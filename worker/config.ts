/**
 * Worker configuration.
 *
 * Every knob is an env var with a safe default, so the worker is runnable
 * without a config file. Riot-specific shapes (routing, published rate limits)
 * live here rather than being sprinkled through the crawler.
 */

export type Region = "EUW" | "KR";
export type SeedTier = "challenger" | "grandmaster" | "master";
export type KeyType = "development" | "production";

/** Platform host for league/summoner calls, regional host for match calls. */
export const REGION_ROUTING: Record<Region, { platform: string; regional: string }> = {
  EUW: { platform: "euw1", regional: "europe" },
  KR: { platform: "kr", regional: "asia" },
};

export const ALL_SEED_TIERS: SeedTier[] = ["challenger", "grandmaster", "master"];

/**
 * Riot's published limits. The limiter applies the budget percentage on top, so
 * these are ceilings, not targets.
 */
export const KEY_LIMITS: Record<KeyType, { limit: number; windowMs: number }[]> = {
  development: [
    { limit: 20, windowMs: 1_000 },
    { limit: 100, windowMs: 120_000 },
  ],
  production: [
    { limit: 500, windowMs: 10_000 },
    { limit: 30_000, windowMs: 600_000 },
  ],
};

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function regionsFromEnv(raw: string | undefined): Region[] {
  if (!raw) return ["EUW", "KR"];
  const found = raw
    .split(",")
    .map((part) => part.trim().toUpperCase())
    .filter((part): part is Region => part === "EUW" || part === "KR");
  return found.length > 0 ? found : ["EUW", "KR"];
}

function tiersFromEnv(raw: string | undefined): SeedTier[] {
  const source = raw ?? "challenger,grandmaster";
  const found = source
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter((part): part is SeedTier => ALL_SEED_TIERS.includes(part as SeedTier));
  return found.length > 0 ? found : ["challenger", "grandmaster"];
}

export const config = {
  /* --- Riot API --- */
  apiKey: process.env.RIOT_API_KEY ?? "",
  /** Point at the local stub (worker/dev/stub-riot.ts) to rehearse without quota. */
  baseUrl: process.env.RIOT_API_BASE_URL ?? "",
  keyType: (process.env.RIOT_KEY_TYPE === "production"
    ? "production"
    : "development") as KeyType,
  regions: regionsFromEnv(process.env.RIOT_REGIONS),
  /** Fraction of the published limit to actually use. 65% leaves headroom. */
  budgetPercent: Math.min(1, Math.max(0.1, intEnv("CRAWL_BUDGET_PERCENT", 65) / 100)),
  requestTimeoutMs: intEnv("RIOT_REQUEST_TIMEOUT_MS", 15_000),
  maxRetries: intEnv("RIOT_MAX_RETRIES", 4),

  /* --- Crawl shape --- */
  seedTiers: tiersFromEnv(process.env.CRAWL_SEED_TIERS),
  /** Guards against the master ladder (thousands of players) on a small key. */
  seedMaxPlayers: intEnv("CRAWL_SEED_MAX_PLAYERS", 2_000),
  discoveryWindowHours: intEnv("CRAWL_DISCOVERY_WINDOW_HOURS", 72),
  /** Discovery cursor is set slightly in the past so no match falls between runs. */
  discoveryOverlapMinutes: intEnv("CRAWL_DISCOVERY_OVERLAP_MINUTES", 10),
  matchIdsPerRequest: Math.min(100, intEnv("CRAWL_MATCH_IDS_PER_REQUEST", 100)),
  playersPerDiscoveryRun: intEnv("CRAWL_PLAYERS_PER_RUN", 150),
  /**
   * Players whose Riot ID is resolved per `crawl -- names` run. One request per
   * player, so this is a quota decision: raise it on a production key.
   */
  namesPerRun: intEnv("CRAWL_NAMES_PER_RUN", 200),
  concurrency: Math.max(1, intEnv("CRAWL_CONCURRENCY", 4)),
  maxAttempts: Math.max(1, intEnv("CRAWL_MAX_ATTEMPTS", 5)),
  /** A claim older than this is assumed to belong to a dead worker. */
  claimTimeoutMinutes: intEnv("CRAWL_CLAIM_TIMEOUT_MINUTES", 15),
  loopIntervalSeconds: intEnv("CRAWL_LOOP_INTERVAL_SECONDS", 300),
  /** How often the run loop re-materialises comp_stats so pages stay fresh. */
  aggregateIntervalMinutes: Math.max(1, intEnv("CRAWL_AGGREGATE_MINUTES", 30)),
  /** Escape hatch when game_version cannot be parsed (e.g. unusual payloads). */
  patchOverride: process.env.CRAWL_PATCH_OVERRIDE ?? "",

  /* --- Compression --- */
  /**
   * Share of a comp's core units a board must contain to be assigned to it.
   * Must match the methodology text on the site (60%).
   */
  assignThreshold: Math.min(1, Math.max(0.1, Number.parseFloat(process.env.CRAWL_ASSIGN_THRESHOLD ?? "0.6") || 0.6)),
} as const;

export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Example: postgres://user:pass@127.0.0.1:5432/tft",
    );
  }
  return url;
}

export function requireApiKey(): string {
  if (!config.apiKey) {
    throw new Error(
      "RIOT_API_KEY is not set. Get a development key from https://developer.riotgames.com " +
        "(it expires every 24 hours), or point RIOT_API_BASE_URL at the local stub to rehearse.",
    );
  }
  return config.apiKey;
}
