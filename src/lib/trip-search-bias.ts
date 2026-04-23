import type { JournalTrip } from "@/context/journal-trips-context";
import type { JournalPlacePick } from "@/lib/daily-journal-entry";
import { normalizeDailyJournalEntry } from "@/lib/daily-journal-entry";

function pickSavedCoords(p: JournalPlacePick): google.maps.LatLngLiteral | null {
  if (
    typeof p.lat === "number" &&
    typeof p.lng === "number" &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng)
  ) {
    return { lat: p.lat, lng: p.lng };
  }
  return null;
}

/**
 * Average of all saved lat/lng pins on this trip’s journal days.
 * Used to bias Places Autocomplete toward where the trip already lives on the map.
 */
export function computeTripSearchBiasCenter(
  trip: JournalTrip,
): google.maps.LatLngLiteral | null {
  const samples: google.maps.LatLngLiteral[] = [];

  for (const day of trip.days) {
    const raw = trip.dayJournal?.[day.dateISO];
    const entry = normalizeDailyJournalEntry(raw ?? null);
    for (const leg of entry.travelLegs) {
      const s = pickSavedCoords(leg.startPoint);
      const e = pickSavedCoords(leg.endPoint);
      if (s) samples.push(s);
      if (e) samples.push(e);
    }
    const acc = pickSavedCoords(entry.accommodation);
    if (acc) samples.push(acc);
    for (const stop of entry.stops) {
      const c = pickSavedCoords(stop);
      if (c) samples.push(c);
    }
  }

  if (samples.length === 0) return null;

  let lat = 0;
  let lng = 0;
  for (const p of samples) {
    lat += p.lat;
    lng += p.lng;
  }
  return { lat: lat / samples.length, lng: lng / samples.length };
}
