/**
 * Measure within-patch momentum and write it to src/content.
 *
 * Why this exists: `comp_stats` holds one row set per patch, so the site cannot
 * derive patch-over-patch movers from it. It can, however, answer a narrower
 * question honestly: inside a single patch, did a comp's top-4 rate move between
 * the first and second half of the crawl window? That is drift within one patch,
 * not a riser or faller, and it is labelled that way wherever it is shown.
 *
 *   npm run momentum:measure -- 18.6
 *   npm run momentum:measure -- 18.6 --min-games 30
 *
 * Boards are assigned with the same signature and threshold the crawler uses
 * (`worker/assign.ts`, 60%), so a board counted here is a board `aggregate`
 * would count. The output is a content snapshot, not a database row: it carries
 * its window, split timestamp and sample sizes so a stale or thin reading is
 * visible rather than implied.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import "../worker/load-env";

import { comps } from "../src/content/comps";
import type { MomentumEntry, MomentumHalf, PatchMomentum } from "../src/content/types";
import { assignBoard, type CompSignature } from "../worker/assign";
import { config } from "../worker/config";
import { closeDb, db } from "../worker/db";

type BoardRow = {
  match_id: string;
  set_number: number;
  game_datetime: string | Date;
  placement: number;
  units: string[];
  traits: string[];
};

type Accumulator = { games: number; placeSum: number; top4: number };

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toHalf(accumulator: Accumulator): MomentumHalf {
  return {
    games: accumulator.games,
    top4Rate: round(accumulator.top4 / accumulator.games),
    avgPlace: round(accumulator.placeSum / accumulator.games, 2),
  };
}

async function main(): Promise<void> {
  const patch = process.argv.slice(2).find((arg) => /^\d+\.\d+$/.test(arg)) ?? "18.6";
  const minGames = Math.max(1, Number.parseInt(argValue("--min-games") ?? "20", 10) || 20);

  const sql = db();

  const [window] = await sql<{ matches: number; first: string; last: string }[]>`
    SELECT count(*)::int AS matches, min(game_datetime) AS first, max(game_datetime) AS last
    FROM matches
    WHERE patch = ${patch}
  `;

  if (!window || window.matches === 0 || !window.first || !window.last) {
    throw new Error(`no crawled matches for patch ${patch}`);
  }

  const start = new Date(window.first).getTime();
  const end = new Date(window.last).getTime();
  const splitAt = new Date(start + (end - start) / 2);

  const setRows = await sql<{ set_number: number }[]>`
    SELECT DISTINCT set_number FROM matches WHERE patch = ${patch} ORDER BY set_number
  `;
  const setNumbers = setRows.map((row) => row.set_number);
  const setNumber = Math.max(...setNumbers, 0);

  // Signatures come from the curated comps, which are what `sync-comps` pushed —
  // slug is used as the id because this snapshot is content, not a DB join.
  const signatures = new Map<number, CompSignature[]>();
  const eligible = new Set<string>();
  const names = new Map<string, string>();

  for (const comp of comps) {
    if (!comp.published || !setNumbers.includes(comp.setNumber)) continue;
    eligible.add(comp.slug);
    names.set(comp.slug, comp.name);

    const list = signatures.get(comp.setNumber) ?? [];
    list.push({
      compId: comp.slug,
      slug: comp.slug,
      setName: comp.setNumber,
      coreUnits: comp.coreUnits,
      definingTrait: comp.definingTrait ?? null,
    });
    signatures.set(comp.setNumber, list);
  }

  if (eligible.size === 0) {
    throw new Error(`no published comps for set ${setNumber} — run sync-comps first`);
  }

  const boards = await sql<BoardRow[]>`
    SELECT
      p.match_id,
      m.set_number,
      m.game_datetime,
      p.placement,
      COALESCE((
        SELECT array_agg(u.unit_id)
        FROM participant_units u
        WHERE u.match_id = p.match_id AND u.puuid = p.puuid
      ), '{}') AS units,
      COALESCE((
        SELECT array_agg(t.trait_id)
        FROM participant_traits t
        WHERE t.match_id = p.match_id AND t.puuid = p.puuid AND t.tier_current > 0
      ), '{}') AS traits
    FROM participants p
    JOIN matches m ON m.match_id = p.match_id
    WHERE m.patch = ${patch}
  `;

  const first = new Map<string, Accumulator>();
  const second = new Map<string, Accumulator>();
  let classified = 0;

  for (const board of boards) {
    const time = new Date(board.game_datetime).getTime();
    const half = time < splitAt.getTime() ? first : second;

    const assignment = assignBoard(
      { units: board.units, traits: board.traits, placement: board.placement },
      signatures.get(board.set_number) ?? [],
      config.assignThreshold,
    );
    if (assignment.compId === null) continue;
    classified += 1;

    const accumulator = half.get(assignment.compId) ?? { games: 0, placeSum: 0, top4: 0 };
    accumulator.games += 1;
    accumulator.placeSum += board.placement;
    if (board.placement <= 4) accumulator.top4 += 1;
    half.set(assignment.compId, accumulator);
  }

  const entries: MomentumEntry[] = [];
  const tooThin: string[] = [];

  for (const slug of eligible) {
    const before = first.get(slug);
    const after = second.get(slug);
    if (!before || !after || before.games < minGames || after.games < minGames) {
      tooThin.push(slug);
      continue;
    }

    const firstHalf = toHalf(before);
    const secondHalf = toHalf(after);
    entries.push({
      compSlug: slug,
      label: names.get(slug) ?? slug,
      first: firstHalf,
      second: secondHalf,
      top4Delta: round(secondHalf.top4Rate - firstHalf.top4Rate),
      placeDelta: round(secondHalf.avgPlace - firstHalf.avgPlace, 2),
    });
  }

  entries.sort((a, b) => b.top4Delta - a.top4Delta || a.compSlug.localeCompare(b.compSlug));

  const momentum: PatchMomentum = {
    generatedAt: new Date().toISOString(),
    label: `first half vs second half of the ${patch} crawl window`,
    patch,
    setNumber,
    scope: "every crawled region",
    windowStart: new Date(start).toISOString(),
    windowEnd: new Date(end).toISOString(),
    splitAt: splitAt.toISOString(),
    matches: window.matches,
    boards: boards.length,
    classified,
    minGames,
    source:
      "matches + participant_units/participant_traits, assigned at 60% core-unit overlap",
    entries,
  };

  const out = path.join("src", "content", "momentum", `${patch}.json`);
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(momentum, null, 2)}\n`, "utf8");

  console.log(`[momentum] ${entries.length} comps, ${window.matches} matches, ${boards.length} boards`);
  for (const entry of entries) {
    const delta = `${entry.top4Delta >= 0 ? "+" : ""}${(entry.top4Delta * 100).toFixed(1)}pp`;
    console.log(
      `  ${entry.label.padEnd(24)} ${(entry.first.top4Rate * 100).toFixed(1)}% -> ` +
        `${(entry.second.top4Rate * 100).toFixed(1)}%  (${delta})  n ${entry.first.games}/${entry.second.games}`,
    );
  }
  if (tooThin.length > 0) {
    console.log(
      `[momentum] below ${minGames} games in a half, omitted: ${tooThin.join(", ")}`,
    );
  }
  console.log(`[momentum] wrote ${out}`);
}

main()
  .catch((error: unknown) => {
    console.error(
      `[momentum] failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(() => closeDb());
