import Link from "next/link";
import { redirect } from "next/navigation";
import { ClaimStatusBadge, DonationStatusBadge } from "@/components/StatusBadge";
import { timeAgo } from "@/components/DonationCard";
import { getCurrentUser } from "@/lib/auth";
import {
  countPendingClaims,
  getStats,
  listClaimsByClaimer,
  listDonationsByDonor,
} from "@/lib/donations";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");

  const isDonor = user.role === "donor";
  const [donations, claims, stats, pendingCounts] = await Promise.all([
    isDonor ? listDonationsByDonor(user.id) : Promise.resolve([]),
    isDonor ? Promise.resolve([]) : listClaimsByClaimer(user.id),
    getStats(),
    isDonor
      ? listDonationsByDonor(user.id).then((ds) =>
          Promise.all(ds.map((d) => countPendingClaims(d.id)))
        )
      : Promise.resolve<number[]>([]),
  ]);
  const totalPending = pendingCounts.reduce((n, c) => n + c, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isDonor ? "Donor dashboard" : "Claimer dashboard"}
          </h1>
          <p className="mt-1 text-gray-600">
            Hi {user.name}{user.org_name ? ` (${user.org_name})` : ""} — thanks for fighting food waste. 💚
          </p>
        </div>
        {isDonor ? (
          <Link href="/donate" className="btn-primary">
            + Post new donation
          </Link>
        ) : (
          <Link href="/browse" className="btn-primary">
            Browse available food
          </Link>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {isDonor ? (
          <>
            <Stat label="Your donations" value={donations.length} />
            <Stat label="Awaiting approval" value={totalPending} />
            <Stat label="Meals rescued by you" value={donations.filter((d) => d.status === "picked_up").reduce((n, d) => n + d.servings, 0)} />
            <Stat label="Meals rescued platform-wide" value={stats.total_saved} />
          </>
        ) : (
          <>
            <Stat label="Your claims" value={claims.length} />
            <Stat label="Active" value={claims.filter((c) => c.status === "pending" || c.status === "approved").length} />
            <Stat label="Completed pickups" value={claims.filter((c) => c.status === "completed").length} />
            <Stat label="Meals rescued platform-wide" value={stats.total_saved} />
          </>
        )}
      </div>

      {isDonor ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">Your donations</h2>
          {donations.length === 0 ? (
            <EmptyState
              text="You haven't posted any donations yet."
              cta="Post your first donation"
              href="/donate"
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {donations.map((d, i) => {
                const pending = pendingCounts[i] ?? 0;
                return (
                  <li key={d.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link href={`/donations/${d.id}`} className="font-semibold text-gray-900 hover:text-brand">
                          {d.title}
                        </Link>
                        <DonationStatusBadge status={d.status} />
                        {pending > 0 && d.status === "available" && (
                          <span className="badge bg-amber-100 text-amber-800">
                            {pending} request{pending === 1 ? "" : "s"} waiting
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-500">
                        📍 {d.city} · 🍱 {d.servings} servings · posted {timeAgo(d.created_at)}
                      </div>
                    </div>
                    <Link href={`/donations/${d.id}`} className="btn-secondary shrink-0">
                      Manage
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-gray-900">Your pickup requests</h2>
          {claims.length === 0 ? (
            <EmptyState
              text="You haven't claimed any food yet."
              cta="Find food nearby"
              href="/browse"
            />
          ) : (
            <ul className="mt-4 space-y-3">
              {claims.map((c) => (
                <li key={c.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/donations/${c.donation_id}`} className="font-semibold text-gray-900 hover:text-brand">
                        {c.donation_title}
                      </Link>
                      <ClaimStatusBadge status={c.status} />
                      <DonationStatusBadge status={c.donation_status} />
                    </div>
                    <div className="mt-1 text-sm text-gray-500">
                      requested {timeAgo(c.created_at)} · {c.donation_status === "picked_up" ? "picked up ✅" : c.donation_status === "reserved" ? "awaiting your pickup" : ""}
                    </div>
                  </div>
                  <Link href={`/donations/${c.donation_id}`} className="btn-secondary shrink-0">
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold text-brand-dark">{value}</div>
      <div className="mt-0.5 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function EmptyState({ text, cta, href }: { text: string; cta: string; href: string }) {
  return (
    <div className="card mt-4 p-10 text-center text-gray-500">
      {text}{" "}
      <Link href={href} className="font-semibold text-brand hover:underline">
        {cta} →
      </Link>
    </div>
  );
}
