"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, ShoppingBag, UserRound, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";

export default function Header() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <Link className="brand" href="/" aria-label="Cut & Catch home"><span className="brand-mark">C<span>&</span>C</span><span className="brand-name">CUT & CATCH<small>THE LOCAL COUNTER</small></span></Link>
    <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
      <Link onClick={() => setOpen(false)} href="/shop">Shop the counter</Link>
      <Link onClick={() => setOpen(false)} href="/#our-promise">Our promise</Link>
      <Link onClick={() => setOpen(false)} href="/#how-it-works">How it works</Link>
      <Link className="mobile-nav-link" href="/admin">Market desk <ArrowUpRight size={14} /></Link>
    </nav>
    <div className="header-actions">
      <Link className="service-link" href="/shop"><span className="status-dot" />Delivering near you</Link>
      <Link className="icon-button account-button" href="/account" aria-label="Your account"><UserRound size={17} /></Link>
      <Link className="icon-button cart-button" href="/cart" aria-label={`Cart, ${count} items`}><ShoppingBag size={19} /><span>Bag{count > 0 ? <i>{count}</i> : null}</span></Link>
      <button className="menu-toggle" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</button>
    </div>
  </header>;
}
