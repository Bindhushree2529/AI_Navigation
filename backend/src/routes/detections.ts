import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { aiClient } from "../services/aiClient";
import { uploadToS3 } from "../services/storageService";

export async function detectionRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // Submit image for AI detection (proxies to AI engine)
  app.post("/analyze", async (req, reply) => {
    const userId = (req as any).userId as string;
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Image required" });

    const buffer = await data.toBuffer();
    const result = await aiClient.analyze(buffer, data.mimetype);

    // Persist detections
    if (result.detections?.length) {
      await prisma.detection.createMany({
        data: result.detections.map((d: any) => ({
          userId,
          sessionId: req.headers["x-session-id"] as string | undefined,
          category: d.category,
          label: d.label,
          confidence: d.confidence,
          distanceM: d.distanceM,
          boundingBox: d.boundingBox ? JSON.stringify(d.boundingBox) : undefined,
          spokenText: d.spokenText,
          modelName: result.modelName,
          modelVersion: result.modelVersion,
          inferenceMs: result.inferenceMs,
          location: req.headers["x-location"] ? req.headers["x-location"] as string : undefined,
        })),
      });
    }

    return result;
  });

  // Scene description
  app.post("/describe", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Image required" });
    const buffer = await data.toBuffer();
    const description = await aiClient.describeScene(buffer);
    return { description };
  });

  // OCR
  app.post("/ocr", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Image required" });
    const buffer = await data.toBuffer();
    const text = await aiClient.extractText(buffer);
    return { text };
  });

  // Currency detection
  app.post("/currency", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Image required" });
    const buffer = await data.toBuffer();
    const result = await aiClient.detectCurrency(buffer);
    return result;
  });

  // Visual Q&A
  app.post("/ask", async (req, reply) => {
    const form = await req.file();
    if (!form) return reply.status(400).send({ error: "Image required" });
    const buffer = await form.toBuffer();
    const question = (req.headers["x-question"] as string) ?? "What do you see?";
    const answer = await aiClient.visualQA(buffer, question);
    return { answer };
  });

  // Traffic & road safety analysis
  app.post("/traffic", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Image required" });
    const buffer = await data.toBuffer();
    return aiClient.analyzeTraffic(buffer);
  });

  app.post("/road-safety", async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "Image required" });
    const buffer = await data.toBuffer();
    return aiClient.analyzeRoadSafety(buffer);
  });

  // Detection history
  app.get("/history", async (req) => {
    const userId = (req as any).userId as string;
    const { page = 1, limit = 50, category } = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(50),
      category: z.string().optional(),
    }).parse(req.query);

    const where = { userId, ...(category ? { category: category as any } : {}) };
    const [detections, total] = await Promise.all([
      prisma.detection.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.detection.count({ where }),
    ]);

    return { detections, total, page, limit };
  });
}
