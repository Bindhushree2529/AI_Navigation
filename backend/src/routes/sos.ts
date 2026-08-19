import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { redisPub } from "../config/redis";
import { sendSosEmail } from "../services/emailService";
import { sendSosSms } from "../services/smsService";

export async function sosRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Trigger SOS
  app.post("/", async (req, reply) => {
    const userId = (req as any).userId as string;
    const body = z.object({
      location: z.object({ lat: z.number(), lng: z.number() }),
      message: z.string().optional(),
      sessionId: z.string().uuid().optional(),
    }).parse(req.body);

    const sos = await prisma.sosEvent.create({ data: { userId, location: JSON.stringify(body.location), message: body.message, sessionId: body.sessionId } });

    // Get user + emergency contacts
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { emergencyContacts: true },
    });

    // Broadcast to caregivers via WebSocket
    await redisPub.publish(`sos:${userId}`, JSON.stringify({ event: "SOS_TRIGGERED", sos, user: { name: user?.name } }));

    // Notify emergency contacts
    if (user?.emergencyContacts) {
      for (const contact of user.emergencyContacts) {
        sendSosSms(contact.phone, user.name, body.location).catch(() => {});
      }
    }

    // Notify caregivers
    const caregiverLinks = await prisma.caregiverLink.findMany({
      where: { userId, isAccepted: true },
      include: { caregiver: { include: { emergencyContacts: true } } },
    });

    for (const link of caregiverLinks) {
      if (link.caregiver.email) {
        sendSosEmail(link.caregiver.email, user?.name ?? "User", body.location).catch(() => {});
      }
    }

    return reply.status(201).send(sos);
  });

  // Resolve SOS
  app.patch("/:id/resolve", async (req) => {
    const userId = (req as any).userId as string;
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await prisma.sosEvent.updateMany({
      where: { id, userId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
    return { resolved: true };
  });

  // Get SOS history
  app.get("/history", async (req) => {
    const userId = (req as any).userId as string;
    return prisma.sosEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  // Emergency contacts CRUD
  app.get("/contacts", async (req) => {
    const userId = (req as any).userId as string;
    return prisma.emergencyContact.findMany({ where: { userId } });
  });

  app.post("/contacts", async (req, reply) => {
    const userId = (req as any).userId as string;
    const body = z.object({ name: z.string(), phone: z.string(), relation: z.string(), isPrimary: z.boolean().default(false) }).parse(req.body);
    const contact = await prisma.emergencyContact.create({ data: { userId, ...body } });
    return reply.status(201).send(contact);
  });

  app.delete("/contacts/:id", async (req) => {
    const userId = (req as any).userId as string;
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await prisma.emergencyContact.deleteMany({ where: { id, userId } });
    return { deleted: true };
  });
}
