import { set19 } from "@/content/set-19";
import { site } from "@/content/site";

/**
 * The set-switch guard.
 *
 * Moving the site to a new set is a content edit — `site.setNumber`, `patches`,
 * the comps, the crawler's `load-assets` — not a deploy step, so nothing forces it
 * on launch day. A site still analysing Set 18 once Set 19 is live is not a
 * rendering bug: every number on it describes a ladder that no longer exists.
 *
 * Returns the message to fail on, or null when the site is pointed at the right
 * set. `scripts/check-content.ts` runs it before a deploy and
 * `tests/set-launch.test.ts` pins it with a faked launch-day clock.
 */
const launchAt = new Date(set19.launchDate);
if (Number.isNaN(launchAt.getTime())) {
  // Never compare against an unreadable date: `now < NaN` is false, which would
  // turn a typo into a guard that always passes.
  throw new Error(`The Set ${set19.number} launch date ("${set19.launchDate}") cannot be read.`);
}

/**
 * Live from the first moment of the launch date, not the day after: on
 * 2 December the live set is Set 19, so "Set 18 is current" is already wrong.
 * The site's launch band reads the same function, so the two cannot disagree
 * about whether launch day has arrived.
 */
export function isSet19Live(now: Date = new Date()): boolean {
  return now.getTime() >= launchAt.getTime();
}

export function staleSetWarning(
  { now = new Date(), activeSet = site.setNumber }: { now?: Date; activeSet?: number } = {},
): string | null {
  if (activeSet >= set19.number) return null;
  if (!isSet19Live(now)) return null;

  return (
    `Set ${set19.number} launched on ${set19.launchDate}, but the site still points at ` +
    `Set ${activeSet}. Update site.setNumber and the content that follows it (patches, comps, ` +
    `load-assets) before shipping.`
  );
}
