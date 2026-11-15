import { z } from "zod";

const optionalText = (max) => z.string().trim().max(max).optional();

export const customerProfileUpdateSchema = z.object({
  phone: optionalText(24).refine((value) => value === undefined || value === "" || value.length >= 8, "Enter at least 8 characters for the phone number."),
  address: optionalText(300),
  city: optionalText(80),
  state: optionalText(100),
  postalCode: optionalText(6).refine((value) => value === undefined || value === "" || /^[1-9]\d{5}$/.test(value), "Enter a valid six-digit Indian PIN code."),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).refine((value) => {
  const hasLatitude = Object.hasOwn(value, "latitude");
  const hasLongitude = Object.hasOwn(value, "longitude");
  return hasLatitude === hasLongitude && (!hasLatitude || (value.latitude === null) === (value.longitude === null));
}, { path: ["latitude"], message: "Provide both map coordinates or neither." });

export function profileAddressFields(value) {
  const address = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  return {
    address: typeof address.address === "string" ? address.address : "",
    city: typeof address.city === "string" ? address.city : "",
    state: typeof address.state === "string" ? address.state : "",
    postalCode: typeof address.postalCode === "string" ? address.postalCode : "",
    latitude: typeof address.latitude === "number" ? address.latitude : null,
    longitude: typeof address.longitude === "number" ? address.longitude : null,
  };
}
