import Link from "next/link";
import { auth } from "@/server/auth";
import { db, databaseConfigured } from "@/server/db";
import SignOutButton from "@/components/SignOutButton";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account" };

export default async function AccountPage() {
  if (!databaseConfigured) return <main className="subpage"><div className="eyebrow"><span className="eyebrow-line" /> YOUR ACCOUNT</div><h1 className="page-title">Your counter,<br /><em>your way.</em></h1><p className="page-lede">Connect PostgreSQL to create an account, save your order history, and manage delivery details. Demo orders remain in the browser where they were placed.</p><div className="hero-actions" style={{ marginTop: 24 }}><Link className="button button-dark" href="/sign-in">Sign in <span>→</span></Link><Link className="text-link" href="/register">Create an account</Link></div></main>;
  const session = await auth();
  if (!session?.user?.id) return <main className="subpage"><h1 className="page-title">Your account<br /><em>is waiting.</em></h1><p className="page-lede">Sign in to see your orders and saved details.</p><Link className="button button-dark" href="/sign-in">Sign in <span>→</span></Link></main>;
  const orders = await db.order.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, take: 20 });
  return <main className="subpage"><div className="eyebrow"><span className="eyebrow-line" /> YOUR ACCOUNT</div><div className="shop-heading"><div><h1 className="page-title">Hello,<br /><em>{session.user.name?.split(" ")[0] || "there"}.</em></h1><p className="page-lede">Your orders, all together.</p></div><SignOutButton /></div><section className="ops-main"><h2>Recent orders</h2>{orders.length === 0 ? <p className="page-lede">Your first counter order will show up here.</p> : <div className="data-table-wrap"><table className="data-table"><thead><tr><th>ORDER</th><th>DATE</th><th>STATUS</th><th>TOTAL</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><Link href={`/orders/${order.id}`}><b>{order.orderNumber}</b></Link></td><td>{new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td><td><span className="status-badge">{order.status.replaceAll("_", " ")}</span></td><td>{formatPrice(order.totalPaise)}</td></tr>)}</tbody></table></div>}</section></main>;
}
