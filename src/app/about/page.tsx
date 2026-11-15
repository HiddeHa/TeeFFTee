import type { Metadata } from "next";
import Link from "next/link";

import { METHODOLOGY, RIOT_DISCLAIMER, site } from "@/content/site";

export const metadata: Metadata = {
  title: "About & methodology",
  description:
    "Who runs this site, how the stats are computed, where the data comes from and what it deliberately does not do.",
  alternates: { canonical: "/about" },
};

const METHOD_SECTIONS = [
  { title: "Where the sample comes from", body: METHODOLOGY.sample },
  { title: "What “Master+” actually means", body: METHODOLOGY.bucket },
  { title: "How a board becomes a comp", body: METHODOLOGY.assignment },
  { title: "Why the ranking is not just win rate", body: METHODOLOGY.confidence },
  { title: "What is never published", body: METHODOLOGY.privacy },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          About
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          A tier list is only useful if you know how it was made.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Everything on this site comes from full 8-player matches crawled from the
          high-elo ladders, combined with my own read of the patch. Both halves are
          labelled, so you can tell which one you are looking at.
        </p>
      </header>

      <section className="card p-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-lg font-semibold">{site.author.name}</h2>
          {site.author.handle ? (
            <span className="text-sm text-muted">{site.author.handle}</span>
          ) : null}
        </div>
        <p className="mt-2 text-sm text-fg/80">
          {site.author.currentRank} · {site.author.server} (peak {site.author.peakRank})
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted">{site.author.proof}</p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Why this site exists</h2>
        <div className="prose-block mt-3 text-sm">
          <p>
            I play this game at a high level and I wanted a tool that answers my own
            questions: which comps are genuinely strong right now, which ones only look
            strong because nobody plays them, and what changed after the patch. Most tier
            lists answer the first question and stay quiet about the other two.
          </p>
          <p>
            So this is built as an analysis tool first. The data tells me what happened;
            my read explains why, and where I think the numbers are misleading. When those
            two disagree, the disagreement is usually the most useful thing on the page, so
            I write it down instead of hiding it.
          </p>
          <p>
            The coaching side exists because the same work — looking at a board and
            explaining the decision behind every slot — is what actually helps someone
            climb. If the stats bring you here, the coaching is what makes them actionable.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Methodology</h2>
        <dl className="mt-4 space-y-5">
          {METHOD_SECTIONS.map((section) => (
            <div key={section.title}>
              <dt className="text-sm font-semibold">{section.title}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-muted">{section.body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">What this site does not do</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-fg/80">
          <li>
            No lookup of arbitrary players: the only player pages are the tracked Master+
            ladder accounts, shown by Riot ID with their own crawled placements.
          </li>
          <li>
            No live in-game recommendations or opponent tracking. Riot's policy rules that
            out, and it would make the game worse anyway.
          </li>
          <li>No boosting and no account access, in any product or service.</li>
          <li>No invented numbers: where there is no sample, the page says so.</li>
        </ul>
      </section>

      <section className="mt-10 space-y-3">
        <h2 className="text-xl font-semibold">Contact</h2>
        <p className="text-sm text-muted">
          Questions about the data or the method:{" "}
          <a href={`mailto:${site.contactEmail}`} className="text-accent hover:underline">
            {site.contactEmail}
          </a>
          . Coaching enquiries go through{" "}
          <Link href="/coaching" className="text-accent hover:underline">
            the coaching page
          </Link>
          .
        </p>
        <p className="max-w-2xl border-t border-line pt-4 text-xs leading-relaxed text-muted">
          {RIOT_DISCLAIMER}
        </p>
      </section>
    </div>
  );
}
