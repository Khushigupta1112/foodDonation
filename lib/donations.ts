import db, { plain } from "./db";
import type { Claim, Donation, DonationStatus, FoodCategory } from "./types";

const DONATION_SELECT = `
  SELECT d.*, u.name AS donor_name, u.org_name AS donor_org
  FROM donations d JOIN users u ON u.id = d.donor_id
`;

const CLAIM_SELECT = `
  SELECT c.*, u.name AS claimer_name, u.org_name AS claimer_org, u.phone AS claimer_phone,
         d.title AS donation_title, d.status AS donation_status
  FROM claims c
  JOIN users u ON u.id = c.claimer_id
  JOIN donations d ON d.id = c.donation_id
`;

function touch(donationId: number): void {
  db.prepare("UPDATE donations SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    donationId
  );
}

export interface DonationFilters {
  q?: string;
  city?: string;
  category?: string;
  vegOnly?: boolean;
}

export function listDonations(filters: DonationFilters = {}): Donation[] {
  const where: string[] = ["d.status = 'available'"];
  const params: (string | number)[] = [];

  if (filters.q) {
    where.push("(d.title LIKE ? OR d.description LIKE ?)");
    params.push(`%${filters.q}%`, `%${filters.q}%`);
  }
  if (filters.city) {
    where.push("LOWER(d.city) = LOWER(?)");
    params.push(filters.city);
  }
  if (filters.category) {
    where.push("d.category = ?");
    params.push(filters.category);
  }
  if (filters.vegOnly) {
    where.push("d.is_veg = 1");
  }

  where.push("d.expiry_at > ?");
  params.push(new Date().toISOString());

  const rows = plain(
    db
      .prepare(`${DONATION_SELECT} WHERE ${where.join(" AND ")} ORDER BY d.created_at DESC LIMIT 100`)
      .all(...params) as unknown as Donation[]
  );
  return rows;
}

export function listAllCities(): string[] {
  return (
    db
      .prepare("SELECT DISTINCT city FROM donations WHERE status IN ('available','reserved') ORDER BY city")
      .all() as unknown as { city: string }[]
  ).map((r) => r.city);
}

export function getDonation(id: number): Donation | null {
  const row = db.prepare(`${DONATION_SELECT} WHERE d.id = ?`).get(id) as Donation | undefined;
  return plain(row) ?? null;
}

export function getDonationClaims(donationId: number): Claim[] {
  return plain(
    db
      .prepare(`${CLAIM_SELECT} WHERE c.donation_id = ? ORDER BY c.created_at ASC`)
      .all(donationId) as unknown as Claim[]
  );
}

export function getActiveClaim(donationId: number, claimerId: number): Claim | null {
  const row = db
    .prepare(
      `${CLAIM_SELECT} WHERE c.donation_id = ? AND c.claimer_id = ? AND c.status IN ('pending','approved')`
    )
    .get(donationId, claimerId) as Claim | undefined;
  return plain(row) ?? null;
}

export interface NewDonationInput {
  donorId: number;
  title: string;
  description: string;
  category: FoodCategory;
  quantity: string;
  servings: number;
  isVeg: boolean;
  expiryAt: string;
  pickupWindow: string;
  address: string;
  city: string;
  imageUrl: string | null;
}

export function createDonation(input: NewDonationInput): Donation | null {
  const result = db
    .prepare(
      `INSERT INTO donations (donor_id, title, description, category, quantity, servings, is_veg, expiry_at, pickup_window, address, city, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.donorId,
      input.title,
      input.description,
      input.category,
      input.quantity,
      input.servings,
      input.isVeg ? 1 : 0,
      input.expiryAt,
      input.pickupWindow,
      input.address,
      input.city,
      input.imageUrl
    );
  return getDonation(Number(result.lastInsertRowid));
}

export function listDonationsByDonor(donorId: number): Donation[] {
  return plain(
    db
      .prepare(`${DONATION_SELECT} WHERE d.donor_id = ? ORDER BY d.created_at DESC`)
      .all(donorId) as unknown as Donation[]
  );
}

export function listClaimsByClaimer(claimerId: number): Claim[] {
  return plain(
    db
      .prepare(`${CLAIM_SELECT} WHERE c.claimer_id = ? ORDER BY c.created_at DESC`)
      .all(claimerId) as unknown as Claim[]
  );
}

export function countPendingClaims(donationId: number): number {
  const row = db
    .prepare("SELECT COUNT(*) AS n FROM claims WHERE donation_id = ? AND status = 'pending'")
    .get(donationId) as { n: number };
  return row.n;
}

export function getClaim(claimId: number): Claim | null {
  const row = db.prepare(`${CLAIM_SELECT} WHERE c.id = ?`).get(claimId) as Claim | undefined;
  return plain(row) ?? null;
}

export function createClaim(donationId: number, claimerId: number, message: string | null): Claim | null {
  const donation = getDonation(donationId);
  if (!donation || donation.status !== "available") return null;
  if (donation.expiry_at <= new Date().toISOString()) return null;
  if (getActiveClaim(donationId, claimerId)) return null;

  db.prepare("INSERT INTO claims (donation_id, claimer_id, message) VALUES (?, ?, ?)").run(
    donationId,
    claimerId,
    message
  );
  return getActiveClaim(donationId, claimerId);
}

export function approveClaim(claimId: number, donorId: number): Claim | null {
  const claim = getClaim(claimId);
  if (!claim || claim.status !== "pending") return null;
  const donation = getDonation(claim.donation_id);
  if (!donation || donation.donor_id !== donorId || donation.status !== "available") return null;

  db.prepare("UPDATE claims SET status = 'approved', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    claimId
  );
  db.prepare(
    "UPDATE claims SET status = 'rejected', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE donation_id = ? AND id != ? AND status = 'pending'"
  ).run(donation.id, claimId);
  db.prepare("UPDATE donations SET status = 'reserved', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    donation.id
  );
  return getClaim(claimId);
}

export function rejectClaim(claimId: number, donorId: number): Claim | null {
  const claim = getClaim(claimId);
  if (!claim || claim.status !== "pending") return null;
  const donation = getDonation(claim.donation_id);
  if (!donation || donation.donor_id !== donorId) return null;

  db.prepare("UPDATE claims SET status = 'rejected', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    claimId
  );
  touch(donation.id);
  return getClaim(claimId);
}

export function cancelClaim(claimId: number, claimerId: number): Claim | null {
  const claim = getClaim(claimId);
  if (!claim || claim.claimer_id !== claimerId) return null;
  if (claim.status !== "pending" && claim.status !== "approved") return null;

  db.prepare("UPDATE claims SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    claimId
  );
  if (claim.status === "approved") {
    db.prepare("UPDATE donations SET status = 'available', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
      claim.donation_id
    );
  }
  return getClaim(claimId);
}

export function completeClaim(claimId: number, donorId: number): Claim | null {
  const claim = getClaim(claimId);
  if (!claim || claim.status !== "approved") return null;
  const donation = getDonation(claim.donation_id);
  if (!donation || donation.donor_id !== donorId || donation.status !== "reserved") return null;

  db.prepare("UPDATE claims SET status = 'completed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    claimId
  );
  db.prepare("UPDATE donations SET status = 'picked_up', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    donation.id
  );
  return getClaim(claimId);
}

export function cancelDonation(donationId: number, donorId: number): Donation | null {
  const donation = getDonation(donationId);
  if (!donation || donation.donor_id !== donorId) return null;
  if (donation.status !== "available" && donation.status !== "reserved") return null;

  db.prepare("UPDATE donations SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(
    donationId
  );
  db.prepare(
    "UPDATE claims SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE donation_id = ? AND status IN ('pending','approved')"
  ).run(donationId);
  return getDonation(donationId);
}

export function getStats(): {
  total_saved: number;
  active_donations: number;
  total_donations: number;
  ngos: number;
  co2_saved_kg: number;
} {
  const row = db
    .prepare(
      `SELECT
         COALESCE((SELECT SUM(servings) FROM donations WHERE status = 'picked_up'), 0) AS total_saved,
         COALESCE((SELECT COUNT(*) FROM donations WHERE status = 'available' AND expiry_at > ?), 0) AS active_donations,
         COALESCE((SELECT COUNT(*) FROM donations), 0) AS total_donations,
         COALESCE((SELECT COUNT(*) FROM users WHERE role = 'claimer'), 0) AS ngos`
    )
    .get(new Date().toISOString()) as {
    total_saved: number;
    active_donations: number;
    total_donations: number;
    ngos: number;
  };
  return { ...row, co2_saved_kg: Math.round(row.total_saved * 0.5 * 10) / 10 };
}

export type { DonationStatus };
