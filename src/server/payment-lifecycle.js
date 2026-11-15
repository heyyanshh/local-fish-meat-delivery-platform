export async function releaseOrderReservations(tx, order) {
  const slot = await tx.deliverySlot.updateMany({
    where: { id: order.slotId, reservedCount: { gt: 0 } },
    data: { reservedCount: { decrement: 1 } },
  });
  if (slot.count !== 1) throw new Error("reservation_release_conflict");
  for (const item of order.items || []) {
    if (!item.variantId) continue;
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockGrams: { increment: item.weightGrams * item.quantity } },
    });
  }
}

export async function failAwaitingPayment(tx, order, { code, actorId = null, note } = {}) {
  if (order.status !== "AWAITING_PAYMENT" || ["PAID", "REFUNDED"].includes(order.paymentStatus)) return false;
  await releaseOrderReservations(tx, order);
  await tx.order.update({
    where: { id: order.id },
    data: { status: "PAYMENT_FAILED", paymentStatus: "FAILED", paymentFailureCode: code || "payment_failed" },
  });
  await tx.orderStatusHistory.create({
    data: { orderId: order.id, status: "PAYMENT_FAILED", actorId, note: note || "Payment could not be completed; stock and delivery capacity were released." },
  });
  return true;
}

export async function markPaymentCaptured(tx, order, { paymentId, actorId = null } = {}) {
  if (order.paymentStatus === "PAID" && order.paymentProviderPaymentId === paymentId) return { changed: false, late: false };
  if (["PAYMENT_FAILED", "CANCELLED"].includes(order.status)) {
    await tx.order.update({
      where: { id: order.id },
      data: { paymentStatus: "PAID", paymentProviderPaymentId: paymentId, paymentFailureCode: "late_capture_requires_manual_refund" },
    });
    await tx.orderStatusHistory.create({
      data: { orderId: order.id, status: order.status, actorId, note: "A payment was captured after the order closed. Review and refund before fulfillment." },
    });
    return { changed: true, late: true };
  }
  if (order.status !== "AWAITING_PAYMENT") return { changed: false, late: false };
  await tx.order.update({
    where: { id: order.id },
    data: { status: "CONFIRMED", paymentStatus: "PAID", paymentProviderPaymentId: paymentId, paymentFailureCode: null },
  });
  await tx.orderStatusHistory.create({
    data: { orderId: order.id, status: "CONFIRMED", actorId, note: "Razorpay payment captured." },
  });
  return { changed: true, late: false };
}

export async function expireAwaitingPayments(db, now = new Date(), limit = 100) {
  const expired = await db.order.findMany({
    where: { status: "AWAITING_PAYMENT", expiresAt: { lte: now } },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: limit,
  });
  let count = 0;
  for (const { id } of expired) {
    const didExpire = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true } });
      if (!order || order.status !== "AWAITING_PAYMENT" || !order.expiresAt || order.expiresAt > now) return false;
      return failAwaitingPayment(tx, order, { code: "payment_window_expired", note: "Payment window expired; stock and delivery capacity were released." });
    }, { isolationLevel: "Serializable" });
    if (didExpire) count += 1;
  }
  return count;
}
