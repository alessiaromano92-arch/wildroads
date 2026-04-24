"use client";

import { useAuth } from "@clerk/nextjs";
import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DailyJournalEntry } from "@/lib/daily-journal-entry";
import type {
  JournalTrip,
  PreTripChecklistItem,
} from "@/lib/journal-trip-model";
import { parseJournalTripsRecord } from "@/lib/journal-trip-parse";
import { mergeTripStorages } from "@/lib/trips-cloud-merge";
import { loadTripsJson, saveTripsJson } from "@/lib/trips-persistence";

export type { JournalTrip, PreTripChecklistItem } from "@/lib/journal-trip-model";

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

const CLOUD_PUSH_MS = 1200;

export function JournalTripsProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded: authLoaded } = useAuth();
  const [tripsById, setTripsById] = useState<Record<string, JournalTrip>>({});
  const [tripsHydrated, setTripsHydrated] = useState(false);
  const cloudSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userIdRef = useRef<string | null | undefined>(userId);
  userIdRef.current = userId;

  const scheduleCloudPush = useCallback((json: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
    cloudSyncTimerRef.current = setTimeout(() => {
      cloudSyncTimerRef.current = null;
      void fetch("/api/trips", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: json }),
      });
    }, CLOUD_PUSH_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (cloudSyncTimerRef.current) clearTimeout(cloudSyncTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!authLoaded) return;

    if (!userId) {
      const raw = loadTripsJson(null);
      const data = raw ? parseJournalTripsRecord(raw) : {};
      startTransition(() => {
        setTripsById(data);
        setTripsHydrated(true);
      });
      return;
    }

    setTripsHydrated(false);
    let cancelled = false;

    void (async () => {
      const localRaw = loadTripsJson(userId);
      const local = localRaw ? parseJournalTripsRecord(localRaw) : {};
      let merged = local;

      try {
        const res = await fetch("/api/trips", { credentials: "same-origin" });
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as {
            sync?: boolean;
            payload?: string;
          };
          if (body.sync === true && typeof body.payload === "string") {
            const remote = parseJournalTripsRecord(body.payload);
            merged = mergeTripStorages(local, remote);
            const mergedJson = JSON.stringify(merged);
            saveTripsJson(userId, mergedJson);
            if (mergedJson !== body.payload) {
              await fetch("/api/trips", {
                method: "PUT",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ payload: mergedJson }),
              });
            }
          }
        }
      } catch {
        merged = local;
      }

      if (cancelled) return;
      startTransition(() => {
        setTripsById(merged);
        setTripsHydrated(true);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoaded, userId]);

  const persistAndMaybeCloud = useCallback(
    (next: Record<string, JournalTrip>) => {
      const json = JSON.stringify(next);
      saveTripsJson(userId ?? null, json);
      if (userId) scheduleCloudPush(json);
    },
    [userId, scheduleCloudPush],
  );

  const saveTrip = useCallback(
    (trip: JournalTrip) => {
      setTripsById((prev) => {
        const next = { ...prev, [trip.id]: trip };
        persistAndMaybeCloud(next);
        return next;
      });
    },
    [persistAndMaybeCloud],
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
        persistAndMaybeCloud(next);
        return next;
      });
    },
    [persistAndMaybeCloud],
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
        persistAndMaybeCloud(next);
        return next;
      });
    },
    [persistAndMaybeCloud],
  );

  const deleteTrip = useCallback(
    (tripId: string) => {
      setTripsById((prev) => {
        if (!prev[tripId]) return prev;
        const next = { ...prev };
        delete next[tripId];
        persistAndMaybeCloud(next);
        return next;
      });
    },
    [persistAndMaybeCloud],
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
