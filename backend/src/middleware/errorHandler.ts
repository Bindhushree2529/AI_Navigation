import type { FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

export function errorHandler(error: any, req: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError || error?.name === "ZodError") {
    return reply.status(400).send({
      error: "Validation error",
      details: error.flatten?.().fieldErrors ?? error.issues,
    });
  }

  req.log.error(error);
  const statusCode = error.statusCode ?? 500;
  return reply.status(statusCode).send({
    error: statusCode === 500 ? "Internal server error" : (error.message ?? "Unknown error"),
  });
}
