import "@/app/globals.css";
import Link from "next/link";
import { CartProvider } from "@/components/CartProvider";
import Header from "@/components/Header";
import { DM_Sans, Playfair_Display } from "next/font/google";

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const serif = Playfair_Display({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: "Cut & Catch — Fresh from trusted local counters", template: "%s · Cut & Catch" },
  description: "Fresh fish, seafood and meat from trusted neighbourhood counters. Prepared with care and delivered cold.",
  openGraph: { title: "Cut & Catch", description: "Fresh from trusted local counters. Ready for your kitchen.", images: ["/images/hero-market.png"] },
};

export default function RootLayout({ children, modal }) {
  return <html lang="en" className={`${sans.variable} ${serif.variable}`}><body><CartProvider><Header />{children}{modal}<footer className="site-footer page-gutter"><Link className="brand" href="/"><span className="brand-mark">C<span>&</span>C</span><span className="brand-name">CUT & CATCH<small>THE LOCAL COUNTER</small></span></Link><span>Fresh from trusted local counters.</span><nav><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link><Link href="/admin">Market desk</Link></nav><small>© 2026 Cut & Catch. Made for good dinners.</small></footer></CartProvider></body></html>;
}
