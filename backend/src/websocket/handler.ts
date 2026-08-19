import type { FastifyInstance } from "fastify";
import { redisSub } from "../config/redis";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

// Map of userId -> Set of WebSocket connections
const connections = new Map<string, Set<any>>();

function broadcast(userId: string, data: object) {
  const sockets = connections.get(userId);
  if (!sockets) return;
  const msg = JSON.stringify(data);
  for (const ws of sockets) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

export async function wsRoutes(app: FastifyInstance) {
  // Subscribe to Redis channels
  await redisSub.psubscribe("location:*", "sos:*", "user:*:session");

  redisSub.on("pmessage", (_pattern, channel, message) => {
    const data = JSON.parse(message);

    if (channel.startsWith("location:")) {
      const userId = channel.split(":")[1];
      // Broadcast to caregivers watching this user
      broadcast(`caregiver:${userId}`, { type: "LOCATION_UPDATE", ...data });
    }

    if (channel.startsWith("sos:")) {
      const userId = channel.split(":")[1];
      broadcast(`caregiver:${userId}`, { type: "SOS_ALERT", ...data });
    }

    if (channel.includes(":session")) {
      const userId = channel.split(":")[1];
      broadcast(`caregiver:${userId}`, { type: "SESSION_UPDATE", ...data });
    }
  });

  // WebSocket endpoint
  app.get("/ws", { websocket: true }, (socket, req) => {
    const token = new URL(req.url!, `http://localhost`).searchParams.get("token");
    if (!token) return socket.close(1008, "Unauthorized");

    let userId: string;
    let role: string;
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; role: string };
      userId = payload.userId;
      role = payload.role;
    } catch {
      return socket.close(1008, "Invalid token");
    }

    // Register connection
    if (!connections.has(userId)) connections.set(userId, new Set());
    connections.get(userId)!.add(socket);

    socket.send(JSON.stringify({ type: "CONNECTED", userId }));

    socket.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // Caregiver subscribes to watch a user
        if (msg.type === "WATCH_USER" && role === "CAREGIVER") {
          const watchKey = `caregiver:${msg.userId}`;
          if (!connections.has(watchKey)) connections.set(watchKey, new Set());
          connections.get(watchKey)!.add(socket);
        }

        // Ping/pong keepalive
        if (msg.type === "PING") socket.send(JSON.stringify({ type: "PONG" }));
      } catch {}
    });

    socket.on("close", () => {
      connections.get(userId)?.delete(socket);
    });
  });
}
