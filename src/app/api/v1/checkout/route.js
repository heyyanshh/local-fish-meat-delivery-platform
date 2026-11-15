import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { db, databaseConfigured } from "@/server/db";
import { createRazorpayOrder, getRazorpayConfig, isRazorpayReady } from "@/server/payments";

const schema = z.object({
  items: z.array(z.object({ productSlug: z.string().min(1), weightGrams: z.number().int().positive(), preparation: z.string().min(1).max(80), quantity: z.number().int().min(1).max(20) })).min(1).max(30),
  slotId: z.string().min(1), idempotencyKey: z.string().min(16).max(128), paymentMethod: z.enum(["COD", "RAZORPAY"]),
  address: z.object({ name: z.string().min(2).max(80), phone: z.string().min(8).max(24), email: z.email().max(254), address: z.string().min(5).max(300), city: z.string().min(2).max(80), postalCode: z.string().regex(/^\d{6}$/) }),
  instructions: z.string().max(300).optional().default(""),
});

function publicOrder(order) {
  const { userId: _userId, ...safeOrder } = order;
  return safeOrder;
}

function paymentDetails(order, keyId) {
  if (order.paymentMethod !== "RAZORPAY" || !order.paymentProviderOrderId) return undefined;
  return { provider: "razorpay", keyId, razorpayOrderId: order.paymentProviderOrderId, amount: order.totalPaise, currency: "INR" };
}

export async function POST(request) {
  if (!databaseConfigured) return NextResponse.json({ error: "database_not_configured", demoAvailable: true }, { status: 503 });
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_checkout", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  const input = parsed.data;
  if (input.paymentMethod === "RAZORPAY" && !isRazorpayReady()) return NextResponse.json({ error: "online_payment_not_configured" }, { status: 503 });

  let order;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      order = await db.$transaction(async (tx) => {
        const existing = await tx.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
        if (existing) return existing;

        const items = [];
        let subtotalPaise = 0;
        for (const requested of input.items) {
          const variant = await tx.productVariant.findFirst({ where: { product: { slug: requested.productSlug, active: true }, active: true, weightGrams: requested.weightGrams }, include: { product: true } });
          if (!variant || !variant.prepOptions.includes(requested.preparation)) throw new Error("item_unavailable");
          const gramsNeeded = variant.weightGrams * requested.quantity;
          const inventory = await tx.productVariant.updateMany({ where: { id: variant.id, active: true, stockGrams: { gte: gramsNeeded } }, data: { stockGrams: { decrement: gramsNeeded } } });
          if (inventory.count !== 1) throw new Error("out_of_stock");
          const lineTotalPaise = variant.pricePaise * requested.quantity;
          subtotalPaise += lineTotalPaise;
          items.push({ variantId: variant.id, productName: variant.product.name, variantLabel: variant.label, preparation: requested.preparation, quantity: requested.quantity, weightGrams: variant.weightGrams, unitPricePaise: variant.pricePaise, lineTotalPaise });
        }

        const slotRows = await tx.$queryRaw`UPDATE "DeliverySlot" SET "reservedCount" = "reservedCount" + 1 WHERE "id" = ${input.slotId} AND "areaCode" = ${input.address.postalCode} AND "active" = true AND "startsAt" > NOW() AND "reservedCount" < "capacity" RETURNING "id"`;
        if (slotRows.length !== 1) throw new Error("slot_unavailable");
        const deliveryPaise = subtotalPaise >= 50000 ? 0 : 4900;
        const orderNumber = `CC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
        return tx.order.create({ data: {
          orderNumber, idempotencyKey: input.idempotencyKey, userId: session.user.id, slotId: input.slotId,
          status: input.paymentMethod === "RAZORPAY" ? "AWAITING_PAYMENT" : "CONFIRMED",
          paymentStatus: "PENDING", paymentMethod: input.paymentMethod,
          subtotalPaise, deliveryPaise, totalPaise: subtotalPaise + deliveryPaise,
          addressJson: input.address, instructions: input.instructions,
          expiresAt: input.paymentMethod === "RAZORPAY" ? new Date(Date.now() + 15 * 60_000) : null,
          items: { create: items },
          history: { create: { status: input.paymentMethod === "RAZORPAY" ? "AWAITING_PAYMENT" : "CONFIRMED", actorId: session.user.id, note: input.paymentMethod === "RAZORPAY" ? "Waiting for online payment." : "Order placed with cash on delivery." } },
        } });
      }, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 });
      break;
    } catch (error) {
      if (error?.code === "P2034" && attempt < 2) continue;
      if (error?.code === "P2002") {
        order = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } }).catch(() => null);
        if (order) break;
      }
      const reason = error instanceof Error ? error.message : "checkout_failed";
      const status = ["item_unavailable", "out_of_stock", "slot_unavailable"].includes(reason) ? 409 : 503;
      return NextResponse.json({ error: reason === "out_of_stock" ? "out_of_stock" : reason === "slot_unavailable" ? "slot_unavailable" : reason === "item_unavailable" ? "item_unavailable" : "checkout_unavailable" }, { status });
    }
  }

  if (!order) return NextResponse.json({ error: "checkout_conflict_retry" }, { status: 409 });
  if (order.userId !== session.user.id || order.paymentMethod !== input.paymentMethod) return NextResponse.json({ error: "idempotency_key_conflict" }, { status: 409 });
  if (["PAYMENT_FAILED", "CANCELLED", "REFUNDED"].includes(order.status)) return NextResponse.json({ error: "order_payment_closed", retryWithNewKey: true }, { status: 409 });
  if (order.status === "AWAITING_PAYMENT" && order.expiresAt && order.expiresAt <= new Date()) return NextResponse.json({ error: "payment_window_expired", retryWithNewKey: true }, { status: 409 });
  if (order.paymentMethod === "COD") return NextResponse.json({ order: publicOrder(order) }, { status: 201 });

  if (!order.paymentProviderOrderId) {
    try {
      const providerOrder = await createRazorpayOrder({ orderId: order.id, orderNumber: order.orderNumber, amountPaise: order.totalPaise });
      await db.order.updateMany({ where: { id: order.id, paymentProviderOrderId: null }, data: { paymentProviderOrderId: providerOrder.id } });
      order = await db.order.findUnique({ where: { id: order.id } });
    } catch {
      return NextResponse.json({ error: "payment_initialization_failed", retryable: true }, { status: 503 });
    }
  }
  const { keyId } = getRazorpayConfig();
  return NextResponse.json({ order: publicOrder(order), payment: paymentDetails(order, keyId) }, { status: 201 });
}
