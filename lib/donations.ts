import { all, batch, get, run } from "./db";
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

export interface DonationFilters {
  q?: string;
  city?: string;
  category?: string;
  vegOnly?: boolean;
}

export async function listDonations(filters: DonationFilters = {}): Promise<Donation[]> {
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

  return all<Donation>(
    `${DONATION_SELECT} WHERE ${where.join(" AND ")} ORDER BY d.created_at DESC LIMIT 100`,
    ...params
  );
}

export async function listAllCities(): Promise<string[]> {
  const rows = await all<{ city: string }>(
    "SELECT DISTINCT city FROM donations WHERE status IN ('available','reserved') ORDER BY city"
  );
  return rows.map((r) => r.city);
}

export async function getDonation(id: number): Promise<Donation | null> {
  const row = await get<Donation>(`${DONATION_SELECT} WHERE d.id = ?`, id);
  return row ?? null;
}

export async function getDonationClaims(donationId: number): Promise<Claim[]> {
  return all<Claim>(`${CLAIM_SELECT} WHERE c.donation_id = ? ORDER BY c.created_at ASC`, donationId);
}

export async function getActiveClaim(donationId: number, claimerId: number): Promise<Claim | null> {
  const row = await get<Claim>(
    `${CLAIM_SELECT} WHERE c.donation_id = ? AND c.claimer_id = ? AND c.status IN ('pending','approved')`,
    donationId,
    claimerId
  );
  return row ?? null;
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

export async function createDonation(input: NewDonationInput): Promise<Donation | null> {
  const result = await run(
    `INSERT INTO donations (donor_id, title, description, category, quantity, servings, is_veg, expiry_at, pickup_window, address, city, image_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

export async function listDonationsByDonor(donorId: number): Promise<Donation[]> {
  return all<Donation>(`${DONATION_SELECT} WHERE d.donor_id = ? ORDER BY d.created_at DESC`, donorId);
}

export async function listClaimsByClaimer(claimerId: number): Promise<Claim[]> {
  return all<Claim>(`${CLAIM_SELECT} WHERE c.claimer_id = ? ORDER BY c.created_at DESC`, claimerId);
}

export async function countPendingClaims(donationId: number): Promise<number> {
  const row = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM claims WHERE donation_id = ? AND status = 'pending'",
    donationId
  );
  return row?.n ?? 0;
}

export async function getClaim(claimId: number): Promise<Claim | null> {
  const row = await get<Claim>(`${CLAIM_SELECT} WHERE c.id = ?`, claimId);
  return row ?? null;
}

export async function createClaim(
  donationId: number,
  claimerId: number,
  message: string | null
): Promise<Claim | null> {
  const donation = await getDonation(donationId);
  if (!donation || donation.status !== "available") return null;
  if (donation.expiry_at <= new Date().toISOString()) return null;
  if (await getActiveClaim(donationId, claimerId)) return null;

  await run("INSERT INTO claims (donation_id, claimer_id, message) VALUES (?, ?, ?)", 
    donationId,
    claimerId,
    message
  );
  return getActiveClaim(donationId, claimerId);
}

export async function approveClaim(claimId: number, donorId: number): Promise<Claim | null> {
  const claim = await getClaim(claimId);
  if (!claim || claim.status !== "pending") return null;
  const donation = await getDonation(claim.donation_id);
  if (!donation || donation.donor_id !== donorId || donation.status !== "available") return null;

  await batch([
    {
      sql: "UPDATE claims SET status = 'approved', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      args: [claimId],
    },
    {
      sql: "UPDATE claims SET status = 'rejected', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE donation_id = ? AND id != ? AND status = 'pending'",
      args: [donation.id, claimId],
    },
    {
      sql: "UPDATE donations SET status = 'reserved', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      args: [donation.id],
    },
  ]);
  return getClaim(claimId);
}

export async function rejectClaim(claimId: number, donorId: number): Promise<Claim | null> {
  const claim = await getClaim(claimId);
  if (!claim || claim.status !== "pending") return null;
  const donation = await getDonation(claim.donation_id);
  if (!donation || donation.donor_id !== donorId) return null;

  await run(
    "UPDATE claims SET status = 'rejected', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    claimId
  );
  return getClaim(claimId);
}

export async function cancelClaim(claimId: number, claimerId: number): Promise<Claim | null> {
  const claim = await getClaim(claimId);
  if (!claim || claim.claimer_id !== claimerId) return null;
  if (claim.status !== "pending" && claim.status !== "approved") return null;

  await run(
    "UPDATE claims SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
    claimId
  );
  if (claim.status === "approved") {
    await run(
      "UPDATE donations SET status = 'available', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      claim.donation_id
    );
  }
  return getClaim(claimId);
}

export async function completeClaim(claimId: number, donorId: number): Promise<Claim | null> {
  const claim = await getClaim(claimId);
  if (!claim || claim.status !== "approved") return null;
  const donation = await getDonation(claim.donation_id);
  if (!donation || donation.donor_id !== donorId || donation.status !== "reserved") return null;

  await batch([
    {
      sql: "UPDATE claims SET status = 'completed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      args: [claimId],
    },
    {
      sql: "UPDATE donations SET status = 'picked_up', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      args: [donation.id],
    },
  ]);
  return getClaim(claimId);
}

export async function cancelDonation(donationId: number, donorId: number): Promise<Donation | null> {
  const donation = await getDonation(donationId);
  if (!donation || donation.donor_id !== donorId) return null;
  if (donation.status !== "available" && donation.status !== "reserved") return null;

  await batch([
    {
      sql: "UPDATE donations SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?",
      args: [donationId],
    },
    {
      sql: "UPDATE claims SET status = 'cancelled', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE donation_id = ? AND status IN ('pending','approved')",
      args: [donationId],
    },
  ]);
  return getDonation(donationId);
}

export async function getStats(): Promise<{
  total_saved: number;
  active_donations: number;
  total_donations: number;
  ngos: number;
  co2_saved_kg: number;
}> {
  const row = await get<{
    total_saved: number;
    active_donations: number;
    total_donations: number;
    ngos: number;
  }>(
    `SELECT
       COALESCE((SELECT SUM(servings) FROM donations WHERE status = 'picked_up'), 0) AS total_saved,
       COALESCE((SELECT COUNT(*) FROM donations WHERE status = 'available' AND expiry_at > ?), 0) AS active_donations,
       COALESCE((SELECT COUNT(*) FROM donations), 0) AS total_donations,
       COALESCE((SELECT COUNT(*) FROM users WHERE role = 'claimer'), 0) AS ngos`,
    new Date().toISOString()
  );
  const stats = row ?? { total_saved: 0, active_donations: 0, total_donations: 0, ngos: 0 };
  return { ...stats, co2_saved_kg: Math.round(stats.total_saved * 0.5 * 10) / 10 };
}

export type { DonationStatus };
