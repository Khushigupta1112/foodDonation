import pg from "pg";

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "DATABASE_URL is not set. Add your Neon Postgres connection string to .env.local (or Vercel env vars)."
      );
    }
    const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
    pool = new pg.Pool({
      connectionString,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

function toPgSql(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('donor', 'claimer')),
    org_name TEXT,
    phone TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  );

  CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
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
    created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    updated_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
  );

  CREATE TABLE IF NOT EXISTS claims (
    id SERIAL PRIMARY KEY,
    donation_id INTEGER NOT NULL REFERENCES donations(id) ON DELETE CASCADE,
    claimer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled','completed')),
    created_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    updated_at TEXT NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
    UNIQUE (donation_id, claimer_id)
  );

  CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
  CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);
  CREATE INDEX IF NOT EXISTS idx_claims_donation ON claims(donation_id);
  CREATE INDEX IF NOT EXISTS idx_claims_claimer ON claims(claimer_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`;

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((err) => {
        schemaReady = null;
        throw err;
      });
  }
  return schemaReady;
}

export async function all<T>(sql: string, ...args: unknown[]): Promise<T[]> {
  await ensureSchema();
  const result = await getPool().query(toPgSql(sql), args);
  return result.rows as T[];
}

export async function get<T>(sql: string, ...args: unknown[]): Promise<T | undefined> {
  const rows = await all<T>(sql, ...args);
  return rows[0];
}

export async function run(sql: string, ...args: unknown[]): Promise<void> {
  await ensureSchema();
  await getPool().query(toPgSql(sql), args);
}

export async function insert(sql: string, ...args: unknown[]): Promise<number> {
  await ensureSchema();
  const result = await getPool().query(toPgSql(sql), args);
  return Number(result.rows[0].id);
}

export async function batch(statements: { sql: string; args: unknown[] }[]): Promise<void> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    for (const s of statements) {
      await client.query(toPgSql(s.sql), s.args);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
