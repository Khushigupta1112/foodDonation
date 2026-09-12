"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const defaultRole = searchParams.get("role") === "claimer" ? "claimer" : "donor";

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-6">
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {mode === "register" && (
        <>
          <div>
            <span className="label">I want to…</span>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 p-3 text-sm has-checked:border-brand has-checked:bg-brand-light">
                <input type="radio" name="role" value="donor" defaultChecked={defaultRole === "donor"} className="accent-green-700" />
                🍽️ Donate food
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 p-3 text-sm has-checked:border-brand has-checked:bg-brand-light">
                <input type="radio" name="role" value="claimer" defaultChecked={defaultRole === "claimer"} className="accent-green-700" />
                🤝 Claim food
              </label>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="name">Full name *</label>
            <input id="name" name="name" required minLength={2} maxLength={80} className="input" placeholder="Khushi Gupta" />
          </div>
        </>
      )}

      <div>
        <label className="label" htmlFor="email">Email *</label>
        <input id="email" name="email" type="email" required className="input" placeholder="you@example.com" />
      </div>

      <div>
        <label className="label" htmlFor="password">Password *</label>
        <input id="password" name="password" type="password" required minLength={8} className="input"
          placeholder={mode === "register" ? "At least 8 characters" : "Your password"} />
      </div>

      {mode === "register" && (
        <>
          <div>
            <label className="label" htmlFor="org_name">Organisation (optional)</label>
            <input id="org_name" name="org_name" maxLength={120} className="input"
              placeholder="e.g. Robin Hood Army, Hotel Green Leaf" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone (optional)</label>
            <input id="phone" name="phone" maxLength={20} className="input" placeholder="+91 …" />
          </div>
        </>
      )}

      <button type="submit" disabled={busy} className="btn-primary w-full py-3">
        {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>

      <p className="text-center text-sm text-gray-600">
        {mode === "login" ? (
          <>
            New here?{" "}
            <Link href="/register" className="font-semibold text-brand hover:underline">
              Create an account
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Log in
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
