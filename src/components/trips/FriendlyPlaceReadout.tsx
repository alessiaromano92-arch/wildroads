"use client";

import { useEffect, useState } from "react";
import type { JournalPlacePick } from "@/lib/daily-journal-entry";
import { placeDisplayLine } from "@/lib/daily-journal-entry";
import { formatPlaceTitleForCard } from "@/lib/trip-place-label";

const labelByPlaceId = new Map<string, string>();

async function fetchGoogleLabel(placeId: string): Promise<string | null> {
  const hit = labelByPlaceId.get(placeId);
  if (hit) return hit;
  const res = await fetch(
    `/api/place-label?placeId=${encodeURIComponent(placeId)}`,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { label?: string | null };
  const raw = typeof data.label === "string" ? data.label.trim() : "";
  if (!raw) return null;
  labelByPlaceId.set(placeId, raw);
  return raw;
}

type Props = {
  place: JournalPlacePick;
  /** When set with onActivate, the label is a button that calls onActivate(place). */
  interactive?: boolean;
  onActivate?: (place: JournalPlacePick) => void;
};

/**
 * Daily summary read-only: prefers saved `displayName`, then Google’s short
 * name for `placeId`, then the formatted line. Hover shows the full address
 * when it differs from the headline.
 */
export function FriendlyPlaceReadout({
  place,
  interactive,
  onActivate,
}: Props) {
  const [line, setLine] = useState(() => placeDisplayLine(place));
  const [addressHint, setAddressHint] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    const nextSaved = place.displayName?.trim() ?? "";
    const nextFormatted = place.formattedAddress?.trim() ?? "";

    if (nextSaved) {
      setLine(formatPlaceTitleForCard(nextSaved));
      setAddressHint(
        nextFormatted &&
          nextFormatted.toLowerCase() !== nextSaved.toLowerCase()
          ? nextFormatted
          : undefined,
      );
      return;
    }

    setLine(placeDisplayLine(place));
    setAddressHint(nextFormatted || undefined);

    const pid = place.placeId?.trim();
    if (!pid) return;

    let cancelled = false;
    void (async () => {
      const fetched = await fetchGoogleLabel(pid);
      if (cancelled) return;
      if (fetched) {
        const pretty = formatPlaceTitleForCard(fetched);
        setLine(pretty);
        setAddressHint(
          nextFormatted &&
            nextFormatted.toLowerCase() !== pretty.toLowerCase()
            ? nextFormatted
            : undefined,
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    place.displayName,
    place.formattedAddress,
    place.placeId,
    place.lat,
    place.lng,
  ]);

  const sharedClass =
    "inline-block max-w-full hyphens-auto break-words [overflow-wrap:anywhere] text-left";

  if (interactive && onActivate) {
    return (
      <button
        type="button"
        title={addressHint}
        aria-label={`Show on map: ${line}`}
        className={`${sharedClass} cursor-pointer rounded-sm border border-transparent bg-transparent p-0 font-sans font-medium text-camp-navy underline decoration-camp-rust/40 decoration-2 underline-offset-2 transition hover:border-camp-navy/15 hover:bg-camp-cream/50 hover:decoration-camp-rust focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-camp-cream`}
        onClick={() => onActivate(place)}
      >
        {line}
      </button>
    );
  }

  return (
    <span title={addressHint} className={sharedClass}>
      {line}
    </span>
  );
}
