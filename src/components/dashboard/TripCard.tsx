"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { JournalTrip } from "@/context/journal-trips-context";
import {
  absoluteUrlForPath,
  fetchTripSharePath,
  shareFailureMessage,
} from "@/lib/trip-share-client";
import {
  buildTripCardPhotoUrl,
  countTripStops,
  tripCardFallbackImageUrl,
} from "@/lib/trip-dashboard-helpers";

function formatTripDateRange(trip: JournalTrip) {
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  const a = new Date(`${trip.startDate}T12:00:00`).toLocaleDateString(
    undefined,
    opts,
  );
  const b = new Date(`${trip.endDate}T12:00:00`).toLocaleDateString(
    undefined,
    opts,
  );
  return `${a} — ${b}`;
}

/** Classic share: open tray (square missing the top) + arrow up through the opening. */
function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 4.5v6.25M8.75 7.75 12 4.5l3.25 3.25"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8 11v8.5h8V11"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TripCardProps = {
  trip: JournalTrip;
  /** When false, bottom corners are square (e.g. checklist stacked below). */
  roundedBottom?: boolean;
};

export function TripCard({ trip, roundedBottom = true }: TripCardProps) {
  const apiPhotoUrl = useMemo(() => buildTripCardPhotoUrl(trip), [trip]);
  const stockFallbackUrl = useMemo(
    () => tripCardFallbackImageUrl(trip.id),
    [trip.id],
  );
  const [heroImageUrl, setHeroImageUrl] = useState(apiPhotoUrl);
  useEffect(() => {
    setHeroImageUrl(apiPhotoUrl);
  }, [apiPhotoUrl]);

  const stops = useMemo(() => countTripStops(trip), [trip]);
  const dayCount = trip.days.length;
  const dateLine = formatTripDateRange(trip);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareResult = await fetchTripSharePath(trip);
    if (!shareResult.ok) {
      window.alert(shareFailureMessage(shareResult));
      return;
    }
    const url = absoluteUrlForPath(shareResult.path);
    try {
      if (navigator.share) {
        await navigator.share({ title: trip.name, url });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        window.alert(
          "Link copied. Anyone with the link can view this trip (read-only).",
        );
      }
    } catch {
      /* user cancelled share sheet or clipboard blocked */
    }
  };

  const roundClass = roundedBottom
    ? "rounded-[1.35rem]"
    : "rounded-t-[1.35rem] rounded-b-none";

  const hoverLift = roundedBottom
    ? "hover:-translate-y-1.5 hover:shadow-[10px_10px_0_var(--trip-dashboard-offset-shadow)]"
    : "";

  return (
    <div
      className={`group relative isolate overflow-hidden border-[3px] border-[var(--cartoon-ink)] shadow-[6px_6px_0_var(--trip-dashboard-offset-shadow)] transition duration-300 ease-out will-change-transform ${hoverLift} ${roundClass}`}
    >
      <Link
        href={`/trips/${trip.id}/journal`}
        aria-label={`Open journal: ${trip.name}`}
        className="relative block min-h-[min(17rem,52vw)] focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-cream focus-visible:ring-offset-2 focus-visible:ring-offset-black/50"
      >
        <div
          className="trip-card-film-media absolute inset-0 overflow-hidden transition-transform duration-500 ease-out"
          aria-hidden
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Unsplash stock URLs */}
          <img
            key={trip.id}
            src={heroImageUrl}
            alt=""
            className="trip-card-film-img pointer-events-none absolute inset-0 h-full w-full object-cover opacity-0"
            onLoad={(ev) => {
              ev.currentTarget.style.opacity = "1";
            }}
            onError={() => {
              setHeroImageUrl((u) =>
                u === stockFallbackUrl ? u : stockFallbackUrl,
              );
            }}
          />
        </div>

        <div
          className="absolute inset-0 bg-gradient-to-t from-[#0f1714]/92 via-[#1a2420]/55 to-[#0f1714]/35"
          aria-hidden
        />

        <div className="relative flex min-h-[min(17rem,52vw)] flex-col justify-end p-6 pb-7 sm:p-8 sm:pb-8">
          <div className="pointer-events-none absolute left-5 top-5 sm:left-7 sm:top-6">
            <span className="trip-scout-badge trip-scout-badge--pine -rotate-1 inline-block">
              {dayCount === 1 ? "1 day" : `${dayCount} days`}
              <span className="mx-1.5 opacity-60">·</span>
              {stops === 1 ? "1 stop" : `${stops} stops`}
            </span>
          </div>

          <div className="pointer-events-none mt-14 sm:mt-16">
            <h3 className="font-heading text-balance text-2xl font-bold leading-[1.12] tracking-tight text-camp-cream drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] sm:text-4xl sm:leading-[1.08]">
              {trip.name}
            </h3>
            <p className="mt-1.5 font-sans text-[11px] font-medium leading-snug text-camp-cream/82 drop-shadow-[0_1px_6px_rgba(0,0,0,0.4)] sm:mt-2 sm:text-xs">
              {dateLine}
            </p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={handleShare}
        className="patch-btn-secondary patch-btn--icon-only absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center !bg-camp-cream/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1714]/80"
        aria-label="Share trip"
        title="Share trip"
      >
        <ShareIcon className="shrink-0" />
      </button>
    </div>
  );
}
