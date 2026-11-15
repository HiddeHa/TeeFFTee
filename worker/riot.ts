import { config, REGION_ROUTING, type Region, type SeedTier } from "./config";
import type { RateLimiter } from "./limiter";
import type { LadderResponse, RiotAccountDto, TftMatchDto } from "./riot-types";

export class RiotApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** Whether retrying this request could plausibly succeed. */
    readonly retriable: boolean,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

/** 404 means the match does not exist (old match, wrong region). Skip it. */
export class RiotNotFoundError extends RiotApiError {
  constructor(message: string) {
    super(message, 404, false);
    this.name = "RiotNotFoundError";
  }
}

function backoffMs(attempt: number): number {
  const base = Math.min(30_000, 500 * 2 ** attempt);
  return base + Math.floor(Math.random() * 400);
}

type HostKind = "platform" | "regional";

/**
 * Thin Riot API client.
 *
 * Responsibilities kept deliberately narrow: build the URL for a region, take a
 * rate-limit slot before every request, translate HTTP failures into two
 * categories (retriable / terminal), and honour retry-after on 429.
 */
export class RiotClient {
  /** Counts every HTTP attempt, so the stub run can prove the budget is respected. */
  requestCount = 0;

  constructor(private readonly limiter: RateLimiter) {}

  /** Wired by the run loop so shutdown can interrupt a quota wait or backoff. */
  setStopCheck(check: () => boolean): void {
    this.limiter.setStopCheck(check);
  }

  ladder(region: Region, tier: SeedTier): Promise<LadderResponse> {
    return this.getJson<LadderResponse>(
      `/tft/league/v1/${tier}?queue=RANKED_TFT`,
      region,
      "platform",
    );
  }

  /**
   * The Riot ID (game name + tag) for one PUUID.
   *
   * Regional routing, like the match endpoints: account data is sharded by
   * cluster, so a KR PUUID is asked for on `asia` and an EUW one on `europe`.
   * This costs one request per player, which is why names are resolved by a
   * separate command rather than inside `seed`.
   */
  accountByPuuid(region: Region, puuid: string): Promise<RiotAccountDto> {
    return this.getJson<RiotAccountDto>(
      `/riot/account/v1/accounts/by-puuid/${encodeURIComponent(puuid)}`,
      region,
      "regional",
    );
  }

  matchIdsByPuuid(
    region: Region,
    puuid: string,
    startTimeEpochSeconds: number,
    count: number,
  ): Promise<string[]> {
    const query = new URLSearchParams({
      count: String(count),
      startTime: String(Math.max(0, Math.floor(startTimeEpochSeconds))),
    });
    return this.getJson<string[]>(
      `/tft/match/v1/matches/by-puuid/${encodeURIComponent(puuid)}/ids?${query}`,
      region,
      "regional",
    );
  }

  match(region: Region, matchId: string): Promise<TftMatchDto> {
    return this.getJson<TftMatchDto>(
      `/tft/match/v1/matches/${encodeURIComponent(matchId)}`,
      region,
      "regional",
    );
  }

  private buildUrl(path: string, region: Region, host: HostKind): string {
    const routing = REGION_ROUTING[region];
    const subdomain = host === "platform" ? routing.platform : routing.regional;

    if (config.baseUrl) {
      // Keep the hostname as a path prefix against the stub. Region lives in the
      // hostname in production, so dropping it would make both regions
      // indistinguishable — and seeding would silently merge their ladders.
      return `${config.baseUrl.replace(/\/$/, "")}/${subdomain}${path}`;
    }

    return `https://${subdomain}.api.riotgames.com${path}`;
  }

  private async getJson<T>(path: string, region: Region, host: HostKind): Promise<T> {
    const url = this.buildUrl(path, region, host);

    for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
      // Reserve quota for this attempt. After a 429 the limiter is paused, so
      // this call is what makes every concurrent loop back off.
      await this.limiter.acquire();
      this.requestCount += 1;

      let response: Response;
      try {
        response = await fetch(url, {
          headers: {
            "X-Riot-Token": config.apiKey,
            Accept: "application/json",
          },
          signal: AbortSignal.timeout(config.requestTimeoutMs),
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (attempt === config.maxRetries) {
          throw new RiotApiError(`network failure: ${reason}`, 0, true);
        }
        await this.limiter.wait(backoffMs(attempt));
        continue;
      }

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 404) {
        throw new RiotNotFoundError(`not found: ${path}`);
      }

      if (response.status === 429) {
        const header = Number.parseFloat(response.headers.get("retry-after") ?? "1");
        const retryAfterMs = Math.max(1_000, Math.ceil((Number.isFinite(header) ? header : 1) * 1000));
        this.limiter.pause(retryAfterMs);
        if (attempt === config.maxRetries) {
          throw new RiotApiError("rate limited: retries exhausted", 429, true, retryAfterMs);
        }
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        throw new RiotApiError(
          `Riot rejected the API key (HTTP ${response.status}). Development keys expire every ` +
            "24 hours — regenerate it, or set RIOT_API_BASE_URL to the local stub.",
          response.status,
          false,
        );
      }

      if (response.status >= 500) {
        if (attempt === config.maxRetries) {
          throw new RiotApiError(`server error ${response.status}: retries exhausted`, response.status, true);
        }
        await this.limiter.wait(backoffMs(attempt));
        continue;
      }

      // 400/415 and friends: the request itself is wrong, retrying will not help.
      throw new RiotApiError(`unexpected HTTP ${response.status} for ${path}`, response.status, false);
    }

    throw new RiotApiError("retries exhausted", 0, true);
  }
}
