"use client";

import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import Link from "next/link";

export function Header() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <header className="border-b-4 border-camp-navy bg-camp-cream/95 shadow-[0_3px_0_rgba(51,84,76,0.2)] backdrop-blur-sm">
      <nav className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-base font-bold tracking-tight text-camp-forest sm:text-lg"
        >
          Camp Wayfinder
        </Link>
        <div className="flex min-h-9 items-center justify-end">
          {!isLoaded ? (
            <div
              className="patch-skeleton h-9 w-24 rounded-md"
              aria-hidden
            />
          ) : isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button
                type="button"
                className="patch-btn-ghost font-heading text-sm font-bold text-camp-rust"
              >
                Sign in
              </button>
            </SignInButton>
          )}
        </div>
      </nav>
    </header>
  );
}
