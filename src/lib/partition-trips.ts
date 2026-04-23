import { parseTripLocalDate } from "@/lib/build-trip-days";

export function partitionTrips<T extends { endDate: string; startDate: string }>(
  trips: T[],
): { upcoming: T[]; past: T[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming: T[] = [];
  const past: T[] = [];

  for (const t of trips) {
    const end = parseTripLocalDate(t.endDate);
    if (Number.isNaN(end.getTime())) continue;
    if (end >= today) upcoming.push(t);
    else past.push(t);
  }

  upcoming.sort(
    (a, b) =>
      parseTripLocalDate(a.startDate).getTime() -
      parseTripLocalDate(b.startDate).getTime(),
  );
  past.sort(
    (a, b) =>
      parseTripLocalDate(b.endDate).getTime() -
      parseTripLocalDate(a.endDate).getTime(),
  );

  return { upcoming, past };
}
