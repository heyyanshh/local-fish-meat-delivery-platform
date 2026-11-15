"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

export default function SignInClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const formData = new FormData(event.currentTarget);
    const result = await signIn("credentials", { email: formData.get("email"), password: formData.get("password"), redirect: false });
    if (result?.error) { setError("We couldn’t sign you in. Check your email and password, then try again."); setBusy(false); return; }
    const requested = searchParams.get("returnTo") || "/account";
    router.push(requested.startsWith("/") && !requested.startsWith("//") ? requested : "/account"); router.refresh();
  }
  return <main className="subpage"><div className="eyebrow" style={{ justifyContent: "center" }}><span className="eyebrow-line" /> YOUR COUNTER, YOUR ACCOUNT</div><section className="auth-card"><h1>Welcome<br /><em>back.</em></h1><p className="page-lede">Sign in to revisit your orders and saved details.</p><form onSubmit={submit}><div className="field"><label htmlFor="email">Email address</label><input required id="email" name="email" type="email" autoComplete="email" /></div><div className="field"><label htmlFor="password">Password</label><input required id="password" name="password" type="password" autoComplete="current-password" minLength={8} /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" disabled={busy} type="submit"><span>{busy ? "Signing in…" : "Sign in"}</span><ArrowRight size={15} /></button></form><div className="auth-links"><Link href="/register">Create an account</Link><span>Secure, server-verified access</span></div><p className="small-note">Sign-in requires a configured database and an existing customer or staff account.</p></section></main>;
}
