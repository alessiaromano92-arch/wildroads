"use client";

import { useGuestTrip } from "@/context/guest-trip-context";

export function GuestTripPanel() {
  const { trip, isGuest, updateTrip, exitGuestSession } = useGuestTrip();

  if (!isGuest || !trip) return null;

  return (
    <section className="patch-card paper-surface mt-10 w-full max-w-xl p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-heading text-xl text-camp-forest sm:text-2xl">
          Guest trail sheet
        </h2>
        <button
          type="button"
          onClick={exitGuestSession}
          className="patch-btn-ghost text-sm"
        >
          Leave guest mode
        </button>
      </div>
      <p className="mb-6 font-sans text-sm text-camp-navy/85">
        Nothing is saved to the cloud yet—this is pretend data that only lives
        in this browser tab for now.
      </p>
      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 font-sans text-sm text-camp-navy">
          Trail or campsite name
          <input
            className="patch-input"
            value={trip.trailName}
            onChange={(e) => updateTrip({ trailName: e.target.value })}
            placeholder="e.g. Mystery Shack loop"
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-sm text-camp-navy">
          Nights under the stars
          <input
            type="number"
            min={1}
            max={30}
            className="patch-input w-28"
            value={trip.nights}
            onChange={(e) =>
              updateTrip({ nights: Number.parseInt(e.target.value, 10) || 1 })
            }
          />
        </label>
        <label className="flex flex-col gap-1 font-sans text-sm text-camp-navy">
          Notes
          <textarea
            className="patch-input min-h-[100px] resize-y"
            value={trip.notes}
            onChange={(e) => updateTrip({ notes: e.target.value })}
            placeholder="Wildlife sightings, tide times, secret maps…"
          />
        </label>
        <div>
          <p className="mb-2 font-sans text-sm font-medium text-camp-navy">
            Pack list (mock)
          </p>
          <ul className="flex flex-col gap-2 font-sans text-sm text-camp-forest">
            {trip.supplies.map((item, i) => (
              <li
                key={`${item}-${i}`}
                className="flex items-center gap-2 rounded-sm border border-camp-navy/25 bg-camp-cream/80 px-3 py-2"
              >
                <span className="text-camp-rust">▸</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="border-t border-camp-navy/20 pt-3 font-mono text-xs text-camp-navy/70">
          Last pretend save: {new Date(trip.updatedAt).toLocaleString()}
        </p>
      </div>
    </section>
  );
}
