import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import db, { plain } from "./db";
import type { User, UserRole } from "./types";

const SESSION_COOKIE = "fs_session";
const SESSION_TTL_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: number): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    hashToken(token),
    userId,
    expires.toISOString()
  );
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.name, u.email, u.role, u.org_name, u.phone, u.created_at
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`
    )
    .get(hashToken(token), new Date().toISOString()) as User | undefined;
  return plain(row) ?? null;
}

export function validateRegistration(body: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
}): { name: string; email: string; password: string; role: UserRole } | string {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = body.role;

  if (name.length < 2 || name.length > 80) return "Name must be 2-80 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  if (role !== "donor" && role !== "claimer") return "Role must be donor or claimer.";
  return { name, email, password, role };
}
