"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  DailyJournalEntry,
  JournalTransportType,
} from "@/lib/daily-journal-entry";
import {
  hasPlaceContent,
  normalizeDailyJournalEntry,
} from "@/lib/daily-journal-entry";
import { getGoogleMapsBrowserKey } from "@/lib/google-maps-env";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";
import { parseLatLngFromGoogleMapsUrl } from "@/lib/google-maps-link";
import { journalPlaceToLatLng } from "@/lib/journal-place-geocode";

function PencilIcon() {
  return (
    <svg
      className="shrink-0"
      viewBox="0 0 24 24"
      width={20}
      height={20}
      aria-hidden
    >
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
      />
    </svg>
  );
}

type Props = {
  dateISO: string;
  dayLabel: string;
  entry: DailyJournalEntry | undefined;
  /** When false (editing / unsaved day), the route map is not shown. */
  showMap?: boolean;
  /** Shown as a pencil next to the day title when the day is submitted. */
  onEditSubmittedDay?: () => void;
};

type LatLng = google.maps.LatLngLiteral;

type LegBundle = {
  transportType: JournalTransportType;
  start: LatLng | null;
  end: LatLng | null;
  routePath: LatLng[] | null;
  driveHours: number | null;
  driveSource: "roads" | "guess" | "none";
};

type MapBundle = {
  legs: LegBundle[];
  stops: LatLng[];
};

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function getDrivingRoute(
  start: LatLng,
  end: LatLng,
): Promise<{ durationHours: number; path: LatLng[] } | null> {
  const svc = new google.maps.DirectionsService();
  return new Promise((resolve) => {
    svc.route(
      {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status !== "OK" || !result?.routes?.[0]) {
          resolve(null);
          return;
        }
        const route = result.routes[0];
        const leg = route.legs?.[0];
        const sec = leg?.duration?.value;
        const overview = route.overview_path;
        if (
          typeof sec !== "number" ||
          !overview ||
          overview.length < 2
        ) {
          resolve(null);
          return;
        }
        resolve({
          durationHours: sec / 3600,
          path: overview.map((p) => ({ lat: p.lat(), lng: p.lng() })),
        });
      },
    );
  });
}

function formatDrivingHours(h: number | null): string {
  if (h === null) return "—";
  const totalMin = Math.max(1, Math.round(h * 60));
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  if (hh === 0) return `${mm} min`;
  if (mm === 0) return `${hh} hr${hh === 1 ? "" : "s"}`;
  return `${hh} hr ${mm} min`;
}

function emptyMapBundle(): MapBundle {
  return { legs: [], stops: [] };
}

export type DailySummaryMapHandle = {
  /** Pan and zoom the route map to a coordinate (no-op if the map is not ready). */
  focusAt: (lat: number, lng: number) => void;
};

export const DailySummary = forwardRef<DailySummaryMapHandle, Props>(
  function DailySummary(
    {
      dateISO,
      dayLabel,
      entry,
      showMap = true,
      onEditSubmittedDay,
    },
    ref,
  ) {
  const apiKey = getGoogleMapsBrowserKey();
  const normalized = useMemo(
    () => normalizeDailyJournalEntry(entry ?? null),
    [entry],
  );

  const geoKey = useMemo(
    () =>
      JSON.stringify({
        legs: normalized.travelLegs,
        stops: normalized.stops,
        manualMapLink: normalized.manualMapLink,
      }),
    [normalized.travelLegs, normalized.stops, normalized.manualMapLink],
  );

  const manualLinksList = useMemo(() => {
    const links: string[] = [];
    const seen = new Set<string>();
    const add = (u: string) => {
      const t = u.trim();
      if (!t || seen.has(t)) return;
      seen.add(t);
      links.push(t);
    };
    add(normalized.manualMapLink);
    for (const leg of normalized.travelLegs) {
      add(leg.startManualMapLink);
      add(leg.endManualMapLink);
    }
    return links;
  }, [normalized]);

  const hasAnyManualLink = manualLinksList.length > 0;

  const [bundle, setBundle] = useState<MapBundle | null>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  const hasMapSection = useMemo(
    () =>
      hasAnyManualLink ||
      normalized.travelLegs.some(
        (leg) =>
          hasPlaceContent(leg.startPoint) || hasPlaceContent(leg.endPoint),
      ),
    [hasAnyManualLink, normalized.travelLegs],
  );

  useImperativeHandle(
    ref,
    () => ({
      focusAt(lat: number, lng: number) {
        const map = mapRef.current;
        if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
        document
          .getElementById("trip-journal-daily-summary")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        map.panTo({ lat, lng });
        map.setZoom(16);
      },
    }),
    [],
  );

  /** Map is bound to a DOM node; if that node unmounts, the instance must be dropped. */
  useEffect(() => {
    if (!hasMapSection) {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      mapRef.current = null;
    }
  }, [hasMapSection]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!showMap) {
        if (!cancelled) setBundle(null);
        return;
      }

      if (!apiKey) {
        if (!cancelled) setBundle(emptyMapBundle());
        return;
      }

      try {
        await loadGoogleMapsScript(apiKey);
      } catch {
        if (!cancelled) setBundle(emptyMapBundle());
        return;
      }
      if (cancelled || typeof google === "undefined") return;

      const n = normalized;

      const hasPlotInput =
        Boolean(n.manualMapLink.trim()) ||
        n.travelLegs.some(
          (leg) =>
            hasPlaceContent(leg.startPoint) ||
            hasPlaceContent(leg.endPoint) ||
            leg.startManualMapLink.trim() ||
            leg.endManualMapLink.trim(),
        );
      if (!hasPlotInput) {
        if (!cancelled) setBundle(emptyMapBundle());
        return;
      }

      const stopResults = await Promise.all(
        n.stops.map((s) => journalPlaceToLatLng(s)),
      );
      if (cancelled) return;
      const stops = stopResults.filter((x): x is LatLng => x !== null);

      const legsOut: LegBundle[] = [];

      for (let legIndex = 0; legIndex < n.travelLegs.length; legIndex++) {
        const leg = n.travelLegs[legIndex]!;
        const startManual = leg.startManualMapLink.trim();
        const endManual = leg.endManualMapLink.trim();
        const legacyRootStart =
          legIndex === 0 && !startManual ? n.manualMapLink.trim() : "";
        const startFromManual = startManual || legacyRootStart;
        const startLL = startFromManual
          ? parseLatLngFromGoogleMapsUrl(startFromManual)
          : null;
        const endLL = endManual
          ? parseLatLngFromGoogleMapsUrl(endManual)
          : null;

        const startPromise =
          startLL !== null
            ? Promise.resolve(startLL)
            : journalPlaceToLatLng(leg.startPoint);
        const endPromise =
          endLL !== null
            ? Promise.resolve(endLL)
            : journalPlaceToLatLng(leg.endPoint);
        const [start, end] = await Promise.all([startPromise, endPromise]);
        if (cancelled) return;

        let routePath: LatLng[] | null = null;
        let driveHours: number | null = null;
        let driveSource: LegBundle["driveSource"] = "none";

        if (start && end) {
          if (leg.transportType === "Car") {
            const routed = await getDrivingRoute(start, end);
            if (cancelled) return;
            if (routed) {
              routePath = routed.path;
              driveHours = routed.durationHours;
              driveSource = "roads";
            } else {
              routePath = [start, end];
              driveHours = haversineKm(start, end) / 55;
              driveSource = "guess";
            }
          } else {
            routePath = [start, end];
            driveHours = null;
            driveSource = "none";
          }
        }

        legsOut.push({
          transportType: leg.transportType,
          start,
          end,
          routePath,
          driveHours,
          driveSource,
        });
      }

      if (!cancelled) {
        setBundle({ legs: legsOut, stops });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [apiKey, geoKey, normalized, showMap]);

  useEffect(() => {
    if (!showMap) {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      mapRef.current = null;
      return;
    }
    if (!apiKey || !bundle) return;
    if (!mapElRef.current) {
      mapRef.current = null;
      return;
    }

    const hasPoint =
      bundle.legs.some((l) => l.start || l.end) || bundle.stops.length > 0;
    if (!hasPoint) {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
      mapRef.current = null;
      return;
    }

    const el = mapElRef.current;
    const mapUi: google.maps.MapOptions = {
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: false,
      cameraControl: false,
      rotateControl: false,
      gestureHandling: "greedy",
    };
    const map =
      mapRef.current ?? new google.maps.Map(el, mapUi);
    mapRef.current = map;
    map.setOptions(mapUi);

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    polylinesRef.current.forEach((p) => p.setMap(null));
    polylinesRef.current = [];

    const bounds = new google.maps.LatLngBounds();

    const dropPin = (pos: LatLng, title: string, fill: string) => {
      const m = new google.maps.Marker({
        position: pos,
        map,
        title,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: fill,
          fillOpacity: 1,
          strokeColor: "#2a3644",
          strokeWeight: 2,
        },
      });
      markersRef.current.push(m);
      bounds.extend(pos);
    };

    const startFills = ["#33544c", "#2d6a4f", "#1b4332"];
    const endFills = ["#3d4f66", "#4a5d7a", "#5c4d7d"];
    const strokeColors = ["#33544c", "#713d27", "#3d4f66"];

    bundle.legs.forEach((leg, i) => {
      if (leg.start) {
        const srcLeg = normalized.travelLegs[i];
        const startIsManual = Boolean(
          srcLeg?.startManualMapLink.trim() ||
            (i === 0 && normalized.manualMapLink.trim()),
        );
        dropPin(
          leg.start,
          startIsManual ? `Map link (leg ${i + 1} start)` : `Leg ${i + 1} start`,
          startFills[i % startFills.length],
        );
      }
      if (leg.end) {
        const srcLeg = normalized.travelLegs[i];
        const endIsManual = Boolean(srcLeg?.endManualMapLink.trim());
        dropPin(
          leg.end,
          endIsManual ? `Map link (leg ${i + 1} end)` : `Leg ${i + 1} end`,
          endFills[i % endFills.length],
        );
      }
    });

    bundle.stops.forEach((pos, i) =>
      dropPin(pos, `Stop ${i + 1}`, "#713d27"),
    );

    bundle.legs.forEach((leg, i) => {
      const path =
        leg.routePath && leg.routePath.length >= 2
          ? leg.routePath
          : leg.start && leg.end
            ? [leg.start, leg.end]
            : [];
      if (path.length >= 2) {
        const poly = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: strokeColors[i % strokeColors.length],
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
        });
        polylinesRef.current.push(poly);
        path.forEach((p) => bounds.extend(p));
      }
    });

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 32);
    }

    const mapInstance = map;
    requestAnimationFrame(() => {
      google.maps.event.trigger(mapInstance, "resize");
      if (!bounds.isEmpty()) {
        mapInstance.fitBounds(bounds, 32);
      }
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      polylinesRef.current.forEach((p) => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [apiKey, bundle, normalized, showMap]);

  const showDrivingEstimate = normalized.travelLegs.some(
    (l) => l.transportType === "Car",
  );

  const carLegsWithHours = (bundle?.legs ?? []).filter(
    (l) => l.transportType === "Car" && l.driveHours != null,
  );
  const totalCarDriveHours =
    carLegsWithHours.length > 0
      ? carLegsWithHours.reduce((s, l) => s + (l.driveHours ?? 0), 0)
      : null;

  const hoursLabel = formatDrivingHours(totalCarDriveHours);

  const bundleHasMapPoints = useMemo(
    () =>
      bundle != null &&
      (bundle.legs.some((l) => l.start || l.end) || bundle.stops.length > 0),
    [bundle],
  );

  const showMapCanvas = Boolean(apiKey && bundle && bundleHasMapPoints);
  const showLinkOnlyPanel = Boolean(
    apiKey && bundle && !bundleHasMapPoints && hasAnyManualLink,
  );
  const showMapLoading = Boolean(
    showMap && apiKey && hasMapSection && bundle === null,
  );

  const mapLinkOpenHref = (() => {
    const raw = manualLinksList[0] ?? "";
    if (!raw) return "";
    return raw.startsWith("http://") || raw.startsWith("https://")
      ? raw
      : `https://${raw}`;
  })();

  const drivingBadge =
    showMap ? (
      <aside
        className="scout-badge scout-badge--map-overlap"
        aria-label="Estimated driving time"
      >
        <div className="scout-badge-ribbon">Patrol</div>
        <div className="scout-badge-body">
          {showDrivingEstimate ? (
            <>
              <p className="scout-badge-label">Estimated driving</p>
              <p className="scout-badge-value">{hoursLabel}</p>
            </>
          ) : (
            <p className="scout-badge-note scout-badge-note--solo">
              Driving time is only added up for legs where transport is{" "}
              <span className="font-semibold text-camp-navy">Car</span> in Day
              travel.
            </p>
          )}
        </div>
      </aside>
    ) : null;

  const mapWrapClass =
    "daily-summary-map-wrap" +
    (showMap ? " daily-summary-map-wrap--scout-overlap" : "");

  const showTitleEdit =
    Boolean(entry?.isSubmitted) && typeof onEditSubmittedDay === "function";

  return (
    <section
      className="daily-summary daily-summary--merged-map"
      aria-labelledby={`daily-summary-title-${dateISO}`}
    >
      <div className="daily-summary-head">
        <div className="daily-summary-head-text min-w-0 flex-1">
          <p className="field-guide-ledger-no">Daily summary</p>
          <h2
            id={`daily-summary-title-${dateISO}`}
            className="daily-summary-day-heading font-heading text-lg font-bold text-camp-forest sm:text-xl"
          >
            {dayLabel}
          </h2>
        </div>
        {showTitleEdit ? (
          <button
            type="button"
            className="patch-btn-secondary patch-btn--icon-only daily-summary-head-edit inline-flex h-10 w-10 shrink-0 items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-camp-cream"
            onClick={onEditSubmittedDay}
            aria-label="Edit this day"
            title="Edit this day"
          >
            <PencilIcon />
          </button>
        ) : null}
      </div>

      {showMap ? (
        !apiKey ? (
          <div className={mapWrapClass}>
            <div className="daily-summary-map-fallback">
              Add a Google Maps key to see today’s route on the map.
            </div>
            {drivingBadge}
          </div>
        ) : hasMapSection ? (
          <div className={mapWrapClass}>
            {showMapLoading ? (
              <div
                className="daily-summary-map daily-summary-map--skeleton"
                aria-busy="true"
              />
            ) : null}
            {showMapCanvas ? (
              <div ref={mapElRef} className="daily-summary-map" />
            ) : null}
            {showLinkOnlyPanel ? (
              <div className="daily-summary-map daily-summary-map--link-only">
                <a
                  href={mapLinkOpenHref}
                  className="daily-summary-link-only-btn patch-btn-secondary text-sm"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open in Google Maps
                </a>
              </div>
            ) : null}
            {hasAnyManualLink ? (
              <div
                className="daily-summary-link-attached-badge"
                role="status"
              >
                <span className="daily-summary-link-attached-ico" aria-hidden />
                <span>Link attached</span>
              </div>
            ) : null}
            {drivingBadge}
          </div>
        ) : null
      ) : null}
    </section>
  );
});
