import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db, databaseConfigured } from "@/server/db";
import { expireAwaitingPayments } from "@/server/payment-lifecycle";

export const runtime = "nodejs";

function authorized(request) {
  const expected = process.env.PAYMENT_CLEANUP_SECRET || "";
  const received = request.headers.get("authorization") || "";
  const supplied = received.startsWith("Bearer ") ? received.slice(7) : "";
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  try {
    const expired = await expireAwaitingPayments(db);
    const oldRateLimitRows = await db.rateLimitBucket.deleteMany({ where: { windowStartedAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } } });
    return NextResponse.json({ expired, rateLimitBucketsPruned: oldRateLimitRows.count });
  } catch {
    return NextResponse.json({ error: "payment_expiry_failed" }, { status: 503 });
  }
}
