import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/requireAuth";
import { redisSub } from "../config/redis";

export async function caregiverRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Link user by email (caregiver adds user they care for)
  app.post("/link-by-email", async (req, reply) => {
    const caregiverId = (req as any).userId as string;
    const { email, name } = z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return reply.status(404).send({ error: "No user found with that email" });
    if (user.id === caregiverId) return reply.status(400).send({ error: "Cannot link yourself" });

    const existing = await prisma.caregiverLink.findUnique({
      where: { userId_caregiverId: { userId: user.id, caregiverId } },
    });
    if (existing) {
      if (!existing.isAccepted) {
        await prisma.caregiverLink.update({ where: { id: existing.id }, data: { isAccepted: true } });
        return reply.send({ linked: true, user: { id: user.id, name: user.name, email: user.email } });
      }
      return reply.status(409).send({ error: "Already linked to this user" });
    }

    await prisma.caregiverLink.create({ data: { userId: user.id, caregiverId, isAccepted: true } });
    return reply.status(201).send({ linked: true, user: { id: user.id, name: user.name, email: user.email } });
  });

  // Add caregiver by phone (user adds their caregiver's contact)
  app.post("/add-my-caregiver", async (req, reply) => {
    const userId = (req as any).userId as string;
    const { name, phone, relation } = z.object({
      name: z.string().min(1),
      phone: z.string().min(6),
      relation: z.string().default("Caregiver"),
    }).parse(req.body);

    // Save as emergency contact
    const contact = await prisma.emergencyContact.create({
      data: { userId, name, phone, relation, isPrimary: false },
    });
    return reply.status(201).send(contact);
  });

  // Get my emergency contacts (caregivers added by user)
  app.get("/my-contacts", async (req) => {
    const userId = (req as any).userId as string;
    return prisma.emergencyContact.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  });

  // Delete emergency contact
  app.delete("/my-contacts/:id", async (req) => {
    const userId = (req as any).userId as string;
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await prisma.emergencyContact.deleteMany({ where: { id, userId } });
    return { deleted: true };
  });

  // Get users I'm caring for
  app.get("/users", async (req) => {
    const caregiverId = (req as any).userId as string;
    const links = await prisma.caregiverLink.findMany({
      where: { caregiverId, isAccepted: true },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true, avatarUrl: true, lastSeenAt: true },
        },
      },
    });
    return links.map((l) => l.user);
  });

  // Invite user to link
  app.post("/invite", async (req, reply) => {
    const caregiverId = (req as any).userId as string;
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.body);

    const existing = await prisma.caregiverLink.findUnique({ where: { userId_caregiverId: { userId, caregiverId } } });
    if (existing) return reply.status(409).send({ error: "Already linked" });

    const link = await prisma.caregiverLink.create({ data: { userId, caregiverId } });
    return reply.status(201).send(link);
  });

  // Accept invite
  app.patch("/invite/:id/accept", async (req) => {
    const userId = (req as any).userId as string;
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await prisma.caregiverLink.updateMany({ where: { id, userId }, data: { isAccepted: true } });
    return { accepted: true };
  });

  // Remove link
  app.delete("/users/:userId", async (req) => {
    const caregiverId = (req as any).userId as string;
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);
    await prisma.caregiverLink.deleteMany({ where: { userId, caregiverId } });
    return { removed: true };
  });

  // Get user's active session
  app.get("/users/:userId/session", async (req, reply) => {
    const caregiverId = (req as any).userId as string;
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);

    const link = await prisma.caregiverLink.findUnique({
      where: { userId_caregiverId: { userId, caregiverId }, isAccepted: true } as any,
    });
    if (!link) return reply.status(403).send({ error: "Not authorized" });

    const session = await prisma.navigationSession.findFirst({
      where: { userId, isActive: true },
    });
    return session;
  });

  // Get user's SOS history
  app.get("/users/:userId/sos", async (req, reply) => {
    const caregiverId = (req as any).userId as string;
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);

    const link = await prisma.caregiverLink.findFirst({ where: { userId, caregiverId, isAccepted: true } });
    if (!link) return reply.status(403).send({ error: "Not authorized" });

    return prisma.sosEvent.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 });
  });

  // Get user's navigation history
  app.get("/users/:userId/sessions", async (req, reply) => {
    const caregiverId = (req as any).userId as string;
    const { userId } = z.object({ userId: z.string().uuid() }).parse(req.params);

    const link = await prisma.caregiverLink.findFirst({ where: { userId, caregiverId, isAccepted: true } });
    if (!link) return reply.status(403).send({ error: "Not authorized" });

    return prisma.navigationSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 30,
    });
  });
}
