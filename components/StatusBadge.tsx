import type { DonationStatus, ClaimStatus } from "@/lib/types";

const DONATION_STYLES: Record<DonationStatus, string> = {
  available: "bg-green-100 text-green-800",
  reserved: "bg-amber-100 text-amber-800",
  picked_up: "bg-gray-200 text-gray-700",
  cancelled: "bg-red-100 text-red-700",
};

const DONATION_LABELS: Record<DonationStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  picked_up: "Picked up",
  cancelled: "Cancelled",
};

const CLAIM_STYLES: Record<ClaimStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-200 text-gray-600",
  completed: "bg-blue-100 text-blue-800",
};

const CLAIM_LABELS: Record<ClaimStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
  completed: "Completed",
};

export function DonationStatusBadge({ status }: { status: DonationStatus }) {
  return <span className={`badge ${DONATION_STYLES[status]}`}>{DONATION_LABELS[status]}</span>;
}

export function ClaimStatusBadge({ status }: { status: ClaimStatus }) {
  return <span className={`badge ${CLAIM_STYLES[status]}`}>{CLAIM_LABELS[status]}</span>;
}
