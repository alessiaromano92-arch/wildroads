"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { TripsDashboard } from "@/components/dashboard/TripsDashboard";
import { HomeLanding } from "@/components/landing/HomeLanding";

export function AppHome() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const prevSignedIn = useRef<boolean | null>(null);

  // After Google OAuth, Clerk updates the session on the client before the App
  // Router tree has caught up—refresh once when we flip from signed-out → in.
  useEffect(() => {
    if (!isLoaded) return;
    const prev = prevSignedIn.current;
    prevSignedIn.current = isSignedIn;
    if (prev === false && isSignedIn) {
      router.refresh();
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="camp-bg flex flex-1 flex-col items-center justify-center px-4 py-24">
        <div className="patch-skeleton h-14 w-full max-w-md rounded-md" />
      </div>
    );
  }

  if (isSignedIn) {
    return <TripsDashboard />;
  }

  return <HomeLanding />;
}
