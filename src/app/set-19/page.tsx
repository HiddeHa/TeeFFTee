import type { Metadata } from "next";
import Link from "next/link";

import { DataNote } from "@/components/data-note";
import { Set19StatusTag } from "@/components/set19-status-tag";
import { Set19Tabs } from "@/components/set-19-tabs";
import {
  SET_19_AS_OF,
  set19,
  set19Confirmed,
  set19DevDropStats,
  set19Mechanics,
  set19Schedule,
  set19Sources,
  set19Unknowns,
  type RevealStatus,
} from "@/content/set-19";
import { site } from "@/content/site";
import { loadDataHealth, type DataHealth } from "@/lib/data-health";
import { classNames, formatDate, formatPercent } from "@/lib/format";
import { isSet19Live } from "@/lib/set-launch";

/**
 * Hourly, because the launch chip and the collecting-data state are facts about
 * today rather than about the build: a page rendered on 15 November that still
 * says "Launches" on 3 December is worse than one that says nothing.
 */
export const revalidate = 3_600;

export const metadata: Metadata = {
  title: `Set ${set19.number}: ${set19.name}`,
  description:
    "What Riot has actually confirmed about TFT Set 19, Prismatic Tour — the 19.1 dates, the Dev Drop's 94 champions and five Prismatic traits, returning champion unlocks, and what is still unpublished.",
  alternates: { canonical: "/set-19" },
};

function Fact({ title, body, status }: { title: string; body: string; status: RevealStatus }) {
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Set19StatusTag status={status} />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
    </li>
  );
}

function LiveDataState({ health }: { health: DataHealth | null }) {
  if (health === null) {
    return (
      <DataNote>
        Set {set19.number} is live, but no crawler database is attached here, so there are
        no Set {set19.number} numbers to show. Comps and tier lists on this site come from
        crawled boards; nothing is estimated in the meantime.
      </DataNote>
    );
  }

  if (health.aggregation === null) {
    return (
      <DataNote>
        Set {set19.number} is live. {health.matches.toLocaleString("en-GB")} matches on patch{" "}
        {health.patch} have been crawled, but none have been aggregated yet — the
        collecting-data figures appear after the next aggregation pass. Runs every 30
        minutes while the crawler is up.
      </DataNote>
    );
  }

  return (
    <DataNote>
      Collecting Set {set19.number} data: {
        (health.aggregation.boards - health.aggregation.classified).toLocaleString("en-GB")
      }{" "}
      of {health.aggregation.boards.toLocaleString("en-GB")} Master+ boards on patch{" "}
      {health.patch} ({formatPercent(health.aggregation.share, 1)}) are not yet claimed by a
      published comp. {health.matches.toLocaleString("en-GB")} matches crawled. Boards that
      match nothing are counted rather than hidden — see{" "}
      <Link href="/meta/stats" className="text-accent hover:underline">
        data health
      </Link>
      .
    </DataNote>
  );
}

export default async function Set19Page() {
  // The same clock as the stale-set guard and the launch band, so this page cannot
  // disagree with either about whether launch day has arrived.
  const isLive = isSet19Live();
  const health = isLive ? await loadDataHealth(set19.number, set19.patch) : null;
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {set19.number} · {set19.name}
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          94 champions, five Prismatic traits, and a soundtrack that reads your board.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Prismatic Tour {isLive ? "is live" : "opens"} with patch {set19.patch}, and these pages
          sort what is known by where it came from: Riot&apos;s own posts, Riot&apos;s Dev Drop as
          read through a third-party reveal, and coverage nobody has confirmed.{" "}
          {isLive
            ? `Comps and tier lists come from crawled Set ${set19.number} boards; the roster and unlock pages remain the reference layer.`
            : `The roster, teambuilder and tier-list maker already read Set ${set19.number}; comps and stats stay empty until the set is live.`}
        </p>

        <div className="mt-5 flex flex-wrap gap-1.5">
          <span className="chip" data-active={isLive ? "true" : undefined}>
            {isLive ? `Live since ${set19.launchDate}` : `Launches ${set19.launchDate}`}
          </span>
          <span className="chip">Patch {set19.patch}</span>
          <span className="chip">PBE ~{set19.pbeDate}</span>
          <span className="chip">94 champions</span>
          <span className="chip">5 Prismatic traits</span>
          <span className="chip">{set19.nextPatch} on {set19.nextPatchDate}</span>
        </div>
      </header>

      <Set19Tabs active="overview" />

      {isLive ? (
        <div className="mt-6">
          <LiveDataState health={health} />
        </div>
      ) : null}

      <div className="mt-6">
        <DataNote>
          Riot&apos;s Dev Drop aired on {set19.devDropDate} and published the whole roster, the
          trait list with its breakpoints, and the unlock conditions. Riot has not posted a written
          version of it, so everything tagged “Dev Drop” below is Riot&apos;s content read through
          third-party reveal pages on {formatDate(SET_19_AS_OF)} — the details are Riot&apos;s, the
          transcription is not. Where the reveal describes an effect in words instead of figures
          (“a portion of previous damage”, “the required number”), these pages say so rather than
          inventing a value.
        </DataNote>
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">The Dev Drop, in numbers</h2>
        <p className="mt-1 text-xs text-muted">
          Six figures Riot put on the set, and the one thing each of them changes about how you
          read the set.
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {set19DevDropStats.map((stat) => (
            <li key={stat.label} className="card p-3">
              <p className="stat-value text-2xl font-semibold">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                {stat.label}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{stat.note}</p>
            </li>
          ))}
        </ul>

        <ul className="mt-3 space-y-2">
          {set19Mechanics.map((mechanic) => (
            <li key={mechanic.title} className="rounded-lg border border-line bg-surface p-3.5">
              <h3 className="text-sm font-semibold">{mechanic.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{mechanic.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">The dates, as Riot has published them</h2>
        <p className="mt-1 text-xs text-muted">
          Riot&apos;s patch schedule and Riot&apos;s own Set 19 video disagree by one day about the
          launch. Both are below rather than one being picked for tidiness; the PBE row is an
          expectation, and it is labelled as one.
        </p>

        <ul className="mt-3 space-y-1.5">
          {set19Schedule.map((row) => (
            <li
              key={`${row.patch}-${row.date}`}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-3 py-2"
            >
              <span className="stat-value w-14 shrink-0 text-sm font-semibold">{row.patch}</span>
              <span className="w-36 shrink-0 text-[13px]">{row.date}</span>
              <span className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted">
                {row.note}
              </span>
              <Set19StatusTag status={row.status} />
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          {isLive
            ? `Set ${set19.number} went live on ${set19.launchDate}, the date in Riot's video; the client updated with patch ${set19.patch} on ${set19.scheduleDate}.`
            : `Concretely: plan on ${set19.launchDate}, the date in Riot's video, and treat ${set19.scheduleDate} as the patch the client updates on.`}
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">The rest of what is confirmed</h2>
        <p className="mt-1 text-xs text-muted">
          Everything tagged “From Riot” appears in a Riot dev post, patch note, schedule or video.
          “Coverage, not Riot” means a third party reported it and Riot has neither confirmed nor
          denied it — read those as reported, not settled.
        </p>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {set19Confirmed.map((fact) => (
            <Fact key={fact.title} {...fact} />
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">What is still unpublished</h2>
        <p className="mt-1 text-xs text-muted">
          Shorter than it was yesterday, and still the part that decides whether any of this is
          playable. A page that lists only the known half reads as complete.
        </p>

        <ul className="mt-3 space-y-2">
          {set19Unknowns.map((item) => (
            <li key={item.topic} className="rounded-lg border border-dashed border-line px-3 py-2.5">
              <p className="text-sm font-semibold text-fg/85">{item.topic}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-muted">{item.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">
          {isLive ? "How this site handles the live set" : "How this site will handle the switch"}
        </h2>
        <div className="prose-block mt-2 text-sm">
          {isLive ? (
            <>
              <p>
                The{" "}
                <Link href="/meta" className="text-accent hover:underline">
                  tier list
                </Link>{" "}
                and comp pages moved to Set {set19.number} when patch {set19.patch} shipped. Early-set
                pages say they are early: comps appear with their sample size attached, and the
                confidence ranking keeps small samples from outranking large ones.
              </p>
              <p>
                PBE notes are labelled as PBE. A PBE game is not a ranked game, and mixing the two
                is how a launch-week tier list ends up describing a build nobody plays.
              </p>
            </>
          ) : (
            <>
              <p>
                The reference pages, the{" "}
                <Link href="/teambuilder" className="text-accent hover:underline">
                  teambuilder
                </Link>{" "}
                and the{" "}
                <Link href="/tier-lists" className="text-accent hover:underline">
                  tier-list maker
                </Link>{" "}
                now read Set {set19.number} from the reveal roster. The{" "}
                <Link href="/meta" className="text-accent hover:underline">
                  tier list
                </Link>{" "}
                stays open but empty: comps and measured stats need Set {set19.number} boards,
                and there are none before the set goes live. Set 18 comps are not carried over
                as if they described this set.
              </p>
              <p>
                When Set {set19.number} goes live, the order is fixed: the crawler seeds the new
                ladder, a day or two of boards accumulate, and comps appear with their sample size
                attached. Early-set pages will say they are early, and the confidence ranking will
                keep small samples from outranking large ones — that machinery does not change
                just because the set is new.
              </p>
              <p>
                PBE notes, if there are any, will be labelled as PBE. A PBE game is not a ranked
                game, and mixing the two is how a launch-week tier list ends up describing a build
                nobody plays.
              </p>
            </>
          )}
        </div>
      </section>

      <section id="sources" className="mt-12 scroll-mt-24">
        <h2 className="text-xl font-semibold">Sources</h2>
        <p className="mt-1 text-xs text-muted">
          Checked {formatDate(SET_19_AS_OF)}. Riot&apos;s pages first, then the coverage the
          claims above lean on.
        </p>

        <ul className="mt-3 space-y-2">
          {set19Sources.map((source) => (
            <li key={source.href} className="rounded-lg border border-line bg-surface px-3 py-2.5">
              <a
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-medium text-fg/85 hover:text-accent"
              >
                {source.label}
              </a>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
                <span>{source.publisher}</span>
                <span aria-hidden>·</span>
                <span>{source.date}</span>
                <span
                  className={classNames(
                    "rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider",
                    source.kind === "official"
                      ? "border-accent/40 bg-accent/10 text-accent"
                      : "border-line bg-raised text-muted",
                  )}
                >
                  {source.kind === "official" ? "Official" : "Coverage"}
                </span>
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
