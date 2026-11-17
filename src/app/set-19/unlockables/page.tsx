import type { Metadata } from "next";
import Link from "next/link";

import { Set19Tabs } from "@/components/set-19-tabs";
import {
  set19,
  set19UnlockCategories,
  set19UnlockQuests,
  set19Units,
  set19Unlocks,
} from "@/content/set-19";
import { classNames } from "@/lib/format";
import { cardAnchor, unitHref } from "@/lib/set19-anchors";

export const metadata: Metadata = {
  title: `Set ${set19.number} unlockables: quests and categories`,
  description:
    "The 36 unlockable Set 19 champions, the three unlock categories, the five cards Riot has shown and every published quest condition.",
  alternates: { canonical: "/set-19/unlockables" },
};

/** The roster row for a quest's champion, or null if the name is a variant. */
function rosterHref(name: string): string | null {
  const unit =
    set19Units.find((entry) => entry.name === name) ??
    set19Units.find((entry) => entry.name.startsWith(`${name} (`));
  return unit ? unitHref(unit.name) : null;
}

export default function Set19UnlockablesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {set19.number} · {set19.name}
        </p>
        <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">
          Unlocks: 36 champions, three categories
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Unlocks return from Lore and Legends. A locked champion is not in the shop; finish its
          quest and it shows up in your next shop, buyable at its normal cost. Exactly 36 of the 94
          are unlocks, and Riot split them into three kinds.
        </p>
      </header>

      <Set19Tabs active="unlockables" />

      <section className="mt-6">
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

        <h2 className="mt-6 text-sm font-semibold">The five cards Riot has shown</h2>
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
              {set19Unlocks.map((card) => {
                const href = rosterHref(card.champion);
                return (
                  <tr
                    key={card.champion}
                    id={cardAnchor(card.champion)}
                    className="bg-surface scroll-mt-24"
                  >
                    <td className="rounded-l-lg border-y border-l border-line px-3 py-2 text-[13px] font-semibold">
                      {href ? (
                        <Link href={href} className="hover:text-accent">
                          {card.champion}
                        </Link>
                      ) : (
                        card.champion
                      )}
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
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          The two quests Riot did give show the intended spread: Aphelios asks for a Recurve Bow
          on a Heartsteel champion — something you might do anyway — while Mordekaiser wants
          eleven unique Pentakill star levels, which only pays a board already committed to the
          band.
        </p>

        <h2 className="mt-6 text-sm font-semibold">The published quest conditions</h2>
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
              {set19UnlockQuests.map((quest) => {
                const href = rosterHref(quest.champion);
                return (
                  <tr key={quest.champion} className="bg-surface">
                    <td className="rounded-l-lg border-y border-l border-line px-3 py-2 text-[13px] font-semibold">
                      {href ? (
                        <Link href={href} className="hover:text-accent">
                          {quest.champion}
                        </Link>
                      ) : (
                        quest.champion
                      )}
                    </td>
                    <td className="border-y border-line px-3 py-2 text-[13px] text-muted">
                      {quest.cost}
                    </td>
                    <td className="rounded-r-lg border-y border-r border-line px-3 py-2 text-[13px] text-muted">
                      {quest.quest}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
