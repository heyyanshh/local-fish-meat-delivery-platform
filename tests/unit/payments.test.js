import test from "node:test";
import assert from "node:assert/strict";
import { createRazorpayOrder, getRazorpayConfig, isRazorpayReady, paymentSignature, verifyPaymentSignature, verifyWebhookSignature, webhookSignature } from "../../src/server/payments.js";

test("payment callback signature is verified against the server-known order and payment ids", () => {
  const signature = paymentSignature({ orderId: "order_cc_123", paymentId: "pay_cc_456", secret: "test-secret" });
  assert.equal(verifyPaymentSignature({ orderId: "order_cc_123", paymentId: "pay_cc_456", signature, secret: "test-secret" }), true);
  assert.equal(verifyPaymentSignature({ orderId: "order_other", paymentId: "pay_cc_456", signature, secret: "test-secret" }), false);
  assert.equal(verifyPaymentSignature({ orderId: "order_cc_123", paymentId: "pay_cc_456", signature: "not-a-digest", secret: "test-secret" }), false);
});

test("webhook signatures authenticate the exact raw body", () => {
  const rawBody = '{"event":"payment.captured","payload":{}}';
  const signature = webhookSignature(rawBody, "webhook-secret");
  assert.equal(verifyWebhookSignature({ rawBody, signature, secret: "webhook-secret" }), true);
  assert.equal(verifyWebhookSignature({ rawBody: `${rawBody} `, signature, secret: "webhook-secret" }), false);
});

test("online checkout requires server credentials and a webhook secret", () => {
  assert.equal(isRazorpayReady({ RAZORPAY_KEY_ID: "id", RAZORPAY_KEY_SECRET: "secret", RAZORPAY_WEBHOOK_SECRET: "hook", PAYMENT_CLEANUP_SECRET: "cleanup" }), true);
  assert.equal(isRazorpayReady({ RAZORPAY_KEY_ID: "id", RAZORPAY_KEY_SECRET: "secret", RAZORPAY_WEBHOOK_SECRET: "hook", PAYMENT_CLEANUP_SECRET: "" }), false);
  assert.deepEqual(getRazorpayConfig({}), { keyId: "", keySecret: "", webhookSecret: "", cleanupSecret: "" });
});

test("server-created provider orders use the server-calculated paise amount and keep credentials in the auth header", async () => {
  let request;
  const result = await createRazorpayOrder({
    orderId: "local_order_123",
    orderNumber: "CC-ABC-123",
    amountPaise: 54900,
    env: { RAZORPAY_KEY_ID: "rzp_test_example", RAZORPAY_KEY_SECRET: "server-only", RAZORPAY_WEBHOOK_SECRET: "hook", PAYMENT_CLEANUP_SECRET: "cleanup" },
    fetchImpl: async (url, init) => {
      request = { url, init };
      return { ok: true, json: async () => ({ id: "order_provider_123", amount: 54900, currency: "INR" }) };
    },
  });
  assert.equal(result.id, "order_provider_123");
  assert.equal(request.url, "https://api.razorpay.com/v1/orders");
  assert.equal(request.init.headers.Authorization, `Basic ${Buffer.from("rzp_test_example:server-only").toString("base64")}`);
  assert.deepEqual(JSON.parse(request.init.body), { amount: 54900, currency: "INR", receipt: "CC-ABC-123", notes: { cutcatch_order_id: "local_order_123" } });
});
