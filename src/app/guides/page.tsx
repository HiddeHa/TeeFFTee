import type { Metadata } from "next";
import Link from "next/link";

import { guides } from "@/content/guides";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Long-form TFT guides on reading the numbers and spending gold: how a tier list is built, what its sample size means, and when to roll instead of level.",
  alternates: { canonical: "/guides" },
};

export default function GuidesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Guides
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          The parts that decide games the tier list cannot.
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          How to read a number that came from someone else comes first, then the
          fundamentals underneath every board: gold, positioning and items. Each guide
          states what is measured and what is my read, names the case where it is wrong,
          and works whether or not the crawler has a sample for the comp you are playing.
        </p>
      </header>

      <ul className="space-y-3">
        {guides.map((guide) => (
          <li key={guide.slug}>
            <Link
              href={`/guides/${guide.slug}`}
              className="card group block p-5 transition-colors hover:border-accent/40 hover:bg-raised"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-lg font-semibold group-hover:text-accent">
                  {guide.title}
                </h2>
                <span className="text-[11px] text-muted">
                  {guide.readingMinutes} min read
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{guide.dek}</p>
              <p className="mt-3 text-[11px] text-muted/80">
                Answers: {guide.answers} · patch {guide.patch} · reviewed{" "}
                {formatDate(guide.updatedAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-8 text-xs leading-relaxed text-muted">
        Patch-specific comp advice lives on the{" "}
        <Link href="/meta" className="text-accent hover:underline">
          tier list
        </Link>
        . Guides here are written to survive a patch: they describe how to decide, not
        which board to copy.
      </p>
    </div>
  );
}
