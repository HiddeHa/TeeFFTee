import { site } from "@/content/site";

import { TrackedLink } from "./tracked-link";

type Variant = "header" | "inline" | "band";

const proof = `${site.author.peakRank} on ${site.author.server} · ${site.author.name}`;

const linkProps = {
  href: site.bookingUrl,
  target: "_blank",
  rel: "noopener noreferrer",
} as const;

/**
 * The coaching funnel's single CTA component.
 *
 * Every placement goes through here so they share copy, styling and the
 * analytics event. Placement is passed in, never assumed (blueprint §10).
 */
export function CoachingCTA({
  variant,
  placement,
}: {
  variant: Variant;
  placement: string;
}) {
  if (variant === "header") {
    return (
      <TrackedLink
        {...linkProps}
        event="cta_book_coaching"
        placement={placement}
        className="btn btn-primary btn-sm whitespace-nowrap"
      >
        Book coaching
      </TrackedLink>
    );
  }

  if (variant === "inline") {
    return (
      <aside className="card border-accent/25 bg-accent/[0.05] p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Coaching
        </p>
        <h2 className="mt-2 text-lg font-semibold">Want me to look at your games?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          A session on this comp, your VODs and a plan for the next patch. Read the
          board above, then let me watch you play it.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <TrackedLink
            {...linkProps}
            event="cta_book_coaching"
            placement={placement}
            className="btn btn-primary"
          >
            Book a session
          </TrackedLink>
          <span className="text-xs text-muted">{proof}</span>
        </div>
      </aside>
    );
  }

  return (
    <section className="card border-accent/20 bg-accent/[0.04] px-6 py-10 text-center sm:px-10">
      <p className="text-xs font-semibold uppercase tracking-wider text-accent">
        Coaching
      </p>
      <h2 className="mx-auto mt-3 max-w-xl text-2xl font-semibold sm:text-3xl">
        A tier list tells you what is strong. Coaching tells you why you are stuck.
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted">
        Fifty minutes, your own games, and no generic advice. If you are going to spend
        the patch grinding, spend the first hour getting the plan right.
      </p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <TrackedLink
          {...linkProps}
          event="cta_book_coaching"
          placement={placement}
          className="btn btn-primary"
        >
          Book a session
        </TrackedLink>
        <span className="text-xs text-muted">{proof}</span>
      </div>
    </section>
  );
}
