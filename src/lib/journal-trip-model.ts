import type { JournalTripDay } from "@/lib/build-trip-days";
import type { DailyJournalEntry } from "@/lib/daily-journal-entry";

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
  dayJournal?: Record<string, DailyJournalEntry>;
  preTripChecklist?: PreTripChecklistItem[];
};
