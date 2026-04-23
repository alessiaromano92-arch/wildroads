import type { Metadata } from "next";
import { TripJournalClient } from "@/components/trips/TripJournalClient";

export const metadata: Metadata = {
  title: "Trip journal | Wild roads",
  description: "Your day-by-day trail journal.",
};

export default async function TripJournalPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return <TripJournalClient tripId={tripId} />;
}
