import { formatPlaceTitleForCard } from "@/lib/trip-place-label";

/** A place picked from Google Places or typed by hand */
export type JournalPlacePick = {
  formattedAddress: string;
  /**
   * Short label from Google when you pick a suggestion (e.g. business or landmark name).
   * The full street address stays in `formattedAddress` for maps and editing.
   */
  displayName?: string;
  placeId?: string;
  /** Saved when picking from Google so maps can skip geocoding */
  lat?: number;
  lng?: number;
};

export const TRANSPORT_OPTIONS = [
  "Car",
  "Flight",
  "Train",
  "Bus",
  "Boat",
  "Bike",
  "On foot",
  "Other",
] as const;

export type JournalTransportType = (typeof TRANSPORT_OPTIONS)[number];

/** Icon for each transport mode (journal readout + pickers). */
export const TRANSPORT_EMOJI: Record<JournalTransportType, string> = {
  Car: "🚗",
  Flight: "✈️",
  Train: "🚆",
  Bus: "🚌",
  Boat: "⛵",
  Bike: "🚲",
  "On foot": "🚶",
  Other: "🧭",
};

export type DailyJournalAmenities = {
  freeParking: boolean;
  laundry: boolean;
  breakfast: boolean;
};

/** One segment of the day (e.g. flight A→B, then drive B→C) */
export type TravelLeg = {
  /** Stable id for React lists (saved with the trip) */
  legId: string;
  startPoint: JournalPlacePick;
  endPoint: JournalPlacePick;
  /** Google Maps URL for this leg’s start when search is not enough; overrides geocoded start on the map. */
  startManualMapLink: string;
  /** Google Maps URL for this leg’s end when search is not enough; overrides geocoded end on the map. */
  endManualMapLink: string;
  transportType: JournalTransportType;
};

/** One day’s field notes for the trip journal */
export type DailyJournalEntry = {
  travelLegs: TravelLeg[];
  accommodation: JournalPlacePick;
  bookingUrl: string;
  amenities: DailyJournalAmenities;
  stops: JournalPlacePick[];
  notes: string;
  /** Pasted Google Maps URL when search does not find the place; overrides leg 1 start on the map when set. */
  manualMapLink: string;
  /** When true, the day was saved and the form is shown read-only until Edit. */
  isSubmitted?: boolean;
};

export function emptyJournalPlace(): JournalPlacePick {
  return { formattedAddress: "", placeId: undefined, lat: undefined, lng: undefined };
}

function newLegId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `leg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function emptyTravelLeg(): TravelLeg {
  return {
    legId: newLegId(),
    startPoint: emptyJournalPlace(),
    endPoint: emptyJournalPlace(),
    startManualMapLink: "",
    endManualMapLink: "",
    transportType: "Car",
  };
}

export function emptyDailyJournalEntry(): DailyJournalEntry {
  return {
    travelLegs: [emptyTravelLeg()],
    accommodation: emptyJournalPlace(),
    bookingUrl: "",
    amenities: {
      freeParking: false,
      laundry: false,
      breakfast: false,
    },
    stops: [],
    notes: "",
    manualMapLink: "",
  };
}

function parseTransport(v: unknown, fallback: JournalTransportType): JournalTransportType {
  if (
    typeof v === "string" &&
    (TRANSPORT_OPTIONS as readonly string[]).includes(v)
  ) {
    return v as JournalTransportType;
  }
  return fallback;
}

export function normalizeDailyJournalEntry(
  raw: unknown,
): DailyJournalEntry {
  const base = emptyDailyJournalEntry();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  const pick = (v: unknown): JournalPlacePick => {
    if (!v || typeof v !== "object") return emptyJournalPlace();
    const p = v as Record<string, unknown>;
    const formattedAddress =
      typeof p.formattedAddress === "string" ? p.formattedAddress : "";
    const displayNameRaw =
      typeof p.displayName === "string" ? p.displayName.trim() : "";
    const displayName = displayNameRaw ? displayNameRaw : undefined;
    const placeId = typeof p.placeId === "string" ? p.placeId : undefined;
    const lat = typeof p.lat === "number" && Number.isFinite(p.lat) ? p.lat : undefined;
    const lng = typeof p.lng === "number" && Number.isFinite(p.lng) ? p.lng : undefined;
    return { formattedAddress, placeId, lat, lng, displayName };
  };

  const parseLeg = (v: unknown): TravelLeg | null => {
    if (!v || typeof v !== "object") return null;
    const x = v as Record<string, unknown>;
    const legId =
      typeof x.legId === "string" && x.legId.trim() ? x.legId.trim() : newLegId();
    const startManualMapLink =
      typeof x.startManualMapLink === "string"
        ? x.startManualMapLink.trim()
        : "";
    const endManualMapLink =
      typeof x.endManualMapLink === "string" ? x.endManualMapLink.trim() : "";
    return {
      legId,
      startPoint: pick(x.startPoint),
      endPoint: pick(x.endPoint),
      startManualMapLink,
      endManualMapLink,
      transportType: parseTransport(x.transportType, "Car"),
    };
  };

  let travelLegs: TravelLeg[];

  const legsRaw = o.travelLegs;
  if (Array.isArray(legsRaw) && legsRaw.length > 0) {
    travelLegs = legsRaw
      .map((row) => parseLeg(row))
      .filter((leg): leg is TravelLeg => leg !== null);
    if (travelLegs.length === 0) {
      travelLegs = [emptyTravelLeg()];
    }
  } else {
    travelLegs = [
      {
        legId: newLegId(),
        startPoint: pick(o.startPoint),
        endPoint: pick(o.endPoint),
        startManualMapLink: "",
        endManualMapLink: "",
        transportType: parseTransport(o.transportType, base.travelLegs[0].transportType),
      },
    ];
  }

  const legacyRootManual =
    typeof o.manualMapLink === "string" ? o.manualMapLink.trim() : "";
  if (legacyRootManual && travelLegs[0]) {
    const first = travelLegs[0];
    if (!first.startManualMapLink.trim()) {
      travelLegs = [
        { ...first, startManualMapLink: legacyRootManual },
        ...travelLegs.slice(1),
      ];
    }
  }

  const amenitiesIn = o.amenities;
  let amenities = { ...base.amenities };
  if (amenitiesIn && typeof amenitiesIn === "object") {
    const a = amenitiesIn as Record<string, unknown>;
    amenities = {
      freeParking: Boolean(a.freeParking),
      laundry: Boolean(a.laundry),
      breakfast: Boolean(a.breakfast),
    };
  }

  const stopsRaw = o.stops;
  const stops: JournalPlacePick[] = Array.isArray(stopsRaw)
    ? stopsRaw.map((s) => pick(s))
    : [];

  const manualRaw =
    typeof o.manualMapLink === "string" ? o.manualMapLink.trim() : "";
  const out: DailyJournalEntry = {
    travelLegs,
    accommodation: pick(o.accommodation),
    bookingUrl:
      typeof o.bookingUrl === "string" ? o.bookingUrl : base.bookingUrl,
    amenities,
    stops,
    notes: typeof o.notes === "string" ? o.notes : base.notes,
    manualMapLink: manualRaw,
  };
  if (Boolean(o.isSubmitted)) {
    out.isSubmitted = true;
  }
  return out;
}

/** True if the first leg has a usable start or a manual map link (required to save). */
export function hasRequiredDayStart(entry: DailyJournalEntry): boolean {
  const first = entry.travelLegs[0];
  if (!first) return false;
  if (first.startManualMapLink.trim()) return true;
  if (entry.manualMapLink?.trim()) return true;
  const s = first.startPoint;
  return Boolean(
    (typeof s.formattedAddress === "string" && s.formattedAddress.trim()) ||
      s.placeId,
  );
}

export function placeDisplayLine(place: JournalPlacePick): string {
  const name = place.displayName?.trim();
  if (name) return formatPlaceTitleForCard(name);
  const t = place.formattedAddress?.trim();
  if (t) return formatPlaceTitleForCard(t);
  if (place.placeId) return "Saved place";
  return "—";
}

export function hasPlaceContent(place: JournalPlacePick): boolean {
  return Boolean(
    (typeof place.formattedAddress === "string" &&
      place.formattedAddress.trim()) ||
      place.placeId,
  );
}
