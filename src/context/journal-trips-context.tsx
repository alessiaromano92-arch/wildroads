"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { JournalTripDay } from "@/lib/build-trip-days";
import type { DailyJournalEntry } from "@/lib/daily-journal-entry";
import {
  normalizeDailyJournalEntry,
} from "@/lib/daily-journal-entry";
import { loadTripsJson, saveTripsJson } from "@/lib/trips-persistence";

export type PreTripChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export type JournalTrip = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  days: JournalTripDay[];
  createdAt: string;
  /** Field-guide entries keyed by calendar day `YYYY-MM-DD` */
  dayJournal?: Record<string, DailyJournalEntry>;
  /** Tasks to finish before departure; optional for older saved trips */
  preTripChecklist?: PreTripChecklistItem[];
};

type JournalTripsContextValue = {
  /** True after we’ve read browser storage for the current auth mode. */
  tripsHydrated: boolean;
  getTrip: (id: string) => JournalTrip | undefined;
  listTrips: () => JournalTrip[];
  saveTrip: (trip: JournalTrip) => void;
  /** Merges one day into `dayJournal` using latest trip state (safe with debounced saves). */
  updateTripDayJournal: (
    tripId: string,
    dateISO: string,
    entry: DailyJournalEntry,
  ) => void;
  /** Replaces the whole pre-trip checklist (empty array clears it). */
  updateTripPreTripChecklist: (
    tripId: string,
    items: PreTripChecklistItem[],
  ) => void;
  deleteTrip: (tripId: string) => void;
};

const JournalTripsContext = createContext<JournalTripsContextValue | null>(null);

function normalizePreTripChecklist(raw: unknown): PreTripChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PreTripChecklistItem[] = [];
  for (const x of raw) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.label !== "string") continue;
    out.push({
      id: o.id,
      label: o.label,
      done: Boolean(o.done),
    });
  }
  return out;
}

function parseStoredTrips(raw: string): Record<string, JournalTrip> {
  try {
    const data = JSON.parse(raw) as Record<string, JournalTrip>;
    if (!data || typeof data !== "object") return {};
    for (const id of Object.keys(data)) {
      const trip = data[id];
      if (!trip) continue;
      let next: JournalTrip = trip;

      if (trip.dayJournal && typeof trip.dayJournal === "object") {
        const nextJournal: Record<string, DailyJournalEntry> = {};
        for (const [dateISO, entry] of Object.entries(trip.dayJournal)) {
          nextJournal[dateISO] = normalizeDailyJournalEntry(entry);
        }
        next = { ...next, dayJournal: nextJournal };
      }

      if (trip.preTripChecklist !== undefined) {
        next = {
          ...next,
          preTripChecklist: normalizePreTripChecklist(trip.preTripChecklist),
        };
      }

      data[id] = next;
    }
    return data;
  } catch {
    return {};
  }
}

export function JournalTripsProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const [tripsById, setTripsById] = useState<Record<string, JournalTrip>>({});
  const [tripsHydrated, setTripsHydrated] = useState(false);

  useEffect(() => {
    if (!authLoaded) return;
    const raw = loadTripsJson(userId ?? null);
    const data = raw ? parseStoredTrips(raw) : {};
    startTransition(() => {
      setTripsById(data);
      setTripsHydrated(true);
    });
  }, [authLoaded, userId]);

  const saveTrip = useCallback(
    (trip: JournalTrip) => {
      setTripsById((prev) => {
        const next = { ...prev, [trip.id]: trip };
        saveTripsJson(userId ?? null, JSON.stringify(next));
        return next;
      });
    },
    [userId],
  );

  const updateTripDayJournal = useCallback(
    (tripId: string, dateISO: string, entry: DailyJournalEntry) => {
      setTripsById((prev) => {
        const trip = prev[tripId];
        if (!trip) return prev;
        const nextTrip: JournalTrip = {
          ...trip,
          dayJournal: {
            ...(trip.dayJournal ?? {}),
            [dateISO]: entry,
          },
        };
        const next = { ...prev, [tripId]: nextTrip };
        saveTripsJson(userId ?? null, JSON.stringify(next));
        return next;
      });
    },
    [userId],
  );

  const updateTripPreTripChecklist = useCallback(
    (tripId: string, items: PreTripChecklistItem[]) => {
      setTripsById((prev) => {
        const trip = prev[tripId];
        if (!trip) return prev;
        const nextTrip: JournalTrip = {
          ...trip,
          preTripChecklist: items.length > 0 ? items : undefined,
        };
        const next = { ...prev, [tripId]: nextTrip };
        saveTripsJson(userId ?? null, JSON.stringify(next));
        return next;
      });
    },
    [userId],
  );

  const deleteTrip = useCallback(
    (tripId: string) => {
      setTripsById((prev) => {
        if (!prev[tripId]) return prev;
        const next = { ...prev };
        delete next[tripId];
        saveTripsJson(userId ?? null, JSON.stringify(next));
        return next;
      });
    },
    [userId],
  );

  const listTrips = useCallback(() => Object.values(tripsById), [tripsById]);

  const getTrip = useCallback(
    (id: string) => tripsById[id],
    [tripsById],
  );

  const value = useMemo(
    () => ({
      tripsHydrated,
      getTrip,
      listTrips,
      saveTrip,
      updateTripDayJournal,
      updateTripPreTripChecklist,
      deleteTrip,
    }),
    [
      tripsHydrated,
      getTrip,
      listTrips,
      saveTrip,
      updateTripDayJournal,
      updateTripPreTripChecklist,
      deleteTrip,
    ],
  );

  return (
    <JournalTripsContext.Provider value={value}>
      {children}
    </JournalTripsContext.Provider>
  );
}

export function useJournalTrips() {
  const ctx = useContext(JournalTripsContext);
  if (!ctx) {
    throw new Error("useJournalTrips must be used within JournalTripsProvider");
  }
  return ctx;
}
