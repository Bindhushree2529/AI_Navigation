import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { aiClient } from "../services/aiClient";

export async function weatherRoutes(app: FastifyInstance) {
  app.get("/current", async (req, reply) => {
    const { lat, lng } = z.object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
    }).parse(req.query);
    try {
      const data = await aiClient.getWeather(lat, lng);
      return data;
    } catch {
      return reply.status(502).send({ error: "Weather service unavailable" });
    }
  });

  app.get("/route-advice", async (req, reply) => {
    const { lat, lng } = z.object({
      lat: z.coerce.number(),
      lng: z.coerce.number(),
    }).parse(req.query);
    try {
      const data = await aiClient.getWeatherAdvice(lat, lng);
      return data;
    } catch {
      return reply.status(502).send({ error: "Weather service unavailable" });
    }
  });
}
