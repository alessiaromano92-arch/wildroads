"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useJournalTrips } from "@/context/journal-trips-context";
import { useGoogleClerkSignIn } from "@/hooks/use-google-clerk-sign-in";
import { buildTripDaysFromRange } from "@/lib/build-trip-days";

export function NewTripForm() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signInWithGoogle, error: googleSignInError, isReady: googleSignInReady } =
    useGoogleClerkSignIn();
  const { saveTrip } = useJournalTrips();
  const [tripName, setTripName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = tripName.trim();
    if (!trimmed) {
      setError("Please name your trip so the rangers can file it.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Start and end dates are both required.");
      return;
    }

    const days = buildTripDaysFromRange(startDate, endDate);
    if (days.length === 0) {
      setError("End date must be on or after the start date.");
      return;
    }

    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `trip-${Date.now()}`;

    saveTrip({
      id,
      name: trimmed,
      startDate,
      endDate,
      days,
      createdAt: new Date().toISOString(),
    });

    router.push(`/trips/${id}/journal`);
  };

  return (
    <div className="park-registration-card paper-surface relative w-full max-w-lg shrink-0 px-6 pb-12 pt-10 sm:px-10 sm:pb-10 sm:pt-10">
      <Link
        href="/"
        aria-label="Go back"
        className="absolute left-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-lg border-2 border-camp-navy text-camp-navy transition hover:bg-camp-navy/8 sm:left-8 sm:top-8"
      >
        <span aria-hidden className="text-xl leading-none">
          ←
        </span>
      </Link>

      <div className="mb-8 border-b-2 border-dashed border-camp-navy/35 px-10 pb-6 pt-2 text-center sm:mb-6 sm:px-8 sm:pb-4 sm:pt-0 md:px-6 lg:px-0">
        <p className="mx-auto max-w-[min(100%,16rem)] font-mono text-[10px] uppercase leading-snug tracking-[0.35em] text-camp-rust sm:max-w-none sm:tracking-[0.4em]">
          Form No. 7-A · Visitor services
        </p>
        <h1 className="font-heading mt-2 text-2xl text-camp-forest sm:text-3xl">
          Log new adventure
        </h1>
        <p className="mx-auto mt-3 max-w-[min(100%,18rem)] font-sans text-xs leading-relaxed text-camp-forest/90 sm:max-w-prose">
          {isSignedIn ? (
            <>
              You&apos;re signed in—this trip is{" "}
              <span className="font-semibold">saved automatically</span> for your
              account on this device.
            </>
          ) : (
            <>
              You&apos;ll lose your trip if you close the tab.{" "}
              <button
                type="button"
                aria-label="Log in with Google"
                onClick={signInWithGoogle}
                disabled={!googleSignInReady}
                className="font-semibold text-camp-forest underline decoration-camp-forest/40 underline-offset-2 transition hover:decoration-camp-forest disabled:opacity-50"
              >
                Log in
              </button>{" "}
              to save progress.
            </>
          )}
        </p>
        {!isSignedIn && googleSignInError ? (
          <p
            className="mx-auto mt-2 max-w-prose rounded-md border-2 border-camp-rust bg-camp-rust/10 px-3 py-2 text-left font-sans text-xs text-camp-rust"
            role="alert"
          >
            {googleSignInError}
          </p>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6 sm:gap-5">
        <label className="flex flex-col gap-1.5 font-sans text-sm font-semibold text-camp-navy">
          <span>
            Trip name{" "}
            <span className="text-camp-rust" aria-hidden>
              *
            </span>
          </span>
          <input
            className="patch-input font-normal"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="e.g. Lake Gravity overnight"
            autoComplete="off"
            aria-required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 font-sans text-sm font-semibold text-camp-navy">
            <span>
              Start date{" "}
              <span className="text-camp-rust" aria-hidden>
                *
              </span>
            </span>
            <input
              type="date"
              className="patch-input font-normal"
              value={startDate}
              onChange={(e) => {
                const next = e.target.value;
                setStartDate(next);
                if (next && endDate && endDate < next) {
                  setEndDate(next);
                }
              }}
              aria-required
            />
          </label>
          <label className="flex flex-col gap-1.5 font-sans text-sm font-semibold text-camp-navy">
            <span>
              End date{" "}
              <span className="text-camp-rust" aria-hidden>
                *
              </span>
            </span>
            <input
              type="date"
              className="patch-input font-normal"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              aria-required
            />
          </label>
        </div>

        {error ? (
          <p
            className="rounded-md border-2 border-camp-rust bg-camp-rust/10 px-3 py-2 font-sans text-sm text-camp-rust"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-center sm:mt-4">
          <button type="submit" className="patch-btn-primary w-full max-w-sm">
            Create trip
          </button>
        </div>
      </form>
    </div>
  );
}
