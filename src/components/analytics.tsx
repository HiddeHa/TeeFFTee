import Script from "next/script";

/**
 * Cookieless page analytics (Umami).
 *
 * Rendered from the root layout, which is a server component, so the website id
 * comes from the runtime environment instead of being baked into the client
 * bundle: rotating it is a variable change plus a deploy, not a rebuild.
 *
 * Unset means *nothing* is emitted — no script tag, no network request, no
 * privacy surface — so the site is exactly as before until an id exists.
 * `UMAMI_SCRIPT_URL` exists for self-hosting; the Cloud default is used otherwise.
 */
const CLOUD_SCRIPT = "https://cloud.umami.is/script.js";

export function Analytics() {
  const websiteId = process.env.UMAMI_WEBSITE_ID?.trim();
  if (!websiteId) return null;

  const src = process.env.UMAMI_SCRIPT_URL?.trim() || CLOUD_SCRIPT;

  return <Script src={src} data-website-id={websiteId} strategy="afterInteractive" />;
}
