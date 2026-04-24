import { randomBytes } from "crypto";
import {
  getTripsRedis,
  readUserTripsJson,
} from "@/lib/trips-server-redis";
import type { JournalTrip } from "@/lib/journal-trip-model";
import { parseJournalTripsRecord } from "@/lib/journal-trip-parse";

const shareMetaKey = (token: string) => `wildroads:share:${token}`;
const tripShareStableKey = (ownerUserId: string, tripId: string) =>
  `wildroads:trip-share:${ownerUserId}:${tripId}`;

export type TripShareMeta = {
  ownerUserId: string;
  tripId: string;
};

function redisStringish(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function parseTripShareMetaValue(raw: unknown): TripShareMeta | null {
  if (raw == null) return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>;
    if (
      typeof o.ownerUserId === "string" &&
      typeof o.tripId === "string" &&
      o.ownerUserId &&
      o.tripId
    ) {
      return { ownerUserId: o.ownerUserId, tripId: o.tripId };
    }
    return null;
  }
  const s = redisStringish(raw);
  if (!s) return null;
  try {
    const o = JSON.parse(s) as TripShareMeta;
    if (
      !o ||
      typeof o.ownerUserId !== "string" ||
      typeof o.tripId !== "string"
    ) {
      return null;
    }
    return o;
  } catch {
    return null;
  }
}

/**
 * Returns an existing public token for this trip or creates one.
 * `null` when Redis is not configured.
 */
export async function ensureTripShareToken(
  ownerUserId: string,
  tripId: string,
): Promise<string | null> {
  const r = getTripsRedis();
  if (!r) return null;

  const stable = tripShareStableKey(ownerUserId, tripId);
  const existingRaw = await r.get(stable);
  const existing = redisStringish(existingRaw);
  if (existing && existing.length > 8) {
    return existing;
  }

  const token = randomBytes(18).toString("base64url");
  const meta: TripShareMeta = { ownerUserId, tripId };
  await r.set(shareMetaKey(token), JSON.stringify(meta));
  await r.set(stable, token);
  return token;
}

export async function readTripShareMeta(
  token: string,
): Promise<TripShareMeta | null> {
  const r = getTripsRedis();
  if (!r) return null;
  const raw = await r.get(shareMetaKey(token));
  return parseTripShareMetaValue(raw);
}

function normalizeShareToken(raw: string): string {
  let s = raw.trim();
  try {
    s = decodeURIComponent(s);
  } catch {
    /* keep s */
  }
  return s.trim();
}

export type ShareLookupFailure = "bad_token" | "no_trip" | "no_cloud";

export async function loadSharedTripResult(
  token: string,
): Promise<
  | { ok: true; trip: JournalTrip }
  | { ok: false; reason: ShareLookupFailure }
> {
  const normalized = normalizeShareToken(token);
  const meta = await readTripShareMeta(normalized);
  if (!meta) return { ok: false, reason: "bad_token" };
  const blob = await readUserTripsJson(meta.ownerUserId);
  if (blob == null) return { ok: false, reason: "no_cloud" };
  const trips = parseJournalTripsRecord(blob);
  const trip = trips[meta.tripId];
  if (!trip) return { ok: false, reason: "no_trip" };
  return { ok: true, trip };
}

/** Latest trip snapshot for a public share link (reads owner’s cloud blob). */
export async function loadSharedTrip(token: string): Promise<JournalTrip | null> {
  const r = await loadSharedTripResult(token);
  return r.ok ? r.trip : null;
}
