"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { TripCard } from "@/components/dashboard/TripCard";
import { PreTripChecklistPanel } from "@/components/trips/PreTripChecklistPanel";
import { useJournalTrips, type JournalTrip } from "@/context/journal-trips-context";
import { partitionTrips } from "@/lib/partition-trips";
import { tripRustTextLinkClass } from "@/lib/trip-rust-text-link";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
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
        d="m9 6 6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TripCardWithChecklist({ trip }: { trip: JournalTrip }) {
  return (
    <div className="transition duration-300 ease-out will-change-transform hover:-translate-y-1.5">
      <div className="flex flex-col">
        <TripCard trip={trip} roundedBottom={false} />
        <PreTripChecklistPanel trip={trip} variant="dashboard" />
      </div>
    </div>
  );
}

function TripSection({
  title,
  emptyHint,
  trips,
  headerAction,
}: {
  title: string;
  emptyHint: string;
  trips: JournalTrip[];
  headerAction?: ReactNode;
}) {
  return (
    <section className="w-full">
      <div className="mb-5 flex flex-row flex-wrap items-center justify-between gap-3 sm:mb-6 sm:gap-4">
        <h2 className="font-heading text-2xl text-camp-forest sm:text-3xl">
          {title}
        </h2>
        {headerAction ? (
          <div className="flex shrink-0 items-center">{headerAction}</div>
        ) : null}
      </div>
      {trips.length === 0 ? (
        <p className="patch-card-muted rounded-md px-4 py-3 font-sans text-sm text-camp-navy/85">
          {emptyHint}
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
          {trips.map((trip) => (
            <li key={trip.id} className="min-w-0">
              <TripCardWithChecklist trip={trip} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PastTripsAccordion({ trips }: { trips: JournalTrip[] }) {
  const [open, setOpen] = useState(false);
  const hasPast = trips.length > 0;

  return (
    <section className="w-full" aria-label="Past trips">
      {hasPast ? (
        <>
          <button
            type="button"
            id="past-trips-trigger"
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-camp-navy/20 bg-white px-4 py-4 text-left font-sans text-base font-semibold text-camp-navy shadow-[0_1px_0_rgba(61,79,102,0.06)] transition hover:border-camp-navy/30 hover:bg-camp-cream/35 sm:px-5 sm:py-[1.125rem] sm:text-lg"
            aria-expanded={open}
            aria-controls="past-trips-panel"
            onClick={() => setOpen((v) => !v)}
          >
            <span>Past trips</span>
            <ChevronRightIcon
              className={`shrink-0 transition-transform duration-200 ease-out ${open ? "rotate-90" : ""}`}
            />
          </button>
          {open ? (
            <div
              id="past-trips-panel"
              role="region"
              aria-labelledby="past-trips-trigger"
              className="mt-5"
            >
              <ul className="m-0 grid list-none grid-cols-1 gap-6 p-0 md:grid-cols-2">
                {trips.map((trip) => (
                  <li key={trip.id} className="min-w-0">
                    <TripCardWithChecklist trip={trip} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : (
        <div
          className="flex w-full cursor-not-allowed items-center justify-between gap-3 rounded-xl border border-dashed border-camp-navy/20 bg-camp-cream/40 px-4 py-4 text-left font-sans text-base font-semibold text-camp-navy/45 select-none sm:px-5 sm:py-[1.125rem] sm:text-lg"
          aria-disabled="true"
        >
          <span>Past trips</span>
          <ChevronRightIcon className="shrink-0 text-camp-navy/30" />
        </div>
      )}
    </section>
  );
}

export function TripsDashboard() {
  const { listTrips, tripsHydrated } = useJournalTrips();

  const { upcoming, past } = useMemo(
    () => partitionTrips(listTrips()),
    [listTrips],
  );

  const hasAny = upcoming.length > 0 || past.length > 0;

  if (!tripsHydrated) {
    return (
      <div className="camp-bg flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="patch-skeleton h-32 w-full max-w-md rounded-md" />
      </div>
    );
  }

  return (
    <div className="camp-bg flex flex-1 flex-col px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        {!hasAny ? (
          <div className="patch-card paper-surface mx-auto flex w-full max-w-md flex-col self-center text-center">
            <div className="px-4 pt-4 sm:px-5 sm:pt-5">
              <div className="relative mb-6 w-full overflow-hidden rounded-[0.65rem] border-[3px] border-[var(--cartoon-ink)] shadow-[3px_3px_0_rgba(51,84,76,0.2)] sm:mb-8 sm:rounded-[0.85rem]">
                <div className="relative aspect-[21/9] w-full sm:aspect-[3/1] md:aspect-[10/3]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- static local asset */}
                  <img
                    src="/images/wild-roads-empty-state.png"
                    alt="Illustrated trail map with compass, mountains, and Camp Wild Roads"
                    className="absolute inset-0 h-full w-full object-cover object-center"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-center px-6 pb-10 pt-0 sm:pt-1">
              <p className="font-heading text-xl text-camp-forest sm:text-2xl">
                No trips yet
              </p>
              <p className="mt-3 max-w-md font-sans text-sm text-camp-navy/90">
                When you&apos;re ready, start a new trip.
              </p>
              <Link
                href="/trips/new"
                className="patch-btn-primary mt-8 inline-flex min-h-[3rem] items-center justify-center gap-2 px-6"
              >
                <PlusIcon className="shrink-0" />
                Start a new trip
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-12">
            <TripSection
              title="Trips"
              emptyHint="Nothing on the calendar ahead—you're all caught up."
              trips={upcoming}
              headerAction={
                <Link href="/trips/new" className={tripRustTextLinkClass}>
                  <PlusIcon className="shrink-0" />
                  Start a new trip
                </Link>
              }
            />
            <PastTripsAccordion
              key={past.length > 0 ? "past-has" : "past-empty"}
              trips={past}
            />
          </div>
        )}
      </div>
    </div>
  );
}
