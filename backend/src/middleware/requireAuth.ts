import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return reply.status(401).send({ error: "Unauthorized" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), env.JWT_SECRET) as { userId: string; role: string };
    (req as any).userId = payload.userId;
    (req as any).userRole = payload.role;
  } catch {
    return reply.status(401).send({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: string[]) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAuth(req, reply);
    if (!roles.includes((req as any).userRole)) {
      return reply.status(403).send({ error: "Forbidden" });
    }
  };
}
