import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Next.js 16+ uses `proxy.ts` instead of `middleware.ts`. Clerk supports either.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 *
 * We run Clerk on `/api/trips` so `auth()` works for sync + share, but **not**
 * on `/api/trip-card-photo` — trip cards load that URL in `<img>`; running Clerk
 * there used to return **500**.
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!api|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/api/trips/:path*",
  ],
};
