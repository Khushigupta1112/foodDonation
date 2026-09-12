export type UserRole = "donor" | "claimer";

export type DonationStatus =
  | "available"
  | "reserved"
  | "picked_up"
  | "cancelled";

export type ClaimStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed";

export type FoodCategory =
  | "cooked_meal"
  | "bakery"
  | "produce"
  | "packaged"
  | "dairy"
  | "beverage"
  | "other";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  org_name: string | null;
  phone: string | null;
  created_at: string;
}

export interface Donation {
  id: number;
  donor_id: number;
  donor_name: string;
  donor_org: string | null;
  title: string;
  description: string;
  category: FoodCategory;
  quantity: string;
  servings: number;
  is_veg: number;
  expiry_at: string;
  pickup_window: string;
  address: string;
  city: string;
  image_url: string | null;
  status: DonationStatus;
  created_at: string;
  updated_at: string;
}

export interface Claim {
  id: number;
  donation_id: number;
  claimer_id: number;
  claimer_name: string;
  claimer_org: string | null;
  claimer_phone: string | null;
  donation_title: string;
  donation_status: DonationStatus;
  message: string | null;
  status: ClaimStatus;
  created_at: string;
  updated_at: string;
}

export interface Stats {
  total_saved: number;
  active_donations: number;
  total_donations: number;
  ngos: number;
  co2_saved_kg: number;
}

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  cooked_meal: "Cooked meals",
  bakery: "Bakery",
  produce: "Fresh produce",
  packaged: "Packaged food",
  dairy: "Dairy",
  beverage: "Beverages",
  other: "Other",
};

export const STATUS_LABELS: Record<DonationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  picked_up: "Picked up",
  cancelled: "Cancelled",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};
