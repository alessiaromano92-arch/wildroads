import type { JournalTrip } from "@/context/journal-trips-context";
import type { JournalPlacePick } from "@/lib/daily-journal-entry";
import {
  hasPlaceContent,
  normalizeDailyJournalEntry,
  placeDisplayLine,
} from "@/lib/daily-journal-entry";
import { cleanTripImageTitleForSearch } from "@/lib/trip-card-photo-nature";

/** Count saved “stops & sights” across every day of the trip. */
export function countTripStops(trip: JournalTrip): number {
  let n = 0;
  for (const d of trip.days) {
    const raw = trip.dayJournal?.[d.dateISO];
    if (!raw) continue;
    const entry = normalizeDailyJournalEntry(raw);
    for (const s of entry.stops) {
      if (hasPlaceContent(s)) n += 1;
    }
  }
  return n;
}

const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1504280390367-361c6d9ca68c?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80",
  "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?auto=format&fit=crop&w=1400&q=80",
] as const;

/** Same URLs as `tripCardFallbackImageUrl` — used by the trip-card photo API for static fallbacks. */
export const TRIP_CARD_STATIC_NATURE_URLS = FALLBACK_IMAGES;

/** Stable nature / road-trip placeholder per trip. */
export function tripCardFallbackImageUrl(tripId: string): string {
  let h = 0;
  for (let i = 0; i < tripId.length; i += 1) {
    h = (h * 31 + tripId.charCodeAt(i)) | 0;
  }
  return FALLBACK_IMAGES[Math.abs(h) % FALLBACK_IMAGES.length];
}

/** For image search when no destination pin: title without years / edge-only digits. */
export function stripTripTitleForImageSearch(raw: string): string {
  let t = cleanTripImageTitleForSearch(raw);
  t = t.replace(/\s*\b(19|20)\d{2}\b\s*/g, " ");
  t = t.replace(/^\d+\s+/, "");
  t = t.replace(/\s+\d+$/g, "");
  return t.replace(/\s+/g, " ").trim();
}

const TRANSIT_HUB_RE =
  /\b(airport|international\s+airport|aerodrome|station|railway\s+station|train\s+station|bus\s+station|coach\s+station|terminal|ferry\s+terminal|hotel|motel|hostel|inn)\b/i;

/** True when the label looks like a transit hub or generic hotel (skip for hero imagery). */
export function isTransitHubPlaceLabel(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return false;
  return TRANSIT_HUB_RE.test(t);
}

/**
 * Chronological “where the trip goes” pins: each leg’s **end** only (never starts),
 * then day stops **excluding index 0** (first POI skipped for hero).
 */
export function collectTripHeroPlaceCandidates(trip: JournalTrip): JournalPlacePick[] {
  const out: JournalPlacePick[] = [];
  for (const d of trip.days) {
    const raw = trip.dayJournal?.[d.dateISO];
    if (!raw) continue;
    const e = normalizeDailyJournalEntry(raw);
    for (const leg of e.travelLegs) {
      if (hasPlaceContent(leg.endPoint)) out.push(leg.endPoint);
    }
    for (let i = 1; i < e.stops.length; i += 1) {
      if (hasPlaceContent(e.stops[i]!)) out.push(e.stops[i]!);
    }
  }
  return out;
}

/**
 * Prefer the chronologically last non–transit-hub pin (arrival / late stops).
 * If every candidate matches hub words, still use the last pin so we never return empty when data exists.
 */
export function pickTripHeroDestinationPlace(
  trip: JournalTrip,
): JournalPlacePick | null {
  const c = collectTripHeroPlaceCandidates(trip);
  if (c.length === 0) return null;
  for (let i = c.length - 1; i >= 0; i -= 1) {
    const p = c[i]!;
    const blob = `${placeDisplayLine(p)} ${p.formattedAddress ?? ""}`;
    if (!isTransitHubPlaceLabel(blob)) return p;
  }
  return c[c.length - 1] ?? null;
}

/** `/api/trip-card-photo` URL: destination pin when possible, else title-only search. */
export function buildTripCardPhotoUrl(trip: JournalTrip): string {
  const params = new URLSearchParams();
  params.set("tid", trip.id);
  const titleClean =
    stripTripTitleForImageSearch(trip.name) || trip.name.trim() || "Road trip";
  const hero = pickTripHeroDestinationPlace(trip);

  if (hero?.placeId?.trim()) {
    const pid = hero.placeId.trim().replace(/^places\//, "");
    if (pid) params.set("placeId", pid);
    params.set("title", hero.displayName?.trim() || titleClean);
  } else if (hero && hasPlaceContent(hero)) {
    params.set("address", hero.formattedAddress.trim());
    params.set("title", hero.displayName?.trim() || titleClean);
  } else {
    params.set("title", titleClean);
    params.set("address", titleClean);
  }

  return `/api/trip-card-photo?${params.toString()}`;
}
