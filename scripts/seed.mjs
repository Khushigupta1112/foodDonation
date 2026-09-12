import { randomBytes, scryptSync } from "node:crypto";
import { createClient } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
if (!process.env.TURSO_DATABASE_URL) {
  fs.mkdirSync(path.join(root, "data"), { recursive: true });
}

const url = process.env.TURSO_DATABASE_URL ?? `file:${path.join(root, "data", "foodshare.db")}`;
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const now = new Date();
const hoursFromNow = (h) => new Date(now.getTime() + h * 3600_000).toISOString();
const hoursAgo = (h) => new Date(now.getTime() - h * 3600_000).toISOString();

await db.executeMultiple(`
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
`);

await db.executeMultiple(`
  DELETE FROM claims; DELETE FROM sessions;
  DELETE FROM donations; DELETE FROM users;
  DELETE FROM sqlite_sequence WHERE name IN ('users','donations','claims');
`);

const users = [
  ["Aarti Sharma", "donor@foodshare.test", "donor", "Hotel Green Leaf", "+91 98100 11111"],
  ["Rahul Mehta", "donor2@foodshare.test", "donor", "Mehta Caterers", "+91 98100 22222"],
  ["Neha Verma", "ngo@foodshare.test", "claimer", "Sparsh Foundation NGO", "+91 98100 33333"],
  ["Imran Khan", "volunteer@foodshare.test", "claimer", null, "+91 98100 44444"],
];

const userIds = {};
for (const [name, email, role, org, phone] of users) {
  const res = await db.execute({
    sql: "INSERT INTO users (name, email, password_hash, role, org_name, phone) VALUES (?, ?, ?, ?, ?, ?)",
    args: [name, email, hashPassword("password123"), role, org, phone],
  });
  userIds[email] = Number(res.lastInsertRowid);
}

const donations = [
  {
    donor: "donor@foodshare.test", title: "Evening buffet surplus — paneer tikka & naan",
    description: "Fresh from tonight's buffet. Sealed trays, kept warm. Veg.",
    category: "cooked_meal", quantity: "3 trays (~30 pieces each)", servings: 45, veg: 1,
    expiry: hoursFromNow(5), pickup: "Today 9:00 PM – 10:30 PM",
    address: "Hotel Green Leaf, 12 MG Road", city: "Bengaluru", status: "available", created: hoursAgo(2),
  },
  {
    donor: "donor@foodshare.test", title: "Fresh vegetable crates (unsold)",
    description: "Tomatoes, onions, capsicum — unsold market surplus, good quality.",
    category: "produce", quantity: "4 crates (~20 kg)", servings: 60, veg: 1,
    expiry: hoursFromNow(20), pickup: "Tomorrow 7:00 AM – 9:00 AM",
    address: "Shop 4, K R Market", city: "Bengaluru", status: "available", created: hoursAgo(5),
  },
  {
    donor: "donor2@foodshare.test", title: "Wedding catering leftover — biryani & dessert",
    description: "Hygienically packed after the event. Non-veg biryani + separate veg pulao.",
    category: "cooked_meal", quantity: "8 large containers", servings: 80, veg: 0,
    expiry: hoursFromNow(3), pickup: "Tonight 11:00 PM – midnight",
    address: "Grand Palace Banquet, Sector 29", city: "Gurugram", status: "available", created: hoursAgo(1),
  },
  {
    donor: "donor2@foodshare.test", title: "Bakery: bread loaves & muffins",
    description: "Day-old but well within best-before. Mixed veg/non-veg muffins labelled.",
    category: "bakery", quantity: "12 loaves + 40 muffins", servings: 50, veg: 1,
    expiry: hoursFromNow(26), pickup: "Today 5:00 PM – 8:00 PM",
    address: "Mehta Bake House, Karol Bagh", city: "Delhi", status: "reserved", created: hoursAgo(8),
  },
  {
    donor: "donor@foodshare.test", title: "Packaged snacks & juice cartons",
    description: "Sealed packets, 2 months before best-before date.",
    category: "packaged", quantity: "2 cartons", servings: 40, veg: 1,
    expiry: hoursFromNow(24 * 30), pickup: "Any day 10:00 AM – 6:00 PM",
    address: "Green Leaf godown, Indiranagar", city: "Bengaluru", status: "available", created: hoursAgo(24),
  },
  {
    donor: "donor2@foodshare.test", title: "Conference lunch boxes (veg)",
    description: "Unopened sealed thalis from a corporate event.",
    category: "cooked_meal", quantity: "35 sealed thalis", servings: 35, veg: 1,
    expiry: hoursAgo(2), pickup: "Was today 3:00 PM – 5:00 PM",
    address: "Innov8 Coworking, Hitec City", city: "Hyderabad", status: "picked_up", created: hoursAgo(30),
  },
  {
    donor: "donor@foodshare.test", title: "Milk & curd packs",
    description: "Surplus dairy from breakfast service, refrigerated.",
    category: "dairy", quantity: "20 packs", servings: 20, veg: 1,
    expiry: hoursAgo(5), pickup: "Was today 11:00 AM – 1:00 PM",
    address: "Hotel Green Leaf, 12 MG Road", city: "Bengaluru", status: "picked_up", created: hoursAgo(50),
  },
];

const donationIds = [];
for (const d of donations) {
  const res = await db.execute({
    sql: `INSERT INTO donations (donor_id, title, description, category, quantity, servings, is_veg, expiry_at, pickup_window, address, city, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [userIds[d.donor], d.title, d.description, d.category, d.quantity, d.servings, d.veg, d.expiry, d.pickup, d.address, d.city, d.status, d.created, d.created],
  });
  donationIds.push(Number(res.lastInsertRowid));
}

await db.execute({
  sql: `INSERT INTO claims (donation_id, claimer_id, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  args: [donationIds[3], userIds["ngo@foodshare.test"],
    "We can send a volunteer by 6 PM, we serve 60 kids daily.", "approved", hoursAgo(6), hoursAgo(5)],
});

await db.execute({
  sql: `INSERT INTO claims (donation_id, claimer_id, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  args: [donationIds[5], userIds["volunteer@foodshare.test"],
    "Picking up on my bike, can reach by 4:30.", "completed", hoursAgo(28), hoursAgo(26)],
});

await db.execute({
  sql: `INSERT INTO claims (donation_id, claimer_id, message, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
  args: [donationIds[6], userIds["ngo@foodshare.test"],
    "Will collect with our van.", "completed", hoursAgo(48), hoursAgo(47)],
});

console.log("Seed complete ✔  (" + url + ")");
console.log("  Log in with donor@foodshare.test / ngo@foodshare.test — password: password123");
