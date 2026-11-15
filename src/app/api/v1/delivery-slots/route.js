import { NextResponse } from "next/server";
import { db, databaseConfigured } from "@/server/db";
import { isRazorpayReady } from "@/server/payments";
import { getDeliveryMode, getDemoDeliverySlots, isValidIndianPinCode } from "@/lib/delivery-slots";

export async function GET(request) {
  const postalCode = new URL(request.url).searchParams.get("postalCode") || "";
  const mode = getDeliveryMode({
    databaseConfigured,
    nodeEnv: process.env.NODE_ENV,
    localDemoEnabled: process.env.CUT_CATCH_LOCAL_DEMO === "true",
    host: request.headers.get("host"),
  });
  const pinValid = isValidIndianPinCode(postalCode);
  if (!pinValid) return NextResponse.json({ mode, slots: [], pinValid: false, razorpayAvailable: mode === "database" && isRazorpayReady() });
  if (mode === "demo") return NextResponse.json({ mode, slots: getDemoDeliverySlots(postalCode), pinValid: true, razorpayAvailable: false });
  if (mode === "unavailable") return NextResponse.json({ mode, slots: [], pinValid: true, razorpayAvailable: false });
  try {
    const slots = await db.$queryRaw`SELECT "id", "startsAt", "endsAt", "capacity", "reservedCount", "areaCode" FROM "DeliverySlot" WHERE "areaCode" = ${postalCode} AND "active" = true AND "startsAt" > NOW() AND "reservedCount" < "capacity" ORDER BY "startsAt" ASC LIMIT 12`;
    return NextResponse.json({ mode: "database", slots, pinValid: true, razorpayAvailable: isRazorpayReady() });
  } catch { return NextResponse.json({ error: "delivery_slots_unavailable" }, { status: 503 }); }
}
