"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { calculateLinePrice } from "@/lib/pricing";
import { formatProductAmount } from "@/lib/products";

const CartContext = createContext(null);
const STORAGE_KEY = "cutcatch-cart-v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setItems(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { setItems([]); }
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = useCallback((product, weightGrams = product.weightGrams, preparation = product.prep[0]) => {
    const key = `${product.id}-${weightGrams}-${preparation}`;
    setItems((current) => {
      const found = current.find((item) => item.key === key);
      if (found) return current.map((item) => item.key === key ? { ...item, quantity: item.quantity + 1 } : item);
      const variant = product.variants?.find((choice) => choice.weightGrams === weightGrams);
      const price = variant?.pricePaise ?? calculateLinePrice(product.price, product.weightGrams, weightGrams);
      return [...current, { key, productId: product.id, name: product.name, slug: product.slug, image: product.image, unitPrice: price, weightGrams, variantLabel: formatProductAmount(product, weightGrams), preparation, quantity: 1 }];
    });
  }, []);

  const setQuantity = useCallback((key, quantity) => setItems((current) => quantity < 1 ? current.filter((item) => item.key !== key) : current.map((item) => item.key === key ? { ...item, quantity: Math.min(quantity, 20) } : item)), []);
  const clear = useCallback(() => setItems([]), []);
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const value = useMemo(() => ({ items, addItem, setQuantity, clear, count, subtotal, ready }), [items, addItem, setQuantity, clear, count, subtotal, ready]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useCart must be used inside CartProvider");
  return value;
}
