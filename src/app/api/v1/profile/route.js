import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db, databaseConfigured } from "@/server/db";
import { customerProfileUpdateSchema, profileAddressFields } from "@/lib/customer-profile";
import { isLocalDemoRequest } from "@/lib/delivery-slots";

export const dynamic = "force-dynamic";

async function signedInCustomer() {
  const session = await auth();
  return session?.user?.id ? session.user : null;
}

function isLocalDemo(request) {
  return isLocalDemoRequest({
    nodeEnv: process.env.NODE_ENV,
    localDemoEnabled: process.env.CUT_CATCH_LOCAL_DEMO === "true",
    host: request.headers.get("host"),
  });
}

function localProfile(customer, values = {}) {
  return {
    name: customer?.name || "",
    email: customer?.email || "",
    phone: typeof values.phone === "string" ? values.phone : "",
    ...profileAddressFields(values),
  };
}

function profileResponse(profile, mode) {
  return NextResponse.json({ profile, mode }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET(request) {
  const localDemo = isLocalDemo(request);
  if (!databaseConfigured) {
    return localDemo ? profileResponse(localProfile(null), "local-demo") : NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }
  const customer = await signedInCustomer();
  if (!customer) {
    return localDemo ? profileResponse(localProfile(null), "local-demo") : NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: customer.id },
      select: { name: true, email: true, phone: true, addressJson: true },
    });
    if (!user) {
      return localDemo ? profileResponse(localProfile(customer), "local-demo") : NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    }
    return profileResponse({
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      ...profileAddressFields(user.addressJson),
    }, "database");
  } catch {
    return localDemo ? profileResponse(localProfile(customer), "local-demo") : NextResponse.json({ error: "profile_unavailable" }, { status: 503 });
  }
}

export async function PATCH(request) {
  const localDemo = isLocalDemo(request);
  const customer = await signedInCustomer();
  if (!customer) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "invalid_profile" }, { status: 400 }); }
  const parsed = customerProfileUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid_profile", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  if (!databaseConfigured) {
    return localDemo ? profileResponse(localProfile(customer, parsed.data), "local-demo") : NextResponse.json({ error: "database_not_configured" }, { status: 503 });
  }

  try {
    const existing = await db.user.findUnique({ where: { id: customer.id }, select: { phone: true, addressJson: true } });
    if (!existing) {
      return localDemo ? profileResponse(localProfile(customer, parsed.data), "local-demo") : NextResponse.json({ error: "profile_not_found" }, { status: 404 });
    }
    const update = parsed.data;
    const currentAddress = profileAddressFields(existing.addressJson);
    const nextAddress = { ...currentAddress };
    for (const field of ["address", "city", "state", "postalCode", "latitude", "longitude"]) {
      if (Object.hasOwn(update, field)) nextAddress[field] = update[field];
    }
    const user = await db.user.update({
      where: { id: customer.id },
      data: {
        ...(Object.hasOwn(update, "phone") ? { phone: update.phone || null } : {}),
        addressJson: nextAddress,
      },
      select: { name: true, email: true, phone: true, addressJson: true },
    });
    return profileResponse({
      name: user.name || "",
      email: user.email,
      phone: user.phone || "",
      ...profileAddressFields(user.addressJson),
    }, "database");
  } catch (cause) {
    const diagnostic = typeof cause?.code === "string" ? cause.code : cause instanceof Error ? cause.name : "UnknownError";
    console.error("Profile save failed", {
      name: cause instanceof Error ? cause.name : "UnknownError",
      code: typeof cause?.code === "string" ? cause.code : undefined,
      nestedCode: typeof cause?.cause?.code === "string" ? cause.cause.code : undefined,
    });
    return localDemo
      ? profileResponse(localProfile(customer, parsed.data), "local-demo")
      : NextResponse.json({ error: "profile_save_failed", diagnostic }, { status: 503 });
  }
}
