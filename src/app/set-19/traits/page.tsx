import type { Metadata } from "next";
import Link from "next/link";

import { Set19Tabs } from "@/components/set-19-tabs";
import {
  set19,
  set19PrismaticTraits,
  set19Traits,
  set19UniqueTraits,
  set19Units,
  type RosterUnit,
  type TraitEntry,
} from "@/content/set-19";
import { prismaticAnchor, traitAnchor, unitHref } from "@/lib/set19-anchors";

export const metadata: Metadata = {
  title: `Set ${set19.number} traits: breakpoints and champions`,
  description:
    "All 47 Set 19 traits with their breakpoints, what each tier does, the champions that carry them and the five Prismatic traits.",
  alternates: { canonical: "/set-19/traits" },
};

/** The champions carrying a trait, linking back to their roster rows. */
function UnitChips({ units }: { units: RosterUnit[] }) {
  return (
    <p className="mt-1.5 flex flex-wrap gap-1">
      {units.map((unit) => (
        <Link
          key={unit.name}
          href={unitHref(unit.name)}
          className="rounded border border-line bg-raised px-1.5 py-0.5 text-[11px] text-muted transition-colors hover:border-accent/40 hover:text-fg"
        >
          {unit.name} {unit.cost}
        </Link>
      ))}
    </p>
  );
}

/** One trait: breakpoints on the right, what it does, and who carries it. */
function TraitRow({ trait, units }: { trait: TraitEntry; units: RosterUnit[] }) {
  return (
    <li id={traitAnchor(trait.name)} className="card scroll-mt-24 px-3 py-2.5">
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
      <UnitChips units={units} />
    </li>
  );
}

export default function Set19TraitsPage() {
  // One pass over the roster rather than a filter per trait: the units carrying
  // a trait are the same fact the roster already records.
  const unitsByTrait = new Map<string, RosterUnit[]>();
  for (const unit of set19Units) {
    for (const trait of unit.traits) {
      const list = unitsByTrait.get(trait) ?? [];
      list.push(unit);
      unitsByTrait.set(trait, list);
    }
  }
  const unitsFor = (trait: string) => unitsByTrait.get(trait) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {set19.number} · {set19.name}
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">The 47 traits, with breakpoints</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          27 regular traits and 20 unique ones, plus the five with a Prismatic tier. Percentages
          are mostly absent on purpose — the reveal describes the effects, and a made-up number
          would be indistinguishable from a real one once it is on the page.
        </p>
      </header>

      <Set19Tabs active="traits" />

      <section className="mt-8">
        <h2 className="text-xl font-semibold">The 27 traits, with their breakpoints</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
          Every regular trait with the tiers it needs and what each tier does, plus the champions
          that carry it. The five with a Prismatic tier are marked; the twenty unique traits, which
          only one champion each has, are in the next section.
        </p>

        <ul className="mt-3 space-y-2">
          {set19Traits.map((trait) => (
            <TraitRow key={trait.name} trait={trait} units={unitsFor(trait.name)} />
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">The 20 unique traits</h2>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted">
          Traits with one champion each. They are still traits for the purposes of Jazz, which
          counts active non-unique traits only — so these do not feed it.
        </p>

        <ul className="mt-3 space-y-2">
          {set19UniqueTraits.map((trait) => (
            <TraitRow key={trait.name} trait={trait} units={unitsFor(trait.name)} />
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
            <li
              key={trait.name}
              id={prismaticAnchor(trait.name)}
              className="card scroll-mt-24 p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h3 className="text-sm font-semibold">{trait.name}</h3>
                <span className="stat-value text-[11px] text-muted">{trait.tiers}</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{trait.gist}</p>
              <UnitChips units={unitsFor(trait.name)} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
