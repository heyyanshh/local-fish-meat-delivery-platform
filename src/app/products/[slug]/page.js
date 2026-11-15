import { notFound } from "next/navigation";
import ProductDetail from "@/components/ProductDetail";
import { getProduct } from "@/server/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { product } = await getProduct(slug);
  return product ? { title: product.name, description: product.description, openGraph: { title: `${product.name} · Cut & Catch`, description: product.description } } : {};
}

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const { product } = await getProduct(slug);
  if (!product) notFound();
  return <ProductDetail product={product} />;
}
