/** Browser key for Maps JavaScript API + Places (Autocomplete). */
export function getGoogleMapsBrowserKey(): string | undefined {
  if (typeof process === "undefined") return undefined;
  const k = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : undefined;
}
