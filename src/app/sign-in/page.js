import { Suspense } from "react";
import SignInClient from "@/components/SignInClient";
export const metadata = { title: "Sign in" };
export default function Page() { return <Suspense fallback={<main className="subpage">Opening sign-in…</main>}><SignInClient /></Suspense>; }
