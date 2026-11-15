import test from "node:test";
import assert from "node:assert/strict";
import { checkoutAddressSchema } from "../../src/lib/checkout-address.js";
import { addressFromGeocoderResult } from "../../src/lib/geocoding.js";
import { getDeliveryMode, getDemoDeliverySlots, isValidIndianPinCode, sanitizePinCode } from "../../src/lib/delivery-slots.js";

test("PIN format is checked separately from configured delivery coverage", () => {
  assert.equal(isValidIndianPinCode("560001"), true);
  assert.equal(isValidIndianPinCode("000000"), false);
  assert.equal(isValidIndianPinCode("56001"), false);
  assert.equal(isValidIndianPinCode("5600017"), false);
  assert.equal(isValidIndianPinCode("56A001"), false);
  assert.equal(sanitizePinCode("56-00 17"), "560017");
});

test("local demo has sample windows for every six-digit PIN", () => {
  assert.equal(getDeliveryMode({ databaseConfigured: true, nodeEnv: "development" }), "demo");
  assert.deepEqual(getDemoDeliverySlots("560001"), getDemoDeliverySlots("110001"));
  assert.equal(getDemoDeliverySlots("56A001").length, 0);
});

test("production uses configured live zones and does not claim coverage without a database", () => {
  assert.equal(getDeliveryMode({ databaseConfigured: true, nodeEnv: "production" }), "database");
  assert.equal(getDeliveryMode({ databaseConfigured: false, nodeEnv: "production" }), "unavailable");
});

test("checkout address accepts map coordinates and rejects partial or out-of-range coordinates", () => {
  const address = {
    name: "Sample Customer",
    phone: "+919876543210",
    email: "customer@example.com",
    address: "12 Market Road",
    city: "Bengaluru",
    state: "Karnataka",
    postalCode: "560001",
    latitude: 12.9716,
    longitude: 77.5946,
  };
  assert.equal(checkoutAddressSchema.safeParse(address).success, true);
  assert.equal(checkoutAddressSchema.safeParse({ ...address, longitude: null }).success, false);
  assert.equal(checkoutAddressSchema.safeParse({ ...address, latitude: 91 }).success, false);
  assert.equal(checkoutAddressSchema.safeParse({ ...address, postalCode: "56001" }).success, false);
  assert.equal(checkoutAddressSchema.safeParse({ ...address, postalCode: "000000" }).success, false);
});

test("map result fills address, city, state, and PIN fields", () => {
  const selected = addressFromGeocoderResult({
    display_name: "12 Market Road, Indiranagar, Bengaluru, Karnataka, 560001, India",
    address: { house_number: "12", road: "Market Road", neighbourhood: "Indiranagar", city: "Bengaluru", state: "Karnataka", postcode: "560001", country: "India" },
  });
  assert.deepEqual(selected, { address: "12 Market Road, Indiranagar", city: "Bengaluru", state: "Karnataka", postalCode: "560001" });
});

