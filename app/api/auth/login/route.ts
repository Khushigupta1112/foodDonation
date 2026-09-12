import { NextResponse } from "next/server";
import db from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const row = db.prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: number; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(row.id);
  return NextResponse.json({ ok: true });
}
