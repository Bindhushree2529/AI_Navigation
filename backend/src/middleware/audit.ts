import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../config/prisma";

const SKIP_PATHS = new Set(["/health", "/docs"]);

export async function auditMiddleware(req: FastifyRequest, reply: FastifyReply) {
  if (SKIP_PATHS.has(req.url)) return;

  const userId = (req as any).userId as string | undefined;
  if (!userId) return;

  // Fire-and-forget audit log
  prisma.auditLog
    .create({
      data: {
        userId,
        action: req.method,
        resource: req.url.split("?")[0],
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    })
    .catch(() => {});
}
