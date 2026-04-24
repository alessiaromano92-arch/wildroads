"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { JournalTrip } from "@/context/journal-trips-context";
import { useJournalTrips } from "@/context/journal-trips-context";
import { buildTripDaysFromRange } from "@/lib/build-trip-days";
import {
  absoluteUrlForPath,
  fetchTripSharePath,
  shareFailureMessage,
} from "@/lib/trip-share-client";

type Props = {
  trip: JournalTrip;
};

function MoreVerticalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={22}
      height={22}
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="6.5" r="2.35" fill="currentColor" />
      <circle cx="12" cy="12" r="2.35" fill="currentColor" />
      <circle cx="12" cy="17.5" r="2.35" fill="currentColor" />
    </svg>
  );
}

export function JournalTripHeroMenu({ trip }: Props) {
  const router = useRouter();
  const { saveTrip, deleteTrip } = useJournalTrips();
  const menuRootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(trip.name);
  const [startDate, setStartDate] = useState(trip.startDate);
  const [endDate, setEndDate] = useState(trip.endDate);
  const [editError, setEditError] = useState<string | null>(null);

  const openEdit = useCallback(() => {
    setMenuOpen(false);
    setName(trip.name);
    setStartDate(trip.startDate);
    setEndDate(trip.endDate);
    setEditError(null);
    setEditOpen(true);
  }, [trip.endDate, trip.name, trip.startDate]);

  useEffect(() => {
    if (!menuOpen && !editOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (menuOpen) {
        setMenuOpen(false);
        return;
      }
      setEditOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen, editOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const el = menuRootRef.current;
      if (el && !el.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setEditError("Give the trip a name.");
      return;
    }
    if (!startDate || !endDate) {
      setEditError("Start and end dates are both required.");
      return;
    }
    const days = buildTripDaysFromRange(startDate, endDate);
    if (days.length === 0) {
      setEditError("End date must be on or after the start date.");
      return;
    }
    const allowed = new Set(days.map((d) => d.dateISO));
    const prunedJournal = trip.dayJournal
      ? Object.fromEntries(
          Object.entries(trip.dayJournal).filter(([iso]) => allowed.has(iso)),
        )
      : undefined;

    const next: JournalTrip = {
      ...trip,
      name: trimmed,
      startDate,
      endDate,
      days,
    };
    if (prunedJournal && Object.keys(prunedJournal).length > 0) {
      next.dayJournal = prunedJournal;
    } else {
      delete next.dayJournal;
    }
    saveTrip(next);
    setEditOpen(false);
  };

  const handleShareTrip = async () => {
    setMenuOpen(false);
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
        window.alert("Link copied. Anyone with the link can view this trip (read-only).");
      }
    } catch {
      /* cancelled share sheet */
    }
  };

  const handleDelete = () => {
    const ok = window.confirm(
      "Remove this trip and its journal from this device? This cannot be undone.",
    );
    if (!ok) return;
    setMenuOpen(false);
    setEditOpen(false);
    deleteTrip(trip.id);
    router.push("/");
  };

  return (
    <div ref={menuRootRef} className="relative shrink-0">
      <button
        type="button"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px_6px_10px_6px] border-[3px] border-camp-forest bg-transparent text-camp-forest shadow-[3px_3px_0_var(--trip-dashboard-offset-shadow)] transition hover:-translate-x-px hover:-translate-y-px hover:bg-camp-navy/[0.06] hover:shadow-[4px_4px_0_var(--trip-dashboard-offset-shadow)] focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-page-offwhite"
        aria-label="Trip options"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((o) => !o)}
      >
        <MoreVerticalIcon className="shrink-0" />
      </button>

      {menuOpen ? (
        <div
          className="absolute right-0 top-full z-40 mt-1.5 min-w-[11.5rem] overflow-hidden rounded-lg border-2 border-camp-navy/20 bg-white py-1 shadow-[4px_4px_0_var(--trip-dashboard-offset-shadow)]"
          role="menu"
          aria-label="Trip actions"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left font-sans text-sm font-semibold text-camp-navy transition hover:bg-camp-navy/[0.06]"
            onClick={openEdit}
          >
            Edit trip
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left font-sans text-sm font-semibold text-camp-navy transition hover:bg-camp-navy/[0.06]"
            onClick={() => void handleShareTrip()}
          >
            Share read-only link
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left font-sans text-sm font-semibold text-camp-rust transition hover:bg-camp-rust/[0.08]"
            onClick={() => {
              setMenuOpen(false);
              handleDelete();
            }}
          >
            Delete trip
          </button>
        </div>
      ) : null}

      {editOpen ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-camp-navy/40 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditOpen(false);
          }}
        >
          <div
            className="patch-card paper-surface relative w-full max-w-md p-6 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-trip-title"
          >
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-md border-2 border-transparent text-camp-navy/65 transition hover:border-camp-navy/18 hover:bg-camp-navy/[0.06] hover:text-camp-navy focus:outline-none focus-visible:ring-2 focus-visible:ring-camp-rust focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--paper-surface-fill)]"
              aria-label="Close"
            >
              <span
                className="font-sans text-2xl font-light leading-none"
                aria-hidden
              >
                ×
              </span>
            </button>
            <h2
              id="edit-trip-title"
              className="pr-10 font-heading text-xl text-camp-forest"
            >
              Edit trip
            </h2>
            <form className="mt-5 flex flex-col gap-4" onSubmit={handleSaveEdit}>
              <label className="flex flex-col gap-1.5 font-sans text-sm font-semibold text-camp-navy">
                <span>
                  Trip name{" "}
                  <span className="text-camp-rust" aria-hidden>
                    *
                  </span>
                </span>
                <input
                  className="patch-input font-normal"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  aria-required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
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
              {editError ? (
                <p
                  className="rounded-md border-2 border-camp-rust bg-camp-rust/10 px-3 py-2 font-sans text-sm text-camp-rust"
                  role="alert"
                >
                  {editError}
                </p>
              ) : null}
              <div className="mt-1 flex w-full flex-row flex-wrap items-center justify-end">
                <button type="submit" className="patch-btn-primary text-sm">
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
