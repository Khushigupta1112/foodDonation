import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { approveClaim, cancelClaim, completeClaim, rejectClaim } from "@/lib/donations";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claimId = Number(id);
  if (!Number.isInteger(claimId)) {
    return NextResponse.json({ error: "Invalid claim id." }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = body.action;
  let claim = null;
  if (action === "approve") claim = await approveClaim(claimId, user.id);
  else if (action === "reject") claim = await rejectClaim(claimId, user.id);
  else if (action === "complete") claim = await completeClaim(claimId, user.id);
  else if (action === "cancel") claim = await cancelClaim(claimId, user.id);
  else return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  if (!claim) {
    return NextResponse.json({ error: "This action is not allowed for this claim." }, { status: 409 });
  }
  return NextResponse.json({ claim });
}
