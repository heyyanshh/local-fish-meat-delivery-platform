"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, PackageCheck, Truck } from "lucide-react";
import { formatPrice } from "@/lib/products";

const transitions = {
  ADMIN: ["CANCELLED", "ACCEPTED", "PICKING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED"],
  MANAGER: ["CANCELLED", "ACCEPTED", "PICKING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED"],
  PICKER: ["ACCEPTED", "PICKING", "PACKED"],
  RIDER: ["OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED"],
};
const nextByStatus = {
  AWAITING_PAYMENT: ["CANCELLED"], CONFIRMED: ["ACCEPTED", "CANCELLED"], ACCEPTED: ["PICKING", "CANCELLED"],
  PICKING: ["PACKED", "CANCELLED"], PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURN_REQUESTED"], DELIVERED: ["RETURN_REQUESTED"],
};

export default function OperationsClient({ surface, role = "DEMO", orders = [], riders = [], counts = {}, connected = false }) {
  const [rows, setRows] = useState(orders);
  const [message, setMessage] = useState("");
  const [busyOrder, setBusyOrder] = useState("");
  const titles = { admin: ["Market desk", "A clear view of the counter."], store: ["The prep bench", "The next good order starts here."], rider: ["On the way", "Your assigned deliveries, at a glance."] };
  const [title, lede] = titles[surface];
  const nav = [{ href: "/admin", label: "Overview", icon: ClipboardList }, { href: "/store", label: "Prep bench", icon: PackageCheck }, { href: "/rider", label: "Delivery", icon: Truck }];
  const currentTransitions = transitions[role] || [];

  async function updateStatus(order, status) {
    setMessage("");
    const cashCollected = status === "DELIVERED" && order.paymentMethod === "COD";
    if (cashCollected && !window.confirm("Confirm the customer paid cash for this order?")) return;
    setBusyOrder(order.id);
    try {
      const response = await fetch(`/api/v1/admin/orders/${encodeURIComponent(order.id)}/transition`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, cashCollected }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error === "refund_required" ? "Issue a refund before closing this paid order." : result.error === "cash_collection_confirmation_required" ? "Confirm cash collection before marking delivery complete." : result.error === "rider_assignment_required" ? "Assign a rider before starting delivery." : result.error === "transition_not_allowed" || result.error === "order_not_assigned" ? "Your role cannot make that change for this order." : "We couldn’t update the order. Try again."); return; }
      setRows((current) => current.map((row) => row.id === order.id ? { ...row, status: result.order.status, paymentStatus: result.order.paymentStatus } : row));
      setMessage(`${order.orderNumber} moved to ${status.replaceAll("_", " ")}.`);
    } catch { setMessage("We couldn’t update the order. Check the connection and try again."); }
    finally { setBusyOrder(""); }
  }

  async function updateAssignment(order, riderId) {
    if (!riderId) return;
    setMessage(""); setBusyOrder(order.id);
    try {
      const response = await fetch(`/api/v1/admin/orders/${encodeURIComponent(order.id)}/assignment`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ riderId }) });
      const result = await response.json();
      if (!response.ok) { setMessage("This order could not be assigned. Assign riders after packing is complete."); return; }
      const rider = riders.find((item) => item.id === result.assignment.riderId);
      setRows((current) => current.map((row) => row.id === order.id ? { ...row, assignment: { ...result.assignment, rider } } : row));
      setMessage(`${order.orderNumber} assigned to ${rider?.name || rider?.email || "the selected rider"}.`);
    } catch { setMessage("We couldn’t save the assignment. Check the connection and try again."); }
    finally { setBusyOrder(""); }
  }

  async function issueRefund(order) {
    if (!window.confirm(`Issue a full refund for ${order.orderNumber}? This cannot be undone.`)) return;
    setMessage(""); setBusyOrder(order.id);
    try {
      const response = await fetch(`/api/v1/admin/orders/${encodeURIComponent(order.id)}/refund`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason: order.status === "PAYMENT_FAILED" ? "Late payment after order closure" : "Customer return" }) });
      const result = await response.json();
      if (!response.ok) { setMessage(result.error === "refund_status_unknown" ? "Refund status is unclear. Check the Razorpay dashboard before retrying." : "We couldn’t issue the refund. Check the payment status and try again."); return; }
      setRows((current) => current.map((row) => row.id === order.id ? { ...row, status: result.order.status, paymentStatus: result.order.paymentStatus } : row));
      setMessage(result.refund.status === "processed" ? `${order.orderNumber} refund processed.` : `${order.orderNumber} refund submitted and awaiting confirmation.`);
    } catch { setMessage("We couldn’t issue the refund. Check the payment dashboard before retrying."); }
    finally { setBusyOrder(""); }
  }

    return <main className="subpage"><div className="eyebrow"><span className="eyebrow-line" /> CUT & CATCH OPERATIONS</div><div className="shop-heading"><div><h1 className="page-title">{title}</h1><p className="page-lede">{lede}</p></div><Link className="text-link" href="/">View storefront <ArrowRight size={15} /></Link></div><div className="ops-shell"><aside className="ops-nav"><h2>WORKSPACE</h2>{nav.map(({ href, label, icon: Icon }) => <Link className={href === `/${surface}` ? "active" : ""} href={href} key={href}><Icon size={14} style={{ verticalAlign: "-3px", marginRight: 9 }} />{label}</Link>)}<Link href="/account">Customer account</Link></aside><section className="ops-main">
    {!connected ? <div className="demo-banner">Operations are not connected. Configure PostgreSQL, apply migrations, and sign in with an assigned staff role to see live orders. No sample metrics are shown.</div> : <><div className="metric-grid"><div className="metric"><small>Orders in this view</small><b>{counts.total ?? rows.length}</b></div><div className="metric"><small>Awaiting action</small><b>{counts.active ?? 0}</b></div><div className="metric"><small>Today’s delivered</small><b>{counts.delivered ?? 0}</b></div></div><h2>{surface === "rider" ? "Your delivery list" : surface === "store" ? "Orders to prepare" : "Recent orders"}</h2>{message && <p className="notice" aria-live="polite">{message}</p>}{rows.length === 0 ? <div className="empty-cart"><p>No orders are waiting in this view.</p></div> : <div className="data-table-wrap"><table className="data-table ops-data-table"><thead><tr><th>ORDER</th><th>PLACED</th><th>STATUS</th><th>PAYMENT</th><th>TOTAL</th>{surface === "admin" && <th>RIDER</th>}<th>NEXT STEP</th></tr></thead><tbody>{rows.map((order) => {
      const available = (nextByStatus[order.status] || []).filter((target) => currentTransitions.includes(target) && (target !== "OUT_FOR_DELIVERY" || order.assignment));
      const refundAvailable = ["ADMIN", "MANAGER"].includes(role) && order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PAID" && ["RETURN_REQUESTED", "PAYMENT_FAILED"].includes(order.status);
      return <tr key={order.id}><td><Link href={`/orders/${order.id}`}><b>{order.orderNumber}</b></Link><small className="summary-sub">{order.user?.name || order.user?.email || "Customer"}</small></td><td>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td><td><span className="status-badge">{order.status.replaceAll("_", " ")}</span></td><td><span className={`status-badge ${order.paymentStatus === "FAILED" ? "demo" : ""}`}>{order.paymentStatus?.replaceAll("_", " ") || "PENDING"}</span></td><td>{formatPrice(order.totalPaise)}</td>{surface === "admin" && <td>{order.status === "PACKED" && riders.length ? <select aria-label={`Assign rider to ${order.orderNumber}`} value={order.assignment?.riderId || ""} disabled={busyOrder === order.id} onChange={(event) => updateAssignment(order, event.target.value)}><option value="">Choose rider…</option>{riders.map((rider) => <option value={rider.id} key={rider.id}>{rider.name || rider.email}</option>)}</select> : <span>{order.assignment?.rider?.name || (order.status === "PACKED" ? "No riders set up" : "—")}</span>}</td>}<td>{refundAvailable ? <button className="text-link" type="button" disabled={busyOrder === order.id} onClick={() => issueRefund(order)}>{busyOrder === order.id ? "Working…" : "Issue full refund"}</button> : available.length ? <select aria-label={`Move ${order.orderNumber} to next status`} value="" disabled={busyOrder === order.id} onChange={(event) => { if (event.target.value) updateStatus(order, event.target.value); }}><option value="">Update…</option>{available.map((target) => <option key={target} value={target}>{target.replaceAll("_", " ")}</option>)}</select> : order.paymentStatus === "REFUND_PENDING" ? <span>Refund pending</span> : <span>—</span>}</td></tr>;
    })}</tbody></table></div>}</>}
    </section></div></main>;
}
