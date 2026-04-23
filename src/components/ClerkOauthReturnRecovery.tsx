"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { consumeOAuthPending } from "@/lib/oauth-pending";

/**
 * After an OAuth redirect, the browser can restore this tab from the
 * back-forward cache. Clerk’s client can be left in a bad state and the
 * Google button may stay disabled. If we marked OAuth as started, a soft
 * refresh re-syncs the app.
 */
export function ClerkOauthReturnRecovery() {
  const router = useRouter();

  useEffect(() => {
    const onPageShow = () => {
      if (consumeOAuthPending()) {
        router.refresh();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [router]);

  return null;
}
