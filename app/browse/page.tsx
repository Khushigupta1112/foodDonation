import Link from "next/link";
import { DonationCard } from "@/components/DonationCard";
import { listAllCities, listDonations } from "@/lib/donations";
import { CATEGORY_LABELS } from "@/lib/types";

export const metadata = { title: "Browse donations" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BrowsePage({ searchParams }: Props) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";

  const q = one(sp.q);
  const city = one(sp.city);
  const category = one(sp.category);
  const vegOnly = one(sp.veg) === "1";

  const [donations, cities] = await Promise.all([
    listDonations({ q, city, category, vegOnly }),
    listAllCities(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900">Browse available food</h1>
      <p className="mt-1 text-gray-600">
        {donations.length} live donation{donations.length === 1 ? "" : "s"} waiting to be claimed.
      </p>

      <form className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5" action="/browse">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search food…"
          className="input lg:col-span-2"
        />
        <select name="city" defaultValue={city} className="input">
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={category} className="input">
          <option value="">All categories</option>
          {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="veg" value="1" defaultChecked={vegOnly} className="size-4 accent-green-700" />
            Veg only
          </label>
          <button type="submit" className="btn-primary flex-1">
            Filter
          </button>
        </div>
      </form>

      {donations.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-gray-500">
          Nothing matches your filters yet. Try widening the search — or{" "}
          <Link href="/donate" className="font-semibold text-brand hover:underline">
            post a donation
          </Link>{" "}
          if you have food to share.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {donations.map((d) => (
            <DonationCard key={d.id} donation={d} />
          ))}
        </div>
      )}
    </div>
  );
}
