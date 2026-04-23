/**
 * Best-effort lat/lng from a pasted Google Maps URL.
 * Short links (goo.gl) are not resolved here.
 */
export function parseLatLngFromGoogleMapsUrl(raw: string): {
  lat: number;
  lng: number;
} | null {
  const u = raw.trim();
  if (!u) return null;

  const at = u.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)(?:,|z|\/|$)/i);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  const d34 = u.match(/[!?&]3d(-?\d+\.?\d*)[!&]4d(-?\d+\.?\d*)/i);
  if (d34) {
    const lat = Number(d34[1]);
    const lng = Number(d34[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  try {
    const base =
      u.startsWith("http://") || u.startsWith("https://") ? u : `https://${u}`;
    const url = new URL(base);
    const q = url.searchParams.get("q") ?? url.searchParams.get("query");
    if (q) {
      const decoded = decodeURIComponent(q.replace(/\+/g, " "));
      const pair = decoded.match(/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/);
      if (pair) {
        const lat = Number(pair[1]);
        const lng = Number(pair[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
      }
    }
    const ll = url.searchParams.get("ll");
    if (ll) {
      const [a, b] = ll.split(",").map((x) => Number(x.trim()));
      if (Number.isFinite(a) && Number.isFinite(b)) return { lat: a, lng: b };
    }
  } catch {
    return null;
  }

  return null;
}
