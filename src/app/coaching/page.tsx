import type { Metadata } from "next";

import { CoachingCTA } from "@/components/coaching-cta";
import { TrackedLink } from "@/components/tracked-link";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Coaching",
  description:
    "One-to-one TFT coaching: VOD reviews, live sessions and a climb package. Your games, your rank, a concrete plan for the patch.",
  alternates: { canonical: "/coaching" },
};

const STEPS = [
  {
    title: "Book a slot",
    body: "Pick a time from the booking page. You get a confirmation with a short form: rank, region and what you feel is holding you back.",
  },
  {
    title: "Send your games",
    body: "Two or three VODs from a session where you felt stuck. Losses are more useful than wins — they show the decisions, not the outcomes.",
  },
  {
    title: "Leave with a plan",
    body: "We go through the decisions together, then you get written notes and the three things to work on before the next patch.",
  },
];

const FAQ = [
  {
    q: "Which ranks is this for?",
    a: "Most useful from Iron to Diamond. Above that the sessions get more specific — comp selection matters less than tempo and positioning, and that is fine too.",
  },
  {
    q: "Which server do you coach on?",
    a: `Primarily ${site.author.server}, but the review is on VODs, so any region works. The comp and meta advice is built from the same high-elo sample the site uses.`,
  },
  {
    q: "Do you play on my account?",
    a: "No. No boosting, no account access, ever. That is a Riot policy line and also a personal one — the point is that you get better, not that your rank moves without you.",
  },
  {
    q: "What if I need to reschedule?",
    a: "Reschedule through the booking page up to 24 hours before the session. Inside 24 hours, message me and we will find another slot.",
  },
  {
    q: "Do you cover Double Up or other modes?",
    a: "Not yet. Everything here is built around standard ranked.",
  },
];

function priceLabel(price: number, currency: string): string {
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : `${currency} `;
  return `${symbol}${price}`;
}

export default function CoachingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="py-12 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Coaching
        </p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Get unstuck in one patch, not one season.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted">
          One-to-one sessions on your own games. We look at the decisions you are making
          on 3-2 and 4-1, not at a tier list — you already know the comps, or you would
          not be here.
        </p>

        <div className="card mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
          <span className="font-semibold">{site.author.name}</span>
          <span className="text-muted">
            {site.author.currentRank} · {site.author.server} (peak {site.author.peakRank})
          </span>
          <span className="text-muted">{site.author.proof}</span>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-semibold">Sessions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {site.offers.map((offer) => (
            <div
              key={offer.id}
              id={offer.id}
              className={
                offer.flagship
                  ? "card border-accent/40 bg-accent/[0.05] p-5"
                  : "card p-5"
              }
            >
              {offer.flagship ? (
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Most popular
                </p>
              ) : null}
              <h3 className="text-base font-semibold">{offer.name}</h3>
              <p className="stat-value mt-2 text-2xl font-semibold">
                {priceLabel(offer.price, offer.currency)}
              </p>
              <p className="mt-1 text-xs text-muted">{offer.format}</p>
              <ul className="mt-4 space-y-2 text-sm leading-relaxed text-fg/80">
                {offer.includes.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span
                      aria-hidden
                      className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                <TrackedLink
                  href={site.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  event="cta_book_coaching"
                  placement={`coaching_offer_${offer.id}`}
                  className={
                    offer.flagship ? "btn btn-primary w-full" : "btn btn-ghost w-full"
                  }
                >
                  Book {offer.name.toLowerCase()}
                </TrackedLink>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="card p-5">
              <p className="stat-value text-xs text-accent">0{index + 1}</p>
              <h3 className="mt-2 text-sm font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold">Questions</h2>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="card group px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-semibold marker:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    aria-hidden
                    className="text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <div className="mt-14">
        <CoachingCTA variant="band" placement="coaching_footer" />
      </div>
    </div>
  );
}
