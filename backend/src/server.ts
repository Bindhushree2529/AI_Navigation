import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { navigationRoutes } from "./routes/navigation";
import { detectionRoutes } from "./routes/detections";
import { sosRoutes } from "./routes/sos";
import { caregiverRoutes } from "./routes/caregiver";
import { adminRoutes } from "./routes/admin";
import { voiceRoutes } from "./routes/voice";
import { weatherRoutes } from "./routes/weather";
import { indoorRoutes } from "./routes/indoor";
import { wsRoutes } from "./websocket/handler";
import { errorHandler } from "./middleware/errorHandler";
import { auditMiddleware } from "./middleware/audit";
import { env } from "./config/env";

const app = Fastify({ logger: true, trustProxy: true });

async function bootstrap() {
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.ALLOWED_ORIGINS.split(","),
    credentials: true,
  });
  await app.register(rateLimit, { max: 200, timeWindow: "1 minute" });
  await app.register(jwt, { secret: env.JWT_SECRET, sign: { expiresIn: "15m" } });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(websocket);

  await app.register(swagger, {
    openapi: {
      info: { title: "NaviAssist API", version: "1.0.0" },
      components: {
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
        },
      },
    },
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  app.addHook("onRequest", auditMiddleware);
  app.setErrorHandler(errorHandler);

  await app.register(authRoutes, { prefix: "/api/v1/auth" });
  await app.register(userRoutes, { prefix: "/api/v1/users" });
  await app.register(navigationRoutes, { prefix: "/api/v1/navigation" });
  await app.register(detectionRoutes, { prefix: "/api/v1/detections" });
  await app.register(sosRoutes, { prefix: "/api/v1/sos" });
  await app.register(caregiverRoutes, { prefix: "/api/v1/caregiver" });
  await app.register(adminRoutes, { prefix: "/api/v1/admin" });
  await app.register(voiceRoutes, { prefix: "/api/v1/voice" });
  await app.register(weatherRoutes, { prefix: "/api/v1/weather" });
  await app.register(indoorRoutes, { prefix: "/api/v1/indoor" });
  await app.register(wsRoutes);

  app.get("/health", async () => ({ status: "ok", timestamp: new Date().toISOString() }));

  await app.listen({ port: env.PORT, host: "0.0.0.0" });
  console.log(`NaviAssist backend running on port ${env.PORT}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
