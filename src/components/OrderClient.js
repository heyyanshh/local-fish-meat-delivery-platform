"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { formatPrice, formatLineOption } from "@/lib/products";

export default function OrderClient({ id }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [problem, setProblem] = useState("");
  const [returnMessage, setReturnMessage] = useState("");
  useEffect(() => {
    let active = true;
    let timer;
    let attempts = 0;
    const demo = JSON.parse(localStorage.getItem("cutcatch-demo-orders-v1") || "[]").find((item) => item.id === id);
    if (demo) {
      timer = window.setTimeout(() => { if (active) { setOrder(demo); setLoading(false); } }, 0);
      return () => { active = false; window.clearTimeout(timer); };
    }
    async function refresh() {
      try {
        const response = await fetch(`/api/v1/orders/${encodeURIComponent(id)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error === "authentication_required" ? "Sign in to view this order." : "We couldn’t find this order in your account.");
        if (!active) return;
        setOrder(data.order);
        setLoading(false);
        if (data.order.status === "AWAITING_PAYMENT" && attempts < 12) {
          attempts += 1;
          timer = window.setTimeout(refresh, 5000);
        }
      } catch (error) {
        if (active) { setProblem(error.message); setLoading(false); }
      }
    }
    refresh();
    return () => { active = false; window.clearTimeout(timer); };
  }, [id]);

  if (loading) return <main className="subpage"><p>Finding your order…</p></main>;
  if (!order) return <main className="subpage"><div className="empty-cart"><h1 className="page-title">Order not<br /><em>found.</em></h1><p>{problem || "This order isn’t available in this browser."}</p><Link className="button button-dark" href="/shop">Back to the counter <ArrowRight size={15} /></Link></div></main>;

  const status = order.status;
  const steps = [
    ...(order.paymentMethod === "RAZORPAY" ? ["AWAITING_PAYMENT"] : []),
    "CONFIRMED", "ACCEPTED", "PICKING", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED", "REFUNDED",
  ];
  const currentIndex = steps.indexOf(status);
  const history = order.history || [];
  const total = order.totalPaise ?? order.total;
  async function requestReturn() {
    if (!window.confirm("Send a return request to the CUT & CATCH team for review? This will not submit a refund.")) return;
    setReturnMessage("");
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(id)}/return`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "return_request_failed");
      setOrder((current) => ({ ...current, status: data.order.status, history: [...(current.history || []), { status: data.order.status, createdAt: new Date().toISOString() }] }));
      setReturnMessage("Your return request is with the team for review. No refund has been submitted yet.");
    } catch { setReturnMessage("We couldn’t submit the request. Please contact the team for help."); }
  }
  return <main className="subpage"><div className="order-success"><div className="success-mark"><Check size={24} /></div><div className="eyebrow" style={{ justifyContent: "center" }}>{order.demo ? "LOCAL DEMO ORDER" : order.status === "AWAITING_PAYMENT" ? "PAYMENT PENDING" : "ORDER PLACED"}</div><h1>{order.status === "AWAITING_PAYMENT" ? <>Payment<br /><em>in progress.</em></> : <>That’s a good<br /><em>choice.</em></>}</h1><p>Your reference is <b>{order.orderNumber}</b>. {order.demo ? "This sample order is saved only in this browser; no delivery or payment has been arranged." : order.status === "AWAITING_PAYMENT" ? "We’re waiting for Razorpay to confirm your payment. This page checks for an update for about a minute." : "We’ll keep you posted as your order moves from counter to kitchen."}</p><Link className="text-link" href="/shop">Back to shopping <ArrowRight size={15} /></Link></div>
    <section className="tracking-card"><div className="eyebrow"><span className="eyebrow-line" /> ORDER STATUS {order.demo && "· DEMO"}</div><h2 className="section-heading">{status.replaceAll("_", " ")}</h2><p className="page-lede">{order.demo ? order.slot : `Delivery window: ${new Date(order.slot.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}–${new Date(order.slot.endsAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`}</p>{order.paymentStatus === "REFUND_PENDING" && <div className="notice warning">Your refund is processing. The payment provider will return it to the original payment method.</div>}{order.paymentFailureCode === "late_capture_requires_manual_refund" && <div className="notice warning">Payment was captured after the order closed. Our team needs to review and refund it before fulfillment.</div>}{status === "PAYMENT_FAILED" && <div className="notice warning">Payment was not completed, so stock and delivery capacity were released. Please place a new order.</div>}{status === "DELIVERED" && order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PAID" && <button className="text-link" type="button" onClick={requestReturn}>Request a return for review</button>}{returnMessage && <p className="notice" aria-live="polite">{returnMessage}</p>}<ol className="timeline">{steps.map((step, index) => { const record = history.find((entry) => entry.status === step); const isDemoCurrent = order.demo && step === "CONFIRMED"; return <li key={step} className={index <= currentIndex || isDemoCurrent ? "complete" : ""}><span className="timeline-dot" /><span>{step.replaceAll("_", " ")}</span><small>{record ? new Date(record.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : isDemoCurrent ? "Saved locally" : ""}</small></li>; })}</ol>
      {order.demo && <div className="notice warning" style={{ marginTop: 18 }}>Live updates aren’t connected in demo mode. This timeline reflects only the locally saved sample order.</div>}
    </section><aside className="summary-card" style={{ maxWidth: 520 }}><h2>Order summary</h2>{order.items.map((item, index) => <div className="summary-row" key={item.key || item.id || index}><span>{item.quantity} × {item.name || item.productName}<small className="summary-sub">{formatLineOption(item)}</small></span><span>{formatPrice(item.lineTotalPaise ?? item.unitPrice * item.quantity)}</span></div>)}<div className="summary-row total"><span>Total</span><span>{formatPrice(total)}</span></div></aside></main>;
}
