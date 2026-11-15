"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import { useCart } from "@/components/CartProvider";
import { formatPrice, formatProductAmount, isWeightBasedProduct } from "@/lib/products";

export default function QuickView({ product }) {
  const router = useRouter();
  const [weight, setWeight] = useState(product.weightGrams);
  const [prep, setPrep] = useState(product.prep[0]);
  const { addItem } = useCart();
  const weights = useMemo(() => product.variants?.length ? product.variants.map((variant) => variant.weightGrams) : [250, 500, 1000], [product]);
  const variant = product.variants?.find((choice) => choice.weightGrams === weight);
  const prepOptions = variant?.prepOptions || product.prep;
  const selectedPrep = prepOptions.includes(prep) ? prep : prepOptions[0];
  const price = variant?.pricePaise ?? Math.round(product.price * weight / product.weightGrams);
  const weightBased = isWeightBasedProduct(product);
  const showPreparation = prepOptions.length > 1 || prepOptions[0] !== "Standard";
  const close = () => router.back();

  return <dialog open className="quickview-dialog" aria-label={`Quick view: ${product.name}`} onClick={(event) => { if (event.target === event.currentTarget) close(); }} onCancel={(event) => { event.preventDefault(); close(); }}>
    <section className="quickview-panel" role="document"><button className="quickview-close" onClick={close} autoFocus aria-label="Close product details"><X size={19} /></button><div className={`quickview-image image-${product.image}`} role="img" aria-label={product.name} /><div className="quickview-copy"><div className="eyebrow"><span className="eyebrow-line" /> {product.category.toUpperCase()}</div><h1>{product.name}</h1><p className="detail-price">{formatPrice(price)} <span className="detail-unit">/ {formatProductAmount(product, weight)}</span></p><p>{product.description}</p><label className="option-label">{weightBased ? "Weight" : "Pack"}</label><div className="option-row">{weights.map((grams) => <button key={grams} className={`option-chip ${weight === grams ? "selected" : ""}`} onClick={() => setWeight(grams)}>{formatProductAmount(product, grams)}</button>)}</div>{showPreparation && <><label className="option-label">Preparation</label><div className="option-row">{prepOptions.map((value) => <button key={value} className={`option-chip ${selectedPrep === value ? "selected" : ""}`} onClick={() => setPrep(value)}>{selectedPrep === value && <Check size={12} />} {value}</button>)}</div></>}<button className="button button-dark detail-add" onClick={() => { addItem(product, weight, selectedPrep); close(); }}><span>Add to bag</span><span>{formatPrice(price)} <ArrowRight size={15} /></span></button><Link className="text-link" href={`/products/${product.slug}`} onClick={close}>View full product <ArrowRight size={15} /></Link></div></section>
  </dialog>;
}
