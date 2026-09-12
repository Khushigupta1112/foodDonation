import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClaim, getDonation, getDonationClaims } from "@/lib/donations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) {
    return NextResponse.json({ error: "Invalid donation id." }, { status: 400 });
  }

  const user = await getCurrentUser();
  const donation = await getDonation(donationId);
  if (!donation) return NextResponse.json({ error: "Donation not found." }, { status: 404 });
  if (!user || user.id !== donation.donor_id) {
    return NextResponse.json({ error: "Only the donor can view claims." }, { status: 403 });
  }
  return NextResponse.json({ claims: await getDonationClaims(donationId) });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) {
    return NextResponse.json({ error: "Invalid donation id." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  if (user.role !== "claimer") {
    return NextResponse.json({ error: "Only claimer accounts can request food." }, { status: 403 });
  }

  let message: string | null = null;
  try {
    const body = (await request.json()) as { message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) {
      message = body.message.trim().slice(0, 500);
    }
  } catch {
    message = null;
  }

  const claim = await createClaim(donationId, user.id, message);
  if (!claim) {
    return NextResponse.json(
      { error: "This donation is no longer available, or you already have an active claim on it." },
      { status: 409 }
    );
  }
  return NextResponse.json({ claim }, { status: 201 });
}
