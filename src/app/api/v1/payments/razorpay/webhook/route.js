import { NextResponse } from "next/server";
import { db, databaseConfigured } from "@/server/db";
import { getRazorpayConfig, verifyWebhookSignature } from "@/server/payments";
import { markPaymentCaptured } from "@/server/payment-lifecycle";

export async function POST(request) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const rawBody = await request.text();
  if (rawBody.length > 1_000_000) return NextResponse.json({ error: "webhook_payload_too_large" }, { status: 413 });
  const signature = request.headers.get("x-razorpay-signature") || "";
  const eventId = request.headers.get("x-razorpay-event-id") || "";
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) return NextResponse.json({ error: "webhook_not_configured" }, { status: 503 });
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(eventId) || !verifyWebhookSignature({ rawBody, signature, secret: webhookSecret })) {
    return NextResponse.json({ error: "invalid_webhook_signature" }, { status: 400 });
  }
  let payload;
  try { payload = JSON.parse(rawBody); } catch { return NextResponse.json({ error: "invalid_webhook_payload" }, { status: 400 }); }

  const eventType = typeof payload.event === "string" ? payload.event.slice(0, 100) : "unknown";
  const payment = payload.payload?.payment?.entity;
  const refund = payload.payload?.refund?.entity;
  if (["payment.authorized", "payment.captured", "payment.failed"].includes(eventType) && (!payment?.id || !payment?.order_id)) return NextResponse.json({ error: "invalid_payment_event" }, { status: 400 });
  if (["refund.created", "refund.processed", "refund.failed"].includes(eventType) && (!refund?.id || !refund?.payment_id)) return NextResponse.json({ error: "invalid_refund_event" }, { status: 400 });
  const providerOrderId = payment?.order_id;
  const providerPaymentId = payment?.id || refund?.payment_id;
  const order = providerOrderId
    ? await db.order.findFirst({ where: { paymentProviderOrderId: providerOrderId } })
    : providerPaymentId ? await db.order.findFirst({ where: { paymentProviderPaymentId: providerPaymentId } }) : null;

  try {
    await db.$transaction(async (tx) => {
      await tx.paymentEvent.create({ data: { provider: "RAZORPAY", eventId, eventType, orderId: order?.id || null } });
      if (!order) return;

      if (["payment.authorized", "payment.captured", "payment.failed"].includes(eventType)) {
        if (payment.amount !== order.totalPaise || payment.currency !== "INR") throw new Error("payment_details_mismatch");
        const current = await tx.order.findUnique({ where: { id: order.id }, include: { items: true } });
        if (!current) return;
        if (eventType === "payment.captured") {
          await markPaymentCaptured(tx, current, { paymentId: payment.id });
        } else if (eventType === "payment.failed" && current.status === "AWAITING_PAYMENT" && current.paymentStatus !== "PAID") {
          await tx.order.update({ where: { id: current.id }, data: { paymentStatus: "FAILED", paymentProviderPaymentId: payment.id, paymentFailureCode: String(payment.error_code || "payment_failed").slice(0, 120) } });
        } else if (current.status === "AWAITING_PAYMENT" && current.paymentStatus !== "PAID") {
          await tx.order.update({ where: { id: current.id }, data: { paymentStatus: "AUTHORIZED", paymentProviderPaymentId: payment.id, paymentFailureCode: null } });
        }
      } else if (eventType === "refund.created" && refund?.id) {
        await tx.order.updateMany({ where: { id: order.id, paymentProviderPaymentId: providerPaymentId }, data: { paymentStatus: "REFUND_PENDING", paymentProviderRefundId: refund.id } });
      } else if (eventType === "refund.processed" && refund?.id) {
        const current = await tx.order.findUnique({ where: { id: order.id } });
        if (!current) return;
        await tx.order.update({ where: { id: order.id }, data: {
          paymentStatus: "REFUNDED", paymentProviderRefundId: refund.id, paymentFailureCode: null,
          ...(current.status === "RETURN_REQUESTED" ? { status: "REFUNDED" } : {}),
        } });
        if (current.status === "RETURN_REQUESTED") await tx.orderStatusHistory.create({ data: { orderId: order.id, status: "REFUNDED", note: "Razorpay refund processed." } });
      } else if (eventType === "refund.failed") {
        await tx.order.updateMany({ where: { id: order.id, paymentStatus: "REFUND_PENDING" }, data: { paymentStatus: "PAID", paymentFailureCode: "refund_failed" } });
      }
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error?.code === "P2002") return NextResponse.json({ received: true, duplicate: true });
    if (error instanceof Error && error.message === "payment_details_mismatch") return NextResponse.json({ error: "payment_details_mismatch" }, { status: 400 });
    return NextResponse.json({ error: "webhook_processing_failed" }, { status: 503 });
  }
}
