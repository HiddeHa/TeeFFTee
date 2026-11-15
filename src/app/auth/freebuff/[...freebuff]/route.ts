import { getFreebuff } from "@/lib/freebuff";

/**
 * `/auth/freebuff/{signin,callback,signout,session}`.
 *
 * The handler set comes from the SDK so the paths, PKCE exchange and session
 * cookie are the package's, not a copy of them. Dynamic because every response
 * depends on the request's cookies and must never be cached.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return getFreebuff().handlers.GET(request);
}

export async function POST(request: Request) {
  return getFreebuff().handlers.POST(request);
}
