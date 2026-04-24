import { NextResponse } from "next/server";
import { loadSharedTripResult } from "@/lib/trips-share-redis";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length > 500) {
    return NextResponse.json({ error: "Bad link" }, { status: 400 });
  }

  const result = await loadSharedTripResult(token);
  if (!result.ok) {
    return NextResponse.json(
      { error: "Not found", reason: result.reason },
      { status: 404 },
    );
  }

  return NextResponse.json(
    { trip: result.trip },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}
