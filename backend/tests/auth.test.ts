import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import Fastify from "fastify";
import { authRoutes } from "../src/routes/auth";

// Mock prisma and redis
vi.mock("../src/config/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    userSettings: { create: vi.fn() },
    auditLog: { create: vi.fn() },
  },
}));

vi.mock("../src/config/redis", () => ({
  redis: { get: vi.fn(), setex: vi.fn(), del: vi.fn() },
  redisPub: { publish: vi.fn() },
  redisSub: { psubscribe: vi.fn(), on: vi.fn() },
}));

vi.mock("../src/services/emailService", () => ({
  sendWelcomeEmail: vi.fn(),
}));

vi.mock("../src/services/otpService", () => ({
  sendOtp: vi.fn(),
  verifyOtp: vi.fn().mockResolvedValue(true),
}));

const { prisma } = await import("../src/config/prisma");

describe("Auth Routes", () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    await app.register(import("@fastify/jwt"), {
      secret: "test_secret_min_32_characters_long_xx",
    });
    await app.register(authRoutes, { prefix: "/api/v1/auth" });
    await app.ready();
  });

  afterAll(() => app.close());

  it("POST /register — creates user and returns tokens", async () => {
    const mockUser = { id: "uuid-1", name: "Test User", email: "test@example.com", phone: null, role: "USER" };
    (prisma.user.findFirst as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue(mockUser);

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { name: "Test User", email: "test@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.user.email).toBe("test@example.com");
    expect(body.accessToken).toBeDefined();
    expect(body.refreshToken).toBeDefined();
  });

  it("POST /register — returns 409 if user exists", async () => {
    (prisma.user.findFirst as any).mockResolvedValue({ id: "existing" });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { name: "Test", email: "existing@example.com", password: "password123" },
    });

    expect(res.statusCode).toBe(409);
  });

  it("POST /register — returns 400 if no email or phone", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { name: "Test", password: "password123" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("POST /otp/send — sends OTP", async () => {
    const { sendOtp } = await import("../src/services/otpService");
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/send",
      payload: { phone: "+1234567890" },
    });

    expect(res.statusCode).toBe(200);
    expect(sendOtp).toHaveBeenCalledWith("+1234567890");
  });

  it("POST /otp/verify — creates user and returns tokens for new phone", async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    (prisma.user.create as any).mockResolvedValue({
      id: "uuid-2", name: "User", phone: "+1234567890", role: "USER",
    });

    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/otp/verify",
      payload: { phone: "+1234567890", otp: "123456" },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.accessToken).toBeDefined();
  });
});

describe("Auth Validation", () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    await app.register(import("@fastify/jwt"), { secret: "test_secret_min_32_characters_long_xx" });
    await app.register(authRoutes, { prefix: "/api/v1/auth" });
    await app.ready();
  });

  afterAll(() => app.close());

  it("rejects invalid email format", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { name: "Test", email: "not-an-email", password: "password123" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("rejects short password", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: { name: "Test", email: "test@example.com", password: "short" },
    });
    expect(res.statusCode).toBe(400);
  });
});
