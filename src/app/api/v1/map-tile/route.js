import { NextResponse } from "next/server";

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const tileCache = new Map();

function tileCoordinates(params) {
  const parts = [params.get("z"), params.get("x"), params.get("y")];
  if (parts.some((part) => !/^\d+$/.test(part || ""))) return null;
  const [zoom, x, y] = parts.map(Number);
  if (!Number.isInteger(zoom) || zoom < 0 || zoom > 19) return null;
  const tileCount = 2 ** zoom;
  if (x < 0 || y < 0 || x >= tileCount || y >= tileCount) return null;
  return { zoom, x, y };
}

function imageResponse(bytes, upstreamCacheControl) {
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": upstreamCacheControl || "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function cacheLifetime(cacheControl) {
  const maxAge = cacheControl?.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1];
  return maxAge ? Number(maxAge) * 1000 : CACHE_TTL_MS;
}

export async function GET(request) {
  const coordinate = tileCoordinates(new URL(request.url).searchParams);
  if (!coordinate) return new NextResponse("Invalid map tile coordinates.", { status: 400 });

  const key = `${coordinate.zoom}/${coordinate.x}/${coordinate.y}`;
  const cached = tileCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return imageResponse(cached.bytes, cached.cacheControl);

  const template = process.env.OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const upstreamUrl = template
    .replace("{z}", String(coordinate.zoom))
    .replace("{x}", String(coordinate.x))
    .replace("{y}", String(coordinate.y));

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
        "User-Agent": "CutAndCatch/1.0 (+https://github.com/heyyanshh/local-fish-meat-delivery-platform)",
      },
    });
    if (!upstream.ok) return new NextResponse("Map tiles are temporarily unavailable.", { status: 502 });
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    const cacheControl = upstream.headers.get("cache-control") || undefined;
    if (tileCache.size >= 512) tileCache.delete(tileCache.keys().next().value);
    tileCache.set(key, { bytes, cacheControl, expiresAt: Date.now() + cacheLifetime(cacheControl) });
    return imageResponse(bytes, cacheControl);
  } catch {
    return new NextResponse("Map tiles are temporarily unavailable.", { status: 502 });
  }
}

