import { NextResponse } from "next/server";
import { z } from "zod";
import { db, databaseConfigured } from "@/server/db";
import { requireRole } from "@/server/auth";
import { canTransition } from "@/server/orders";
import { releaseOrderReservations } from "@/server/payment-lifecycle";

const schema = z.object({
  status: z.enum(["ACCEPTED", "PICKING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURN_REQUESTED"]),
  note: z.string().max(240).optional().default(""),
  cashCollected: z.boolean().optional().default(false),
});

export async function POST(request, { params }) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const actor = await requireRole(["ADMIN", "MANAGER", "PICKER", "RIDER"]);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  const { id } = await params;
  try {
    const changed = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true, assignment: true } });
      if (!order) throw new Error("order_not_found");
      if (!canTransition(order.status, parsed.data.status, actor.role)) throw new Error("transition_not_allowed");
      if (actor.role === "RIDER" && order.assignment?.riderId !== actor.id) throw new Error("order_not_assigned");
      if (parsed.data.status === "OUT_FOR_DELIVERY" && !order.assignment) throw new Error("rider_assignment_required");
      if (parsed.data.status === "CANCELLED" && order.paymentStatus === "PAID") throw new Error("refund_required");
      if (parsed.data.status === "DELIVERED" && order.paymentMethod === "COD" && !parsed.data.cashCollected) throw new Error("cash_collection_confirmation_required");

      const collectCash = parsed.data.status === "DELIVERED" && order.paymentMethod === "COD";
      await tx.order.update({ where: { id }, data: {
        status: parsed.data.status,
        ...(collectCash ? { paymentStatus: "PAID" } : {}),
      } });
      const note = collectCash ? "Cash on delivery collected." : parsed.data.note;
      await tx.orderStatusHistory.create({ data: { orderId: id, status: parsed.data.status, actorId: actor.id, note } });
      if (parsed.data.status === "CANCELLED") await releaseOrderReservations(tx, order);
      return { id: order.id, status: parsed.data.status, paymentStatus: collectCash ? "PAID" : order.paymentStatus };
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ order: changed });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "transition_failed";
    const status = reason === "order_not_found" ? 404 : ["transition_not_allowed", "order_not_assigned", "rider_assignment_required", "refund_required", "cash_collection_confirmation_required"].includes(reason) ? 409 : 503;
    return NextResponse.json({ error: reason }, { status });
  }
}
