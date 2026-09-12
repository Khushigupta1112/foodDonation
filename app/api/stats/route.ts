import { NextResponse } from "next/server";
import { getStats } from "@/lib/donations";

export async function GET() {
  return NextResponse.json({ stats: getStats() });
}
