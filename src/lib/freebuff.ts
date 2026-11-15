import {
  createFreebuffNext,
  type FreebuffNext,
  type FreebuffUser,
} from "@freebuff/auth/next";

/**
 * Sign in with Freebuff — the site's only login.
 *
 * STDLIB OIDC, NO SECRETS
 *  - Freebuff signs the tokens; this server verifies them against Freebuff's
 *    public keys, so there is no client secret and no session secret to keep.
 *  - `FREEBUFF_CLIENT_ID` and the origin are public configuration. Sites injects
 *    all three variables on deploy; locally they come from `.env`.
 *
 * WHY LAZY
 *  - `createFreebuffNext` throws when the client id is missing, and CI builds
 *    with no Freebuff variables at all (`.github/workflows/ci.yml`). Creating
 *    the instance at module scope would turn every build without those
 *    variables into a failed import. Creating it on first use keeps the site
 *    building and serving, and confines the failure to the auth routes — the
 *    same shape as the rest of this project, which renders without a database.
 *  - Still one instance per process: it is memoised below, never per request.
 */

/** The canonical origin, from configuration — never from the request's Host. */
function configuredOrigin(): string | null {
  const origin = process.env.APP_ORIGIN;
  if (!origin) return null;
  // A trailing slash makes `baseUrl` a path, which the SDK rejects.
  return origin.replace(/\/+$/, "");
}

/** True when this environment has enough configuration to offer sign-in. */
export function isFreebuffConfigured(): boolean {
  return Boolean(process.env.FREEBUFF_CLIENT_ID && configuredOrigin());
}

let instance: FreebuffNext | null = null;

export function getFreebuff(): FreebuffNext {
  if (instance) return instance;

  const clientId = process.env.FREEBUFF_CLIENT_ID;
  const baseUrl = configuredOrigin();
  if (!clientId || !baseUrl) {
    throw new Error(
      "Sign in with Freebuff is not configured here: FREEBUFF_CLIENT_ID and APP_ORIGIN " +
        "must both be set. Sites injects them on deploy; locally, copy the development " +
        "values that sites_enable_auth returned into .env.",
    );
  }

  instance = createFreebuffNext({
    clientId,
    baseUrl,
    issuer: process.env.FREEBUFF_ISSUER || undefined,
    // `http` is only ever a loopback development origin. On the deployed site
    // APP_ORIGIN is https, so this is false there without needing a branch on
    // NODE_ENV, which a Worker does not set.
    allowInsecureLocalhost: /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(baseUrl),
  });

  return instance;
}

/**
 * The visitor, or null when signed out.
 *
 * Never refreshes on its own — the proxy does that so the refreshed cookie
 * reaches the browser. Outside the proxy this verifies the current access token
 * and returns null once it has expired.
 */
export async function getFreebuffUser(): Promise<FreebuffUser | null> {
  if (!isFreebuffConfigured()) return null;
  return getFreebuff().getUser();
}
