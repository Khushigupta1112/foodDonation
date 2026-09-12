import { CATEGORY_LABELS } from "@/lib/types";
import type { Donation } from "@/lib/types";
import { DonationStatusBadge } from "./StatusBadge";

const CATEGORY_EMOJI: Record<string, string> = {
  cooked_meal: "🍛",
  bakery: "🥖",
  produce: "🥬",
  packaged: "🥫",
  dairy: "🥛",
  beverage: "🧃",
  other: "🍽️",
};

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function DonationCard({ donation }: { donation: Donation }) {
  return (
    <a
      href={`/donations/${donation.id}`}
      className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md"
    >
      {donation.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={donation.image_url}
          alt={donation.title}
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="flex h-40 w-full items-center justify-center bg-brand-light text-5xl">
          {CATEGORY_EMOJI[donation.category] ?? "🍽️"}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 group-hover:text-brand">
            {donation.title}
          </h3>
          <DonationStatusBadge status={donation.status} />
        </div>
        <p className="line-clamp-2 text-sm text-gray-600">{donation.description}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 text-xs text-gray-500">
          <span className="rounded-full bg-gray-100 px-2 py-1">
            {CATEGORY_LABELS[donation.category]}
          </span>
          <span className="rounded-full bg-gray-100 px-2 py-1">📍 {donation.city}</span>
          <span className="rounded-full bg-gray-100 px-2 py-1">🍱 {donation.servings} servings</span>
          {donation.is_veg === 1 && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-green-700">🌱 Veg</span>
          )}
        </div>
        <div className="text-xs text-gray-400">
          {donation.donor_org ?? donation.donor_name} · {timeAgo(donation.created_at)}
        </div>
      </div>
    </a>
  );
}
