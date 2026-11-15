import { NextResponse } from "next/server";
import { z } from "zod";
import { db, databaseConfigured } from "@/server/db";
import { requireRole } from "@/server/auth";

const schema = z.object({ riderId: z.string().min(1) });

export async function POST(request, { params }) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const actor = await requireRole(["ADMIN", "MANAGER"]);
  if (!actor) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_assignment" }, { status: 400 });
  const { id } = await params;
  try {
    const assignment = await db.$transaction(async (tx) => {
      const [order, rider] = await Promise.all([
        tx.order.findUnique({ where: { id }, select: { id: true, status: true } }),
        tx.user.findFirst({ where: { id: parsed.data.riderId, role: "RIDER" }, select: { id: true } }),
      ]);
      if (!order) throw new Error("order_not_found");
      if (!rider) throw new Error("rider_not_found");
      if (order.status !== "PACKED") throw new Error("order_not_ready");
      return tx.deliveryAssignment.upsert({ where: { orderId: id }, update: { riderId: rider.id }, create: { orderId: id, riderId: rider.id } });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ assignment });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "assignment_failed";
    return NextResponse.json({ error: reason }, { status: reason === "order_not_found" || reason === "rider_not_found" ? 404 : reason === "order_not_ready" ? 409 : 503 });
  }
}
