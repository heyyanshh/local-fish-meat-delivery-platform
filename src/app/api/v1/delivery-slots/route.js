import { NextResponse } from "next/server";
import { db, databaseConfigured } from "@/server/db";
import { isRazorpayReady } from "@/server/payments";

export async function GET(request) {
  if (!databaseConfigured) return NextResponse.json({ mode: "demo", slots: [], razorpayAvailable: false });
  const postalCode = new URL(request.url).searchParams.get("postalCode") || "";
  if (!/^\d{6}$/.test(postalCode)) return NextResponse.json({ mode: "database", slots: [], razorpayAvailable: isRazorpayReady() });
  try {
    const slots = await db.$queryRaw`SELECT "id", "startsAt", "endsAt", "capacity", "reservedCount", "areaCode" FROM "DeliverySlot" WHERE "areaCode" = ${postalCode} AND "active" = true AND "startsAt" > NOW() AND "reservedCount" < "capacity" ORDER BY "startsAt" ASC LIMIT 12`;
    return NextResponse.json({ mode: "database", slots, razorpayAvailable: isRazorpayReady() });
  } catch { return NextResponse.json({ error: "delivery_slots_unavailable" }, { status: 503 }); }
}
