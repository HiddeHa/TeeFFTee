import Link from "next/link";

import { set19 } from "@/content/set-19";
import { isSet19Live } from "@/lib/set-launch";

/**
 * Pre-launch only. `isSet19Live` reads the same parsed date the stale-set guard
 * compares against, so the band cannot keep advertising a set the guard already
 * treats as live.
 */
export function Set19LaunchBand() {
  if (isSet19Live()) return null;

  return (
    <aside
      aria-label={`Set ${set19.number} launch`}
      className="mt-6 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm"
    >
      <p>
        <span className="font-semibold text-accent">
          Set {set19.number} · {set19.name}
        </span>{" "}
        <span className="text-muted">
          launches {set19.launchDate}. The roster, traits and unlock conditions are out;
          most numbers inside them are not.
        </span>
      </p>
      <Link href="/set-19" className="mt-1 block font-semibold text-accent hover:underline">
        What&apos;s confirmed →
      </Link>
    </aside>
  );
}
