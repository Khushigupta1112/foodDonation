import Link from "next/link";
import { DonationCard } from "@/components/DonationCard";
import { getCurrentUser } from "@/lib/auth";
import { getStats, listDonations } from "@/lib/donations";

export default async function HomePage() {
  const [user, stats, recent] = await Promise.all([
    getCurrentUser(),
    getStats(),
    listDonations(),
  ]);

  return (
    <div>
      <section className="bg-gradient-to-b from-brand-light/60 to-transparent">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-2xl">
            <p className="mb-3 inline-block rounded-full bg-brand-light px-3 py-1 text-xs font-semibold text-brand-dark">
              🌱 Every plate rescued counts
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Good food shouldn&apos;t end up in the bin.
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              FoodShare connects restaurants, caterers, weddings and households that have extra
              food with NGOs, shelters and volunteers who can pick it up — while it&apos;s still
              good to eat.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user?.role === "donor" ? (
                <Link href="/donate" className="btn-primary px-6 py-3 text-base">
                  Donate surplus food
                </Link>
              ) : (
                <Link href="/register?role=donor" className="btn-primary px-6 py-3 text-base">
                  Donate surplus food
                </Link>
              )}
              <Link href="/browse" className="btn-secondary px-6 py-3 text-base">
                Find food nearby
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Meals rescued", value: stats.total_saved, emoji: "🍱" },
            { label: "Live donations", value: stats.active_donations, emoji: "🟢" },
            { label: "CO₂ saved (kg)", value: stats.co2_saved_kg, emoji: "🌍" },
            { label: "Claimers on board", value: stats.ngos, emoji: "🤝" },
          ].map((s) => (
            <div key={s.label} className="card p-6 text-center">
              <div className="text-3xl">{s.emoji}</div>
              <div className="mt-2 text-3xl font-bold text-brand-dark">{s.value}</div>
              <div className="mt-1 text-sm text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900">How it works</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            {
              step: "1",
              title: "Post the surplus",
              text: "Donors list what they have: quantity, servings, best-before time and pickup address.",
              emoji: "📸",
            },
            {
              step: "2",
              title: "Get claimed",
              text: "Nearby NGOs and volunteers browse live listings and request a pickup.",
              emoji: "🤝",
            },
            {
              step: "3",
              title: "Approve & hand over",
              text: "The donor approves one claim, they coordinate pickup, and the meal is rescued.",
              emoji: "✅",
            },
          ].map((s) => (
            <div key={s.step} className="card p-6">
              <div className="text-3xl">{s.emoji}</div>
              <h3 className="mt-3 font-semibold text-gray-900">
                {s.step}. {s.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 pb-16">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Fresh donations</h2>
          <Link href="/browse" className="text-sm font-semibold text-brand hover:underline">
            View all →
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card mt-6 p-10 text-center text-gray-500">
            No live donations right now. Be the first to{" "}
            <Link href="/donate" className="font-semibold text-brand hover:underline">
              share food
            </Link>
            .
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(0, 6).map((d) => (
              <DonationCard key={d.id} donation={d} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
