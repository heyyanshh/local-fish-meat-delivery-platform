"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice } from "@/lib/products";

export default function ProductCard({ product, index = 0 }) {
  const { addItem } = useCart();
  return <article className="product-card" style={{ "--card-index": index }}>
    <Link className={`product-image image-${product.image}`} href={`/products/${product.slug}`} aria-label={`View ${product.name}`}>
      <span className="product-note">{product.rating}</span><span className="image-link"><ArrowUpRight size={17} /></span>
    </Link>
    <div className="product-meta"><span>{product.category} · {product.origin}</span><span>{product.unit}</span></div>
    <div className="product-title-row"><Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link><span>{formatPrice(product.price)}</span></div>
    <div className="product-bottom"><span className="cut-note">{product.slug === "farm-fresh-eggs" ? "Packed with care" : "Cut to order"}</span><button className="add-button" onClick={() => addItem(product)} aria-label={`Add ${product.name} to bag`}><Plus size={16} /><span>Add</span></button></div>
  </article>;
}
