"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORY_LABELS } from "@/lib/types";

const CATEGORIES = Object.entries(CATEGORY_LABELS);

export default function NewDonationForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = {
      title: form.get("title"),
      description: form.get("description"),
      category: form.get("category"),
      quantity: form.get("quantity"),
      servings: Number(form.get("servings")),
      is_veg: form.get("is_veg") === "on",
      expiry_at: form.get("expiry_at"),
      pickup_window: form.get("pickup_window"),
      address: form.get("address"),
      city: form.get("city"),
      image_url: form.get("image_url"),
    };
    try {
      const res = await fetch("/api/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not post donation.");
      router.push(`/donations/${data.donation.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-5 p-6 sm:grid-cols-2">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}

      <div className="sm:col-span-2">
        <label className="label" htmlFor="title">What food is it? *</label>
        <input id="title" name="title" required minLength={3} maxLength={120}
          placeholder="e.g. Fresh paneer tikka trays from evening buffet"
          className="input" />
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="description">Description</label>
        <textarea id="description" name="description" rows={3} maxLength={1000}
          placeholder="Allergens, packaging, storage notes…"
          className="input" />
      </div>

      <div>
        <label className="label" htmlFor="category">Category *</label>
        <select id="category" name="category" required defaultValue="cooked_meal" className="input">
          {CATEGORIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="label" htmlFor="quantity">Quantity *</label>
        <input id="quantity" name="quantity" required maxLength={80}
          placeholder="e.g. 4 trays, ~40 pieces" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="servings">Servings (people it can feed) *</label>
        <input id="servings" name="servings" type="number" required min={1} max={10000}
          defaultValue={10} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="expiry_at">Best before *</label>
        <input id="expiry_at" name="expiry_at" type="datetime-local" required className="input" />
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="pickup_window">Pickup window *</label>
        <input id="pickup_window" name="pickup_window" required maxLength={120}
          placeholder="e.g. Today 6:00 PM – 9:00 PM" className="input" />
      </div>

      <div className="sm:col-span-2">
        <label className="label" htmlFor="address">Pickup address *</label>
        <input id="address" name="address" required minLength={5} maxLength={200}
          placeholder="Street, area, landmark" className="input" />
      </div>

      <div>
        <label className="label" htmlFor="city">City *</label>
        <input id="city" name="city" required minLength={2} maxLength={80} className="input" />
      </div>

      <div>
        <label className="label" htmlFor="image_url">Photo URL (optional)</label>
        <input id="image_url" name="image_url" type="url"
          placeholder="https://…" className="input" />
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 sm:col-span-2">
        <input type="checkbox" name="is_veg" className="size-4 accent-green-700" defaultChecked />
        This food is vegetarian 🌱
      </label>

      <div className="sm:col-span-2">
        <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
          {busy ? "Posting…" : "Post donation"}
        </button>
      </div>
    </form>
  );
}
