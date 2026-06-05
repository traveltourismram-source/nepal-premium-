import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const SECRET = process.env.JWT_SECRET ?? "fallback_dev_secret_change_in_prod";
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "30d";

export interface JwtPayload {
  sub: string;   // user id
  email: string;
  iat?: number;
  exp?: number;
}

export function signAccessToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshExpiresAt(): number {
  // 30 days in seconds from now
  return Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
}
