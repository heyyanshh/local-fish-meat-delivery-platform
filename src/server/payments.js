import { createHmac, timingSafeEqual } from "node:crypto";

export function getRazorpayConfig(env = process.env) {
  return {
    keyId: env.RAZORPAY_KEY_ID || "",
    keySecret: env.RAZORPAY_KEY_SECRET || "",
    webhookSecret: env.RAZORPAY_WEBHOOK_SECRET || "",
    cleanupSecret: env.PAYMENT_CLEANUP_SECRET || "",
  };
}

export function isRazorpayReady(env = process.env) {
  const { keyId, keySecret, webhookSecret, cleanupSecret } = getRazorpayConfig(env);
  return Boolean(keyId && keySecret && webhookSecret && cleanupSecret);
}

function equalHexDigest(expected, received) {
  if (typeof received !== "string" || !/^[a-f\d]{64}$/i.test(received)) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export function paymentSignature({ orderId, paymentId, secret }) {
  if (!orderId || !paymentId || !secret) return "";
  return createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
}

export function verifyPaymentSignature({ orderId, paymentId, signature, secret }) {
  const expected = paymentSignature({ orderId, paymentId, secret });
  return Boolean(expected && equalHexDigest(expected, signature));
}

export function webhookSignature(rawBody, secret) {
  if (!secret || typeof rawBody !== "string") return "";
  return createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
}

export function verifyWebhookSignature({ rawBody, signature, secret }) {
  const expected = webhookSignature(rawBody, secret);
  return Boolean(expected && equalHexDigest(expected, signature));
}

export async function razorpayRequest(path, { method = "GET", body, env = process.env, fetchImpl = fetch } = {}) {
  const { keyId, keySecret } = getRazorpayConfig(env);
  if (!keyId || !keySecret) throw new Error("payment_provider_not_configured");
  const authorization = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetchImpl(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Basic ${authorization}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error("payment_provider_request_failed");
  return data;
}

export async function createRazorpayOrder({ orderId, orderNumber, amountPaise, env = process.env, fetchImpl = fetch }) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) throw new Error("invalid_payment_amount");
  const data = await razorpayRequest("orders", {
    method: "POST",
    body: {
      amount: amountPaise,
      currency: "INR",
      receipt: orderNumber,
      notes: { cutcatch_order_id: orderId },
    },
    env,
    fetchImpl,
  });
  if (!data?.id || data.amount !== amountPaise || data.currency !== "INR") throw new Error("payment_provider_response_invalid");
  return data;
}

export async function fetchRazorpayPayment(paymentId, env = process.env) {
  return razorpayRequest(`payments/${encodeURIComponent(paymentId)}`, { env });
}

export async function createRazorpayRefund(paymentId, { orderId, reason }, env = process.env) {
  return razorpayRequest(`payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: { notes: { cutcatch_order_id: orderId, reason: (reason || "Customer return").slice(0, 100) } },
    env,
  });
}
