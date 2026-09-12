import { NextResponse } from "next/server";
import db from "@/lib/db";
import { createSession, hashPassword, validateRegistration } from "@/lib/auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const valid = validateRegistration(body);
  if (typeof valid === "string") {
    return NextResponse.json({ error: valid }, { status: 400 });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(valid.email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const orgName = typeof body.org_name === "string" && body.org_name.trim() ? body.org_name.trim() : null;
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;

  const result = db
    .prepare("INSERT INTO users (name, email, password_hash, role, org_name, phone) VALUES (?, ?, ?, ?, ?, ?)")
    .run(valid.name, valid.email, hashPassword(valid.password), valid.role, orgName, phone);

  await createSession(Number(result.lastInsertRowid));
  return NextResponse.json({ ok: true }, { status: 201 });
}
