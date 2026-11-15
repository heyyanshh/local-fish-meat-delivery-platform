import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db, databaseConfigured } from "@/server/db";
import { fetchRazorpayPayment, getRazorpayConfig, verifyPaymentSignature } from "@/server/payments";
import { markPaymentCaptured } from "@/server/payment-lifecycle";

const schema = z.object({
  orderId: z.string().min(1).max(80),
  razorpay_order_id: z.string().min(1).max(80),
  razorpay_payment_id: z.string().min(1).max(80),
  razorpay_signature: z.string().regex(/^[a-f\d]{64}$/i),
});

export async function POST(request) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_payment_verification" }, { status: 400 });
  const input = parsed.data;
  const order = await db.order.findFirst({ where: { id: input.orderId, userId: session.user.id, paymentMethod: "RAZORPAY" } });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  if (order.paymentProviderOrderId !== input.razorpay_order_id) return NextResponse.json({ error: "payment_order_mismatch" }, { status: 400 });
  const { keySecret } = getRazorpayConfig();
  if (!verifyPaymentSignature({ orderId: order.paymentProviderOrderId, paymentId: input.razorpay_payment_id, signature: input.razorpay_signature, secret: keySecret })) {
    return NextResponse.json({ error: "invalid_payment_signature" }, { status: 400 });
  }

  try {
    const payment = await fetchRazorpayPayment(input.razorpay_payment_id);
    if (payment.order_id !== order.paymentProviderOrderId || payment.amount !== order.totalPaise || payment.currency !== "INR") {
      return NextResponse.json({ error: "payment_details_mismatch" }, { status: 400 });
    }
    if (!["captured", "authorized", "failed"].includes(payment.status)) return NextResponse.json({ status: "pending" }, { status: 202 });
    const result = await db.$transaction(async (tx) => {
      const current = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
      if (!current) throw new Error("order_not_found");
      if (payment.status === "captured") {
        return markPaymentCaptured(tx, current, { paymentId: payment.id, actorId: session.user.id });
      }
      if (payment.status === "authorized") {
        if (current.status === "AWAITING_PAYMENT" && current.paymentStatus !== "PAID") {
          await tx.order.update({ where: { id: current.id }, data: { paymentStatus: "AUTHORIZED", paymentProviderPaymentId: payment.id, paymentFailureCode: null } });
        }
        return { changed: false, late: false };
      }
      if (current.status === "AWAITING_PAYMENT" && current.paymentStatus !== "PAID") {
        await tx.order.update({ where: { id: current.id }, data: { paymentStatus: "FAILED", paymentProviderPaymentId: payment.id, paymentFailureCode: payment.error_code || "payment_failed" } });
      }
      return { changed: false, late: false };
    }, { isolationLevel: "Serializable" });
    const updated = await db.order.findUnique({ where: { id: order.id }, select: { id: true, status: true, paymentStatus: true, paymentFailureCode: true } });
    return NextResponse.json({ order: updated, reviewRequired: result.late });
  } catch {
    return NextResponse.json({ error: "payment_verification_unavailable" }, { status: 503 });
  }
}
