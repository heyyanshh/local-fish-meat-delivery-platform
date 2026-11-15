import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/server/auth";
import { db, databaseConfigured } from "@/server/db";
import { createRazorpayRefund } from "@/server/payments";

const schema = z.object({ reason: z.string().trim().max(200).optional().default("Customer return") });

export async function POST(request, { params }) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const actor = await requireRole(["ADMIN", "MANAGER"]);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "invalid_refund_request" }, { status: 400 });
  const { id } = await params;

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  if (order.paymentMethod !== "RAZORPAY" || !order.paymentProviderPaymentId) return NextResponse.json({ error: "razorpay_payment_required" }, { status: 409 });
  if (order.paymentStatus !== "PAID" || !["RETURN_REQUESTED", "PAYMENT_FAILED"].includes(order.status)) return NextResponse.json({ error: "refund_not_available" }, { status: 409 });

  const claimed = await db.order.updateMany({
    where: { id, paymentMethod: "RAZORPAY", paymentStatus: "PAID", paymentProviderRefundId: null, status: { in: ["RETURN_REQUESTED", "PAYMENT_FAILED"] } },
    data: { paymentStatus: "REFUND_PENDING", paymentFailureCode: null },
  });
  if (claimed.count !== 1) return NextResponse.json({ error: "refund_already_started" }, { status: 409 });

  let refund;
  try {
    refund = await createRazorpayRefund(order.paymentProviderPaymentId, { orderId: order.id, reason: parsed.data.reason });
    if (!refund?.id || refund.payment_id !== order.paymentProviderPaymentId) throw new Error("refund_response_invalid");
  } catch {
    // The provider may have accepted a request whose response was lost. Keep the
    // payment in REFUND_PENDING until a webhook or dashboard reconciliation resolves it.
    await db.order.updateMany({ where: { id, paymentStatus: "REFUND_PENDING", paymentProviderRefundId: null }, data: { paymentFailureCode: "refund_status_unknown" } });
    return NextResponse.json({ error: "refund_status_unknown", message: "Check the Razorpay dashboard before retrying this refund." }, { status: 503 });
  }

  const finished = refund.status === "processed";
  const updated = await db.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current) throw new Error("refund_state_changed");
    if (current.paymentStatus === "REFUNDED" && current.paymentProviderRefundId === refund.id) return current;
    if (current.paymentStatus !== "REFUND_PENDING") throw new Error("refund_state_changed");
    const result = await tx.order.update({ where: { id }, data: {
      paymentProviderRefundId: refund.id,
      paymentStatus: finished ? "REFUNDED" : "REFUND_PENDING",
      paymentFailureCode: null,
      ...(finished && current.status === "RETURN_REQUESTED" ? { status: "REFUNDED" } : {}),
    } });
    if (finished && current.status === "RETURN_REQUESTED") {
      await tx.orderStatusHistory.create({ data: { orderId: id, status: "REFUNDED", actorId: actor.id, note: `Razorpay refund ${refund.id} processed.` } });
    }
    return result;
  }, { isolationLevel: "Serializable" });
  return NextResponse.json({ refund: { id: refund.id, status: refund.status }, order: { id: updated.id, status: updated.status, paymentStatus: updated.paymentStatus } }, { status: 202 });
}
