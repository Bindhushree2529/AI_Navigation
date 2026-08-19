import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireRole } from "../middleware/requireAuth";

export async function adminRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireRole("ADMIN"));

  // Dashboard stats
  app.get("/stats", async () => {
    const [
      totalUsers,
      activeUsers,
      totalSessions,
      activeSessions,
      totalDetections,
      totalSos,
      avgConfidence,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastSeenAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.navigationSession.count(),
      prisma.navigationSession.count({ where: { isActive: true } }),
      prisma.detection.count(),
      prisma.sosEvent.count(),
      prisma.detection.aggregate({ _avg: { confidence: true } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      totalSessions,
      activeSessions,
      totalDetections,
      totalSos,
      avgConfidence: avgConfidence._avg.confidence,
    };
  });

  // Detection breakdown by category
  app.get("/detections/breakdown", async () => {
    const breakdown = await prisma.detection.groupBy({
      by: ["category"],
      _count: { id: true },
      _avg: { confidence: true },
      orderBy: { _count: { id: "desc" } },
    });
    return breakdown;
  });

  // User list
  app.get("/users", async (req) => {
    const { page = 1, limit = 20, role, search } = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(20),
      role: z.string().optional(),
      search: z.string().optional(),
    }).parse(req.query);

    const where = {
      ...(role ? { role: role as any } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.user.count({ where }),
    ]);
    const safeUsers = users.map(({ passwordHash, ...u }) => u);
    return { users: safeUsers, total, page, limit };
  });

  // Toggle user active status
  app.patch("/users/:id/toggle", async (req) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("User not found");
    return prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  });

  // SOS events
  app.get("/sos", async (req) => {
    const { status } = z.object({ status: z.string().optional() }).parse(req.query);
    return prisma.sosEvent.findMany({
      where: status ? { status: status as any } : {},
      include: { user: { select: { name: true, phone: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  // Audit logs
  app.get("/logs", async (req) => {
    const { page = 1, limit = 50 } = z.object({ page: z.coerce.number().default(1), limit: z.coerce.number().default(50) }).parse(req.query);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { user: { select: { name: true } } } }),
      prisma.auditLog.count(),
    ]);
    return { logs, total, page, limit };
  });

  // Sessions over time (last 30 days)
  app.get("/analytics/sessions", async () => {
    const since = new Date(Date.now() - 30 * 86400000);
    return prisma.$queryRaw`
      SELECT DATE(startedAt) as date, COUNT(*) as count
      FROM NavigationSession
      WHERE startedAt >= ${since}
      GROUP BY DATE(startedAt)
      ORDER BY date ASC
    `;
  });
}
