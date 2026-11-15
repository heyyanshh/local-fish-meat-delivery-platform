import { z } from "zod";

export const checkoutAddressSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().min(8).max(24),
  email: z.email().max(254),
  address: z.string().min(5).max(300),
  city: z.string().min(2).max(80),
  state: z.string().max(100).optional().default(""),
  postalCode: z.string().regex(/^[1-9]\d{5}$/),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
}).refine(({ latitude, longitude }) => {
  const hasLatitude = typeof latitude === "number";
  const hasLongitude = typeof longitude === "number";
  return hasLatitude === hasLongitude;
}, { path: ["latitude"], message: "Provide both map coordinates or neither." });

