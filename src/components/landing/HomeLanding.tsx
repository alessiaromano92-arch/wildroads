"use client";

import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { GoogleLoginButton } from "@/components/landing/GoogleLoginButton";
import { HomeHeroIllustration } from "@/components/landing/HomeHeroIllustration";

export function HomeLanding() {
  const { isLoaded, isSignedIn } = useAuth();
  const newTripLabel =
    isLoaded && isSignedIn ? "Start a new trip" : "Start new trip as a guest";

  return (
    <div className="camp-bg flex flex-1 flex-col items-center px-4 py-16 sm:py-24">
      <div className="patch-hero paper-surface relative w-full max-w-4xl px-5 pb-10 pt-6 text-center sm:px-10 sm:pb-14 sm:pt-8">
        <HomeHeroIllustration />
        <div className="cartoon-wave-rule mb-6" />
        <h1 className="font-heading text-3xl leading-tight text-camp-forest sm:text-4xl md:text-5xl">
          Wild roads
        </h1>
        <p className="mx-auto mt-4 max-w-md font-sans text-base text-camp-navy/90 sm:text-lg">
          A quiet ranger station for your next expedition—moonrise optional,
          pine needles included.
        </p>

        <div className="mx-auto mt-10 flex w-full max-w-md flex-col gap-3">
          <GoogleLoginButton />
          <Link
            href="/trips/new"
            className="patch-btn-secondary flex min-h-[3rem] w-full items-center justify-center text-center"
          >
            {newTripLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
