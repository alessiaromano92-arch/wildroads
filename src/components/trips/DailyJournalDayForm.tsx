"use client";

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { getGoogleMapsBrowserKey } from "@/lib/google-maps-env";
import { loadGoogleMapsScript } from "@/lib/google-maps-loader";
import { parseLatLngFromGoogleMapsUrl } from "@/lib/google-maps-link";
import { journalPlaceToLatLng } from "@/lib/journal-place-geocode";
import type { JournalTripDay } from "@/lib/build-trip-days";
import {
  TRANSPORT_EMOJI,
  TRANSPORT_OPTIONS,
  type DailyJournalEntry,
  type JournalPlacePick,
  type JournalTransportType,
  emptyTravelLeg,
  hasPlaceContent,
  hasRequiredDayStart,
  normalizeDailyJournalEntry,
} from "@/lib/daily-journal-entry";
import { FieldGuidePlaceField } from "@/components/trips/FieldGuidePlaceField";
import { FriendlyPlaceReadout } from "@/components/trips/FriendlyPlaceReadout";

export type DailyJournalDayFormHandle = {
  requestEdit: () => void;
};

type Props = {
  day: JournalTripDay;
  stored?: DailyJournalEntry;
  onSave: (entry: DailyJournalEntry) => void;
  /** Center of saved pins on this trip; biases Google search toward the trip area. */
  tripSearchBiasCenter?: google.maps.LatLngLiteral | null;
  /** Map + form share one card; day title lives in the summary header only. */
  mergedJournalLayout?: boolean;
  /** Saved view: this day matches the summary map — place rows can pan/zoom the map. */
  readOnlyMapTapEnabled?: boolean;
  /** Pan/zoom the journal route map (same instance as DailySummary). */
  onReadOnlyMapFocusAt?: (lat: number, lng: number) => void;
};

function FieldGuideSection({
  fig,
  title,
  children,
}: {
  fig: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="field-guide-section">
      <div className="field-guide-section-head">
        <h3 className="field-guide-section-title">{title}</h3>
        <span className="field-guide-stamp">{fig}</span>
      </div>
      {children}
    </section>
  );
}

function ReadRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="field-guide-read-row">
      <span className="field-guide-read-label">{label}</span>
      <span className="field-guide-read-value">{value}</span>
    </div>
  );
}

function hrefForManualMapLink(raw: string): string {
  const t = raw.trim();
  if (!t) return "#";
  return t.match(/^https?:\/\//i) ? t : `https://${t}`;
}

/** Fig. 3: hand-drawn messy circle bullet (soft fill + slightly heavier stroke) */
const fieldGuideStopBulletPath =
  "M6.8 2.4c2.4-.35 4.6 1.1 5.2 3.4.35 1.4.1 2.9-.7 4.1-.9 1.4-2.4 2.3-4 2.35-2.6.1-4.9-1.65-5.25-4.2-.25-1.85.55-3.65 2.15-4.55.45-.25.95-.35 1.45-.3z";

function FieldGuideStopHandBullet({ className }: { className?: string }) {
  return (
    <span className={className} aria-hidden>
      <svg
        className="field-guide-read-stop-bullet-svg"
        viewBox="0 0 14 14"
        width={14}
        height={14}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={fieldGuideStopBulletPath}
          fill="currentColor"
          fillOpacity="0.34"
          stroke="none"
        />
        <path
          d={fieldGuideStopBulletPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.12"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function SubmittedDayView({
  entry,
  mapTapEnabled,
  onMapTapPlace,
  onMapTapManualUrl,
}: {
  entry: DailyJournalEntry;
  mapTapEnabled: boolean;
  onMapTapPlace: (place: JournalPlacePick) => void;
  onMapTapManualUrl: (rawUrl: string) => void;
}) {
  const amenityChips: { key: string; emoji: string; label: string }[] = [];
  if (entry.amenities.freeParking) {
    amenityChips.push({ key: "parking", emoji: "🚗", label: "Free parking" });
  }
  if (entry.amenities.laundry) {
    amenityChips.push({ key: "laundry", emoji: "🧼", label: "Laundry" });
  }
  if (entry.amenities.breakfast) {
    amenityChips.push({ key: "breakfast", emoji: "☕", label: "Breakfast" });
  }

  const filledStops = entry.stops.filter((s) => hasPlaceContent(s));
  const showSleep =
    hasPlaceContent(entry.accommodation) ||
    Boolean(entry.bookingUrl?.trim()) ||
    amenityChips.length > 0;
  const showNotes = Boolean(entry.notes?.trim());
  const showStops = filledStops.length > 0;

  const manualMapTapClass =
    "max-w-full break-words text-left font-medium text-camp-rust underline decoration-camp-rust/40 decoration-2 underline-offset-2 cursor-pointer rounded-sm border border-transparent bg-transparent p-0 hover:border-camp-navy/15 hover:bg-camp-cream/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-camp-cream [overflow-wrap:anywhere]";

  return (
    <div className="field-guide-readonly">
      <FieldGuideSection fig="Fig. 1" title="Day travel">
        {entry.travelLegs.map((leg, legIndex) => {
          const showStart = hasPlaceContent(leg.startPoint);
          const showEnd = hasPlaceContent(leg.endPoint);
          const startManual =
            leg.startManualMapLink.trim() ||
            (legIndex === 0 ? entry.manualMapLink.trim() : "");
          const endManual = leg.endManualMapLink.trim();
          if (
            !showStart &&
            !showEnd &&
            !startManual &&
            !endManual &&
            legIndex > 0
          ) {
            return null;
          }

          return (
            <div
              key={leg.legId}
              className={
                legIndex > 0
                  ? "mt-6 border-t border-dashed border-camp-navy/25 pt-6"
                  : undefined
              }
            >
              {entry.travelLegs.length > 1 ? (
                <p className="field-guide-read-leg-title">
                  Leg {legIndex + 1}
                </p>
              ) : null}
              <div className={entry.travelLegs.length > 1 ? "mt-2 space-y-2" : "space-y-2"}>
                {showStart ? (
                  <ReadRow
                    label="Start"
                    value={
                      <FriendlyPlaceReadout
                        place={leg.startPoint}
                        interactive={mapTapEnabled}
                        onActivate={onMapTapPlace}
                      />
                    }
                  />
                ) : null}
                {startManual ? (
                  <div className="field-guide-read-row">
                    <span className="field-guide-read-label">
                      Manual link (start)
                    </span>
                    <span className="field-guide-read-value">
                      {mapTapEnabled ? (
                        <button
                          type="button"
                          className={manualMapTapClass}
                          onClick={() => onMapTapManualUrl(startManual)}
                        >
                          {startManual}
                        </button>
                      ) : (
                        <a
                          href={hrefForManualMapLink(startManual)}
                          className="font-medium text-camp-rust underline break-all"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {startManual}
                        </a>
                      )}
                    </span>
                  </div>
                ) : null}
                {showEnd ? (
                  <ReadRow
                    label="End"
                    value={
                      <FriendlyPlaceReadout
                        place={leg.endPoint}
                        interactive={mapTapEnabled}
                        onActivate={onMapTapPlace}
                      />
                    }
                  />
                ) : null}
                {endManual ? (
                  <div className="field-guide-read-row">
                    <span className="field-guide-read-label">
                      Manual link (end)
                    </span>
                    <span className="field-guide-read-value">
                      {mapTapEnabled ? (
                        <button
                          type="button"
                          className={manualMapTapClass}
                          onClick={() => onMapTapManualUrl(endManual)}
                        >
                          {endManual}
                        </button>
                      ) : (
                        <a
                          href={hrefForManualMapLink(endManual)}
                          className="font-medium text-camp-rust underline break-all"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {endManual}
                        </a>
                      )}
                    </span>
                  </div>
                ) : null}
                <ReadRow
                  label="Transport"
                  value={
                    <span className="field-guide-read-inline-meta inline-flex items-center gap-1.5">
                      <span className="shrink-0 select-none" aria-hidden>
                        {TRANSPORT_EMOJI[leg.transportType]}
                      </span>
                      {leg.transportType}
                    </span>
                  }
                />
              </div>
            </div>
          );
        })}
      </FieldGuideSection>

      {showSleep ? (
        <FieldGuideSection fig="Fig. 2" title="Where you’ll sleep">
          <div className="space-y-2">
            {hasPlaceContent(entry.accommodation) ? (
              <ReadRow
                label="Lodging"
                value={
                  <span className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1.5">
                    <span className="min-w-0">
                      <FriendlyPlaceReadout
                        place={entry.accommodation}
                        interactive={mapTapEnabled}
                        onActivate={onMapTapPlace}
                      />
                    </span>
                    {amenityChips.length > 0 ? (
                      <span className="flex flex-wrap gap-1.5">
                        {amenityChips.map((chip) => (
                          <span
                            key={chip.key}
                            className="field-guide-read-chip inline-flex items-center gap-1"
                          >
                            <span aria-hidden>{chip.emoji}</span>
                            {chip.label}
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </span>
                }
              />
            ) : amenityChips.length > 0 ? (
              <ReadRow
                label="Amenities"
                value={
                  <span className="flex flex-wrap gap-1.5">
                    {amenityChips.map((chip) => (
                      <span
                        key={chip.key}
                        className="field-guide-read-chip inline-flex items-center gap-1"
                      >
                        <span aria-hidden>{chip.emoji}</span>
                        {chip.label}
                      </span>
                    ))}
                  </span>
                }
              />
            ) : null}
            {entry.bookingUrl?.trim() ? (
              <div className="field-guide-read-row">
                <span className="field-guide-read-label">Booking link</span>
                <span className="field-guide-read-value">
                  <a
                    href={entry.bookingUrl.trim()}
                    className="font-medium text-camp-rust underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {entry.bookingUrl.trim()}
                  </a>
                </span>
              </div>
            ) : null}
          </div>
        </FieldGuideSection>
      ) : null}

      {showStops ? (
        <FieldGuideSection fig="Fig. 3" title="Stops & sights">
          <ul className="field-guide-read-stops list-none space-y-2.5 pl-0">
            {filledStops.map((stop, index) => (
              <li key={`${stop.placeId ?? "s"}-${index}`}>
                <span className="inline-flex flex-wrap items-baseline gap-x-2">
                  <FieldGuideStopHandBullet className="field-guide-read-stop-bullet mt-0.5 shrink-0 text-camp-rust" />
                  <FriendlyPlaceReadout
                    place={stop}
                    interactive={mapTapEnabled}
                    onActivate={onMapTapPlace}
                  />
                </span>
              </li>
            ))}
          </ul>
        </FieldGuideSection>
      ) : null}

      {showNotes ? (
        <FieldGuideSection fig="Fig. 4" title="Field notes">
          <div className="field-note-page field-note-page--readonly whitespace-pre-wrap">
            {entry.notes}
          </div>
        </FieldGuideSection>
      ) : null}
    </div>
  );
}

export const DailyJournalDayForm = forwardRef<
  DailyJournalDayFormHandle,
  Props
>(function DailyJournalDayForm(
  {
    day,
    stored,
    onSave,
    tripSearchBiasCenter,
    mergedJournalLayout = false,
    readOnlyMapTapEnabled = false,
    onReadOnlyMapFocusAt,
  },
  ref,
) {
  const [entry, setEntry] = useState<DailyJournalEntry>(() =>
    normalizeDailyJournalEntry(stored ?? null),
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  const isReadOnly = Boolean(entry.isSubmitted);

  const handleSave = () => {
    if (!hasRequiredDayStart(entry)) {
      setSaveError("Set leg 1’s start (a place) before saving.");
      return;
    }
    setSaveError(null);
    const next: DailyJournalEntry = { ...entry, isSubmitted: true };
    setEntry(next);
    onSave(next);
    window.setTimeout(() => {
      document
        .getElementById("trip-journal-daily-summary")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleEdit = useCallback(() => {
    if (!entry.isSubmitted) return;
    setSaveError(null);
    const next: DailyJournalEntry = { ...entry, isSubmitted: false };
    setEntry(next);
    onSave(next);
  }, [entry, onSave]);

  const mapTapEnabled =
    Boolean(readOnlyMapTapEnabled) && typeof onReadOnlyMapFocusAt === "function";

  const handleMapTapPlace = useCallback(
    async (place: JournalPlacePick) => {
      if (!mapTapEnabled || !onReadOnlyMapFocusAt) return;
      const key = getGoogleMapsBrowserKey();
      if (!key) return;
      try {
        await loadGoogleMapsScript(key);
      } catch {
        return;
      }
      const ll = await journalPlaceToLatLng(place);
      if (ll) onReadOnlyMapFocusAt(ll.lat, ll.lng);
    },
    [mapTapEnabled, onReadOnlyMapFocusAt],
  );

  const handleMapTapManualUrl = useCallback(
    (raw: string) => {
      if (!mapTapEnabled || !onReadOnlyMapFocusAt) return;
      const trimmed = raw.trim();
      const parsed = parseLatLngFromGoogleMapsUrl(trimmed);
      if (parsed) {
        onReadOnlyMapFocusAt(parsed.lat, parsed.lng);
        return;
      }
      window.open(
        hrefForManualMapLink(trimmed),
        "_blank",
        "noopener,noreferrer",
      );
    },
    [mapTapEnabled, onReadOnlyMapFocusAt],
  );

  useImperativeHandle(
    ref,
    () => ({
      requestEdit: () => {
        handleEdit();
      },
    }),
    [handleEdit],
  );

  const addStop = () => {
    setEntry((e) => ({
      ...e,
      stops: [...e.stops, { formattedAddress: "", placeId: undefined }],
    }));
  };

  const updateStop = (index: number, next: DailyJournalEntry["stops"][0]) => {
    setEntry((e) => {
      const stops = [...e.stops];
      stops[index] = next;
      return { ...e, stops };
    });
  };

  const removeStop = (index: number) => {
    setEntry((e) => ({
      ...e,
      stops: e.stops.filter((_, i) => i !== index),
    }));
  };

  return (
    <article className="field-guide-day paper-surface">
      {mergedJournalLayout ? (
        <div
          className="field-guide-day-merged-divider"
          aria-hidden
        />
      ) : (
        <header className="field-guide-day-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <h2
                className={`field-guide-day-title${isReadOnly ? " mt-0" : ""}`}
              >
                {day.label}
              </h2>
            </div>
            {isReadOnly ? (
              <button
                type="button"
                className="patch-btn-secondary shrink-0 text-sm"
                onClick={handleEdit}
              >
                Edit
              </button>
            ) : null}
          </div>
        </header>
      )}

      {isReadOnly ? (
        <SubmittedDayView
          entry={entry}
          mapTapEnabled={mapTapEnabled}
          onMapTapPlace={handleMapTapPlace}
          onMapTapManualUrl={handleMapTapManualUrl}
        />
      ) : (
        <>
          <FieldGuideSection fig="Fig. 1" title="Day travel">
            {entry.travelLegs.map((leg, legIndex) => (
              <div
                key={leg.legId}
                className={
                  legIndex > 0
                    ? "mt-8 border-t-2 border-dashed border-camp-navy/25 pt-8"
                    : undefined
                }
              >
                {entry.travelLegs.length > 1 ? (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-camp-rust">
                      Leg {legIndex + 1}
                    </p>
                    <button
                      type="button"
                      className="patch-btn-ghost text-xs"
                      onClick={() => {
                        setEntry((e) => ({
                          ...e,
                          travelLegs: e.travelLegs.filter((_, i) => i !== legIndex),
                        }));
                      }}
                    >
                      Remove leg
                    </button>
                  </div>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldGuidePlaceField
                    id={`${day.dateISO}-${legIndex}-start`}
                    label="Start point"
                    required={legIndex === 0}
                    place={leg.startPoint}
                    onPick={(startPoint) =>
                      setEntry((e) => ({
                        ...e,
                        travelLegs: e.travelLegs.map((l, i) =>
                          i === legIndex ? { ...l, startPoint } : l,
                        ),
                      }))
                    }
                    mode="address"
                    searchBiasCenter={tripSearchBiasCenter ?? undefined}
                  />
                  <FieldGuidePlaceField
                    id={`${day.dateISO}-${legIndex}-end`}
                    label="End point"
                    place={leg.endPoint}
                    onPick={(endPoint) =>
                      setEntry((e) => ({
                        ...e,
                        travelLegs: e.travelLegs.map((l, i) =>
                          i === legIndex ? { ...l, endPoint } : l,
                        ),
                      }))
                    }
                    mode="address"
                    searchBiasCenter={tripSearchBiasCenter ?? undefined}
                  />
                </div>
                <div className="mt-6 max-w-md">
                  <label
                    className="field-guide-label"
                    htmlFor={`${day.dateISO}-${legIndex}-transport`}
                  >
                    Transport type
                  </label>
                  <select
                    id={`${day.dateISO}-${legIndex}-transport`}
                    className="patch-input w-full font-normal"
                    value={leg.transportType}
                    onChange={(e) =>
                      setEntry((prev) => ({
                        ...prev,
                        travelLegs: prev.travelLegs.map((l, i) =>
                          i === legIndex
                            ? {
                                ...l,
                                transportType: e.target
                                  .value as JournalTransportType,
                              }
                            : l,
                        ),
                      }))
                    }
                  >
                    {TRANSPORT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {TRANSPORT_EMOJI[opt]} {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="patch-btn-secondary mt-6 text-sm"
              onClick={() =>
                setEntry((e) => ({
                  ...e,
                  travelLegs: [...e.travelLegs, emptyTravelLeg()],
                }))
              }
            >
              + Add another leg
            </button>
          </FieldGuideSection>

          <FieldGuideSection fig="Fig. 2" title="Where you’ll sleep">
            <FieldGuidePlaceField
              id={`${day.dateISO}-sleep`}
              label="Search lodging or campsite"
              place={entry.accommodation}
              onPick={(accommodation) =>
                setEntry((e) => ({ ...e, accommodation }))
              }
              mode="address"
              searchBiasCenter={tripSearchBiasCenter ?? undefined}
            />
            <div className="mt-4">
              <label
                className="field-guide-label"
                htmlFor={`${day.dateISO}-booking`}
              >
                Booking link
              </label>
              <input
                id={`${day.dateISO}-booking`}
                type="url"
                className="patch-input w-full font-normal"
                value={entry.bookingUrl}
                onChange={(e) =>
                  setEntry((prev) => ({ ...prev, bookingUrl: e.target.value }))
                }
                placeholder="https://…"
                autoComplete="off"
              />
            </div>
            <fieldset className="mt-5">
              <legend className="field-guide-label mb-2">Amenities</legend>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["freeParking", "Free parking"],
                    ["laundry", "Laundry"],
                    ["breakfast", "Breakfast"],
                  ] as const
                ).map(([key, text]) => (
                  <label
                    key={key}
                    className="field-guide-checkbox flex cursor-pointer items-center gap-2 font-sans text-sm text-camp-navy"
                  >
                    <input
                      type="checkbox"
                      className="field-guide-check"
                      checked={entry.amenities[key]}
                      onChange={(e) =>
                        setEntry((prev) => ({
                          ...prev,
                          amenities: {
                            ...prev.amenities,
                            [key]: e.target.checked,
                          },
                        }))
                      }
                    />
                    {text}
                  </label>
                ))}
              </div>
            </fieldset>
          </FieldGuideSection>

          <FieldGuideSection fig="Fig. 3" title="Stops & sights">
            <p className="field-guide-hint mb-3">
              Landmarks, cafés, trailheads, anything worth a detour.
            </p>
            <ul className="flex flex-col gap-4">
              {entry.stops.map((stop, index) => (
                <li
                  key={`${day.dateISO}-stop-${index}-${stop.placeId ?? "noid"}`}
                  className="field-guide-stop-row"
                >
                  <div className="flex flex-1 flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-camp-rust">
                      Waypoint {index + 1}
                    </span>
                    <FieldGuidePlaceField
                      id={`${day.dateISO}-stop-${index}`}
                      label="Point of interest"
                      place={stop}
                      onPick={(next) => updateStop(index, next)}
                      mode="poi"
                      searchBiasCenter={tripSearchBiasCenter ?? undefined}
                    />
                  </div>
                  <button
                    type="button"
                    className="patch-btn-ghost mt-6 shrink-0 self-start text-xs sm:mt-8"
                    onClick={() => removeStop(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="patch-btn-secondary mt-4 text-sm"
              onClick={addStop}
            >
              + Add point of interest
            </button>
          </FieldGuideSection>

          <FieldGuideSection fig="Fig. 4" title="Field notes">
            <label className="sr-only" htmlFor={`${day.dateISO}-notes`}>
              Notes for {day.label}
            </label>
            <textarea
              id={`${day.dateISO}-notes`}
              className="field-note-page"
              rows={12}
              value={entry.notes}
              onChange={(e) =>
                setEntry((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Sketches, weather, birds, snack tally…"
            />
          </FieldGuideSection>

          <div className="mt-8 flex flex-col gap-3 border-t-2 border-dashed border-camp-navy/25 pt-6">
            {saveError ? (
              <p
                className="rounded-md border-2 border-camp-rust bg-camp-rust/10 px-3 py-2 font-sans text-sm text-camp-rust"
                role="alert"
              >
                {saveError}
              </p>
            ) : null}
            <button
              type="button"
              className="patch-btn-primary w-full max-w-md self-center text-center"
              onClick={handleSave}
            >
              Save this day
            </button>
          </div>
        </>
      )}
    </article>
  );
});

DailyJournalDayForm.displayName = "DailyJournalDayForm";
