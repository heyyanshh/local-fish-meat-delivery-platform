"use client";

import { signOut } from "next-auth/react";
export default function SignOutButton() { return <button className="text-link" onClick={() => signOut({ callbackUrl: "/" })}>Sign out</button>; }
