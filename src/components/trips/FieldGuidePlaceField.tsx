"use client";

import { useEffect, useMemo, useRef } from "react";
import Autocomplete from "react-google-autocomplete";
import type { JournalPlacePick } from "@/lib/daily-journal-entry";
import { getGoogleMapsBrowserKey } from "@/lib/google-maps-env";

const AUTOCOMPLETE_TYPES = ["establishment", "geocode"] as const;
const BIAS_RADIUS_METERS = 200_000;

/** `react-google-autocomplete` passes the real `<input>` at runtime; types say RefObject. */
function inputFromPlaceSelectedArg(second: unknown): HTMLInputElement | null {
  if (second instanceof HTMLInputElement) return second;
  if (
    second &&
    typeof second === "object" &&
    "current" in second &&
    (second as { current: unknown }).current instanceof HTMLInputElement
  ) {
    return (second as { current: HTMLInputElement }).current;
  }
  return null;
}

function pickDisplayNameForPick(
  suggestionRow: string,
  typedInBox: string,
  formatted: string,
  apiName: string,
): string | undefined {
  const s = suggestionRow.trim();
  const t = typedInBox.trim();
  const f = formatted.trim();
  const n = apiName.trim();
  if (s.length > 0 && s.toLowerCase() !== f.toLowerCase()) return s;
  if (t.length > 0 && t.toLowerCase() !== f.toLowerCase()) return t;
  if (n.length > 0 && n.toLowerCase() !== f.toLowerCase()) return n;
  return undefined;
}

/** Without `name`, `PlaceResult.name` is empty — saved view fell back to the long address. */
const AUTOCOMPLETE_PLACE_FIELDS = [
  "address_components",
  "formatted_address",
  "geometry",
  "name",
  "place_id",
] as const;

type Props = {
  id: string;
  label: string;
  hint?: string;
  /** Shows a red asterisk (mandatory field). */
  required?: boolean;
  place: JournalPlacePick;
  onPick: (next: JournalPlacePick) => void;
  /** Broader addresses vs venues / businesses (kept for callers; search types are unified). */
  mode: "address" | "poi";
  /** When set, Autocomplete is biased toward this trip’s saved map area. */
  searchBiasCenter?: google.maps.LatLngLiteral | null;
};

export function FieldGuidePlaceField({
  id,
  label,
  hint,
  required = false,
  place,
  onPick,
  mode,
  searchBiasCenter,
}: Props) {
  void mode;
  const apiKey = getGoogleMapsBrowserKey();
  /** Clicks a `.pac-item` before the input is swapped to the long address (pointerdown runs first). */
  const suggestionRowLabelRef = useRef("");

  useEffect(() => {
    if (!apiKey) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement | null;
      if (!t?.closest) return;
      const item = t.closest(".pac-item");
      if (!item) return;
      const q = item.querySelector(".pac-item-query");
      const text = (q?.textContent ?? item.textContent ?? "").replace(/\s+/g, " ").trim();
      if (text) suggestionRowLabelRef.current = text;
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [apiKey]);

  const options = useMemo((): google.maps.places.AutocompleteOptions => {
    const bias: google.maps.CircleLiteral | undefined =
      searchBiasCenter &&
      Number.isFinite(searchBiasCenter.lat) &&
      Number.isFinite(searchBiasCenter.lng)
        ? {
            center: searchBiasCenter,
            radius: BIAS_RADIUS_METERS,
          }
        : undefined;

    return {
      types: [...AUTOCOMPLETE_TYPES],
      fields: [...AUTOCOMPLETE_PLACE_FIELDS],
      ...(bias ? { locationBias: bias } : {}),
    } as google.maps.places.AutocompleteOptions;
  }, [searchBiasCenter]);

  return (
    <div className="field-guide-field">
      <label className="field-guide-label" htmlFor={id}>
        {label}
        {required ? (
          <span className="text-camp-rust" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </label>
      {hint ? <p className="field-guide-hint">{hint}</p> : null}
      {apiKey ? (
        <Autocomplete
          key={`${id}-${place.placeId ?? ""}-${place.formattedAddress}-${searchBiasCenter?.lat ?? "x"}-${searchBiasCenter?.lng ?? "x"}`}
          id={id}
          apiKey={apiKey}
          options={options}
          defaultValue={place.formattedAddress}
          aria-required={required || undefined}
          onPlaceSelected={(
            p: google.maps.places.PlaceResult,
            secondArg?: unknown,
          ) => {
            const loc = p.geometry?.location;
            const lat = loc?.lat();
            const lng = loc?.lng();
            const formatted = (p.formatted_address ?? "").trim();
            const apiName = typeof p.name === "string" ? p.name.trim() : "";
            const inputEl = inputFromPlaceSelectedArg(secondArg);
            const typedInBox = inputEl?.value?.trim() ?? "";
            const fromSuggestionRow = suggestionRowLabelRef.current.trim();
            suggestionRowLabelRef.current = "";
            const displayName = pickDisplayNameForPick(
              fromSuggestionRow,
              typedInBox,
              formatted,
              apiName,
            );

            onPick({
              formattedAddress: p.formatted_address ?? "",
              placeId: p.place_id,
              ...(displayName ? { displayName } : {}),
              ...(typeof lat === "number" &&
              typeof lng === "number" &&
              Number.isFinite(lat) &&
              Number.isFinite(lng)
                ? { lat, lng }
                : {}),
            });
          }}
          placeholder="Search on Google Maps…"
          className="patch-input w-full font-normal"
          autoComplete="off"
        />
      ) : (
        <>
          <input
            id={id}
            className="patch-input w-full font-normal"
            aria-required={required || undefined}
            value={place.formattedAddress}
            onChange={(e) =>
              onPick({
                formattedAddress: e.target.value,
                placeId: undefined,
                displayName: undefined,
                lat: undefined,
                lng: undefined,
              })
            }
            placeholder="Type a place name…"
            autoComplete="off"
          />
          <p className="field-guide-hint mt-1.5 text-camp-rust/90">
            Set{" "}
            <code className="rounded bg-camp-navy/10 px-1 font-mono text-[10px]">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
            </code>{" "}
            to turn on live map search.
          </p>
        </>
      )}
    </div>
  );
}
