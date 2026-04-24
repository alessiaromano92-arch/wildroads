import type { JournalTrip } from "@/lib/journal-trip-model";

/**
 * Combine trips from this browser and from the server so nothing is dropped.
 * Same trip id: trip fields favour the server copy, day notes merge with server
 * winning when both sides saved the same calendar day.
 */
export function mergeTripStorages(
  local: Record<string, JournalTrip>,
  remote: Record<string, JournalTrip>,
): Record<string, JournalTrip> {
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);
  const out: Record<string, JournalTrip> = {};
  for (const id of ids) {
    const L = local[id];
    const R = remote[id];
    if (L && !R) {
      out[id] = L;
    } else if (R && !L) {
      out[id] = R;
    } else if (L && R) {
      out[id] = {
        ...L,
        ...R,
        dayJournal: {
          ...(L.dayJournal ?? {}),
          ...(R.dayJournal ?? {}),
        },
        preTripChecklist: R.preTripChecklist ?? L.preTripChecklist,
      };
    }
  }
  return out;
}
