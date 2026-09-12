import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "foodshare.db"));

db.exec("PRAGMA busy_timeout = 10000;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

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

for (let attempt = 0; ; attempt++) {
  try {
    db.exec(SCHEMA);
    break;
  } catch (err) {
    if (attempt >= 5 || (err as NodeJS.ErrnoException).code !== "ERR_SQLITE_ERROR") throw err;
    const wait = 500 * (attempt + 1);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, wait);
  }
}

export function plain<T>(row: T): T {
  return row == null ? row : (JSON.parse(JSON.stringify(row)) as T);
}

export default db;
