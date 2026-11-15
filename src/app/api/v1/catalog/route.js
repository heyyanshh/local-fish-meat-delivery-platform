import { NextResponse } from "next/server";
import { getCatalog } from "@/server/catalog";

export async function GET() {
  try { return NextResponse.json(await getCatalog(), { headers: { "Cache-Control": "private, max-age=0, must-revalidate" } }); }
  catch { return NextResponse.json({ error: "catalog_unavailable" }, { status: 503 }); }
}
