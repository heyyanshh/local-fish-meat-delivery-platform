import test from "node:test";
import assert from "node:assert/strict";
import { canTransition } from "../../src/server/orders.js";

test("operators can move an order only along the defined lifecycle", () => {
  assert.equal(canTransition("CONFIRMED", "ACCEPTED", "PICKER"), true);
  assert.equal(canTransition("PICKING", "PACKED", "PICKER"), true);
  assert.equal(canTransition("PACKED", "OUT_FOR_DELIVERY", "PICKER"), false);
  assert.equal(canTransition("PACKED", "OUT_FOR_DELIVERY", "RIDER"), true);
  assert.equal(canTransition("DELIVERED", "PICKING", "ADMIN"), false);
});

test("riders can update delivery steps but customers cannot transition orders", () => {
  assert.equal(canTransition("OUT_FOR_DELIVERY", "DELIVERED", "RIDER"), true);
  assert.equal(canTransition("OUT_FOR_DELIVERY", "DELIVERED", "CUSTOMER"), false);
});

test("pending payments can be cancelled, paid orders require a return flow, and delivered orders can be returned", () => {
  assert.equal(canTransition("AWAITING_PAYMENT", "CANCELLED", "MANAGER"), true);
  assert.equal(canTransition("AWAITING_PAYMENT", "ACCEPTED", "PICKER"), false);
  assert.equal(canTransition("CONFIRMED", "CANCELLED", "PICKER"), false);
  assert.equal(canTransition("DELIVERED", "RETURN_REQUESTED", "RIDER"), true);
  assert.equal(canTransition("RETURN_REQUESTED", "REFUNDED", "MANAGER"), false);
});
