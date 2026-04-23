"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useJournalTrips } from "@/context/journal-trips-context";
import { DailyJournalCarousel } from "@/components/trips/DailyJournalCarousel";
import { JournalTripHeroMenu } from "@/components/trips/JournalTripHeroMenu";
import Link from "next/link";

type Props = {
  tripId: string;
};

export function TripJournalClient({ tripId }: Props) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { getTrip } = useJournalTrips();
  const trip = getTrip(tripId);

  const newTripLabel =
    isLoaded && isSignedIn ? "Start a new trip" : "Start new trip as a guest";
  const dashboardLinkLabel = !isLoaded
    ? "Back"
    : isSignedIn
      ? "Back to dashboard"
      : "Back to home";

  if (!trip) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="patch-card-muted paper-surface max-w-md px-6 py-8 text-center">
          <h1 className="font-heading text-xl text-camp-forest">
            Journal not on file
          </h1>
          <p className="mt-3 font-sans text-sm text-camp-navy/90">
            {isSignedIn
              ? "We could not find this trip in your saved list. Open your dashboard or start a new trip."
              : "This trip was only kept in this browser tab. If you refreshed, closed the tab, or were not signed in, it may be gone—start a new registration."}
          </p>
          <Link
            href="/trips/new"
            className="patch-btn-primary mt-6 inline-flex justify-center"
          >
            {newTripLabel}
          </Link>
          <Link
            href="/"
            className="mt-3 block font-sans text-sm font-medium text-camp-rust underline"
          >
            {isSignedIn ? "Back to dashboard" : "Back to home"}
          </Link>
        </div>
      </main>
    );
  }

  const rangeLabel = `${new Date(trip.startDate + "T12:00:00").toLocaleDateString()} — ${new Date(trip.endDate + "T12:00:00").toLocaleDateString()}`;

  return (
    <main className="flex min-w-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full min-w-0 max-w-3xl pb-12">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-x-3 gap-y-2 border-b border-camp-navy/15 pb-4 sm:gap-x-4">
          <div className="flex min-w-0 flex-1 items-baseline gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              aria-label={dashboardLinkLabel}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-transparent bg-transparent font-heading text-xl leading-none text-camp-forest transition-colors hover:border-camp-navy/35 hover:bg-camp-navy/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-page-offwhite sm:h-10 sm:w-10 sm:text-2xl"
            >
              <span aria-hidden>←</span>
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-xl leading-snug text-camp-forest sm:text-2xl">
                {trip.name}
              </h1>
              <p className="mt-1 font-sans text-xs text-camp-navy/85">{rangeLabel}</p>
            </div>
          </div>
          <JournalTripHeroMenu trip={trip} />
        </header>

        <DailyJournalCarousel key={trip.id} trip={trip} />
      </div>
    </main>
  );
}
