import { redirect } from "next/navigation";
import OperationsClient from "@/components/OperationsClient";
import { db, databaseConfigured } from "@/server/db";
import { requireRole } from "@/server/auth";

const roleAccess = { admin: ["ADMIN", "MANAGER"], store: ["ADMIN", "MANAGER", "PICKER"], rider: ["ADMIN", "MANAGER", "RIDER"] };

export default async function OperationsPage({ surface }) {
  if (!databaseConfigured) return <OperationsClient surface={surface} connected={false} />;
  const actor = await requireRole(roleAccess[surface]);
  if (!actor) redirect(`/sign-in?returnTo=/${surface}`);
  let where = {};
  if (surface === "store") where = { status: { in: ["CONFIRMED", "ACCEPTED", "PICKING", "PACKED"] } };
  if (surface === "rider") where = { assignment: { riderId: actor.id }, status: { in: ["PACKED", "OUT_FOR_DELIVERY"] } };
  const [orders, total, active, delivered, riders] = await Promise.all([
    db.order.findMany({ where, include: { user: { select: { name: true, email: true } }, assignment: { include: { rider: { select: { id: true, name: true, email: true } } } } }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.order.count({ where }),
    db.order.count({ where: { ...where, status: { in: ["CONFIRMED", "ACCEPTED", "PICKING", "PACKED", "OUT_FOR_DELIVERY"] } } }),
    db.order.count({ where: { status: "DELIVERED", createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }, ...(surface === "rider" ? { assignment: { riderId: actor.id } } : {}) } }),
    surface === "admin" ? db.user.findMany({ where: { role: "RIDER" }, select: { id: true, name: true, email: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);
  return <OperationsClient surface={surface} role={actor.role} orders={orders} riders={riders} counts={{ total, active, delivered }} connected />;
}
