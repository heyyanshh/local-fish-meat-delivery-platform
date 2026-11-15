function firstValue(...values) {
  return values.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

export function addressFromGeocoderResult(result) {
  const parts = result?.address || {};
  const street = [parts.house_number, parts.road].filter(Boolean).join(" ");
  const neighbourhood = firstValue(parts.neighbourhood, parts.suburb, parts.quarter, parts.residential);
  const fallbackAddress = String(result?.display_name || "").split(",").slice(0, 3).map((part) => part.trim()).filter(Boolean).join(", ");
  const rawPostalCode = String(parts.postcode || "").replace(/\D/g, "");

  return {
    address: [street, neighbourhood].filter(Boolean).join(", ") || fallbackAddress,
    city: firstValue(parts.city, parts.town, parts.village, parts.municipality, parts.county),
    state: firstValue(parts.state, parts.state_district),
    postalCode: /^[1-9]\d{5}$/.test(rawPostalCode) ? rawPostalCode : "",
  };
}

