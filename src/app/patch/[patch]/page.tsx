import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CoachingCTA } from "@/components/coaching-cta";
import { DataNote } from "@/components/data-note";
import { patches } from "@/content/patches";
import type { PatchChange } from "@/content/types";
import { getPatch } from "@/lib/data";
import { formatDate, formatGames, formatPercent } from "@/lib/format";
import { getPatchMovers } from "@/lib/movers";

type Params = Promise<{ patch: string }>;

// Movers come from comp_stats, which the crawler keeps filling — revalidate so a
// second patch window appears without a redeploy.
export const revalidate = 300;

const KIND_STYLES: Record<PatchChange["kind"], string> = {
  buff: "border-good/30 bg-good/10 text-good",
  nerf: "border-bad/30 bg-bad/10 text-bad",
  adjust: "border-line bg-raised text-muted",
  new: "border-accent/30 bg-accent/10 text-accent",
};

const KIND_LABELS: Record<PatchChange["kind"], string> = {
  buff: "Buff",
  nerf: "Nerf",
  adjust: "Adjust",
  new: "New",
};

export function generateStaticParams() {
  return patches.map((patch) => ({ patch: patch.patch }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { patch: patchId } = await params;
  const patch = await getPatch(patchId);
  if (!patch) return { title: "Patch not found" };

  return {
    title: `Patch ${patch.patch} notes and meta read`,
    description: patch.summary,
    alternates: { canonical: `/patch/${patch.patch}` },
    openGraph: {
      title: `Patch ${patch.patch} notes and meta read`,
      description: patch.summary,
      url: `/patch/${patch.patch}`,
    },
  };
}

export default async function PatchPage({ params }: { params: Params }) {
  const { patch: patchId } = await params;
  const patch = await getPatch(patchId);
  if (!patch) notFound();

  const movers = await getPatchMovers(patch.patch);
  const hasDeltas =
    movers !== null && (movers.risers.length > 0 || movers.fallers.length > 0);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/meta" className="hover:text-accent">
          Meta
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">Patch {patch.patch}</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Set {patch.setNumber} · released {formatDate(patch.releasedAt)}
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Patch {patch.patch}: {patch.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">{patch.summary}</p>
      </header>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          What changed
        </h2>
        <ul className="mt-3 space-y-2">
          {patch.changes.map((change) => (
            <li key={change.subject} className="card flex gap-3 p-4">
              <span
                className={`mt-0.5 h-fit shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_STYLES[change.kind]}`}
              >
                {KIND_LABELS[change.kind]}
              </span>
              <div>
                <p className="text-sm font-semibold">{change.subject}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{change.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Movers
        </h2>
        <div className="mt-3">
          {hasDeltas ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-good">
                  Rising
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {movers?.risers.map((entry) => (
                    <li key={entry.compSlug} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <Link
                          href={`/meta/${entry.compSlug}`}
                          className="block truncate hover:text-accent"
                        >
                          {entry.label}
                        </Link>
                        <span className="text-[10px] text-muted">
                          n {entry.previousGames} → {entry.games}
                        </span>
                      </span>
                      <span className="stat-value shrink-0 text-good">
                        +{(entry.delta * 100).toFixed(1)}pp
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-bad">
                  Falling
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {movers?.fallers.map((entry) => (
                    <li key={entry.compSlug} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <Link
                          href={`/meta/${entry.compSlug}`}
                          className="block truncate hover:text-accent"
                        >
                          {entry.label}
                        </Link>
                        <span className="text-[10px] text-muted">
                          n {entry.previousGames} → {entry.games}
                        </span>
                      </span>
                      <span className="stat-value shrink-0 text-bad">
                        {(entry.delta * 100).toFixed(1)}pp
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <DataNote>
              {movers
                ? `Patch ${movers.previousPatch} and ${movers.patch} both have stats, but no comp clears ${movers.minGames} games in both yet — nothing is estimated to fill the gap.`
                : "Risers and fallers are derived from comp_stats once the crawler has games on two patch windows. Until then this section stays empty rather than estimated."}
            </DataNote>
          )}

          {hasDeltas && movers ? (
            <p className="mt-2 text-[11px] text-muted">
              Top-4 rate against patch {movers.previousPatch} · {movers.rankBucket} · all
              regions · at least {movers.minGames} games in both patches.
            </p>
          ) : null}

          {patch.momentum && patch.momentum.entries.length > 0 ? (
            <div className="card mt-3 p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
                  Within patch {patch.patch}
                </p>
                <p className="text-[11px] text-muted">
                  Intra-patch drift, not patch-over-patch
                </p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                First half against the second half of the crawl window (
                {formatDate(patch.momentum.windowStart)} to{" "}
                {formatDate(patch.momentum.windowEnd)}, split{" "}
                {formatDate(patch.momentum.splitAt)}), measured on{" "}
                {formatGames(patch.momentum.boards)} boards from {patch.momentum.matches}{" "}
                matches. Both halves are small samples — read the direction, not the
                decimals.
              </p>
              <ul className="mt-3 divide-y divide-line/60 text-sm">
                {patch.momentum.entries.map((entry) => (
                  <li
                    key={entry.compSlug}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                  >
                    <Link
                      href={`/meta/${entry.compSlug}`}
                      className="font-medium hover:text-accent"
                    >
                      {entry.label}
                    </Link>
                    <span className="stat-value text-xs text-muted">
                      {formatPercent(entry.first.top4Rate)} →{" "}
                      {formatPercent(entry.second.top4Rate)}
                    </span>
                    <span
                      className={`stat-value text-xs ${
                        entry.top4Delta >= 0 ? "text-good" : "text-bad"
                      }`}
                    >
                      {entry.top4Delta >= 0 ? "+" : ""}
                      {formatPercent(entry.top4Delta)}
                    </span>
                    <span className="text-[11px] text-muted">
                      n {entry.first.games} → {entry.second.games}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] leading-relaxed text-muted">
                Top-4 rate per half; only comps with at least {patch.momentum.minGames}{" "}
                games in both halves are listed.{" "}
                {patch.momentum.classified} of{" "}
                {patch.momentum.boards} boards classified. Generated{" "}
                {formatDate(patch.momentum.generatedAt)}.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Meta read
        </p>
        <h2 className="mt-1 text-2xl font-semibold">{patch.metaRead.headline}</h2>
        <div className="prose-block mt-4 text-sm">
          {patch.metaRead.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 40)}>{paragraph}</p>
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs text-muted">
        Riot's notes:{" "}
        <a
          href={patch.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          official patch {patch.patch} notes
        </a>
        . Summaries here are rewritten, not copied.
      </p>

      <div className="mt-10">
        <CoachingCTA variant="band" placement={`patch_${patch.patch}`} />
      </div>

      <p className="mt-8 text-sm text-muted">
        Back to the{" "}
        <Link href="/meta" className="font-semibold text-accent hover:underline">
          meta
        </Link>
        .
      </p>
    </div>
  );
}
