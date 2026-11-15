import Storefront from "@/components/Storefront";
import { getCatalog } from "@/server/catalog";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const catalog = await getCatalog();
  return <Storefront initialProducts={catalog.products} catalogMode={catalog.mode} />;
}
