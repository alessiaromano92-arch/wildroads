import type { JournalPlacePick } from "@/lib/daily-journal-entry";

export type JournalLatLng = { lat: number; lng: number };

/**
 * Resolve a journal place to coordinates (saved lat/lng, or Google Geocoder).
 * Call only after the Maps JS API is loaded.
 */
export async function journalPlaceToLatLng(
  place: JournalPlacePick,
): Promise<JournalLatLng | null> {
  if (
    typeof place.lat === "number" &&
    typeof place.lng === "number" &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng)
  ) {
    return { lat: place.lat, lng: place.lng };
  }
  const addr = place.formattedAddress?.trim();
  if (!place.placeId && !addr) return null;

  const geocoder = new google.maps.Geocoder();
  const request: google.maps.GeocoderRequest = place.placeId
    ? { placeId: place.placeId }
    : { address: addr! };

  const { results, status } = await new Promise<{
    results: google.maps.GeocoderResult[] | null;
    status: string;
  }>((resolve) => {
    geocoder.geocode(request, (results, status) => {
      resolve({ results, status: String(status) });
    });
  });

  if (status !== "OK" || !results?.[0]?.geometry?.location) return null;
  const loc = results[0].geometry.location;
  return { lat: loc.lat(), lng: loc.lng() };
}
