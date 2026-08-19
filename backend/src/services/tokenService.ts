import jwt from "jsonwebtoken";
import { env } from "../config/env";

interface TokenPayload {
  userId: string;
  role: string;
}

export function generateTokens(userId: string, role: string) {
  const accessToken = jwt.sign({ userId, role }, env.JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId, role }, env.JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}
