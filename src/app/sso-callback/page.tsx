"use client";

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";
import { useEffect } from "react";
import { clearOAuthPending } from "@/lib/oauth-pending";

export default function SSOCallbackPage() {
  useEffect(() => {
    clearOAuthPending();
  }, []);

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center px-4">
      <AuthenticateWithRedirectCallback />
      <p className="mt-4 font-sans text-sm text-camp-navy/80">
        Finishing sign-in…
      </p>
    </div>
  );
}
