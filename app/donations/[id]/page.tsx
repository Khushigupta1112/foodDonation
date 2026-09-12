import { notFound } from "next/navigation";
import DonationActions from "@/components/DonationActions";
import { formatDateTime, timeAgo } from "@/components/DonationCard";
import { DonationStatusBadge } from "@/components/StatusBadge";
import { getCurrentUser } from "@/lib/auth";
import { getActiveClaim, getDonation, getDonationClaims } from "@/lib/donations";
import { CATEGORY_LABELS } from "@/lib/types";
import type { Claim } from "@/lib/types";

export default async function DonationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) notFound();

  const donation = await getDonation(donationId);
  if (!donation) notFound();

  const viewer = await getCurrentUser();
  const isDonor = viewer?.id === donation.donor_id;
  const [claims, viewerClaim] = await Promise.all([
    isDonor ? getDonationClaims(donationId) : Promise.resolve<Claim[]>([]),
    viewer && viewer.role === "claimer"
      ? getActiveClaim(donationId, viewer.id)
      : Promise.resolve(null),
  ]);

  const expired = donation.expiry_at <= new Date().toISOString();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <a href="/browse" className="text-sm font-medium text-brand hover:underline">
        ← Back to browse
      </a>

      <div className="card mt-4 overflow-hidden">
        {donation.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={donation.image_url} alt={donation.title} className="h-64 w-full object-cover" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-brand-light text-6xl">🍱</div>
        )}
        <div className="p-6">
          <div className="flex flex-wrap items-center gap-3">
            <DonationStatusBadge status={donation.status} />
            <span className="badge bg-gray-100 text-gray-700">{CATEGORY_LABELS[donation.category]}</span>
            {donation.is_veg === 1 && <span className="badge bg-green-100 text-green-700">🌱 Vegetarian</span>}
            {expired && <span className="badge bg-red-100 text-red-700">⏰ Best-before passed</span>}
          </div>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">{donation.title}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Posted by {donation.donor_org ?? donation.donor_name} · {timeAgo(donation.created_at)}
          </p>
          {donation.description && (
            <p className="mt-4 whitespace-pre-line text-gray-700">{donation.description}</p>
          )}

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["Quantity", donation.quantity],
              ["Servings", `${donation.servings}`],
              ["Best before", formatDateTime(donation.expiry_at)],
              ["Pickup window", donation.pickup_window],
              ["Pickup address", donation.address],
              ["City", donation.city],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-gray-50 p-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
                <dd className="mt-1 text-sm font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <DonationActions
        donation={donation}
        claims={claims}
        viewer={viewer}
        viewerClaim={viewerClaim}
      />
    </div>
  );
}
