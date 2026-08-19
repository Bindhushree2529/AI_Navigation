import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/requireAuth";

export async function userRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Get profile
  app.get("/profile", async (req) => {
    const userId = (req as any).userId as string;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { settings: true, emergencyContacts: true, favoriteLocations: true },
    });
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
  });

  // Update profile
  app.patch("/profile", async (req) => {
    const userId = (req as any).userId as string;
    const body = z.object({ name: z.string().min(2).optional(), avatarUrl: z.string().url().optional() }).parse(req.body);
    const user = await prisma.user.update({ where: { id: userId }, data: body });
    const { passwordHash, ...rest } = user;
    return rest;
  });

  // Update settings
  app.patch("/settings", async (req) => {
    const userId = (req as any).userId as string;
    const body = z.object({
      voiceLanguage: z.string().optional(),
      voiceSpeed: z.number().min(0.5).max(2).optional(),
      voiceType: z.string().optional(),
      hapticIntensity: z.number().min(0).max(3).optional(),
      highContrast: z.boolean().optional(),
      largeTouchTarget: z.boolean().optional(),
      offlineMode: z.boolean().optional(),
      darkMode: z.boolean().optional(),
      announceCadence: z.number().min(1).max(10).optional(),
    }).parse(req.body);

    return prisma.userSettings.upsert({
      where: { userId },
      update: body,
      create: { userId, ...body },
    });
  });

  // Submit feedback
  app.post("/feedback", async (req, reply) => {
    const userId = (req as any).userId as string;
    const body = z.object({ rating: z.number().min(1).max(5), comment: z.string().optional(), feature: z.string().optional() }).parse(req.body);
    const feedback = await prisma.feedback.create({ data: { userId, ...body } });
    return reply.status(201).send(feedback);
  });
}
