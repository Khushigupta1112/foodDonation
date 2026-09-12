import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createDonation, listDonations } from "@/lib/donations";
import { CATEGORY_LABELS } from "@/lib/types";
import type { FoodCategory } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const donations = listDonations({
    q: url.searchParams.get("q")?.trim() || undefined,
    city: url.searchParams.get("city")?.trim() || undefined,
    category: url.searchParams.get("category")?.trim() || undefined,
    vegOnly: url.searchParams.get("veg") === "1",
  });
  return NextResponse.json({ donations });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "You must be logged in." }, { status: 401 });
  if (user.role !== "donor") {
    return NextResponse.json({ error: "Only donor accounts can post donations." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const title = str(body.title);
  const description = str(body.description);
  const category = str(body.category) as FoodCategory;
  const quantity = str(body.quantity);
  const servings = Number(body.servings);
  const expiryAt = str(body.expiry_at);
  const pickupWindow = str(body.pickup_window);
  const address = str(body.address);
  const city = str(body.city);
  const imageUrl = str(body.image_url) || null;

  if (title.length < 3 || title.length > 120) {
    return NextResponse.json({ error: "Title must be 3-120 characters." }, { status: 400 });
  }
  if (description.length > 1000) {
    return NextResponse.json({ error: "Description must be at most 1000 characters." }, { status: 400 });
  }
  if (!(category in CATEGORY_LABELS)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  if (quantity.length < 1 || quantity.length > 80) {
    return NextResponse.json({ error: "Quantity must be 1-80 characters." }, { status: 400 });
  }
  if (!Number.isInteger(servings) || servings < 1 || servings > 10000) {
    return NextResponse.json({ error: "Servings must be a whole number between 1 and 10000." }, { status: 400 });
  }
  const expiry = new Date(expiryAt);
  if (!expiryAt || Number.isNaN(expiry.getTime()) || expiry.getTime() <= Date.now()) {
    return NextResponse.json({ error: "Best-before must be a future date and time." }, { status: 400 });
  }
  if (pickupWindow.length < 1 || pickupWindow.length > 120) {
    return NextResponse.json({ error: "Pickup window must be 1-120 characters." }, { status: 400 });
  }
  if (address.length < 5 || address.length > 200) {
    return NextResponse.json({ error: "Pickup address must be 5-200 characters." }, { status: 400 });
  }
  if (city.length < 2 || city.length > 80) {
    return NextResponse.json({ error: "City must be 2-80 characters." }, { status: 400 });
  }
  if (imageUrl && !/^https:\/\/\S+$/.test(imageUrl)) {
    return NextResponse.json({ error: "Image URL must be a valid https URL." }, { status: 400 });
  }

  const donation = createDonation({
    donorId: user.id,
    title,
    description,
    category,
    quantity,
    servings,
    isVeg: body.is_veg === true || body.is_veg === "true" || body.is_veg === 1,
    expiryAt: expiry.toISOString(),
    pickupWindow,
    address,
    city,
    imageUrl,
  });

  return NextResponse.json({ donation }, { status: 201 });
}
