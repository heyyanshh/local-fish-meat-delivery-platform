export function calculateLinePrice(basePricePaise, baseWeightGrams, selectedWeightGrams, quantity = 1) {
  for (const value of [basePricePaise, baseWeightGrams, selectedWeightGrams, quantity]) {
    if (!Number.isInteger(value) || value <= 0) throw new TypeError("Price, weight, and quantity must be positive integers");
  }
  return Math.round(basePricePaise * selectedWeightGrams / baseWeightGrams) * quantity;
}

export function calculateDeliveryFee(subtotalPaise, thresholdPaise = 50000, feePaise = 4900) {
  if (!Number.isInteger(subtotalPaise) || subtotalPaise < 0) throw new TypeError("Subtotal must be a non-negative integer in paise");
  return subtotalPaise === 0 || subtotalPaise >= thresholdPaise ? 0 : feePaise;
}
