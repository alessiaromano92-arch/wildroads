export type JournalTripDay = {
  dayNumber: number;
  /** Local calendar date YYYY-MM-DD */
  dateISO: string;
  label: string;
};

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC off-by-one). */
export function parseTripLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d);
}

function formatLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Inclusive days from start through end. Returns [] if range is invalid.
 */
export function buildTripDaysFromRange(
  startDateISO: string,
  endDateISO: string,
): JournalTripDay[] {
  const start = parseTripLocalDate(startDateISO);
  const end = parseTripLocalDate(endDateISO);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  if (end < start) return [];

  const days: JournalTripDay[] = [];
  const cursor = new Date(start);
  let dayNumber = 0;

  while (cursor <= end) {
    dayNumber += 1;
    const dateISO = formatLocalISO(cursor);
    const label = `Day ${dayNumber} — ${cursor.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    })}`;
    days.push({ dayNumber, dateISO, label });
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
