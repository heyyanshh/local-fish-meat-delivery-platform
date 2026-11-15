import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db, databaseConfigured } from "@/server/db";

export async function GET(_request, { params }) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const { id } = await params;
  const isPrivilegedStaff = ["ADMIN", "MANAGER", "PICKER"].includes(session.user.role);
  const where = session.user.role === "RIDER"
    ? { id, assignment: { riderId: session.user.id } }
    : isPrivilegedStaff ? { id } : { id, userId: session.user.id };
  const order = await db.order.findFirst({ where, include: { items: true, history: { orderBy: { createdAt: "asc" } }, slot: { select: { startsAt: true, endsAt: true } } } }).catch(() => null);
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  return NextResponse.json({ order });
}
