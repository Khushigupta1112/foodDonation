import { NextResponse } from "next/server";
import { get, run } from "@/lib/db";
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

  const existing = await get<{ id: number }>("SELECT id FROM users WHERE email = ?", valid.email);
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const orgName = typeof body.org_name === "string" && body.org_name.trim() ? body.org_name.trim() : null;
  const phone = typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null;

  const result = await run(
    "INSERT INTO users (name, email, password_hash, role, org_name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    valid.name,
    valid.email,
    hashPassword(valid.password),
    valid.role,
    orgName,
    phone
  );

  await createSession(Number(result.lastInsertRowid));
  return NextResponse.json({ ok: true }, { status: 201 });
}
