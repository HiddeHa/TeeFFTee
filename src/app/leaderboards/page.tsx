import type { Metadata } from "next";
import Link from "next/link";

import { DataNote } from "@/components/data-note";
import { site } from "@/content/site";
import { classNames, formatDate } from "@/lib/format";
import { listTrackedPlayers } from "@/lib/players";

/**
 * The tracked ladder, one region at a time.
 *
 * Forced dynamic: this is a database read whose answer changes with every seed,
 * and a prerendered build would freeze whatever the build machine could see.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboards",
  description:
    "The ranked TFT ladder the crawler tracks in Europe and Korea, highest LP first, with a profile for every player.",
  alternates: { canonical: "/leaderboards" },
};

/** How deep the board goes, and how many rows one page carries. */
const MAX_RANK = 1_000;
const PAGE_SIZE = 100;

const REGIONS = [
  { code: "EUW", label: "Europe" },
  { code: "KR", label: "Korea" },
] as const;

type RegionCode = (typeof REGIONS)[number]["code"];

function isRegion(value: string | undefined): value is RegionCode {
  return REGIONS.some((region) => region.code === value);
}

function pageNumber(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(parsed, Math.ceil(MAX_RANK / PAGE_SIZE));
}

function shortPuuid(puuid: string): string {
  return puuid.length > 16 ? `${puuid.slice(0, 10)}…${puuid.slice(-4)}` : puuid;
}

type SearchParams = Promise<{ region?: string; page?: string }>;

export default async function LeaderboardsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const region: RegionCode = isRegion(params.region) ? params.region : "EUW";
  const page = pageNumber(params.page);

  const board = await listTrackedPlayers({
    region,
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  });

  const totalBoards = board.kind === "ok" ? Math.min(board.total, MAX_RANK) : 0;
  const pages = Math.max(1, Math.ceil(totalBoards / PAGE_SIZE));
  const label = REGIONS.find((entry) => entry.code === region)?.label ?? region;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">Leaderboards</span>
      </nav>

      <header className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Leaderboard</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Top {MAX_RANK > 0 ? MAX_RANK.toLocaleString("en-GB") : "1,000"} in {label}.
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The {label} ladder as <code className="text-fg/70">crawl -- seed</code> last read it,
          highest LP first. Every row opens that player&apos;s crawled matches — placements, boards
          and finishes — so a rank can be checked against what the player actually did.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {REGIONS.map((entry) => (
          <Link
            key={entry.code}
            href={`/leaderboards?region=${entry.code}`}
            aria-current={entry.code === region ? "page" : undefined}
            className={classNames(
              "chip transition-colors",
              entry.code === region
                ? "border-accent bg-accent font-semibold text-[#1a1204]"
                : "hover:border-accent/40 hover:text-fg",
            )}
          >
            {entry.label}
          </Link>
        ))}
      </div>

      {board.kind === "unavailable" ? (
        <div className="mt-6">
          <DataNote>
            No crawl data is attached here. This leaderboard reads the crawler&apos;s Postgres, and
            nothing is connected to it in this environment — so there is no ladder to rank.
          </DataNote>
        </div>
      ) : board.total === 0 ? (
        <div className="mt-6">
          <DataNote>
            The database is connected but no {label} ladder has been seeded yet. Run{" "}
            <code className="text-fg/70">npm run crawl -- seed</code> and the board fills in.
          </DataNote>
        </div>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted">
            {board.total.toLocaleString("en-GB")} tracked in {label} · showing{" "}
            {(page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + board.players.length}
            {board.total > MAX_RANK
              ? ` of the top ${MAX_RANK.toLocaleString("en-GB")}`
              : ""}
          </p>

          <ol className="mt-3 space-y-1.5">
            {board.players.map((player, index) => {
              const rank = (page - 1) * PAGE_SIZE + index + 1;
              return (
                <li key={player.puuid}>
                  <Link
                    href={`/players/${player.puuid}`}
                    className="card group flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-raised"
                  >
                    <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-muted">
                      {rank}
                    </span>
                    <span className="min-w-0 break-all font-mono text-sm group-hover:text-accent">
                      {shortPuuid(player.puuid)}
                    </span>
                    <span className="ml-auto flex shrink-0 items-baseline gap-2 text-[11px] text-muted">
                      <span className="chip">{player.tier}</span>
                      <span className="font-semibold tabular-nums text-fg/80">
                        {player.lp} LP
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>

          {pages > 1 ? (
            <nav className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="Leaderboard pages">
              {Array.from({ length: pages }, (_, index) => index + 1).map((candidate) => (
                <Link
                  key={candidate}
                  href={`/leaderboards?region=${region}&page=${candidate}`}
                  aria-current={candidate === page ? "page" : undefined}
                  className={classNames(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-md border px-1.5 text-xs tabular-nums transition-colors",
                    candidate === page
                      ? "border-accent bg-accent font-semibold text-[#1a1204]"
                      : "border-line bg-raised text-muted hover:border-accent/40 hover:text-fg",
                  )}
                >
                  {candidate}
                </Link>
              ))}
            </nav>
          ) : null}

          <p className="mt-6 text-[11px] leading-relaxed text-muted">
            LP and tier are the last seed&apos;s snapshot, not a live standing — Riot&apos;s ladder
            endpoints are read when the crawler re-seeds, so a promotion between seeds shows up on
            the next pass. Names are PUUIDs because resolving a Riot ID costs one request per
            player, which the crawler spends on matches instead.
            {board.players.some((player) => player.lastSeenAt)
              ? ` Most recent seed read: ${formatDate(
                  board.players
                    .map((player) => player.lastSeenAt)
                    .filter((value): value is string => value !== null)
                    .sort()
                    .at(-1) ?? new Date().toISOString(),
                )}.`
              : ""}
          </p>
        </>
      )}
    </div>
  );
}
