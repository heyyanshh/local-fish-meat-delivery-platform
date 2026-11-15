import test from "node:test";
import assert from "node:assert/strict";
import { calculateDeliveryFee, calculateLinePrice } from "../../src/lib/pricing.js";

test("line pricing scales integer paise from grams and quantity", () => {
  assert.equal(calculateLinePrice(17600, 1000, 500, 2), 17600);
  assert.equal(calculateLinePrice(12900, 500, 250, 1), 6450);
});

test("delivery becomes free at the configured threshold", () => {
  assert.equal(calculateDeliveryFee(49999), 4900);
  assert.equal(calculateDeliveryFee(50000), 0);
  assert.equal(calculateDeliveryFee(0), 0);
});

test("invalid amounts and weights are rejected", () => {
  assert.throws(() => calculateLinePrice(12900, 0, 250), TypeError);
  assert.throws(() => calculateDeliveryFee(-1), TypeError);
});
