"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { clearOAuthPending, markOAuthPending } from "@/lib/oauth-pending";

function clerkErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Google sign-in did not finish.";
  const e = err as {
    message?: string;
    errors?: Array<{ message?: string; longMessage?: string }>;
  };
  if (typeof e.message === "string" && e.message) return e.message;
  const first = e.errors?.[0];
  if (first?.longMessage) return first.longMessage;
  if (first?.message) return first.message;
  return "Google sign-in did not finish. Check the Clerk dashboard: Google OAuth must be enabled, and this app’s URL must match what Clerk expects.";
}

function openOAuthPopup(): Window | null {
  const w = 520;
  const h = 680;
  const left = Math.max(
    0,
    window.screenX + (window.outerWidth - w) / 2,
  );
  const top = Math.max(
    0,
    window.screenY + (window.outerHeight - h) / 2,
  );
  const features = `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`;
  return window.open("about:blank", "clerk-oauth-google", features);
}

export function useGoogleClerkSignIn() {
  const { isLoaded: authLoaded } = useAuth();
  const { signIn } = useSignIn();
  const [error, setError] = useState<string | null>(null);

  const signInWithGoogle = useCallback(() => {
    setError(null);
    if (!signIn?.sso) {
      setError("Sign-in is still loading. Wait a moment and try again.");
      return;
    }

    const origin = window.location.origin;
    const popup = openOAuthPopup();

    const finishRedirectFlow = () => {
      markOAuthPending();
      void signIn
        .sso({
          strategy: "oauth_google",
          redirectUrl: `${origin}/`,
          redirectCallbackUrl: `${origin}/sso-callback`,
        })
        .then(({ error: oauthError }) => {
          if (oauthError) {
            setError(clerkErrorMessage(oauthError));
            clearOAuthPending();
          }
        })
        .catch((e: unknown) => {
          setError(clerkErrorMessage(e));
          clearOAuthPending();
        });
    };

    if (!popup) {
      finishRedirectFlow();
      return;
    }

    void signIn
      .sso({
        popup,
        strategy: "oauth_google",
        redirectUrl: `${origin}/`,
        redirectCallbackUrl: `${origin}/sso-callback`,
      })
      .then(({ error: oauthError }) => {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        if (oauthError) {
          setError(clerkErrorMessage(oauthError));
          return;
        }
        window.location.assign(`${origin}/`);
      })
      .catch((e: unknown) => {
        try {
          popup.close();
        } catch {
          /* ignore */
        }
        const msg = clerkErrorMessage(e);
        if (
          msg.includes("popup") ||
          msg.includes("blocked") ||
          msg.includes("closed")
        ) {
          finishRedirectFlow();
          return;
        }
        setError(msg);
      });
  }, [signIn]);

  return {
    signInWithGoogle,
    error,
    isReady: authLoaded,
  };
}
