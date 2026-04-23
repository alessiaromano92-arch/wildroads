"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type GuestTrip = {
  id: string;
  trailName: string;
  nights: number;
  notes: string;
  supplies: string[];
  updatedAt: string;
};

type GuestTripContextValue = {
  trip: GuestTrip | null;
  isGuest: boolean;
  startGuestSession: () => void;
  exitGuestSession: () => void;
  updateTrip: (patch: Partial<Omit<GuestTrip, "id" | "updatedAt">>) => void;
};

const GuestTripContext = createContext<GuestTripContextValue | null>(null);

function createEmptyTrip(): GuestTrip {
  const now = new Date().toISOString();
  return {
    id: `guest-${now}`,
    trailName: "",
    nights: 2,
    notes: "",
    supplies: ["Trail map", "Water", "Snacks"],
    updatedAt: now,
  };
}

export function GuestTripProvider({ children }: { children: ReactNode }) {
  const [trip, setTrip] = useState<GuestTrip | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  const startGuestSession = useCallback(() => {
    setIsGuest(true);
    setTrip(createEmptyTrip());
  }, []);

  const exitGuestSession = useCallback(() => {
    setIsGuest(false);
    setTrip(null);
  }, []);

  const updateTrip = useCallback(
    (patch: Partial<Omit<GuestTrip, "id" | "updatedAt">>) => {
      setTrip((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      trip,
      isGuest,
      startGuestSession,
      exitGuestSession,
      updateTrip,
    }),
    [trip, isGuest, startGuestSession, exitGuestSession, updateTrip],
  );

  return (
    <GuestTripContext.Provider value={value}>{children}</GuestTripContext.Provider>
  );
}

export function useGuestTrip() {
  const ctx = useContext(GuestTripContext);
  if (!ctx) {
    throw new Error("useGuestTrip must be used within GuestTripProvider");
  }
  return ctx;
}
