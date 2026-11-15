"use client";

import Link from "next/link";
import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice, formatLineOption } from "@/lib/products";

export default function CartPage() {
  const { items, subtotal, setQuantity, ready } = useCart();
  const delivery = subtotal >= 50000 || subtotal === 0 ? 0 : 4900;
  if (!ready) return <main className="subpage"><p>Opening your bag…</p></main>;
  return <main className="subpage"><div className="eyebrow"><span className="eyebrow-line" /> YOUR SELECTION</div><h1 className="page-title">The good<br /><em>things.</em></h1><p className="page-lede">Your counter picks, gathered in one place.</p>
    {items.length === 0 ? <div className="empty-cart"><h2 className="section-heading">Your bag is taking a breather.</h2><p>Find something fresh for your next meal.</p><Link className="button button-dark" href="/shop">Browse the counter <ArrowRight size={16} /></Link></div> : <div className="cart-layout"><div className="cart-lines">{items.map((item) => <article className="cart-line" key={item.key}><div className={`cart-line-image image-${item.image}`} /><div><Link href={`/products/${item.slug}`}><h3>{item.name}</h3></Link><p>{formatLineOption(item)}</p><div className="quantity-control"><button onClick={() => setQuantity(item.key, item.quantity - 1)} aria-label={`Decrease ${item.name}`}><Minus size={12} /></button><span>{item.quantity}</span><button onClick={() => setQuantity(item.key, item.quantity + 1)} aria-label={`Increase ${item.name}`}><Plus size={12} /></button><button className="remove-button" onClick={() => setQuantity(item.key, 0)} aria-label={`Remove ${item.name}`}><Trash2 size={13} /></button></div></div><span className="line-price">{formatPrice(item.unitPrice * item.quantity)}</span></article>)}</div><aside className="summary-card"><h2>At a glance</h2><div className="summary-row"><span>Items ({items.reduce((sum, item) => sum + item.quantity, 0)})</span><span>{formatPrice(subtotal)}</span></div><div className="summary-row"><span>Delivery</span><span>{delivery === 0 ? "On us" : formatPrice(delivery)}</span></div><div className="summary-row total"><span>Estimated total</span><span>{formatPrice(subtotal + delivery)}</span></div><Link className="button button-dark" href="/checkout">Continue to checkout <ArrowRight size={16} /></Link><p className="small-note">Final price and availability are confirmed by the server at checkout.</p></aside></div>}
    <p className="demo-note">Prices shown are sample catalogue prices. Live stock and checkout require the database setup.</p></main>;
}
