import type { JournalTrip } from "@/lib/journal-trip-model";
import { parseJournalTripsRecord } from "@/lib/journal-trip-parse";

export type SharePathResult =
  | { ok: true; path: string }
  | { ok: false; reason: "no-redis" | "failed" };

/**
 * Uploads this trip into cloud storage (merge with what’s already there), then
 * creates a public read-only link. Needs Upstash Redis (same as cross-device sync).
 */
export async function fetchTripSharePath(trip: JournalTrip): Promise<SharePathResult> {
  const get = await fetch("/api/trips", { credentials: "same-origin" });
  if (!get.ok) return { ok: false, reason: "failed" };
  const json = (await get.json()) as { sync?: boolean; payload?: string };
  if (!json.sync) return { ok: false, reason: "no-redis" };

  const trips = parseJournalTripsRecord(
    typeof json.payload === "string" ? json.payload : "{}",
  );
  trips[trip.id] = trip;

  const put = await fetch("/api/trips", {
    method: "PUT",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: JSON.stringify(trips) }),
  });
  if (!put.ok) return { ok: false, reason: "failed" };

  const share = await fetch(
    `/api/trips/${encodeURIComponent(trip.id)}/share`,
    { method: "POST", credentials: "same-origin" },
  );
  if (!share.ok) return { ok: false, reason: "failed" };
  const data = (await share.json()) as { path?: string };
  if (typeof data.path !== "string") return { ok: false, reason: "failed" };
  return { ok: true, path: data.path };
}

export function absoluteUrlForPath(path: string): string {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function shareFailureMessage(result: SharePathResult): string {
  if (result.ok) return "";
  if (result.reason === "no-redis") {
    return "Guest links need cloud storage. Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local (see .env.example), then restart the dev server with npm run dev.";
  }
  return "Could not create the link. Check you’re signed in, your connection, and try again.";
}
