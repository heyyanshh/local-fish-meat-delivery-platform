import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db, databaseConfigured } from "@/server/db";

export async function POST(_request, { params }) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  try {
    const order = await db.$transaction(async (tx) => {
      const current = await tx.order.findFirst({ where: { id, userId: session.user.id } });
      if (!current) throw new Error("order_not_found");
      if (current.status !== "DELIVERED") throw new Error("return_not_available");
      if (current.paymentMethod !== "RAZORPAY" || current.paymentStatus !== "PAID") throw new Error("contact_support_for_return");
      const changed = await tx.order.update({ where: { id }, data: { status: "RETURN_REQUESTED" } });
      await tx.orderStatusHistory.create({ data: { orderId: id, status: "RETURN_REQUESTED", actorId: session.user.id, note: "Customer requested a return for review." } });
      return changed;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ order: { id: order.id, status: order.status } });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "return_request_failed";
    const status = reason === "order_not_found" ? 404 : ["return_not_available", "contact_support_for_return"].includes(reason) ? 409 : 503;
    return NextResponse.json({ error: reason }, { status });
  }
}
