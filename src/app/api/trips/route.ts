import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getTripsRedis,
  readUserTripsJson,
  writeUserTripsJson,
} from "@/lib/trips-server-redis";

export const runtime = "nodejs";

const MAX_BYTES = 4_500_000;

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getTripsRedis()) {
    return NextResponse.json({ sync: false as const });
  }
  const payload = await readUserTripsJson(userId);
  return NextResponse.json({
    sync: true as const,
    payload: payload ?? "{}",
  });
}

export async function PUT(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!getTripsRedis()) {
    return NextResponse.json({ error: "Cloud sync disabled" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected object body" }, { status: 400 });
  }
  const payload = (body as { payload?: unknown }).payload;
  if (typeof payload !== "string") {
    return NextResponse.json({ error: "Expected string payload" }, { status: 400 });
  }
  const bytes = new TextEncoder().encode(payload).length;
  if (bytes > MAX_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return NextResponse.json({ error: "Payload is not JSON" }, { status: 400 });
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return NextResponse.json(
      { error: "Payload must be a JSON object of trips" },
      { status: 400 },
    );
  }

  try {
    await writeUserTripsJson(userId, payload);
  } catch {
    return NextResponse.json({ error: "Write failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
