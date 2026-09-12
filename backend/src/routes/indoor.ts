import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { aiClient } from "../services/aiClient";

export async function indoorRoutes(app: FastifyInstance) {
  app.get("/buildings", async (_req, reply) => {
    try {
      return await aiClient.getIndoorBuildings();
    } catch {
      return reply.status(502).send({ error: "Indoor navigation service unavailable" });
    }
  });

  app.get("/map/:buildingId", async (req, reply) => {
    const { buildingId } = z.object({ buildingId: z.string() }).parse(req.params);
    try {
      return await aiClient.getIndoorMap(buildingId);
    } catch {
      return reply.status(502).send({ error: "Indoor map unavailable" });
    }
  });

  app.post("/route", async (req, reply) => {
    const body = z.object({
      buildingId: z.string().default("demo-building"),
      startId: z.string().optional(),
      startLabel: z.string().optional(),
      destination: z.string(),
      preferAccessible: z.boolean().default(true),
    }).parse(req.body);
    try {
      return await aiClient.getIndoorRoute(body);
    } catch (err: any) {
      const status = err.response?.status ?? 502;
      const msg = err.response?.data?.detail ?? "Indoor route unavailable";
      return reply.status(status).send({ error: msg });
    }
  });

  app.get("/locations/:buildingId", async (req, reply) => {
    const { buildingId } = z.object({ buildingId: z.string() }).parse(req.params);
    try {
      return await aiClient.getIndoorLocations(buildingId);
    } catch {
      return reply.status(502).send({ error: "Indoor locations unavailable" });
    }
  });
}
