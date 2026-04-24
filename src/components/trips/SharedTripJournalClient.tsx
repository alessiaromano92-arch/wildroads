"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { JournalTrip } from "@/lib/journal-trip-model";
import { DailyJournalCarousel } from "@/components/trips/DailyJournalCarousel";

const POLL_MS = 12_000;

type Props = {
  token: string;
};

export function SharedTripJournalClient({ token }: Props) {
  const [trip, setTrip] = useState<JournalTrip | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTrip = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/share/${encodeURIComponent(token)}/trip`,
        { credentials: "same-origin", cache: "no-store" },
      );
      if (!res.ok) {
        if (res.status === 404) {
          let reason: string | undefined;
          try {
            const err = (await res.clone().json()) as { reason?: string };
            reason = err.reason;
          } catch {
            /* ignore */
          }
          const msg =
            reason === "bad_token"
              ? "This link doesn’t look valid. Copy the full address or ask for a new link."
              : reason === "no_cloud"
                ? "Guest links aren’t available on this server yet (cloud storage isn’t configured)."
                : reason === "no_trip"
                  ? "That trip isn’t in the diary anymore—it may have been removed, or the latest version hasn’t finished syncing."
                  : "This link is expired or the trip was removed.";
          setLoadError(msg);
        } else {
          setLoadError("Could not load this trip.");
        }
        setTrip(null);
        return;
      }
      const data = (await res.json()) as { trip?: JournalTrip };
      if (!data.trip?.id) {
        setLoadError("Could not load this trip.");
        setTrip(null);
        return;
      }
      setLoadError(null);
      setTrip(data.trip);
    } catch {
      setLoadError("You may be offline. Try again in a moment.");
      setTrip(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchTrip();
  }, [fetchTrip]);

  useEffect(() => {
    const id = window.setInterval(() => void fetchTrip(), POLL_MS);
    return () => window.clearInterval(id);
  }, [fetchTrip]);

  if (loading) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24">
        <p className="font-sans text-sm text-camp-navy/80">Loading trip…</p>
      </main>
    );
  }

  if (loadError || !trip) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="patch-card-muted paper-surface max-w-md px-6 py-8 text-center">
          <h1 className="font-heading text-xl text-camp-forest">Shared trip</h1>
          <p className="mt-3 font-sans text-sm text-camp-navy/90">
            {loadError ?? "Something went wrong."}
          </p>
          <Link href="/" className="patch-btn-primary mt-6 inline-flex justify-center">
            Back to Wild roads
          </Link>
        </div>
      </main>
    );
  }

  const rangeLabel = `${new Date(trip.startDate + "T12:00:00").toLocaleDateString()} — ${new Date(trip.endDate + "T12:00:00").toLocaleDateString()}`;

  return (
    <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full min-w-0 max-w-3xl pb-12">
        <div
          className="mb-4 rounded-lg border border-camp-navy/15 bg-camp-cream/50 px-3 py-2 font-sans text-xs text-camp-navy/90 sm:text-sm"
          role="status"
        >
          You&apos;re viewing a <strong>read-only</strong> link. Sign in from the
          home page to keep your own journal.
        </div>

        <header className="mb-6 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-camp-navy/15 pb-4 sm:gap-x-4">
          <div className="flex min-w-0 flex-1 items-baseline gap-2.5 sm:gap-3">
            <Link
              href="/"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-transparent bg-transparent font-heading text-xl leading-none text-camp-forest transition-colors hover:border-camp-navy/35 hover:bg-camp-navy/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-page-offwhite sm:h-10 sm:w-10 sm:text-2xl"
              aria-label="Back to Wild roads home"
            >
              <span aria-hidden>←</span>
            </Link>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-xl leading-snug text-camp-forest sm:text-2xl">
                {trip.name}
              </h1>
              <p className="mt-1 font-sans text-xs text-camp-navy/85">{rangeLabel}</p>
            </div>
          </div>
        </header>

        <DailyJournalCarousel key={trip.id} trip={trip} readOnlyViewer />
      </div>
    </main>
  );
}
