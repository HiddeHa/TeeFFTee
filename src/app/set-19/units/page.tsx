import type { Metadata } from "next";
import Link from "next/link";

import { AssetImage } from "@/components/asset-image";
import { Set19Tabs } from "@/components/set-19-tabs";
import { set19, set19CostCurve, set19Units } from "@/content/set-19";
import { portraitFor } from "@/content/set-19-portraits";
import { traitHref, unitAnchor, unitPageHref } from "@/lib/set19-anchors";

export const metadata: Metadata = {
  title: `Set ${set19.number} units: the roster by cost`,
  description:
    "All 94 Set 19 champions by what they cost in the shop, with the traits each one carries.",
  alternates: { canonical: "/set-19/units" },
};

const COST_ORDER = [1, 2, 3, 4, 5, 7];

export default function Set19UnitsPage() {
  const buckets = COST_ORDER.map((cost) => {
    const label = `${cost}-cost`;
    return {
      cost,
      label,
      units: set19Units.filter((unit) => unit.cost === cost),
      note: set19CostCurve.find((bucket) => bucket.cost === label)?.note ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {set19.number} · {set19.name}
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">The roster, by cost</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          All {set19Units.length} champions, by what they cost in the shop, with the traits each
          one carries. The 4-costs are the widest tier in the set and the 7-costs are the
          narrowest, which is the shape you plan an economy around.
        </p>
      </header>

      <Set19Tabs active="units" />

      {buckets.map((bucket) => (
        <section key={bucket.cost} className="mt-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-2">
            <h2 className="text-lg font-semibold">
              {bucket.label}s{" "}
              <span className="text-sm font-normal text-muted">{bucket.units.length}</span>
            </h2>
          </div>
          {bucket.note ? (
            <p className="mt-1 text-[11px] leading-relaxed text-muted">{bucket.note}</p>
          ) : null}

          <table className="mt-2 w-full border-separate border-spacing-y-1 text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted">
                <th className="px-3 font-semibold">Champion</th>
                <th className="px-3 font-semibold">Traits</th>
              </tr>
            </thead>
            <tbody>
              {bucket.units.map((unit) => (
                <tr key={unit.name} id={unitAnchor(unit.name)} className="bg-surface scroll-mt-24">
                  <td className="w-px whitespace-nowrap rounded-l-lg border-y border-l border-line px-3 py-2 text-sm font-semibold">
                    <span className="flex items-center gap-2">
                      <AssetImage
                        src={portraitFor(unit.name)}
                        width={32}
                        height={32}
                        className="h-8 w-8 shrink-0 rounded border border-line object-cover"
                        fallback={
                          <span
                            aria-hidden
                            className="h-8 w-8 shrink-0 rounded border border-dashed border-line bg-surface"
                          />
                        }
                      />
                      <Link href={unitPageHref(unit.name)} className="hover:text-accent">
                        {unit.name}
                      </Link>
                    </span>
                  </td>
                  <td className="rounded-r-lg border-y border-r border-line px-3 py-2">
                    <span className="flex flex-wrap gap-1">
                      {unit.traits.map((trait) => (
                        <Link
                          key={trait}
                          href={traitHref(trait)}
                          className="chip px-1.5 py-0 text-[11px] transition-colors hover:border-accent/40 hover:text-fg"
                        >
                          {trait}
                        </Link>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      <p className="mt-6 text-[11px] leading-relaxed text-muted">
        Two details that change how the shop reads: Akali is in the set twice, as Akali (K|DA)
        and Akali (True Damage) — separate five-cost champions with separate unlock quests — and
        all four 7-costs are unlocks rather than shop units, so they arrive only through their
        quests.
      </p>
    </div>
  );
}
