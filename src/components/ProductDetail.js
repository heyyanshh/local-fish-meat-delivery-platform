"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Minus, Plus } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice, formatProductAmount, isWeightBasedProduct } from "@/lib/products";

export default function ProductDetail({ product }) {
  const [weight, setWeight] = useState(product.weightGrams);
  const [preparation, setPreparation] = useState(product.prep[0]);
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const weights = useMemo(() => product.variants?.length
    ? product.variants.map((variant) => variant.weightGrams)
    : product.weightGrams === 300 ? [150, 300, 600]
      : product.weightGrams === 1000 ? [500, 1000, 1500] : [250, 500, 1000], [product]);
  const variant = product.variants?.find((choice) => choice.weightGrams === weight);
  const price = variant?.pricePaise ?? Math.round(product.price * weight / product.weightGrams);
  const prepOptions = variant?.prepOptions || product.prep;
  const selectedPreparation = prepOptions.includes(preparation) ? preparation : prepOptions[0];
  const weightBased = isWeightBasedProduct(product);
  const showPreparation = prepOptions.length > 1 || prepOptions[0] !== "Standard";

  return <main className="subpage">
    <div className="breadcrumbs"><Link href="/shop">The counter</Link><span>/</span><span>{product.category}</span><span>/</span><span>{product.name}</span></div>
    <div className="product-detail">
      <div className={`detail-image image-${product.image}`} role="img" aria-label={`${product.name}, fresh market product`} />
      <section className="detail-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> {product.category.toUpperCase()} · {product.origin.toUpperCase()}</div>
        <h1>{product.name}</h1>
        <p className="detail-price">{formatPrice(price)} <span className="detail-unit">/ {formatProductAmount(product, weight)}</span></p>
        <p>{product.description}</p>
        <label className="option-label">{weightBased ? "Choose a weight" : "Choose a pack"}</label>
        <div className="option-row">{weights.map((grams) => <button key={grams} className={`option-chip ${weight === grams ? "selected" : ""}`} onClick={() => setWeight(grams)}>{formatProductAmount(product, grams)}</button>)}</div>
        {showPreparation && <><label className="option-label">How should we prepare it?</label>
        <div className="option-row">{prepOptions.map((prep) => <button key={prep} className={`option-chip ${selectedPreparation === prep ? "selected" : ""}`} onClick={() => setPreparation(prep)}>{selectedPreparation === prep && <Check size={12} />} {prep}</button>)}</div></>}
        <label className="option-label">Quantity</label>
        <div className="quantity-control"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus size={13} /></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(20, quantity + 1))} aria-label="Increase quantity"><Plus size={13} /></button></div>
        <button className="button button-dark detail-add" onClick={() => { for (let i = 0; i < quantity; i += 1) addItem(product, weight, selectedPreparation); }}><span>Add {quantity} to bag</span><span>{formatPrice(price * quantity)} <ArrowRight size={15} /></span></button>
        <p className="small-note">{product.slug === "farm-fresh-eggs" ? "Packed with care for delivery" : "Prepared to order · kept cold for delivery"} · product information is sample or database-backed according to mode.</p>
        <Link className="text-link" href="/shop"><ArrowLeft size={15} /> Back to the counter</Link>
      </section>
    </div>
  </main>;
}
