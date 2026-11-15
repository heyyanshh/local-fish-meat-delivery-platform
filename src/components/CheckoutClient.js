"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice, formatLineOption } from "@/lib/products";
import { demoDeliverySlots, isValidIndianPinCode, sanitizePinCode } from "@/lib/delivery-slots";

const DeliveryMapPicker = dynamic(() => import("@/components/DeliveryMapPicker"), {
  ssr: false,
  loading: () => <div className="delivery-map-loading" role="status">Loading the location map…</div>,
});
const localProfileKey = "cutcatch-saved-delivery-v1";

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => { script.remove(); resolve(false); };
    document.body.appendChild(script);
  });
}

export default function CheckoutClient() {
  const router = useRouter();
  const { items, subtotal, clear, ready } = useCart();
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", city: "", state: "", postalCode: "", latitude: null, longitude: null, instructions: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [razorpayAvailable, setRazorpayAvailable] = useState(false);
  const idempotencyKey = useRef(null);
  const touchedFields = useRef(new Set());

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/profile", { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        const data = await response.json();
        if (data.mode === "local-demo") {
          try {
            const localProfile = JSON.parse(localStorage.getItem(localProfileKey) || "null");
            if (localProfile && typeof localProfile === "object") data.profile = { ...data.profile, ...localProfile };
          } catch {}
        }
        return data;
      })
      .then((data) => {
        const profile = data?.profile;
        if (!profile || controller.signal.aborted) return;
        setForm((current) => {
          const next = { ...current };
          for (const field of ["name", "email", "phone", "address", "city", "state", "postalCode", "latitude", "longitude"]) {
            const empty = next[field] === "" || next[field] == null;
            const hasSavedValue = profile[field] !== "" && profile[field] != null;
            if (!touchedFields.current.has(field) && empty && hasSavedValue) next[field] = profile[field];
          }
          return next;
        });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!isValidIndianPinCode(form.postalCode)) return () => controller.abort();
    fetch(`/api/v1/delivery-slots?postalCode=${encodeURIComponent(form.postalCode)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "delivery_slots_unavailable");
        return data;
      }).then((data) => {
      if (controller.signal.aborted) return;
      if (data.mode === "database" && Array.isArray(data.slots)) {
        setSlots(data.slots.map((slot) => ({ id: slot.id, label: `${new Date(slot.startsAt).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })} · ${new Date(slot.startsAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}–${new Date(slot.endsAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`, detail: `${slot.capacity - slot.reservedCount} places left` })));
        setSlotId(data.slots[0]?.id || "");
        setDemoMode(false);
        setRazorpayAvailable(Boolean(data.razorpayAvailable));
        if (!data.razorpayAvailable) setPaymentMethod("COD");
      } else if (data.mode === "demo") {
        setDemoMode(true);
        const availableSlots = Array.isArray(data.slots) && data.slots.length ? data.slots : demoDeliverySlots;
        setSlots(availableSlots);
        setSlotId(availableSlots[0]?.id || "");
        setRazorpayAvailable(false);
        setPaymentMethod("COD");
      } else {
        setSlots([]);
        setSlotId("");
        setDemoMode(false);
        setRazorpayAvailable(false);
        setDeliveryError(data.mode === "unavailable" ? "Live delivery is not configured yet. Please contact the counter." : "Delivery windows could not be checked right now. Please try again.");
      }
    }).catch((cause) => {
      if (cause.name !== "AbortError") {
        setSlots([]);
        setSlotId("");
        setDemoMode(false);
        setDeliveryError("We couldn’t load delivery windows. Please try again.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingSlots(false);
    });
    return () => controller.abort();
  }, [form.postalCode]);

  const update = (event) => {
    const { name } = event.target;
    const value = name === "postalCode" ? sanitizePinCode(event.target.value) : event.target.value;
    touchedFields.current.add(name);
    setForm((current) => ({ ...current, [name]: value }));
    if (name === "postalCode") {
      setError("");
      setDeliveryError("");
      setSlots([]);
      setSlotId("");
      setDemoMode(false);
      setRazorpayAvailable(false);
      setLoadingSlots(isValidIndianPinCode(value));
    }
  };
  const selectLocation = (location) => {
    const nextPostalCode = typeof location.postalCode === "string" ? sanitizePinCode(location.postalCode) : form.postalCode;
    for (const field of ["address", "city", "state", "postalCode", "latitude", "longitude"]) {
      if (Object.hasOwn(location, field)) touchedFields.current.add(field);
    }
    if (nextPostalCode !== form.postalCode) {
      setError("");
      setDeliveryError("");
      setSlots([]);
      setSlotId("");
      setDemoMode(false);
      setRazorpayAvailable(false);
      setLoadingSlots(isValidIndianPinCode(nextPostalCode));
    }
    setForm((current) => ({
      ...current,
      address: typeof location.address === "string" ? location.address : current.address,
      city: typeof location.city === "string" ? location.city : current.city,
      state: typeof location.state === "string" ? location.state : current.state,
      postalCode: typeof location.postalCode === "string" ? nextPostalCode : current.postalCode,
      latitude: typeof location.latitude === "number" ? location.latitude : current.latitude,
      longitude: typeof location.longitude === "number" ? location.longitude : current.longitude,
    }));
  };
  const delivery = subtotal >= 50000 ? 0 : 4900;

  async function submit(event) {
    event.preventDefault(); setError("");
    if (!items.length) { setError("Your bag is empty. Add something from the counter first."); return; }
    if (!isValidIndianPinCode(form.postalCode)) { setError("Enter a valid six-digit PIN code to continue."); return; }
    if (!slotId) { setError("Choose a delivery window to continue."); return; }
    setBusy(true);
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    const payload = { items: items.map(({ slug, weightGrams, preparation, quantity }) => ({ productSlug: slug, weightGrams, preparation, quantity })), slotId, address: form, paymentMethod, instructions: form.instructions, idempotencyKey: idempotencyKey.current };
    const checkoutController = new AbortController();
    const checkoutTimeout = window.setTimeout(() => checkoutController.abort(), 15000);
    try {
      const response = await fetch("/api/v1/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: checkoutController.signal });
      const result = await response.json();
      if (response.status === 401) throw new Error("Sign in to place a live order. Demo checkout is available while the database is not configured.");
      if (result.retryWithNewKey) idempotencyKey.current = null;
      if (response.ok && result.order && paymentMethod === "COD") { clear(); router.push(`/orders/${result.order.id}`); return; }
      if (response.ok && result.order && paymentMethod === "RAZORPAY" && result.payment) {
        if (!(await loadRazorpayCheckout())) throw new Error("Secure checkout could not load. Your order is saved for 15 minutes; retry payment from checkout.");
        const checkout = new window.Razorpay({
          key: result.payment.keyId,
          amount: result.payment.amount,
          currency: result.payment.currency,
          name: "CUT & CATCH",
          description: `Order ${result.order.orderNumber}`,
          order_id: result.payment.razorpayOrderId,
          prefill: { name: form.name, email: form.email, contact: form.phone },
          notes: { cutcatch_order_id: result.order.id },
          theme: { color: "#294c43" },
          modal: { ondismiss: () => setBusy(false) },
          handler: async (providerResult) => {
            try {
              const verification = await fetch("/api/v1/payments/razorpay/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: result.order.id, ...providerResult }) });
              const verified = await verification.json();
              if (!verification.ok) throw new Error(verified.error || "payment_verification_unavailable");
              clear();
              router.push(`/orders/${result.order.id}`);
            } catch {
              setError("We’re checking your payment. Your order is saved; open its tracking page in a moment for the latest status.");
              setBusy(false);
              router.push(`/orders/${result.order.id}`);
            }
          },
        });
        checkout.on("payment.failed", () => { setError("That payment attempt did not complete. You can retry securely with the same order."); setBusy(false); });
        checkout.open();
        return;
      }
      if (result.error !== "database_not_configured") throw new Error(result.error === "out_of_stock" ? "One of your selections is no longer available in that quantity." : result.error === "slot_unavailable" ? "That delivery window has just filled. Choose another one." : result.error === "item_unavailable" ? "One of your selections or preparation options changed. Please review your bag." : result.error === "online_payment_not_configured" ? "Online payment is not configured yet. Choose cash on delivery or try again later." : result.error || "We could not complete the order. Please try again.");
      if (paymentMethod !== "COD") throw new Error("Online payment is not available in demo mode.");
      const order = { id: `demo-${Date.now()}`, orderNumber: `CC-DEMO-${String(Date.now()).slice(-6)}`, status: "CONFIRMED", createdAt: new Date().toISOString(), items, subtotal, delivery, total: subtotal + delivery, address: form, slot: slots.find((slot) => slot.id === slotId)?.label || "Demo delivery window", demo: true };
      const previous = JSON.parse(localStorage.getItem("cutcatch-demo-orders-v1") || "[]");
      localStorage.setItem("cutcatch-demo-orders-v1", JSON.stringify([order, ...previous]));
      clear(); router.push(`/orders/${order.id}`);
    } catch (cause) {
      setError(cause.name === "AbortError" ? "The order request timed out. Check your connection and try again." : cause.message || "Something went wrong. Please try again.");
      setBusy(false);
    } finally { window.clearTimeout(checkoutTimeout); }
  }

  if (!ready) return <main className="subpage"><p>Preparing checkout…</p></main>;
  if (items.length === 0) return <main className="subpage"><h1 className="page-title">Nothing to<br /><em>check out.</em></h1><p className="page-lede">Your bag is empty right now.</p><Link className="button button-dark" href="/shop">Return to the counter <ArrowRight size={15} /></Link></main>;

  return <main className="subpage"><div className="breadcrumbs"><Link href="/cart"><ArrowLeft size={13} /> Your bag</Link><span>/</span><span>Checkout</span></div><div className="eyebrow"><span className="eyebrow-line" /> ALMOST AT YOUR KITCHEN</div><h1 className="page-title">A few little<br /><em>details.</em></h1><div className="checkout-grid"><form onSubmit={submit} className="form-stack">
    <section className="form-panel">
      <h2>Where should we bring it?</h2>
      <DeliveryMapPicker onLocationSelect={selectLocation} selectedLocation={form} />
      <p className="map-privacy-note">The visible map area is served through OpenStreetMap. Address searches and selected points are sent to its geocoder to fill address details. Device location is requested only if you click “Use my current location”.</p>
      <div className="form-grid">
        <div className="field"><label htmlFor="name">Your name</label><input required id="name" name="name" autoComplete="name" value={form.name} onChange={update} /></div>
        <div className="field"><label htmlFor="phone">Phone number</label><input required id="phone" name="phone" autoComplete="tel" inputMode="tel" value={form.phone} onChange={update} /></div>
        <div className="field full"><label htmlFor="address">Address</label><textarea required id="address" name="address" autoComplete="street-address" value={form.address} onChange={update} /></div>
        <div className="field"><label htmlFor="city">City</label><input required id="city" name="city" autoComplete="address-level2" value={form.city} onChange={update} /></div>
        <div className="field"><label htmlFor="state">State</label><input id="state" name="state" autoComplete="address-level1" value={form.state} onChange={update} /></div>
        <div className="field"><label htmlFor="postalCode">PIN code</label><input required id="postalCode" name="postalCode" inputMode="numeric" pattern="[1-9][0-9]{5}" maxLength={6} autoComplete="postal-code" value={form.postalCode} onChange={update} aria-describedby="postal-code-hint" aria-invalid={Boolean(form.postalCode) && !isValidIndianPinCode(form.postalCode)} /><small id="postal-code-hint" className="field-hint">Enter any six-digit Indian PIN for the local demo. Live delivery is limited to configured service areas.</small></div>
        <div className="field full"><label htmlFor="email">Email for your order details</label><input required id="email" type="email" name="email" autoComplete="email" value={form.email} onChange={update} /></div>
        <div className="field full"><label htmlFor="instructions">Delivery note (optional)</label><input id="instructions" name="instructions" placeholder="Gate, floor, or a helpful landmark" value={form.instructions} onChange={update} /></div>
      </div>
    </section>
    <section className="form-panel"><h2>Choose a delivery window</h2>{loadingSlots ? <div className="notice" role="status">Checking delivery windows for this PIN…</div> : slots.length ? <div className="slots">{slots.map((slot) => <button type="button" className={`slot-option ${slotId === slot.id ? "selected" : ""}`} key={slot.id} onClick={() => setSlotId(slot.id)}>{slot.label}<small>{slot.detail}</small></button>)}</div> : <div className="notice" role="status">{deliveryError || (!form.postalCode ? "Choose a location or enter a six-digit PIN to check delivery windows." : !isValidIndianPinCode(form.postalCode) ? "PIN codes must contain exactly six digits. This is a format check, not a delivery-area check." : demoMode ? "Sample delivery windows are temporarily unavailable. Please try again." : "This PIN is formatted correctly, but no live delivery window is available for it. It may be outside configured delivery areas or all windows may be full. Try another location or contact the counter.")}</div>}</section>
    <section className="form-panel"><h2>Payment</h2><div className="payment-choices">
      <label className="payment-choice"><input type="radio" name="paymentMethod" value="COD" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} /><span><b>{demoMode ? "Demo order" : "Cash on delivery"}</b><small>{demoMode ? "Saved in this browser only; no payment or delivery is arranged." : "Pay when your order arrives."}</small></span></label>
      {razorpayAvailable && <label className="payment-choice"><input type="radio" name="paymentMethod" value="RAZORPAY" checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} /><span><b>Pay online</b><small>Secure checkout through Razorpay.</small></span></label>}
      {!demoMode && !razorpayAvailable && <div className="notice"><Check size={13} /> Online payments will appear here after Razorpay test credentials and webhook secret are configured.</div>}
    </div></section>
    {demoMode && <div className="notice warning">Demo checkout is local to this browser. It does not reserve real stock, arrange delivery, or take payment.</div>}
    {error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" disabled={busy || loadingSlots || !isValidIndianPinCode(form.postalCode) || !slotId} type="submit"><span>{busy ? (paymentMethod === "RAZORPAY" ? "Preparing secure checkout…" : "Placing your order…") : loadingSlots ? "Checking delivery windows…" : !isValidIndianPinCode(form.postalCode) ? "Enter a valid six-digit PIN" : !slotId ? "No delivery window available" : paymentMethod === "RAZORPAY" ? "Pay securely" : demoMode ? "Place demo order" : "Place order"}</span><ArrowRight size={16} /></button>
  </form><aside className="summary-card"><h2>Your selection</h2>{items.map((item) => <div className="summary-row" key={item.key}><span>{item.quantity} × {item.name}<small className="summary-sub">{formatLineOption(item)}</small></span><span>{formatPrice(item.unitPrice * item.quantity)}</span></div>)}<div className="summary-row"><span>Delivery</span><span>{delivery === 0 ? "On us" : formatPrice(delivery)}</span></div><div className="summary-row total"><span>Total</span><span>{formatPrice(subtotal + delivery)}</span></div><p className="small-note">The server recalculates all prices and availability for live orders.</p></aside></div></main>;
}
