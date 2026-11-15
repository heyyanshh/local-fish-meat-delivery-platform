import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { db, databaseConfigured } from "@/server/db";
import { limitResponse } from "@/server/rate-limit";

const schema = z.object({ name: z.string().trim().min(2).max(80), email: z.email().max(254), password: z.string().min(10).max(128) });

export async function POST(request) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_registration", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const email = parsed.data.email.toLowerCase();
    const retryAfter = await limitResponse(db, request, { scope: "registration", subject: email, limit: 10, windowSeconds: 900 });
    if (retryAfter) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "email_already_registered" }, { status: 409 });
    const user = await db.user.create({ data: { name: parsed.data.name, email, passwordHash: await hash(parsed.data.password, 12), role: "CUSTOMER" }, select: { id: true, email: true, name: true } });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") return NextResponse.json({ error: "email_already_registered" }, { status: 409 });
    return NextResponse.json({ error: "registration_unavailable" }, { status: 503 });
  }
}
