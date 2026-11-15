import type { Metadata } from "next";
import Link from "next/link";

import { DataNote } from "@/components/data-note";
import { site } from "@/content/site";
import { formatDate } from "@/lib/format";
import { listTrackedPlayers } from "@/lib/players";

// The pool changes when the crawler re-seeds; nothing here is authored.
//
// Forced dynamic rather than ISR on purpose: without a request-time read Next
// prerenders this page at build, and a build that ran without DATABASE_URL would
// freeze "no crawl data" into the deployed output until the next deploy — the
// opposite of what a crawler-backed index is for.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tracked players",
  description:
    "The ranked players the crawler tracks, highest LP first, each linking to their crawled matches and placements.",
  alternates: { canonical: "/players" },
};

const SHOWN = 100;

function shortPuuid(puuid: string): string {
  return puuid.length > 16 ? `${puuid.slice(0, 10)}…${puuid.slice(-4)}` : puuid;
}

export default async function PlayersPage() {
  const page = await listTrackedPlayers(SHOWN);

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">Players</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Players</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">The players we crawl.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Everyone here came off a ranked ladder that <code className="text-fg/70">crawl -- seed</code>{" "}
          read, so the pool is Challenger and Grandmaster on EUW and KR rather than a sample of
          everyone who plays. A profile shows what that player actually did in the matches we
          fetched.
        </p>
      </header>

      {page.kind === "unavailable" ? (
        <div className="mt-6">
          <DataNote>
            No crawl data is attached here. This index reads the crawler&apos;s Postgres, and
            nothing is connected to it in this environment — so there is no ladder to list.
          </DataNote>
        </div>
      ) : page.total === 0 ? (
        <div className="mt-6">
          <DataNote>
            The database is connected but no ladder has been seeded yet. Run{" "}
            <code className="text-fg/70">npm run crawl -- seed</code> and the tracked players
            appear here.
          </DataNote>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted">
            {page.total} tracked {page.total === 1 ? "player" : "players"} ·{" "}
            {page.players.length < page.total
              ? `top ${page.players.length} by LP`
              : "all listed, highest LP first"}
          </p>

          <ol className="mt-3 space-y-1.5">
            {page.players.map((player, index) => (
              <li key={player.puuid}>
                <Link
                  href={`/players/${player.puuid}`}
                  className="card group flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-raised"
                >
                  <span className="w-6 shrink-0 text-right text-[11px] tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0 break-all font-mono text-sm group-hover:text-accent">
                    {shortPuuid(player.puuid)}
                  </span>
                  <span className="ml-auto flex shrink-0 items-baseline gap-2 text-[11px] text-muted">
                    <span className="chip">{player.region}</span>
                    <span className="chip">{player.tier}</span>
                    <span className="font-semibold tabular-nums text-fg/80">
                      {player.lp} LP
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-[11px] leading-relaxed text-muted">
            LP and tier are the last seed&apos;s snapshot, not a live standing — a player can be
            promoted or demoted between seeds. Names are shown as PUUIDs because turning one into
            a Riot ID costs a request per player, which the crawler spends on matches instead.
          </p>
        </>
      )}
    </div>
  );
}
