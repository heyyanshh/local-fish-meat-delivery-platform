import ShopPage from "@/components/ShopPage";
import { getCatalog } from "@/server/catalog";

export const metadata = { title: "Shop the counter" };
export const dynamic = "force-dynamic";
export default async function Page() { const catalog = await getCatalog(); return <ShopPage initialProducts={catalog.products} catalogMode={catalog.mode} />; }
