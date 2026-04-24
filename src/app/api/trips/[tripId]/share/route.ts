import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { parseJournalTripsRecord } from "@/lib/journal-trip-parse";
import { readUserTripsJson } from "@/lib/trips-server-redis";
import { ensureTripShareToken } from "@/lib/trips-share-redis";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ tripId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  if (!tripId || typeof tripId !== "string" || tripId.length > 200) {
    return NextResponse.json({ error: "Bad trip id" }, { status: 400 });
  }

  const blob = await readUserTripsJson(userId);
  if (blob == null) {
    return NextResponse.json(
      {
        error:
          "Cloud storage is not set up on this server, so links that work for everyone cannot be created yet.",
      },
      { status: 503 },
    );
  }

  const trips = parseJournalTripsRecord(blob);
  if (!trips[tripId]) {
    return NextResponse.json(
      { error: "Trip not found in your saved journal." },
      { status: 404 },
    );
  }

  const token = await ensureTripShareToken(userId, tripId);
  if (!token) {
    return NextResponse.json(
      { error: "Could not create a share link (storage unavailable)." },
      { status: 503 },
    );
  }

  return NextResponse.json({ path: `/share/${encodeURIComponent(token)}` });
}
