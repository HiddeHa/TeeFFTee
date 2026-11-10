/**
 * Community Dragon TFT catalogue.
 *
 * One JSON file describes every set Riot has shipped: per-set champions, traits,
 * the item table and the augment list. Set data is nested under a "mutator" —
 * `TFTSet18` is the base set, `TFTSet18_PAIRS` / `..._PVEMODE` / `..._TURBO` are
 * modes layered on top of it.
 *
 * Why Community Dragon rather than Data Dragon: ddragon has no trait
 * breakpoints and lags on augments, and the augment tier is only recoverable
 * from the asset name. CDragon is the same content the client ships.
 *
 * Two quirks this module absorbs so callers do not have to:
 *  - `setData[].champions` and `.traits` are objects, but `.items` and
 *    `.augments` are *arrays of apiNames* for current sets (and objects for
 *    some older ones). Everything is resolved against the top-level `items`
 *    table, which is where names, icons and recipes actually live.
 *  - A champion's `traits` are display names ("Old Growth"), while the trait
 *    entries are keyed by apiName ("DA_18_Elderwood"). The crawler and Riot
 *    match payloads use the apiName, so the builder maps display name → apiName.
 */

/** Pinned by an env var when a load must be repeatable (e.g. reproducing a patch). */
export const CDRAGON_URL =
  process.env.CDRAGON_URL ?? "https://raw.communitydragon.org/latest/cdragon/tft/en_us.json";

export const CDRAGON_GAME_ROOT = "https://raw.communitydragon.org/latest/game/";

export type CdragonChampion = {
  apiName?: string;
  name?: string;
  cost?: number;
  traits?: string[];
  icon?: string | null;
  squareIcon?: string | null;
};

export type CdragonTrait = {
  apiName?: string;
  name?: string;
  icon?: string | null;
  effects?: { minUnits?: number; maxUnits?: number }[];
};

export type CdragonItem = {
  apiName?: string;
  name?: string;
  icon?: string | null;
  composition?: string[];
  isAugment?: boolean;
  /** Opaque property hashes; one of them encodes augment rarity. */
  tags?: string[];
};

export type CdragonSet = {
  mutator?: string;
  number?: number;
  champions?: CdragonChampion[];
  traits?: CdragonTrait[];
  /** apiNames for current sets; full objects on some older ones. */
  items?: (string | CdragonItem)[];
  augments?: (string | CdragonItem)[];
};

export type CdragonPayload = {
  /** The global item table every set's items and augments resolve against. */
  items?: CdragonItem[];
  setData?: CdragonSet[];
};

export type FetchResult = { payload: CdragonPayload; url: string; bytes: number };

/**
 * Download the catalogue.
 *
 * 24 MB in practice, so the timeout is generous and a failure is retried once:
 * a truncated download would otherwise parse as valid JSON and load a partial
 * set. The byte length is returned so the caller can put it in the load report.
 */
export async function fetchCatalogue(
  options: { url?: string; timeoutMs?: number; attempts?: number } = {},
): Promise<FetchResult> {
  const url = options.url ?? CDRAGON_URL;
  const timeoutMs = options.timeoutMs ?? 120_000;
  const attempts = options.attempts ?? 3;

  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: { accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} from ${url}`);
      }
      const text = await response.text();
      const payload = JSON.parse(text) as CdragonPayload;
      if (!Array.isArray(payload.setData) || payload.setData.length === 0) {
        throw new Error(`${url} returned no setData — refusing to load an empty catalogue`);
      }
      return { payload, url, bytes: Buffer.byteLength(text) };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
    }
  }

  throw new Error(
    `could not fetch the Community Dragon catalogue: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`,
  );
}
