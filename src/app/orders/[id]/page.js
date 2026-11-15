import OrderClient from "@/components/OrderClient";

export const metadata = { title: "Order details" };
export default async function Page({ params }) { const { id } = await params; return <OrderClient id={id} />; }
