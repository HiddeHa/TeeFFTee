/**
 * Custom-event seam for the analytics script in `components/analytics.tsx`.
 *
 * Deliberately a no-op when the script is absent: the CTA components render in
 * the same tree whether or not analytics is configured, and an unset id must not
 * throw on click. Umami's `track` is the only provider API named here, so the
 * call site stays one line — swapping providers is this file plus the script tag.
 */
type Tracker = {
  track: (event: string, data?: Record<string, string>) => void;
};

export function trackEvent(event: string, data?: Record<string, string>): void {
  if (typeof window === "undefined") return;
  const tracker = (window as Window & { umami?: Tracker }).umami;
  tracker?.track(event, data);
}
