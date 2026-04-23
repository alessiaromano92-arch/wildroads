import { TRIP_CARD_STATIC_NATURE_URLS } from "@/lib/trip-dashboard-helpers";

/**
 * Clean search: if the trip title contains “and” or “&”, use only the first
 * location segment (e.g. “Yosemite & Vegas” → “Yosemite”).
 */
export function cleanTripImageTitleForSearch(raw: string): string {
  let t = raw.replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (/\s+and\s+/i.test(t)) {
    t = t.split(/\s+and\s+/i)[0]!.trim();
  } else if (t.includes("&")) {
    t = t.split("&")[0]!.trim();
  }
  return t.replace(/\s+/g, " ").trim();
}

/** Prefer trip title (cleaned), then Google display name, then address. */
export function resolveTripImageCleanLabel(
  titleParam: string | null | undefined,
  displayName: string,
  address: string,
): string {
  const tp = titleParam?.trim();
  if (tp) return cleanTripImageTitleForSearch(tp);
  const d = displayName.trim();
  if (d) return d;
  return address.trim();
}

/** “City, ST, USA” → “ST, USA” style tail for emergency region + nature. */
export function extractEmergencyRegionSuffix(formattedOrAddress: string): string | null {
  const parts = formattedOrAddress
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(-2).join(", ");
}

function clipQuery(q: string, max = 185): string {
  const t = q.trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1).trimEnd();
}

/**
 * Trip-card hero search order (destination + outdoors):
 * 1) [Location] [Region] scenic nature
 * 2) [Location] scenic nature (+ legacy landscape / plain loc fallbacks)
 * 3) [Region] scenic nature when it adds new geography vs the name alone
 */
/** Ordered queries for Places text search + Unsplash (destination-first, scenic). */
export function getTripImageSearchQueries(
  cleanLocation: string,
  addressOrFormattedForRegion: string,
): string[] {
  const loc = cleanLocation.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  const add = (q: string) => {
    const t = clipQuery(q);
    if (!t || out.includes(t)) return;
    out.push(t);
  };
  const region = extractEmergencyRegionSuffix(addressOrFormattedForRegion);
  const scenic = "scenic nature";

  const regionDistinctFromLoc = (): boolean => {
    if (!loc || !region) return false;
    const rl = region.toLowerCase();
    const ll = loc.toLowerCase();
    return rl !== ll && !rl.includes(ll) && !ll.includes(rl);
  };

  if (loc) {
    if (region && regionDistinctFromLoc()) add(`${loc} ${region} ${scenic}`);
    else add(`${loc} ${scenic}`);
    add(`${loc} wilderness landscape`);
    add(loc);
  }
  if (region && regionDistinctFromLoc()) add(`${region} ${scenic}`);
  else if (region && !loc) add(`${region} ${scenic}`);

  return out;
}

export async function googleTextSearchPlaceResourceName(
  apiKey: string,
  textQuery: string,
): Promise<string | null> {
  const trimmed = textQuery.trim().slice(0, 400);
  if (!trimmed) return null;
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.name",
      },
      body: JSON.stringify({ textQuery: trimmed }),
    });

    if (!res.ok) return null;
    let data: { places?: { id?: string; name?: string }[] };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return null;
    }
    const p0 = data.places?.[0];
    const resourceName = p0?.name;
    const id = p0?.id;
    if (typeof resourceName === "string" && resourceName.startsWith("places/")) {
      return resourceName;
    }
    if (typeof id === "string" && id.startsWith("places/")) return id;
    if (typeof id === "string" && id.length > 0) return `places/${id}`;
    return null;
  } catch {
    return null;
  }
}

export async function resolvePlaceResourceFromSearchHierarchy(
  apiKey: string,
  queries: string[],
): Promise<string | null> {
  for (const q of queries) {
    if (!q.trim()) continue;
    const id = await googleTextSearchPlaceResourceName(apiKey, q);
    if (id) return id;
  }
  return null;
}

export async function tryUnsplashQueryList(
  accessKey: string,
  queries: string[],
  tripIdForPick: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  for (const q of queries) {
    if (!q.trim()) continue;
    const got = await fetchUnsplashNatureImageBytes(accessKey, q, tripIdForPick);
    if (got) return got;
  }
  return null;
}

/**
 * Place-level types (Google does not tag individual photos).
 * If the pin includes one of these, we keep Google candidates; we still rank by wide aspect.
 */
const NATURE_PLACE_TYPES = new Set([
  "park",
  "national_park",
  "natural_feature",
  "campground",
  "rv_park",
  "hiking_area",
  "state_park",
  "wildlife_park",
]);

const URBAN_LEAN_TYPES = new Set([
  "locality",
  "neighborhood",
  "street_address",
  "premise",
  "subpremise",
  "route",
  "intersection",
]);

export type GooglePlacePhoto = {
  name?: string;
  widthPx?: number;
  heightPx?: number;
};

export type GooglePlaceForHero = {
  types?: string[];
  primaryType?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  photos?: GooglePlacePhoto[];
};

export async function fetchGooglePlaceForHero(
  apiKey: string,
  placeResourceName: string,
): Promise<GooglePlaceForHero | null> {
  const url = `https://places.googleapis.com/v1/${placeResourceName}`;
  try {
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask":
          "types,primaryType,displayName,formattedAddress,photos",
      },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    let data: GooglePlaceForHero;
    try {
      data = (await res.json()) as GooglePlaceForHero;
    } catch {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function collectHeroPlaceTypes(p: GooglePlaceForHero): string[] {
  const raw = [...(p.types ?? [])];
  if (p.primaryType && !raw.includes(p.primaryType)) raw.push(p.primaryType);
  return raw;
}

export function placeHasNatureBias(types: string[]): boolean {
  return types.some((t) => NATURE_PLACE_TYPES.has(t));
}

export function shouldSkipGooglePhotosForUrbanDefault(types: string[]): boolean {
  if (types.length === 0) return false;
  if (placeHasNatureBias(types)) return false;
  return types.some((t) => URBAN_LEAN_TYPES.has(t));
}

function photoLandscapeScore(photo: GooglePlacePhoto, naturePlace: boolean): number {
  const w = typeof photo.widthPx === "number" ? photo.widthPx : 0;
  const h = typeof photo.heightPx === "number" ? photo.heightPx : 0;
  const ratio = w / Math.max(h, 1);
  const minRatio = naturePlace ? 1.06 : 1.22;
  if (ratio < minRatio) return -1;
  const areaBoost = Math.min((w * h) / 1_500_000, 5);
  return ratio * 14 + areaBoost;
}

export function pickNatureBiasedGooglePhotoName(
  photos: GooglePlacePhoto[] | undefined,
  types: string[],
): string | null {
  if (!photos?.length) return null;
  const nature = placeHasNatureBias(types);
  const skipUrbanDefault = shouldSkipGooglePhotosForUrbanDefault(types);
  if (skipUrbanDefault) return null;

  const ranked = photos
    .map((ph) => {
      const name = typeof ph.name === "string" ? ph.name.trim() : "";
      if (!name) return null;
      const score = photoLandscapeScore(ph, nature);
      return score < 0 ? null : { name, score };
    })
    .filter((x): x is { name: string; score: number } => x !== null)
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.name ?? null;
}

const NATURE_TAG_HINTS = [
  "nature",
  "landscape",
  "mountain",
  "forest",
  "wilderness",
  "national park",
  "valley",
  "meadow",
  "lake",
  "canyon",
  "trail",
  "outdoor",
  "hiking",
];

const URBAN_TAG_HINTS = [
  "city",
  "street",
  "building",
  "urban",
  "downtown",
  "skyline",
  "architecture",
  "office",
  "traffic",
];

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function tagBlob(r: {
  tags?: { title?: string }[];
  description?: string | null;
  alt_description?: string | null;
}): string {
  return [
    r.description,
    r.alt_description,
    ...(r.tags?.map((t) => t.title) ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function unsplashResultScore(
  r: {
    width?: number;
    height?: number;
    tags?: { title?: string }[];
    description?: string | null;
    alt_description?: string | null;
  },
  keywords: string[],
): number {
  const w = typeof r.width === "number" ? r.width : 0;
  const h = typeof r.height === "number" ? r.height : 0;
  const ratio = w / Math.max(h, 1);
  if (ratio < 1.12) return -1;
  const blob = tagBlob(r);
  let bonus = 0;
  for (const hint of NATURE_TAG_HINTS) {
    if (blob.includes(hint)) bonus += 14;
  }
  for (const hint of URBAN_TAG_HINTS) {
    if (blob.includes(hint)) bonus -= 22;
  }
  for (const kw of keywords) {
    if (kw.length > 2 && blob.includes(kw)) bonus += 6;
  }
  return ratio * 11 + bonus + Math.min((w * h) / 2_000_000, 4);
}

function extractKeywordsFromSeed(seed: string): string[] {
  const stop = new Set([
    "the",
    "and",
    "usa",
    "uk",
    "united",
    "states",
    "wilderness",
    "landscape",
    "nature",
    "city",
    "street",
    "building",
    "urban",
  ]);
  const raw = seed
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9\s,]/gu, " ");
  return raw
    .split(/[\s,]+/)
    .filter((t) => t.length > 2 && !stop.has(t))
    .slice(0, 12);
}

export async function fetchUnsplashNatureImageBytes(
  accessKey: string,
  searchQuery: string,
  tripIdForPick: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  const q = clipQuery(searchQuery.trim());
  if (!q) return null;
  const keywords = extractKeywordsFromSeed(q);
  try {
    const searchUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=24&orientation=landscape`;
    const res = await fetch(searchUrl, {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    let data: {
      results?: {
        width?: number;
        height?: number;
        urls?: { regular?: string; full?: string };
        tags?: { title?: string }[];
        description?: string | null;
        alt_description?: string | null;
      }[];
    };
    try {
      data = (await res.json()) as typeof data;
    } catch {
      return null;
    }
    const ranked = (data.results ?? [])
      .map((r) => {
        const u = r.urls?.regular ?? r.urls?.full;
        if (typeof u !== "string") return null;
        const score = unsplashResultScore(r, keywords);
        return score < 0 ? null : { u, score };
      })
      .filter((x): x is { u: string; score: number } => x !== null)
      .sort((a, b) => b.score - a.score);
    if (ranked.length === 0) return null;
    const top = ranked[0]!.score;
    const pool = ranked.filter((r) => r.score >= top - 18).slice(0, 8);
    const pickIdx = hashSeed(tripIdForPick || q) % Math.max(pool.length, 1);
    const pick = pool[pickIdx] ?? ranked[0];
    const imgUrl = pick?.u;
    if (typeof imgUrl !== "string") return null;
    const sized = `${imgUrl}${imgUrl.includes("?") ? "&" : "?"}w=1600&q=80`;
    const imgRes = await fetch(sized, { next: { revalidate: 86400 } });
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.toLowerCase().includes("image")) return null;
    return { buf, contentType };
  } catch {
    return null;
  }
}

export async function fetchStaticNatureBytesFromList(
  seed: string,
  tripId?: string,
): Promise<{ buf: Buffer; contentType: string } | null> {
  const fullSeed = tripId ? `${seed}|${tripId}` : seed;
  const n = TRIP_CARD_STATIC_NATURE_URLS.length;
  const start = hashSeed(fullSeed) % n;
  for (let i = 0; i < n; i += 1) {
    const u = TRIP_CARD_STATIC_NATURE_URLS[(start + i) % n];
    try {
      const res = await fetch(u, { next: { revalidate: 86400 } });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      const contentType = res.headers.get("content-type") ?? "image/jpeg";
      if (contentType.toLowerCase().includes("image")) return { buf, contentType };
    } catch {
      /* try next */
    }
  }
  return null;
}
