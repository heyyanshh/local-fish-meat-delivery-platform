"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { ArrowRight } from "lucide-react";

export default function RegisterClient() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    const body = Object.fromEntries(data.entries());
    if (body.password !== body.confirmPassword) { setError("Those passwords don’t match yet."); setBusy(false); return; }
    try {
      const response = await fetch("/api/v1/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error === "database_not_configured" ? "Create an account after PostgreSQL is configured." : result.error === "email_already_registered" ? "That email already has an account. Try signing in." : "Please check the details and try again.");
      const login = await signIn("credentials", { email: body.email, password: body.password, redirect: false });
      if (login?.error) throw new Error("Your account was created. Please sign in to continue.");
      router.push("/account"); router.refresh();
    } catch (cause) { setError(cause.message); setBusy(false); }
  }
  return <main className="subpage"><div className="eyebrow" style={{ justifyContent: "center" }}><span className="eyebrow-line" /> A BETTER COUNTER EXPERIENCE</div><section className="auth-card"><h1>Make yourself<br /><em>at home.</em></h1><p className="page-lede">Create an account to keep your orders and delivery details together.</p><form onSubmit={submit}><div className="field"><label htmlFor="name">Your name</label><input required id="name" name="name" autoComplete="name" minLength={2} maxLength={80} /></div><div className="field"><label htmlFor="email">Email address</label><input required id="email" name="email" type="email" autoComplete="email" /></div><div className="field"><label htmlFor="password">Password</label><input required id="password" name="password" type="password" autoComplete="new-password" minLength={10} /></div><div className="field"><label htmlFor="confirmPassword">Confirm password</label><input required id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} /></div>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark" disabled={busy} type="submit"><span>{busy ? "Creating account…" : "Create account"}</span><ArrowRight size={15} /></button></form><div className="auth-links"><Link href="/sign-in">Already have an account? Sign in</Link></div></section></main>;
}
