import type { DailyJournalEntry } from "@/lib/daily-journal-entry";
import { normalizeDailyJournalEntry } from "@/lib/daily-journal-entry";
import type {
  JournalTrip,
  PreTripChecklistItem,
} from "@/lib/journal-trip-model";

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

/** Parse the JSON blob stored in localStorage / Redis for a signed-in user. */
export function parseJournalTripsRecord(raw: string): Record<string, JournalTrip> {
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
