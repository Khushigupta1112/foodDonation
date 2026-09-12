import { createClient, type InValue } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL ?? "file:data/foodshare.db";

export const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('donor', 'claimer')),
    org_name TEXT,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL CHECK (category IN ('cooked_meal','bakery','produce','packaged','dairy','beverage','other')),
    quantity TEXT NOT NULL,
    servings INTEGER NOT NULL DEFAULT 0,
    is_veg INTEGER NOT NULL DEFAULT 0,
    expiry_at TEXT NOT NULL,
    pickup_window TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    image_url TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','picked_up','cancelled')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    claimer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE (donation_id, claimer_id)
  );

  CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
  CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
  CREATE INDEX IF NOT EXISTS idx_claims_donation ON claims(donation_id);
  CREATE INDEX IF NOT EXISTS idx_claims_claimer ON claims(claimer_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

let schemaReady: Promise<unknown> | null = null;

export function ensureSchema(): Promise<unknown> {
  if (!schemaReady) {
    schemaReady = db.executeMultiple(SCHEMA).catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}

export async function all<T>(sql: string, ...args: InValue[]): Promise<T[]> {
  await ensureSchema();
  const result = await db.execute({ sql, args });
  return result.rows.map((row) => ({ ...row })) as unknown as T[];
}

export async function get<T>(sql: string, ...args: InValue[]): Promise<T | undefined> {
  const rows = await all<T>(sql, ...args);
  return rows[0];
}

export async function run(
  sql: string,
  ...args: InValue[]
): Promise<{ lastInsertRowid: number | null }> {
  await ensureSchema();
  const result = await db.execute({ sql, args });
  return {
    lastInsertRowid:
      result.lastInsertRowid == null ? null : Number(result.lastInsertRowid),
  };
}

export async function batch(statements: { sql: string; args: InValue[] }[]): Promise<void> {
  await ensureSchema();
  await db.batch(statements, "write");
}
