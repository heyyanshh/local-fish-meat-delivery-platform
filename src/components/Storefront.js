"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown, MapPin, Search, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { motion } from "motion/react";
import HeroExperience from "@/components/HeroExperience";
import ProductCard from "@/components/ProductCard";
import { categories } from "@/lib/products";

export default function Storefront({ initialProducts = [], catalogMode = "demo" }) {
  const products = initialProducts;
  const [activeCategory, setActiveCategory] = useState("Everything");
  const [query, setQuery] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [checked, setChecked] = useState(false);
  const filtered = useMemo(() => products.filter((product) => (activeCategory === "Everything" || product.category === activeCategory) && product.name.toLowerCase().includes(query.toLowerCase())), [activeCategory, query, products]);

  return <main>
    <section className="hero-section page-gutter">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> THE NEIGHBOURHOOD COUNTER, REIMAGINED</div>
        <h1>Good things<br />come <em>fresh.</em></h1>
        <p>Fresh from trusted local counters. Cleaned, cut and packed for the way you cook.</p>
        <div className="hero-actions"><Link className="button button-dark" href="/shop">Shop today’s catch <ArrowRight size={16} /></Link><a className="text-link" href="#our-promise">Get to know us <ArrowDownRight size={17} /></a></div>
        <div className="hero-footnote"><span className="status-dot" /> Sourced close. Prepared with care.</div>
      </div>
      <HeroExperience />
      <div className="hero-bottomline"><span>FRESHNESS, WITH A HUMAN TOUCH.</span><span>01 — 04 <ChevronDown size={13} /></span></div>
    </section>

    <section className="service-strip page-gutter" aria-label="Check delivery service">
      <div className="service-intro"><MapPin size={17} /><span>Is your counter around the corner?</span></div>
      <form className="service-form" onSubmit={(event) => { event.preventDefault(); setChecked(postalCode.trim().length >= 5); }}>
        <label className="sr-only" htmlFor="postal-code">Enter your PIN code</label><input id="postal-code" inputMode="numeric" maxLength={6} placeholder="Enter your PIN code" value={postalCode} onChange={(event) => { setPostalCode(event.target.value.replace(/\D/g, "")); setChecked(false); }} />
        <button type="submit" aria-label="Check delivery area">{checked ? <Check size={17} /> : <ArrowRight size={17} />}</button>
      </form>
      <p className="service-result" aria-live="polite">{checked ? "Great — we’re building our local delivery network here." : "A quick check. No account needed."}</p>
    </section>

    <section className="catalog-section page-gutter" id="shop">
      <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line" /> THE COUNTER, TODAY</div><h2>Choose your<br /><em>good.</em></h2></div><p>Thoughtfully sourced. Prepared when you order.<br />A little more care in every cut.</p></div>
      <div className="catalog-toolbar">
        <div className="category-tabs" role="tablist" aria-label="Product category">{categories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)} role="tab" aria-selected={activeCategory === category}>{category}</button>)}</div>
        <label className="search-box"><Search size={15} /><span className="sr-only">Search the counter</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find something good" /></label>
      </div>
      <div className="product-grid">{filtered.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
      {filtered.length === 0 && <div className="empty-state"><p>Nothing on this counter by that name.</p><button className="text-link" onClick={() => { setQuery(""); setActiveCategory("Everything"); }}>Clear filters <ArrowRight size={15} /></button></div>}
      <div className="catalog-end"><span>Showing {filtered.length} of {products.length} counter favourites</span><Link href="/shop">Explore the full counter <ArrowUpRight size={15} /></Link></div>
    </section>

    <section className="promise-section page-gutter" id="our-promise">
      <div className="promise-art"><div className="promise-image" /><div className="promise-orbit orbit-one" /><div className="promise-orbit orbit-two" /><span className="promise-caption">A BETTER KIND<br />OF COUNTER</span></div>
      <div className="promise-copy"><div className="eyebrow"><span className="eyebrow-line" /> GOOD FOOD STARTS HERE</div><h2>Local hands.<br /><em>Better meals.</em></h2><p>We partner with neighbourhood fishmongers and trusted farms, so you can know where dinner begins. Every order is prepared fresh, packed with care, and delivered cold.</p><ul className="promise-list"><li><span><ShieldCheck size={17} /></span><div><b>Know your counter</b><small>People and partners we’d shop with ourselves.</small></div></li><li><span><Sparkles size={17} /></span><div><b>Prepared your way</b><small>Choose the cut. We’ll handle the careful part.</small></div></li><li><span><Truck size={17} /></span><div><b>Cold-chain, all the way</b><small>Freshness protected from our counter to yours.</small></div></li></ul><Link className="text-link" href="/about">A little more about us <ArrowRight size={16} /></Link></div>
    </section>

    <section className="how-section page-gutter" id="how-it-works"><div className="eyebrow"><span className="eyebrow-line" /> SIMPLE, BY DESIGN</div><div className="how-title-row"><h2>From counter<br />to <em>kitchen.</em></h2><span>THREE SMALL STEPS.<br />A VERY GOOD DINNER.</span></div><div className="steps-grid"><article><span>01</span><h3>Pick what looks good</h3><p>Browse the day’s fresh selection and choose the size that suits your table.</p><ArrowDownRight size={19} /></article><article><span>02</span><h3>Make it yours</h3><p>Tell us how you’d like it cleaned and cut. We’ll prepare it to order.</p><ArrowDownRight size={19} /></article><article><span>03</span><h3>Make something lovely</h3><p>Choose a delivery window, then get cooking with something truly fresh.</p><ArrowDownRight size={19} /></article></div></section>

    <section className="closing-cta page-gutter"><div><div className="eyebrow"><span className="eyebrow-line" /> YOUR KITCHEN, NEXT</div><h2>Shall we find<br /><em>something good?</em></h2><Link className="button button-light" href="/shop">Meet the counter <ArrowRight size={16} /></Link></div><div className="cta-mark">CUT<br /><span>&</span><br />CATCH</div></section>
    <div className="demo-note">{catalogMode === "demo" ? "Preview catalogue · sample products shown. Configure PostgreSQL to enable live inventory and checkout." : "Live catalogue · stock and final prices are confirmed again at checkout."}</div>
  </main>;
}
