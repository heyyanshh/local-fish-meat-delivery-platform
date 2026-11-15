"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { categories } from "@/lib/products";

export default function ShopPage({ initialProducts = [], catalogMode = "demo" }) {
  const products = initialProducts;
  const [category, setCategory] = useState("Everything");
  const [query, setQuery] = useState("");
  const rows = useMemo(() => products.filter((product) => (category === "Everything" || product.category === category) && product.name.toLowerCase().includes(query.toLowerCase())), [category, query, products]);
  return <main className="subpage"><div className="eyebrow"><span className="eyebrow-line" /> THE LOCAL COUNTER</div><div className="shop-heading"><div><h1 className="page-title">A good day<br /><em>for dinner.</em></h1><p className="page-lede">A considered selection from the counters and farms we trust. Prepared fresh when you order.</p></div><div className="shop-count">{rows.length} items · {catalogMode === "demo" ? "sample catalogue" : "live catalogue"}</div></div>
    <div className="catalog-toolbar"><div className="category-tabs" role="tablist" aria-label="Product category">{categories.map((value) => <button key={value} className={category === value ? "active" : ""} onClick={() => setCategory(value)} role="tab" aria-selected={category === value}>{value}</button>)}</div><label className="search-box"><Search size={15} /><span className="sr-only">Search products</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the counter" /></label></div>
    <div className="product-grid">{rows.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>{rows.length === 0 && <div className="empty-state">No matches yet. Try another name or category.</div>}
    <p className="demo-note">{catalogMode === "demo" ? "Sample catalogue · prices and stock are illustrative until PostgreSQL is configured." : "Live catalogue · availability is checked again before checkout."}</p></main>;
}
