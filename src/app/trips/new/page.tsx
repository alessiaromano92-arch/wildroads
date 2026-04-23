import type { Metadata } from "next";
import { NewTripForm } from "@/components/trips/NewTripForm";

export const metadata: Metadata = {
  title: "Log new adventure | Wild roads",
  description: "Start a new trip and open your trail journal.",
};

export default function NewTripPage() {
  return (
    <div className="camp-bg flex flex-1 flex-col items-center justify-start px-4 py-10 pb-14 sm:justify-center sm:py-16 sm:pb-16">
      <NewTripForm />
    </div>
  );
}
