// First import on purpose: it populates process.env before ./config reads it.
import "./load-env";

import { parseArgs } from "node:util";

import { aggregate, bootstrapNewPatches, getSetSummary } from "./aggregate";
import { formatAssetReport, loadAssets } from "./assets";
import { findCandidates, formatReport, type Scope } from "./candidates";
import { KEY_LIMITS, config, requireApiKey, type Region } from "./config";
import { closeDb, db } from "./db";
import { discoverMatches } from "./discover";
import { fetchMatches } from "./fetch";
import { createLogger, sleepUnless } from "./log";
import { RateLimiter } from "./limiter";
import { formatPatternReport, refreshPatterns } from "./patterns";
import { queueStats } from "./queue";
import { reprocessMatches } from "./reprocess";
import { resolveRiotIds } from "./names";
import { RiotClient } from "./riot";
import { seedLadders } from "./seed";
import { syncComps } from "./sync-comps";

const log = createLogger("cli");

const HELP = `
TFT crawl pipeline

Usage: npm run crawl -- <command> [options]

Commands
  seed        Load the ranked ladders into the player pool
  names       Resolve Riot IDs (game name + tag) for tracked players
  discover    Turn tracked players into queued match ids
  fetch       Drain the queue: fetch matches, normalise, persist
  reprocess   Rebuild rows from stored raw payloads (after a normaliser fix)
  load-assets Load a set's units, traits, items and augments from Community Dragon
  sync-comps  Push curated comps from src/content into Postgres
  aggregate   Assign boards to comps and materialise comp_stats
  patterns    Materialise the AInalyses study (units, duos, cores, items, traits)
  bootstrap   Seed comp_stats for any patch/region with games but no rows yet
  candidates  Rank frequent unit sets in the crawled data (evidence for comps)
  once        seed -> discover -> fetch in one pass (rehearsal)
  run         Continuous loop: discover + fetch, re-seed periodically
  stats       Queue health and table counts

Options
  --limit <n>        Max matches to fetch, rows to reprocess, or names to resolve  (default 1000)
  --players <n>      Max players to process in discovery        (default from env)
  --region <list>    Comma separated: EUW,KR                    (default from env)
  --patch <id>       Limit aggregation to one patch, e.g. 18.5
  --set <n>          Set for aggregation, or the set to load        (default: newest in CDragon)
  --mutator <name>   Load a mode variant instead of the base set, e.g. TFTSet18_PAIRS
  --source <url>     Catalogue URL override (also CDRAGON_URL); pin a patch to reproduce
  --concurrency <n>  Parallel fetch lanes                       (default from env)
  --min-games <n>    Minimum boards for a candidate core       (default 20)
  --core <n>         Largest core to mine, 2-5                 (default 4)
  --bucket <name>    all | master+                            (default all)
  --json             Print candidates as JSON, for scripting
  -h, --help         This text

Environment
  DATABASE_URL        required for every command
  RIOT_API_KEY        required for seed/discover/fetch/once/run
  RIOT_API_BASE_URL   point at worker/dev/stub-riot.ts to rehearse offline
  RIOT_KEY_TYPE       development (default) | production
  CRAWL_BUDGET_PERCENT  share of the published limit to use (default 65)
  CDRAGON_URL         catalogue source for load-assets (default: CDragon latest)
`;

function intOption(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function regionOption(value: string | undefined): Region[] {
  if (!value) return [...config.regions];
  const parsed = value
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter((part): part is Region => part === "EUW" || part === "KR");
  return parsed.length > 0 ? parsed : [...config.regions];
}

function makeClient(): RiotClient {
  requireApiKey();
  const limiter = new RateLimiter(KEY_LIMITS[config.keyType], config.budgetPercent);
  return new RiotClient(limiter);
}

function logSettings(regions: Region[]): void {
  log.info("pipeline settings", {
    regions,
    keyType: config.keyType,
    budgetPercent: Math.round(config.budgetPercent * 100),
    concurrency: config.concurrency,
    seedTiers: config.seedTiers,
    target: config.baseUrl || "live Riot API",
  });
}

async function printStats(): Promise<void> {
  const sql = db();
  const queue = await queueStats();

  const tables = await sql<
    {
      players: number;
      matches: number;
      participants: number;
      units: number;
      traits: number;
      augments: number;
      raw_payloads: number;
      comps: number;
      comp_stats: number;
      comp_augment_stats: number;
      board_patterns: number;
      board_studies: number;
    }[]
  >`
    SELECT
      (SELECT count(*)::int FROM players) AS players,
      (SELECT count(*)::int FROM matches) AS matches,
      (SELECT count(*)::int FROM participants) AS participants,
      (SELECT count(*)::int FROM participant_units) AS units,
      (SELECT count(*)::int FROM participant_traits) AS traits,
      (SELECT count(*)::int FROM participant_augments) AS augments,
      (SELECT count(*)::int FROM matches WHERE raw IS NOT NULL) AS raw_payloads,
      (SELECT count(*)::int FROM comps WHERE published) AS comps,
      (SELECT count(*)::int FROM comp_stats) AS comp_stats,
      (SELECT count(*)::int FROM comp_augment_stats) AS comp_augment_stats,
      (SELECT count(*)::int FROM board_patterns) AS board_patterns,
      (SELECT count(*)::int FROM board_studies) AS board_studies
  `;

  const byPatch = await sql<{ patch: string; matches: number }[]>`
    SELECT patch, count(*)::int AS matches
    FROM matches
    GROUP BY patch
    ORDER BY matches DESC
    LIMIT 5
  `;

  console.log("");
  console.log("queue");
  console.log(`  pending   ${queue.pending}`);
  console.log(`  fetching  ${queue.fetching}`);
  console.log(`  done      ${queue.done}`);
  console.log(`  failed    ${queue.failed}`);
  console.log(
    `  oldest pending: ${queue.oldestPendingMinutes === null ? "—" : `${queue.oldestPendingMinutes}m`}`,
  );

  const row = tables[0];
  console.log("");
  console.log("tables");
  if (row) {
    console.log(`  players      ${row.players}`);
    console.log(`  matches      ${row.matches}  (raw payloads: ${row.raw_payloads})`);
    console.log(`  participants ${row.participants}`);
    console.log(`  units        ${row.units}`);
    console.log(`  traits       ${row.traits}`);
    console.log(`  augments     ${row.augments}`);
    console.log("");
    console.log("aggregates");
    console.log(`  published comps ${row.comps}`);
    console.log(`  comp_stats rows ${row.comp_stats}`);
    console.log(`  augment rows    ${row.comp_augment_stats}`);
    console.log(
      `  AInalyses sets ${row.board_studies}  (patterns: ${row.board_patterns} rows)`,
    );
  }

  const sets = await getSetSummary();
  if (sets.length > 0) {
    console.log("");
    console.log("sets");
    for (const entry of sets) {
      const flag = entry.comps === 0 ? "   <- no comps for this set" : "";
      console.log(
        `  set ${String(entry.setNumber).padEnd(2)} patch ${entry.patch.padEnd(6)} ` +
          `matches ${String(entry.matches).padEnd(6)} comps ${entry.comps}${flag}`,
      );
    }
  }

  if (byPatch.length > 0) {
    console.log("");
    console.log("matches by patch");
    for (const entry of byPatch) console.log(`  ${entry.patch.padEnd(10)} ${entry.matches}`);
  }
  console.log("");
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      limit: { type: "string" },
      players: { type: "string" },
      region: { type: "string" },
      patch: { type: "string" },
      set: { type: "string" },
      concurrency: { type: "string" },
      "min-games": { type: "string" },
      mutator: { type: "string" },
      source: { type: "string" },
      core: { type: "string" },
      bucket: { type: "string" },
      json: { type: "boolean" },
    },
  });

  const command = positionals[0] ?? "help";

  if (values.help || command === "help") {
    console.log(HELP);
    return;
  }

  const regions = regionOption(values.region);
  const fetchLimit = intOption(values.limit, 1_000);
  const concurrency = intOption(values.concurrency, config.concurrency);
  const playerLimit = intOption(values.players, config.playersPerDiscoveryRun);

  switch (command) {
    case "seed": {
      const client = makeClient();
      logSettings(regions);
      const results = await seedLadders(client, regions);
      const total = results.reduce((sum, entry) => sum + entry.usable, 0);
      log.info("seed complete", { ladders: results.length, players: total });
      break;
    }

    case "names": {
      const client = makeClient();
      logSettings(regions);
      const results = await resolveRiotIds(client, regions, intOption(values.limit, config.namesPerRun));
      const resolved = results.reduce((sum, entry) => sum + entry.resolved, 0);
      const attempted = results.reduce((sum, entry) => sum + entry.attempted, 0);
      log.info("names complete", { attempted, resolved, pending: attempted - resolved });
      break;
    }

    case "discover": {
      const client = makeClient();
      logSettings(regions);
      const result = await discoverMatches(client, regions, playerLimit);
      log.info("discovery complete", result);
      break;
    }

    case "fetch": {
      const client = makeClient();
      logSettings(regions);
      const result = await fetchMatches(client, { limit: fetchLimit, concurrency });
      log.info("fetch complete", result);
      break;
    }

    case "reprocess": {
      const result = await reprocessMatches(intOption(values.limit, 500));
      log.info("reprocess complete", result);
      break;
    }

    case "load-assets": {
      const result = await loadAssets({
        setNumber: values.set ? intOption(values.set, 0) || undefined : undefined,
        mutator: values.mutator,
        source: values.source,
      });

      console.log("");
      console.log(formatAssetReport(result));
      console.log("");
      break;
    }

    case "sync-comps": {
      const result = await syncComps();
      log.info("comps synced", result);
      break;
    }

    case "aggregate": {
      const result = await aggregate({
        patch: values.patch,
        region: values.region ? regionOption(values.region)[0] : undefined,
        set: values.set ? intOption(values.set, 0) || undefined : undefined,
      });

      log.info("aggregation complete", {
        scopes: result.scopes.length,
        rowsWritten: result.rowsWritten,
        augmentRows: result.augmentRowsWritten,
        compsLoaded: result.compsLoaded,
        threshold: config.assignThreshold,
      });

      for (const scope of result.scopes) {
        const share =
          scope.boards === 0 ? 0 : Math.round((scope.unclassified / scope.boards) * 1000) / 10;
        console.log(
          `  ${scope.patch} ${scope.region.padEnd(4)} boards=${String(scope.boards).padEnd(6)} ` +
            `classified=${String(scope.classified).padEnd(6)} unclassified=${scope.unclassified} (${share}%) ` +
            `rows=${scope.rows} augmentRows=${scope.augmentRows}`,
        );
      }
      break;
    }

    case "patterns": {
      const summary = await refreshPatterns({
        set: values.set ? intOption(values.set, 0) || undefined : undefined,
      });
      console.log(formatPatternReport(summary));
      break;
    }

    case "bootstrap": {
      const result = await bootstrapNewPatches();
      log.info("bootstrap complete", {
        seeded: result.bootstrapped.length,
        waitingForComps: result.waitingForComps.length,
        rowsWritten: result.rowsWritten,
        augmentRows: result.augmentRowsWritten,
      });

      for (const scope of result.scopes) {
        const share =
          scope.boards === 0 ? 0 : Math.round((scope.unclassified / scope.boards) * 1000) / 10;
        console.log(
          `  ${scope.patch} ${scope.region.padEnd(4)} boards=${String(scope.boards).padEnd(6)} ` +
            `classified=${String(scope.classified).padEnd(6)} unclassified=${scope.unclassified} (${share}%) ` +
            `rows=${scope.rows} augmentRows=${scope.augmentRows}`,
        );
      }
      break;
    }

    case "candidates": {
      const bucket =
        values.bucket === "master+" || values.bucket === "all" ? values.bucket : undefined;
      if (values.bucket && !bucket) {
        log.warn("unknown --bucket, using all boards", { bucket: values.bucket });
      }

      const scope: Scope = {
        setNumber: values.set ? intOption(values.set, 0) || undefined : undefined,
        patch: values.patch,
        region: values.region ? regionOption(values.region)[0] : undefined,
        bucket,
      };

      const report = await findCandidates(scope, {
        minGames: intOption(values["min-games"], 20),
        maxCore: intOption(values.core, 4),
        limit: intOption(values.limit, 12),
      });

      if (values.json) console.log(JSON.stringify(report, null, 2));
      else console.log(formatReport(report));
      break;
    }

    case "once": {
      const client = makeClient();
      logSettings(regions);
      await seedLadders(client, regions);
      const discovered = await discoverMatches(client, regions, playerLimit);
      log.info("discovery complete", discovered);
      const fetched = await fetchMatches(client, { limit: fetchLimit, concurrency });
      log.info("fetch complete", fetched);
      break;
    }

    case "run": {
      const client = makeClient();
      logSettings(regions);

      let stopping = false;
      // Which stage the cycle is in. Printed on shutdown so an operator can tell
      // "stopped between stages" from "is still finishing discovery".
      let phase = "starting";
      let watchdog: NodeJS.Timeout | undefined;

      const requestStop = (signal: string) => {
        if (stopping) return;
        stopping = true;
        log.info(`received ${signal} — finishing ${phase}, then exiting`);

        // In-flight work checks `stopping` between units, so this should never
        // fire. It exists because a hung socket or a long limiter pause must not
        // turn into a SIGKILL: writes are per-match transactions, so an abrupt
        // exit rolls back cleanly and the rows are reclaimed on restart.
        watchdog = setTimeout(() => {
          log.warn("shutdown watchdog fired; exiting without finishing the current step", {
            phase,
          });
          void closeDb().finally(() => process.exit(0));
        }, 20_000);
      };
      process.once("SIGINT", () => requestStop("SIGINT"));
      process.once("SIGTERM", () => requestStop("SIGTERM"));

      // Lets a stop request interrupt a quota wait or a retry backoff, which can
      // otherwise be minutes long on a busy budget.
      client.setStopCheck(() => stopping);

      const aggregateEveryMs = config.aggregateIntervalMinutes * 60_000;
      let lastAggregateAt = 0;
      let cycle = 0;

      // Content edits (new comps, new set) reach the database on start, so a
      // restart is all it takes to pick them up.
      try {
        const synced = await syncComps();
        log.info("comps synced from content", { synced: synced.synced });
      } catch (error) {
        log.warn("could not sync comps, continuing with what is in the database", {
          error: error instanceof Error ? error.message : String(error),
        });
      }

      while (!stopping) {
        cycle += 1;
        log.info(`cycle ${cycle} starting`);

        try {
          // Re-seed periodically so promotions and demotions from the ladder
          // enter the tracked pool.
          if (cycle % 12 === 1) {
            phase = "reseeding ladders";
            const seeded = await seedLadders(client, regions);
            log.info("reseeding complete", { ladders: seeded.length });
          }

          phase = "discovery";
          const discovered = await discoverMatches(client, regions, playerLimit, {
            shouldStop: () => stopping,
          });
          log.info("discovery complete", discovered);

          phase = "fetch";
          const fetched = await fetchMatches(client, {
            limit: fetchLimit,
            concurrency,
            shouldStop: () => stopping,
          });
          log.info("fetch complete", fetched);

          // Seed a patch window the moment its first games land. Movers compare
          // two windows, so waiting for the aggregate timer would delay them by
          // up to CRAWL_AGGREGATE_MINUTES for no reason. A no-op once seeded.
          if (!stopping) {
            phase = "bootstrap";
            const seeded = await bootstrapNewPatches();
            if (seeded.bootstrapped.length > 0) {
              log.info("bootstrap seeded new patch windows", {
                scopes: seeded.bootstrapped,
                rows: seeded.rowsWritten,
              });
            }
          }

          // Refresh the derived layer on a timer: fetching without aggregating
          // leaves the site showing yesterday's numbers.
          if (!stopping && Date.now() - lastAggregateAt >= aggregateEveryMs) {
            phase = "aggregation";
            const refreshed = await aggregate();
            lastAggregateAt = Date.now();
            log.info("aggregation refreshed", {
              scopes: refreshed.scopes.length,
              rows: refreshed.rowsWritten,
            });

            // AInalyses reads this snapshot, so it has to move on the same timer
            // as comp_stats — a page mined once at launch would describe a meta
            // that stopped existing weeks ago.
            phase = "patterns";
            const mined = await refreshPatterns();
            log.info("patterns refreshed", {
              sets: mined.sets.length,
              rows: mined.rowsWritten,
            });
          }
        } catch (error) {
          if (stopping) {
            log.info("cycle interrupted by shutdown");
          } else {
            // A dead key or a rejected request should not kill a long-lived loop;
            // the next cycle retries.
            log.error("cycle failed", {
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        if (stopping) break;

        phase = "sleeping between cycles";
        log.info(`cycle ${cycle} done, sleeping`, {
          seconds: config.loopIntervalSeconds,
        });
        await sleepUnless(config.loopIntervalSeconds * 1_000, () => stopping);
      }

      if (watchdog) clearTimeout(watchdog);
      log.info("run loop stopped", { cycles: cycle });

      // Exit explicitly. Closing the pool is not enough on its own: a keep-alive
      // socket in the HTTP agent can hold the event loop open with no work left,
      // which is exactly how a container ends up waiting out its grace period.
      await closeDb();
      process.exit(0);
      break;
    }

    case "stats": {
      await printStats();
      break;
    }

    default: {
      console.error(`Unknown command: ${command}`);
      console.log(HELP);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((error: unknown) => {
    log.error("fatal", {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
