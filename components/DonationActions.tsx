"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClaimStatusBadge } from "@/components/StatusBadge";
import { formatDateTime, timeAgo } from "@/components/DonationCard";
import type { Claim, Donation, User } from "@/lib/types";

async function patchClaim(claimId: number, action: string) {
  const res = await fetch(`/api/claims/${claimId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Something went wrong.");
  }
}

export default function DonationActions({
  donation,
  claims,
  viewer,
  viewerClaim,
}: {
  donation: Donation;
  claims: Claim[];
  viewer: User | null;
  viewerClaim: Claim | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showClaimForm, setShowClaimForm] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function requireLogin(role: "donor" | "claimer") {
    router.push(`/register?role=${role}&next=/donations/${donation.id}`);
  }

  const isDonor = viewer?.id === donation.donor_id;
  const isClaimer = viewer?.role === "claimer";

  if (!viewer) {
    return (
      <div className="card mt-8 p-6">
        <h2 className="font-semibold text-gray-900">Want this food?</h2>
        <p className="mt-1 text-sm text-gray-600">
          Log in or create a free claimer account to request a pickup.
        </p>
        <div className="mt-4 flex gap-3">
          <button onClick={() => requireLogin("claimer")} className="btn-primary">
            Sign up to claim
          </button>
          <button onClick={() => router.push(`/login?next=/donations/${donation.id}`)} className="btn-secondary">
            Log in
          </button>
        </div>
      </div>
    );
  }

  if (isDonor) {
    const pending = claims.filter((c) => c.status === "pending");
    const approved = claims.find((c) => c.status === "approved");
    const past = claims.filter((c) => !["pending", "approved"].includes(c.status));

    return (
      <div className="card mt-8 p-6">
        <h2 className="font-semibold text-gray-900">Manage your donation</h2>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {donation.status === "available" && (
          <div className="mt-4">
            {pending.length === 0 ? (
              <p className="text-sm text-gray-500">
                No pickup requests yet. You&apos;ll see them here as soon as someone claims.
              </p>
            ) : (
              <ul className="divide-y divide-black/5">
                {pending.map((c) => (
                  <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {c.claimer_org ?? c.claimer_name}{" "}
                        <span className="text-xs font-normal text-gray-400">
                          · {timeAgo(c.created_at)}
                        </span>
                      </div>
                      {c.claimer_phone && (
                        <div className="text-sm text-gray-500">📞 {c.claimer_phone}</div>
                      )}
                      {c.message && <div className="mt-1 text-sm text-gray-600">“{c.message}”</div>}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        disabled={busy}
                        onClick={() => run(() => patchClaim(c.id, "approve"))}
                        className="btn-primary"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => run(() => patchClaim(c.id, "reject"))}
                        className="btn-danger"
                      >
                        Reject
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {approved && (
          <div className="mt-4 rounded-xl bg-green-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-green-900">
                  Reserved for {approved.claimer_org ?? approved.claimer_name}
                </p>
                {approved.claimer_phone && (
                  <p className="text-sm text-green-800">📞 {approved.claimer_phone}</p>
                )}
              </div>
              <button
                disabled={busy}
                onClick={() => run(() => patchClaim(approved.id, "complete"))}
                className="btn-primary"
              >
                Mark as picked up
              </button>
            </div>
          </div>
        )}

        {past.length > 0 && (
          <details className="mt-4 text-sm text-gray-600">
            <summary className="cursor-pointer font-medium">Past requests ({past.length})</summary>
            <ul className="mt-2 space-y-2">
              {past.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>
                    {c.claimer_org ?? c.claimer_name} · {formatDateTime(c.created_at)}
                  </span>
                  <ClaimStatusBadge status={c.status} />
                </li>
              ))}
            </ul>
          </details>
        )}

        {(donation.status === "available" || donation.status === "reserved") && (
          <button
            disabled={busy}
            onClick={() => run(async () => {
              const res = await fetch(`/api/donations/${donation.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "cancel" }),
              });
              if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                throw new Error(data.error || "Could not cancel.");
              }
            })}
            className="btn-danger mt-6"
          >
            Cancel donation
          </button>
        )}
      </div>
    );
  }

  if (isClaimer) {
    if (viewerClaim) {
      return (
        <div className="card mt-8 p-6">
          <h2 className="font-semibold text-gray-900">Your pickup request</h2>
          <div className="mt-3 flex items-center gap-3">
            <ClaimStatusBadge status={viewerClaim.status} />
            <span className="text-sm text-gray-500">requested {timeAgo(viewerClaim.created_at)}</span>
          </div>
          {viewerClaim.status === "approved" && (
            <p className="mt-3 rounded-xl bg-green-50 p-3 text-sm text-green-800">
              🎉 Approved! Coordinate the pickup with the donor at{" "}
              <strong>{donation.address}</strong> during <strong>{donation.pickup_window}</strong>.
            </p>
          )}
          {viewerClaim.status === "pending" && (
            <p className="mt-3 text-sm text-gray-600">
              Waiting for the donor to approve your request.
            </p>
          )}
          {(viewerClaim.status === "pending" || viewerClaim.status === "approved") && (
            <button
              disabled={busy}
              onClick={() => run(() => patchClaim(viewerClaim.id, "cancel"))}
              className="btn-danger mt-4"
            >
              Cancel request
            </button>
          )}
        </div>
      );
    }

    if (donation.status !== "available") {
      return (
        <div className="card mt-8 p-6 text-sm text-gray-600">
          This donation is no longer accepting requests.
        </div>
      );
    }

    return (
      <div className="card mt-8 p-6">
        <h2 className="font-semibold text-gray-900">Request a pickup</h2>
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {!showClaimForm ? (
          <>
            <p className="mt-1 text-sm text-gray-600">
              Tell the donor who you are and when you can pick up.
            </p>
            <button onClick={() => setShowClaimForm(true)} className="btn-primary mt-4">
              Claim this food
            </button>
          </>
        ) : (
          <div className="mt-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="e.g. We're an NGO with 2 volunteers, can pick up at 6:30 PM."
              className="input"
            />
            <div className="mt-3 flex gap-2">
              <button
                disabled={busy}
                onClick={() =>
                  run(async () => {
                    const res = await fetch(`/api/donations/${donation.id}/claims`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ message }),
                    });
                    if (!res.ok) {
                      const data = await res.json().catch(() => ({}));
                      throw new Error(data.error || "Could not submit claim.");
                    }
                    setShowClaimForm(false);
                  })
                }
                className="btn-primary"
              >
                {busy ? "Sending…" : "Send request"}
              </button>
              <button onClick={() => setShowClaimForm(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="card mt-8 p-6 text-sm text-gray-600">
      You&apos;re signed in as a <strong>donor</strong>. Donor accounts post food — claimer
      accounts (NGOs, volunteers) request pickups.
    </div>
  );
}
