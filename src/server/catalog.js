import "server-only";
import { db, databaseConfigured } from "@/server/db";
import { products as sampleProducts } from "@/lib/products";

function presentProduct(product) {
  const variant = [...product.variants].sort((a, b) => a.weightGrams - b.weightGrams)[0];
  if (!variant) return null;
  const grams = variant.weightGrams;
  const category = product.category.name;
  return {
    id: product.id, name: product.name, slug: product.slug, category, categorySlug: product.category.slug,
    price: variant.pricePaise, weightGrams: grams, unit: variant.label,
    rating: "Prepared to order", description: product.description, prep: variant.prepOptions,
    image: product.imageKey || "fish", origin: product.origin, variants: product.variants,
  };
}

export async function getCatalog() {
  if (!databaseConfigured) return { mode: "demo", products: sampleProducts };
  const rows = await db.product.findMany({ where: { active: true, variants: { some: { active: true } } }, include: { category: true, variants: { where: { active: true }, orderBy: { weightGrams: "asc" } } }, orderBy: { name: "asc" } });
  return { mode: "database", products: rows.map(presentProduct).filter(Boolean) };
}

export async function getProduct(slug) {
  if (!databaseConfigured) return { mode: "demo", product: sampleProducts.find((product) => product.slug === slug) || null };
  const row = await db.product.findFirst({ where: { slug, active: true }, include: { category: true, variants: { where: { active: true }, orderBy: { weightGrams: "asc" } } } });
  return { mode: "database", product: row ? presentProduct(row) : null, variants: row?.variants || [] };
}
