import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { requireAuth } from "../middleware/requireAuth";
import { redisPub } from "../config/redis";
import axios from "axios";

const startSchema = z.object({
  mode: z.enum(["OUTDOOR", "INDOOR"]).default("OUTDOOR"),
  startLocation: z.object({ lat: z.number(), lng: z.number(), address: z.string().optional() }),
  destination: z.string().optional(),
});

// ── Free geocoding via Nominatim (OpenStreetMap) ──────────────────────────────
async function geocode(query: string): Promise<{ lat: number; lng: number; display_name: string } | null> {
  const { data } = await axios.get("https://nominatim.openstreetmap.org/search", {
    params: { q: query, format: "json", limit: 1 },
    headers: { "User-Agent": "NaviAssist/1.0 (accessibility navigation app)" },
    timeout: 8000,
  });
  if (!data?.length) return null;
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), display_name: data[0].display_name };
}

// ── Free routing via OSRM (OpenStreetMap Routing Machine) ────────────────────
async function getRoute(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
  const { data } = await axios.get(
    `https://router.project-osrm.org/route/v1/foot/${coords}`,
    {
      params: { overview: "full", geometries: "geojson", steps: "true", annotations: "false" },
      headers: { "User-Agent": "NaviAssist/1.0" },
      timeout: 10000,
    }
  );
  if (data.code !== "Ok" || !data.routes?.length) throw new Error("No route found");

  const route = data.routes[0];
  const steps = route.legs[0].steps.map((s: any) => ({
    instruction: s.maneuver.type === "arrive" ? "You have arrived at your destination" : _buildInstruction(s),
    distanceM: Math.round(s.distance),
    durationS: Math.round(s.duration),
    direction: s.maneuver.modifier ?? s.maneuver.type,
  }));

  return {
    distanceM: Math.round(route.distance),
    durationS: Math.round(route.duration),
    geometry: route.geometry,   // GeoJSON LineString for map display
    steps,
    summary: `${_metersToText(route.distance)} walk, about ${_secondsToText(route.duration)}`,
  };
}

function _buildInstruction(step: any): string {
  const mod: string = step.maneuver.modifier ?? "";
  const type: string = step.maneuver.type ?? "";
  const road: string = step.name ? ` onto ${step.name}` : "";
  const dist = _metersToText(step.distance);

  if (type === "turn") return `Turn ${mod}${road}, then walk ${dist}`;
  if (type === "new name") return `Continue${road} for ${dist}`;
  if (type === "depart") return `Head ${mod}${road} for ${dist}`;
  if (type === "roundabout") return `Enter roundabout and take exit${road}`;
  return `${type} ${mod}${road}, ${dist}`.trim();
}

function _metersToText(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} meters`;
}

function _secondsToText(s: number): string {
  const mins = Math.round(s / 60);
  return mins < 60 ? `${mins} minutes` : `${Math.floor(mins / 60)} hour ${mins % 60} minutes`;
}

export async function navigationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);

  // ── Geocode an address (Nominatim) ────────────────────────────────────────
  app.get("/geocode", async (req, reply) => {
    const { q } = z.object({ q: z.string().min(2) }).parse(req.query);
    const result = await geocode(q);
    if (!result) return reply.status(404).send({ error: "Location not found" });
    return result;
  });

  // ── Calculate route (OSRM) ────────────────────────────────────────────────
  app.post("/route", async (req, reply) => {
    const body = z.object({
      from: z.object({ lat: z.number(), lng: z.number() }),
      to: z.object({ lat: z.number(), lng: z.number() }).optional(),
      destination: z.string().optional(),
    }).parse(req.body);

    let toCoords = body.to;

    // If destination is a text address, geocode it first
    if (!toCoords && body.destination) {
      const geo = await geocode(body.destination);
      if (!geo) return reply.status(404).send({ error: `Could not find "${body.destination}"` });
      toCoords = { lat: geo.lat, lng: geo.lng };
    }

    if (!toCoords) return reply.status(400).send({ error: "Provide 'to' coords or 'destination' text" });

    try {
      const route = await getRoute(body.from, toCoords);
      return route;
    } catch (err: any) {
      return reply.status(502).send({ error: err.message ?? "Routing failed" });
    }
  });

  // ── Reverse geocode (coords → address) ───────────────────────────────────
  app.get("/reverse", async (req, reply) => {
    const { lat, lng } = z.object({ lat: z.coerce.number(), lng: z.coerce.number() }).parse(req.query);
    const { data } = await axios.get("https://nominatim.openstreetmap.org/reverse", {
      params: { lat, lon: lng, format: "json" },
      headers: { "User-Agent": "NaviAssist/1.0" },
      timeout: 8000,
    });
    return {
      address: data.display_name,
      road: data.address?.road,
      suburb: data.address?.suburb,
      city: data.address?.city ?? data.address?.town,
      country: data.address?.country,
    };
  });

  // ── Start session ─────────────────────────────────────────────────────────
  app.post("/sessions", async (req, reply) => {
    const userId = (req as any).userId as string;
    const body = startSchema.parse(req.body);

    await prisma.navigationSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false, endedAt: new Date() },
    });

    const session = await prisma.navigationSession.create({
      data: { userId, mode: body.mode, startLocation: JSON.stringify(body.startLocation), destination: body.destination },
    });

    await redisPub.publish(`user:${userId}:session`, JSON.stringify({ event: "SESSION_STARTED", session }));
    return reply.status(201).send(session);
  });

  // ── End session ───────────────────────────────────────────────────────────
  app.patch("/sessions/:id/end", async (req, reply) => {
    const userId = (req as any).userId as string;
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    const body = z.object({
      endLocation: z.object({ lat: z.number(), lng: z.number() }).optional(),
      distanceM: z.number().optional(),
    }).parse(req.body);

    const session = await prisma.navigationSession.updateMany({
      where: { id, userId },
      data: { isActive: false, endedAt: new Date(), ...body },
    });
    return { updated: session.count > 0 };
  });

  // ── Get sessions ──────────────────────────────────────────────────────────
  app.get("/sessions", async (req) => {
    const userId = (req as any).userId as string;
    const { page = 1, limit = 20 } = z.object({
      page: z.coerce.number().default(1),
      limit: z.coerce.number().max(100).default(20),
    }).parse(req.query);

    const [sessions, total] = await Promise.all([
      prisma.navigationSession.findMany({
        where: { userId },
        orderBy: { startedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.navigationSession.count({ where: { userId } }),
    ]);
    return { sessions, total, page, limit };
  });

  // ── Favorite locations ────────────────────────────────────────────────────
  app.get("/favorites", async (req) => {
    const userId = (req as any).userId as string;
    return prisma.favoriteLocation.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  });

  app.post("/favorites", async (req, reply) => {
    const userId = (req as any).userId as string;
    const body = z.object({
      label: z.string(), address: z.string(), lat: z.number(), lng: z.number(), icon: z.string().optional(),
    }).parse(req.body);
    const fav = await prisma.favoriteLocation.create({ data: { userId, ...body } });
    return reply.status(201).send(fav);
  });

  app.delete("/favorites/:id", async (req) => {
    const userId = (req as any).userId as string;
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await prisma.favoriteLocation.deleteMany({ where: { id, userId } });
    return { deleted: true };
  });

  // ── Live location update (published to caregivers via Redis) ──────────────
  app.post("/location", async (req) => {
    const userId = (req as any).userId as string;
    const body = z.object({
      lat: z.number(), lng: z.number(),
      accuracy: z.number().optional(),
      heading: z.number().optional(),
    }).parse(req.body);
    await redisPub.publish(`location:${userId}`, JSON.stringify({ ...body, timestamp: Date.now() }));
    return { ok: true };
  });
}
