import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Set19StatusTag } from "@/components/set19-status-tag";
import { Set19Tabs } from "@/components/set-19-tabs";
import {
  SET_19_AS_OF,
  set19,
  set19UnlockQuests,
  set19Unlocks,
  set19Units,
  type RosterUnit,
} from "@/content/set-19";
import { loadDataHealth, type DataHealth } from "@/lib/data-health";
import { formatDate, formatPercent } from "@/lib/format";
import { isSet19Live } from "@/lib/set-launch";
import { traitHref, unitPageHref, unitSlug } from "@/lib/set19-anchors";

/**
 * One champion of Set 19, before the set has any games.
 *
 * These exist because the roster is the only thing the site can say about the new
 * set with authority: cost, traits and any published unlock condition, each
 * labelled with where it came from. When the set goes live this is the natural
 * address for that champion's stats, so the URL is keyed by name rather than by
 * an id that a data load would change.
 */
export const dynamicParams = false;

/** Hourly, so the launch wording flips on the day rather than at the next deploy. */
export const revalidate = 3_600;

type Params = Promise<{ champion: string }>;

const BY_SLUG = new Map(set19Units.map((unit) => [unitSlug(unit.name), unit]));
const QUESTS_BY_CHAMPION = new Map(set19UnlockQuests.map((quest) => [quest.champion, quest]));
const CARDS_BY_CHAMPION = new Map(set19Unlocks.map((card) => [card.champion, card]));

/**
 * The unlocks video names the K/DA Akali without the variant suffix the roster
 * uses. That card belongs to the K/DA five-cost; the True Damage one has its own
 * quest entry, so it must not inherit this card.
 */
const CARD_CHAMPION_BY_UNIT: Record<string, string> = { "Akali (K|DA)": "Akali" };

export function generateStaticParams() {
  return set19Units.map((unit) => ({ champion: unitSlug(unit.name) }));
}

/**
 * The champion page is the natural stats address after launch, so its copy has to
 * stop saying "no stats yet" the moment the set is live — and when the crawler is
 * attached, say how much of the data is still unclassified rather than implying
 * the absence is a gap in the champion.
 */
function ChampionDataState({
  isLive,
  health,
}: {
  isLive: boolean;
  health: DataHealth | null;
}) {
  if (!isLive) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Patch {set19.patch} opens the set on {set19.launchDate}. Champion stats come from
        crawled boards, so there are none before the set is live.
      </p>
    );
  }

  if (health === null) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Set {set19.number} is live. Champion stats come from crawled boards; no crawler
        database is attached here, so none are shown.
      </p>
    );
  }

  if (health.aggregation === null) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        Set {set19.number} is live. {health.matches.toLocaleString("en-GB")} matches on patch{" "}
        {health.patch} have been crawled, but none have been aggregated yet — statistics appear
        after the next aggregation pass.
      </p>
    );
  }

  return (
    <p className="mt-2 text-[11px] leading-relaxed text-muted">
      Collecting Set {set19.number} data: {
        (health.aggregation.boards - health.aggregation.classified).toLocaleString("en-GB")
      }{" "}
      of {health.aggregation.boards.toLocaleString("en-GB")} Master+ boards on patch{" "}
      {health.patch} ({formatPercent(health.aggregation.share, 1)}) are not yet claimed by a
      published comp. Champion statistics are not published until the sample supports them —{" "}
      <Link href="/meta/stats" className="text-accent hover:underline">
        data health
      </Link>
      .
    </p>
  );
}

function unlockFor(unit: RosterUnit) {
  return {
    quest: QUESTS_BY_CHAMPION.get(unit.name),
    card: CARDS_BY_CHAMPION.get(CARD_CHAMPION_BY_UNIT[unit.name] ?? unit.name),
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { champion } = await params;
  const unit = BY_SLUG.get(champion);
  if (!unit) return { title: "Champion not found" };

  const { quest } = unlockFor(unit);
  const title = `${unit.name} — Set ${set19.number} ${set19.name}`;
  const description =
    `${unit.name} in TFT Set ${set19.number}: a ${unit.cost}-cost champion with ` +
    `${unit.traits.join(", ")}.` +
    (quest ? ` Unlock quest: ${quest.quest}.` : "");

  return {
    title,
    description,
    alternates: { canonical: unitPageHref(unit.name) },
    openGraph: { title, description, url: unitPageHref(unit.name) },
  };
}

export default async function Set19UnitPage({ params }: { params: Params }) {
  const { champion } = await params;
  const unit = BY_SLUG.get(champion);
  if (!unit) notFound();

  const { quest, card } = unlockFor(unit);
  const sameCost = set19Units.filter((entry) => entry.cost === unit.cost && entry.name !== unit.name);
  const isLive = isSet19Live();
  const health = isLive ? await loadDataHealth(set19.number, set19.patch) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/set-19" className="hover:text-accent">
          Set {set19.number}
        </Link>
        <span className="px-2">/</span>
        <Link href="/set-19/units" className="hover:text-accent">
          Units
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">{unit.name}</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {set19.number} · {set19.name}
        </p>
        <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{unit.name}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          A {unit.cost}-cost champion with {unit.traits.length}{" "}
          {unit.traits.length === 1 ? "trait" : "traits"}: {unit.traits.join(", ")}.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="chip">{unit.cost}-cost</span>
          {unit.traits.map((trait) => (
            <Link
              key={trait}
              href={traitHref(trait)}
              className="chip transition-colors hover:border-accent/40 hover:text-fg"
            >
              {trait}
            </Link>
          ))}
        </div>
      </header>

      <div className="mt-6">
        <Set19Tabs active="units" />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <section className="card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">At a glance</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Cost</dt>
              <dd className="font-semibold">{unit.cost}-cost</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Traits</dt>
              <dd className="text-right font-semibold">{unit.traits.join(" · ")}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-muted">Set</dt>
              <dd className="font-semibold">
                {set19.number} · {set19.name}
              </dd>
            </div>
          </dl>
        </section>

        <section className="card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Unlock</h2>

          {quest ? (
            <div className="mt-3">
              <p className="text-sm leading-relaxed text-fg/85">{quest.quest}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <Set19StatusTag status="devdrop" />
                <span>published condition · bought at its normal cost once unlocked</span>
              </p>
              <Link href="/set-19/unlockables" className="mt-2 inline-block text-xs text-accent hover:underline">
                All unlock conditions →
              </Link>
            </div>
          ) : card ? (
            <div className="mt-3">
              <p className="text-sm leading-relaxed text-fg/85">
                Riot&apos;s 13 November unlocks video showed this card.
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {card.quest.startsWith("Not shown")
                  ? "The video did not show its condition."
                  : card.quest}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">{card.shown}</p>
              <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
                <Set19StatusTag status="riot" />
                <span>card shown; condition not published</span>
              </p>
            </div>
          ) : (
            <p className="mt-3 text-[13px] leading-relaxed text-muted">
              Riot has not published an unlock condition for this champion. 36 of the 94 are
              unlocks, and only 19 conditions and five cards are out, so most of them are still
              unnamed — this page does not guess which.
            </p>
          )}
        </section>
      </div>

      <section className="card mt-3 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Where this comes from
        </h2>
        {/* The Unlock card above already carries its own status tag; repeating it
            here was a second copy, and the "unknown" case meant nothing beyond
            "no condition published", which the card says in words. */}
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-fg/85">Roster, cost and traits</span>
          <Set19StatusTag status="devdrop" />
        </p>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Riot&apos;s Dev Drop aired {set19.devDropDate}. This site read it through third-party
          reveal pages checked {formatDate(SET_19_AS_OF)}: the details are Riot&apos;s, the
          transcription is not.{" "}
          <Link href="/set-19#sources" className="text-accent hover:underline">
            Sources
          </Link>
          .
        </p>
        <ChampionDataState isLive={isLive} health={health} />
      </section>

      {sameCost.length > 0 ? (
        <section className="mt-8">
          <h2 className="text-xl font-semibold">Other {unit.cost}-costs</h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {sameCost.map((entry) => (
              <li key={entry.name}>
                <Link
                  href={unitPageHref(entry.name)}
                  className="chip transition-colors hover:border-accent/40 hover:text-fg"
                >
                  {entry.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-xs">
        <Link href="/set-19/units" className="text-accent hover:underline">
          All 94 champions →
        </Link>
      </p>
    </div>
  );
}
