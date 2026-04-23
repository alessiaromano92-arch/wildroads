"use client";

import { useGoogleClerkSignIn } from "@/hooks/use-google-clerk-sign-in";

export function GoogleLoginButton() {
  const { signInWithGoogle, error, isReady } = useGoogleClerkSignIn();

  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        disabled={!isReady}
        onClick={signInWithGoogle}
        className="patch-btn-primary flex min-h-[3rem] w-full items-center justify-center gap-2 disabled:opacity-50"
      >
        <span aria-hidden className="text-lg leading-none">
          G
        </span>
        Login with Google
      </button>
      {error ? (
        <p
          className="rounded-md border-2 border-camp-rust bg-camp-rust/10 px-3 py-2 text-left font-sans text-xs text-camp-rust"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
