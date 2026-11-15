import { NextResponse } from "next/server";

const CACHE_TTL_MS = 30 * 60 * 1000;
const MIN_REQUEST_GAP_MS = 1100;
const cache = new Map();
let lastRequestAt = 0;
let requestQueue = Promise.resolve();

async function fetchNominatim(url) {
  const key = url.toString();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const pending = requestQueue.then(async () => {
    const delay = Math.max(0, MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "CutAndCatch/1.0 (+https://github.com/heyyanshh/local-fish-meat-delivery-platform)",
        },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("geocoding_unavailable");
      const data = await response.json();
      if (cache.size >= 200) cache.delete(cache.keys().next().value);
      cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
      return data;
    } finally {
      clearTimeout(timeout);
    }
  });
  requestQueue = pending.then(() => undefined, () => undefined);
  return pending;
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const query = (params.get("q") || "").trim();
  const latitude = Number(params.get("lat"));
  const longitude = Number(params.get("lon"));
  const hasQuery = Boolean(query);
  const hasCoordinates = params.has("lat") && params.has("lon");

  if (hasQuery === hasCoordinates) return NextResponse.json({ error: "provide_search_or_coordinates" }, { status: 400 });

  const isSearch = hasQuery;
  if (isSearch && (query.length < 3 || query.length > 120)) return NextResponse.json({ error: "invalid_search_query" }, { status: 400 });
  if (hasCoordinates && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180)) {
    return NextResponse.json({ error: "invalid_coordinates" }, { status: 400 });
  }

  const baseUrl = (process.env.NOMINATIM_BASE_URL || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
  const endpoint = new URL(`${baseUrl}/${isSearch ? "search" : "reverse"}`);
  endpoint.searchParams.set("format", "jsonv2");
  endpoint.searchParams.set("addressdetails", "1");
  if (isSearch) {
    endpoint.searchParams.set("q", query);
    endpoint.searchParams.set("countrycodes", "in");
    endpoint.searchParams.set("limit", "5");
  } else {
    endpoint.searchParams.set("lat", String(latitude));
    endpoint.searchParams.set("lon", String(longitude));
    endpoint.searchParams.set("zoom", "18");
  }

  try {
    const data = await fetchNominatim(endpoint);
    return NextResponse.json({ results: Array.isArray(data) ? data : data?.place_id ? [data] : [] });
  } catch {
    return NextResponse.json({ error: "geocoding_unavailable" }, { status: 503 });
  }
}

