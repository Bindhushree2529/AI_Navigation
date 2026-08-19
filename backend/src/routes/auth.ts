import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { generateTokens, verifyRefreshToken } from "../services/tokenService";
import { sendOtp, verifyOtp } from "../services/otpService";
import { sendWelcomeEmail } from "../services/emailService";
import { requireAuth } from "../middleware/requireAuth";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(["USER", "CAREGIVER"]).default("USER"),
});

const loginSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  otp: z.string().length(6).optional(),
});

export async function authRoutes(app: FastifyInstance) {
  // Register
  app.post("/register", async (req, reply) => {
    const body = registerSchema.parse(req.body);

    if (!body.email && !body.phone) {
      return reply.status(400).send({ error: "Email or phone required" });
    }

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });
    if (existing) return reply.status(409).send({ error: "User already exists" });

    const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : undefined;

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        phone: body.phone,
        passwordHash,
        role: body.role,
        settings: { create: {} },
      },
      select: { id: true, name: true, email: true, phone: true, role: true },
    });

    if (body.email) sendWelcomeEmail(body.email, body.name).catch(() => {});

    const tokens = generateTokens(user.id, user.role);
    return reply.status(201).send({ user, ...tokens });
  });

  // Login with email/password
  app.post("/login", async (req, reply) => {
    const body = loginSchema.parse(req.body);

    const user = await prisma.user.findFirst({
      where: { OR: [{ email: body.email }, { phone: body.phone }] },
    });
    if (!user || !user.isActive) return reply.status(401).send({ error: "Invalid credentials" });

    if (body.password) {
      if (!user.passwordHash) return reply.status(401).send({ error: "Use OTP login" });
      const valid = await bcrypt.compare(body.password, user.passwordHash);
      if (!valid) return reply.status(401).send({ error: "Invalid credentials" });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

    const tokens = generateTokens(user.id, user.role);
    return { user: { id: user.id, name: user.name, email: user.email, role: user.role }, ...tokens };
  });

  // Send OTP
  app.post("/otp/send", async (req, reply) => {
    const { phone } = z.object({ phone: z.string() }).parse(req.body);
    const devOtp = await sendOtp(phone);
    return { message: "OTP sent", ...(devOtp ? { devOtp } : {}) };
  });

  // Verify OTP
  app.post("/otp/verify", async (req, reply) => {
    const { phone, otp } = z.object({ phone: z.string(), otp: z.string().length(6) }).parse(req.body);
    const valid = await verifyOtp(phone, otp);
    if (!valid) return reply.status(401).send({ error: "Invalid or expired OTP" });

    let user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await prisma.user.create({
        data: { name: "User", phone, provider: "OTP", isVerified: true, settings: { create: {} } },
      });
    }

    const tokens = generateTokens(user.id, user.role);
    return { user: { id: user.id, name: user.name, phone: user.phone, role: user.role }, ...tokens };
  });

  // Refresh token
  app.post("/refresh", async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return reply.status(401).send({ error: "Invalid refresh token" });

    const blacklisted = await redis.get(`blacklist:${refreshToken}`);
    if (blacklisted) return reply.status(401).send({ error: "Token revoked" });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) return reply.status(401).send({ error: "User not found" });

    const tokens = generateTokens(user.id, user.role);
    return tokens;
  });

  // Logout
  app.post("/logout", { preHandler: [requireAuth] }, async (req, reply) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    await redis.setex(`blacklist:${refreshToken}`, 60 * 60 * 24 * 7, "1");
    return { message: "Logged out" };
  });

  // Get current user
  app.get("/me", { preHandler: [requireAuth] }, async (req) => {
    const user = await prisma.user.findUnique({
      where: { id: (req as any).userId },
      include: { settings: true },
    });
    if (!user) return null;
    const { passwordHash, ...rest } = user;
    return rest;
  });
}
