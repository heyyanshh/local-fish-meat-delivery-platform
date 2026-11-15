export const transitions = {
  AWAITING_PAYMENT: ["CANCELLED"],
  CONFIRMED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["PICKING", "CANCELLED"],
  PICKING: ["PACKED", "CANCELLED"],
  PACKED: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "RETURN_REQUESTED"],
  DELIVERED: ["RETURN_REQUESTED"],
  RETURN_REQUESTED: [], CANCELLED: [], PAYMENT_FAILED: [], REFUNDED: [],
};

export function canTransition(from, to, role) {
  if (!transitions[from]?.includes(to)) return false;
  if (["ADMIN", "MANAGER"].includes(role)) return true;
  if (role === "PICKER") return ["ACCEPTED", "PICKING", "PACKED"].includes(to);
  if (role === "RIDER") return ["OUT_FOR_DELIVERY", "DELIVERED", "RETURN_REQUESTED"].includes(to);
  return false;
}
