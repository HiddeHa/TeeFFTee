import { NextResponse, type NextRequest } from "next/server";

import { getFreebuff, isFreebuffConfigured } from "@/lib/freebuff";

/**
 * The SDK's session refresh, before the page renders.
 *
 * An access token lives an hour; refresh tokens rotate on every use. Doing that
 * here means the refreshed cookie reaches both the current render and the
 * browser — doing it further in would make the next refresh look like theft and
 * end the session.
 *
 * Unconfigured environments pass straight through: the site renders fine
 * without sign-in, and a build or preview with no Freebuff variables must not
 * turn every page into a 503.
 */
export async function proxy(request: NextRequest) {
  if (!isFreebuffConfigured()) return NextResponse.next();
  return getFreebuff().proxy(request);
}

export const config = {
  // Everything except the static assets below, which cannot carry a session.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|svg|ico|webp)$).*)"],
};
