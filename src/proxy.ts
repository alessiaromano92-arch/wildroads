import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next.js 16+ uses `proxy.ts` instead of `middleware.ts`. Clerk supports either.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */
export default clerkMiddleware();

/**
 * Clerk must not run on `/api/*` — trip cards load images with `<img src="/api/...">`.
 * Those requests are not a full browser navigation; Clerk can error and return **500**.
 */
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
