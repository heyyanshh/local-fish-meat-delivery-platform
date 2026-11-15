export const demoDeliverySlots = [
  { id: "demo-morning", label: "Sample window · 10 am–1 pm", detail: "Local demo only; no booking is made", demo: true },
  { id: "demo-evening", label: "Sample window · 4 pm–7 pm", detail: "Local demo only; no booking is made", demo: true },
  { id: "demo-next-day", label: "Sample window · next day, 10 am–1 pm", detail: "Local demo only; no booking is made", demo: true },
];

export function isValidIndianPinCode(value) {
  return /^[1-9]\d{5}$/.test(String(value ?? "").trim());
}

export function getDemoDeliverySlots(postalCode) {
  return isValidIndianPinCode(postalCode) ? demoDeliverySlots.map((slot) => ({ ...slot })) : [];
}

export function sanitizePinCode(value) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 6);
}

export function isLoopbackHost(value) {
  const host = String(value ?? "").trim().toLowerCase();
  const hostname = host.startsWith("[") ? host.slice(1, host.indexOf("]")) : host.split(":")[0];
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isLocalDemoRequest({ nodeEnv, localDemoEnabled, host }) {
  return nodeEnv === "development" || (localDemoEnabled && isLoopbackHost(host));
}

export function getDeliveryMode({ databaseConfigured, nodeEnv, localDemoEnabled, host }) {
  if (isLocalDemoRequest({ nodeEnv, localDemoEnabled, host })) return "demo";
  if (databaseConfigured) return "database";
  return "unavailable";
}

