import { notFound } from "next/navigation";
import QuickView from "@/components/QuickView";
import { getProduct } from "@/server/catalog";

export const dynamic = "force-dynamic";
export default async function QuickViewPage({ params }) {
  const { slug } = await params;
  const { product } = await getProduct(slug);
  if (!product) notFound();
  return <QuickView product={product} />;
}
