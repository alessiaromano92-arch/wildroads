"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";

function greetingName(
  user: NonNullable<ReturnType<typeof useUser>["user"]>,
): string {
  const first = user.firstName?.trim();
  if (first) return first;
  const full = user.fullName?.trim();
  if (full) {
    const part = full.split(/\s+/)[0];
    if (part) return part;
  }
  const email = user.primaryEmailAddress?.emailAddress;
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local) return local;
  }
  const un = user.username?.trim();
  if (un) return un;
  return "";
}

function capitalizeFirstName(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function Header() {
  const { isLoaded, isSignedIn, user } = useUser();
  const name = user ? capitalizeFirstName(greetingName(user)) : "";

  return (
    <header className="border-b-4 border-[color:var(--nav-pine-edge)] bg-[color:var(--nav-pine)] shadow-[0_3px_0_rgba(0,0,0,0.18)]">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="font-heading text-base font-bold tracking-tight text-[color:var(--paper-surface-fill)] sm:text-lg"
        >
          Wild roads
        </Link>
        {isLoaded && isSignedIn ? (
          <div className="flex min-w-0 shrink-0 items-center gap-3">
            {name ? (
              <span className="max-w-[10rem] truncate font-sans text-sm font-semibold text-[color:var(--paper-surface-fill)] sm:max-w-[14rem] sm:text-base">
                {name}
              </span>
            ) : null}
            <UserButton
              appearance={{
                elements: {
                  avatarBox:
                    "h-9 w-9 border-4 border-solid border-[color:var(--paper-surface-fill)] ring-0",
                },
              }}
            />
          </div>
        ) : null}
      </nav>
    </header>
  );
}
