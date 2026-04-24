import type { Metadata } from "next";
import { SharedTripJournalClient } from "@/components/trips/SharedTripJournalClient";

export const metadata: Metadata = {
  title: "Shared trip | Wild roads",
  description: "Read-only view of a trip journal.",
};

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedTripJournalClient token={token} />;
}
