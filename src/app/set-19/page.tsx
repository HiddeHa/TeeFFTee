import type { Metadata } from "next";
import Link from "next/link";

import { DataNote } from "@/components/data-note";
import {
  SET_19_AS_OF,
  set19,
  set19Confirmed,
  set19CostCurve,
  set19DevDropStats,
  set19Mechanics,
  set19PrismaticTraits,
  set19Schedule,
  set19Sources,
  set19Traits,
  set19UniqueTraits,
  set19UnlockCategories,
  set19UnlockQuests,
  set19Unknowns,
  set19Unlocks,
  type RevealStatus,
  type TraitEntry,
} from "@/content/set-19";
import { site } from "@/content/site";
import { classNames, formatDate } from "@/lib/format";

/**
 * Daily, because the launch chip is a fact about today rather than about the
 * build: a page rendered on 15 November that still says "Live" on 3 December is
 * worse than one that says nothing.
 */
export const revalidate = 86_400;

export const metadata: Metadata = {
  title: `Set ${set19.number}: ${set19.name}`,
  description:
    "What Riot has actually confirmed about TFT Set 19, Prismatic Tour — the 19.1 dates, the Dev Drop's 94 champions and five Prismatic traits, returning champion unlocks, and what is still unpublished.",
  alternates: { canonical: "/set-19" },
};

const STATUS_LABEL: Record<RevealStatus, string> = {
  riot: "From Riot",
  devdrop: "Dev Drop",
  coverage: "Coverage, not Riot",
  unknown: "Not announced",
};

function StatusTag({ status }: { status: RevealStatus }) {
  return (
    <span
      className={classNames(
        "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        status === "riot" && "border-accent/40 bg-accent/10 text-accent",
        status === "devdrop" && "border-good/40 bg-good/10 text-good",
        status === "coverage" && "border-line bg-raised text-muted",
        status === "unknown" && "border-dashed border-line bg-transparent text-muted/80",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

/** One trait: breakpoints on the right, what it does, and who has it. */
function TraitRow({ trait }: { trait: TraitEntry }) {
  return (
    <li className="card px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {trait.name}
          {trait.prismatic ? (
            <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent">
              Prismatic
            </span>
          ) : null}
        </h3>
        <span className="stat-value shrink-0 text-[11px] text-muted">{trait.breakpoints}</span>
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{trait.gist}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-muted/80">{trait.champions}</p>
    </li>
  );
}

function Fact({ title, body, status }: { title: string; body: string; status: RevealStatus }) {
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <StatusTag status={status} />
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-muted">{body}</p>
    </li>
  );
}

export default function Set19Page() {
  // Riot's own date decides the label, so the page cannot call a set live a
  // fortnight early. An unreadable date falls back to the launch wording — the
  // conservative answer — instead of claiming a status nobody can check.
  const launchedAt = new Date(set19.launchDate);
  const isLive =
    !Number.isNaN(launchedAt.getTime()) && Date.now() >= launchedAt.getTime();

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
          Prismatic Tour opens with patch {set19.patch}, and this page sorts what is known by
          where it came from: Riot&apos;s own posts, Riot&apos;s Dev Drop as read through a
          third-party reveal, and coverage nobody has confirmed. There are no comps, tier list or
          stats for it here yet — {site.name} builds those from crawled boards, and Set{" "}
          {set19.number} has none until it goes live.
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

      <DataNote>
        Riot&apos;s Dev Drop aired on {set19.devDropDate} and published the whole roster, the trait
        list with its breakpoints, and the unlock conditions. Riot has not posted a written version
        of it, so everything tagged “Dev Drop” below is Riot&apos;s content read through third-party
        reveal pages on {formatDate(SET_19_AS_OF)} — the details are Riot&apos;s, the transcription is
        not. Where the reveal describes an effect in words instead of figures (“a portion of
        previous damage”, “the required number”), this page says so rather than inventing a value.
      </DataNote>

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
        <h2 className="text-xl font-semibold">The roster, by cost</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
          All 94 champions, by what they cost in the shop. The 4-costs are the widest tier in the
          set and the 7-costs are the narrowest, which is the shape you plan an economy around.
        </p>

        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {set19CostCurve.map((bucket) => (
            <li key={bucket.cost} className="card p-3">
              <p className="stat-value text-2xl font-semibold">{bucket.count}</p>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-accent">
                {bucket.cost}
              </p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{bucket.note}</p>
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Two details that change how the shop reads: Akali is in the set twice, as Akali (K|DA)
          and Akali (True Damage) — separate five-cost champions with separate unlock quests — and
          all four 7-costs are unlocks rather than shop units, so they arrive only through their
          quests.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">The 27 traits, with their breakpoints</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
          Every regular trait with the tiers it needs and what each tier does, plus the champions
          that carry it by cost. The five with a Prismatic tier are marked; the twenty unique
          traits, which only one champion each has, are in the next section. Percentages are mostly
          absent on purpose — the reveal describes the effects, and a made-up number would be
          indistinguishable from a real one once it is on the page.
        </p>

        <ul className="mt-3 space-y-2">
          {set19Traits.map((trait) => (
            <TraitRow key={trait.name} trait={trait} />
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">The 20 unique traits</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
          Traits with one champion each. They are still traits for the purposes of Jazz, which counts
          active non-unique traits only — so these do not feed it.
        </p>

        <ul className="mt-3 space-y-2">
          {set19UniqueTraits.map((trait) => (
            <TraitRow key={trait.name} trait={trait} />
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Five Prismatic traits, and no emblems</h2>
        <p className="mt-1 text-xs text-muted">
          The old route to a Prismatic trait was an emblem on a carousel. In Prismatic Tour you
          pick one of five and complete a quest line to unlock its Prismatic tier. The tiers below
          come from the Dev Drop; a few of the values did too — True Damage&apos;s Prismatic tier
          states 99% bonus true damage — but most of the numbers inside the other tiers are still
          described rather than quantified.
        </p>

        <ul className="mt-3 space-y-2">
          {set19PrismaticTraits.map((trait) => (
            <li key={trait.name} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold">{trait.name}</h3>
                <span className="stat-value text-[11px] text-muted">{trait.tiers}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{trait.gist}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Unlocks: 36 champions, three categories</h2>
        <p className="mt-1 text-xs text-muted">
          Unlocks return from Lore and Legends. A locked champion is not in the shop; finish its
          quest and it shows up in your next shop, buyable at its normal cost. Exactly 36 of the 94
          are unlocks, and Riot split them into three kinds.
        </p>

        <ul className="mt-3 grid gap-2 sm:grid-cols-3">
          {set19UnlockCategories.map((category) => (
            <li key={category.name} className="rounded-lg border border-line bg-surface p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                {category.name}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-muted">{category.body}</p>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-sm font-semibold">The five cards Riot has shown</h3>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-separate border-spacing-y-1.5 text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="px-3 font-semibold">Champion</th>
                <th className="px-3 font-semibold">Quest</th>
                <th className="px-3 font-semibold">What the reveal showed</th>
              </tr>
            </thead>
            <tbody>
              {set19Unlocks.map((card) => (
                <tr key={card.champion} className="bg-surface">
                  <td className="rounded-l-lg border-y border-l border-line px-3 py-2 text-[13px] font-semibold">
                    {card.champion}
                  </td>
                  <td
                    className={classNames(
                      "border-y border-line px-3 py-2 text-[13px]",
                      card.quest.startsWith("Not shown") ? "text-muted/70" : "text-fg/85",
                    )}
                  >
                    {card.quest}
                  </td>
                  <td className="rounded-r-lg border-y border-r border-line px-3 py-2 text-[13px] text-muted">
                    {card.shown}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          The two quests Riot did give show the intended spread: Aphelios asks for a Recurve Bow
          on a Heartsteel champion — something you might do anyway — while Mordekaiser wants
          eleven unique Pentakill star levels, which only pays a board already committed to the
          band.
        </p>

        <h3 className="mt-6 text-sm font-semibold">The published quest conditions</h3>
        <p className="mt-1 text-xs text-muted">
          Every unlock condition the Dev Drop gave, in Riot&apos;s words. Read the counts as absent:
          the reveal writes “the required number” rather than the number, so the shape of each quest
          is known and its size is not.
        </p>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-separate border-spacing-y-1.5 text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="px-3 font-semibold">Champion</th>
                <th className="px-3 font-semibold">Cost</th>
                <th className="px-3 font-semibold">Condition</th>
              </tr>
            </thead>
            <tbody>
              {set19UnlockQuests.map((quest) => (
                <tr key={quest.champion} className="bg-surface">
                  <td className="rounded-l-lg border-y border-l border-line px-3 py-2 text-[13px] font-semibold">
                    {quest.champion}
                  </td>
                  <td className="border-y border-line px-3 py-2 text-[13px] text-muted">
                    {quest.cost}
                  </td>
                  <td className="rounded-r-lg border-y border-r border-line px-3 py-2 text-[13px] text-muted">
                    {quest.quest}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <StatusTag status={row.status} />
            </li>
          ))}
        </ul>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          Concretely: plan on {set19.launchDate}, the date in Riot&apos;s video, and treat{" "}
          {set19.scheduleDate} as the patch the client updates on.
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
        <h2 className="text-xl font-semibold">How this site will handle the switch</h2>
        <div className="prose-block mt-2 text-sm">
          <p>
            The{" "}
            <Link href="/meta" className="text-accent hover:underline">
              tier list
            </Link>{" "}
            and every comp page stay on Set {set19.liveSet}, {set19.liveSetName} until patch{" "}
            {set19.patch} actually ships. Pretending otherwise would mean either inventing numbers
            or publishing a list with no games behind it.
          </p>
          <p>
            When Set {set19.number} goes live, the order is fixed: the crawler seeds the new
            ladder, a day or two of boards accumulate, and comps appear with their sample size
            attached. Early-set pages will say they are early, and the confidence ranking will
            keep small samples from outranking large ones — that machinery does not change just
            because the set is new.
          </p>
          <p>
            PBE notes, if there are any, will be labelled as PBE. A PBE game is not a ranked game,
            and mixing the two is how a launch-week tier list ends up describing a build nobody
            plays.
          </p>
        </div>
      </section>

      <section className="mt-12">
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
