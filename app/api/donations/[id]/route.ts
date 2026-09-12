import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cancelDonation, getDonation, getDonationClaims } from "@/lib/donations";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) {
    return NextResponse.json({ error: "Invalid donation id." }, { status: 400 });
  }
  const donation = getDonation(donationId);
  if (!donation) return NextResponse.json({ error: "Donation not found." }, { status: 404 });

  const user = await getCurrentUser();
  const isDonor = user?.id === donation.donor_id;
  return NextResponse.json({
    donation,
    claims: isDonor ? getDonationClaims(donationId) : undefined,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donationId = Number(id);
  if (!Number.isInteger(donationId)) {
    return NextResponse.json({ error: "Invalid donation id." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }

  const donation = cancelDonation(donationId, user.id);
  if (!donation) {
    return NextResponse.json({ error: "Donation cannot be cancelled." }, { status: 409 });
  }
  return NextResponse.json({ donation });
}
