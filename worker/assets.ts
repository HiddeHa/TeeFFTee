/**
 * Set catalogue loader: Community Dragon → Postgres.
 *
 * The crawl stores Riot's ids verbatim (`DA_18_Maokai`, `DA_18_Elderwood`,
 * `TFT_Item_InfinityEdge`). This job is what turns those ids into names, costs,
 * breakpoints and icons, so the whole pipeline can stay id-driven and a new set
 * is a data load rather than a code change.
 *
 * Split in two on purpose:
 *  - `buildCatalogue` is pure (payload in, rows out) and is what the tests and
 *    the rehearsals exercise.
 *  - `loadAssets` does I/O: fetch, build, upsert, prune, then measure how many
 *    of the crawled ids actually resolved. That last part is the point of the
 *    job — a catalogue nobody's ids match is a silent failure.
 *
 * Idempotent: rows upsert on their primary key, and rows of the loaded set that
 * the payload no longer contains are deleted, so a rename or a removed unit
 * converges instead of lingering.
 */

import type { TransactionSql } from "postgres";

import {
  CDRAGON_GAME_ROOT,
  fetchCatalogue,
  type CdragonItem,
  type CdragonPayload,
  type CdragonSet,
} from "./cdragon";
import { db } from "./db";
import { createLogger } from "./log";

const log = createLogger("assets");

export type UnitRow = {
  unit_id: string;
  set_number: number;
  name: string;
  cost: number;
  traits: string[];
  image_url: string | null;
};

export type TraitRow = {
  trait_id: string;
  set_number: number;
  name: string;
  breakpoints: number[];
  image_url: string | null;
};

export type ItemRow = {
  item_id: string;
  set_number: number;
  name: string;
  kind: string;
  image_url: string | null;
};

export type AugmentRow = {
  augment_id: string;
  set_number: number;
  name: string;
  tier: string;
  image_url: string | null;
};

export type Catalogue = {
  setNumber: number;
  mutator: string;
  units: UnitRow[];
  traits: TraitRow[];
  items: ItemRow[];
  augments: AugmentRow[];
  /** Rows the payload listed but could not be turned into a row, by reason. */
  skipped: {
    champions: number;
    items: string[];
    augments: string[];
    /** Champion trait names with no trait entry — usually a set mechanic. */
    unmatchedTraits: string[];
    /** Ids the payload listed more than once; only the first row is kept. */
    duplicateIds: string[];
  };
  itemKinds: Record<string, number>;
  augmentTiers: Record<string, number>;
  unitsWithoutTraits: number;
  images: { total: number; missing: number };
};

export type CoverageGroup = {
  label: string;
  ids: number;
  resolved: number;
  missing: string[];
};

export type Coverage = {
  setNumber: number;
  boards: number;
  groups: CoverageGroup[];
};

export type LoadReport = Catalogue & {
  source: string;
  bytes: number;
  stale: { units: number; traits: number; items: number; augments: number };
  /** Null when no crawled match carries this set yet. */
  coverage: Coverage | null;
};

/* -------------------------------------------------------------------------- */
/* Pure transform                                                             */
/* -------------------------------------------------------------------------- */

/** `.tex` paths are what the payload carries; the CDN serves the `.png` next to it. */
export function imageUrl(path: string | null | undefined): string | null {
  if (!path || path === "None") return null;
  const normalised = path.trim().toLowerCase();
  if (normalised.length === 0) return null;
  if (!normalised.endsWith(".tex") && !normalised.endsWith(".png")) return null;
  return CDRAGON_GAME_ROOT + normalised.replace(/\.tex$/, ".png");
}

/**
 * What an item *is*, from the fields the payload actually has.
 *
 * Only derivable categories are used — no guessing from display names beyond the
 * Emblem suffix, which Riot applies consistently:
 *   completed  has a recipe (B.F. Sword + Bow → Giant Slayer)
 *   emblem     completed, and named "... Emblem"
 *   component  a base component (no recipe)
 *   special    set mechanics and mode items (Aftershock, All Fives, ...)
 */
export function itemKind(item: CdragonItem): string {
  const name = item.name ?? "";
  if (/(^|\s)Emblem$/i.test(name)) return "emblem";
  if ((item.composition ?? []).length > 0) return "completed";
  if (/^TFT_Item_/i.test(item.apiName ?? "") || /component/i.test(item.apiName ?? "")) {
    return "component";
  }
  return "special";
}

const TIER_BY_SUFFIX: Record<string, string> = { i: "Silver", ii: "Gold", iii: "Prismatic" };

/**
 * Augment tier from the icon name.
 *
 * The payload carries no rarity field, but hexcore art is named by tier:
 * `branching-out-i.tex` (Silver), `grab-bag-ii.tex` (Gold), `golden-gifts-iii.tex`
 * (Prismatic). Both `-` and `_` separators appear in the same set. When the icon
 * has no tier marker (placeholders, mode augments) the tier is unknown — say so
 * rather than guessing a middle value.
 */
export function tierFromIcon(icon: string | null | undefined): string {
  const match = /[-_](i{1,3})\.tex$/i.exec(icon ?? "");
  const suffix = match?.[1]?.toLowerCase();
  return (suffix && TIER_BY_SUFFIX[suffix]) || "unknown";
}

/**
 * Learn rarity tags from the augments whose icon states the tier.
 *
 * The `tags` array does carry rarity, but as an opaque hash and with no legend.
 * Meanwhile 114 of set 18's augments share a placeholder icon, so the icon alone
 * leaves a fifth of the set unlabelled.
 *
 * So instead of hardcoding hashes: collect, per tag, the tiers its augments
 * declare in their icons, and promote a tag to "rarity tag" only when one tier
 * holds at least 80% of its evidence. On set 18 the icon and the tag agree for
 * 168 of the 170 augments that carry both — that agreement is what makes using
 * the tag on the remaining ones a measurement rather than a guess.
 */
export function learnTagTiers(
  augments: { icon?: string | null; tags?: string[] }[],
): Map<string, string> {
  const votes = new Map<string, Map<string, number>>();

  for (const augment of augments) {
    const tier = tierFromIcon(augment.icon);
    if (tier === "unknown") continue;
    for (const tag of augment.tags ?? []) {
      const byTier = votes.get(tag) ?? new Map<string, number>();
      byTier.set(tier, (byTier.get(tier) ?? 0) + 1);
      votes.set(tag, byTier);
    }
  }

  const learned = new Map<string, string>();
  for (const [tag, byTier] of votes) {
    const total = [...byTier.values()].reduce((sum, count) => sum + count, 0);
    const top = [...byTier.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) continue;
    const [tier, count] = top;
    if (total >= 10 && count / total >= 0.8) learned.set(tag, tier);
  }

  return learned;
}

function pickSet(
  payload: CdragonPayload,
  options: { setNumber?: number; mutator?: string },
): { set: CdragonSet; setNumber: number; available: number[] } {
  const byNumber = new Map<number, CdragonSet[]>();
  for (const set of payload.setData ?? []) {
    if (typeof set.number !== "number") continue;
    const list = byNumber.get(set.number) ?? [];
    list.push(set);
    byNumber.set(set.number, list);
  }

  const available = [...byNumber.keys()].sort((a, b) => a - b);
  if (available.length === 0) throw new Error("the catalogue contains no numbered sets");

  // Default to the newest set in the payload: `latest` tracks the live patch, so
  // this follows a set launch without a code change.
  const newest = available[available.length - 1];
  if (newest === undefined) throw new Error("the catalogue contains no numbered sets");
  const setNumber = options.setNumber ?? newest;

  const variants = byNumber.get(setNumber);
  if (!variants) {
    throw new Error(
      `set ${setNumber} is not in this catalogue (available: ${available.join(", ")}). ` +
        `A set that has not shipped is only in the PBE build — point CDRAGON_URL at it.`,
    );
  }

  if (options.mutator) {
    const wanted = variants.find((set) => set.mutator === options.mutator);
    if (!wanted) {
      throw new Error(
        `mutator "${options.mutator}" has no set ${setNumber} data ` +
          `(available: ${variants.map((set) => set.mutator).join(", ")})`,
      );
    }
    return { set: wanted, setNumber, available };
  }

  // The base mutator is `TFTSet18`; fall back to the shortest name, which is the
  // plain set on every payload shape seen so far (set 15 ships as
  // `TFTSet7_Stage2_CT`, so the name is not always predictable).
  const baseName = `TFTSet${setNumber}`;
  const base =
    variants.find((set) => set.mutator === baseName) ??
    [...variants].sort((a, b) => (a.mutator ?? "").length - (b.mutator ?? "").length)[0];
  if (!base) throw new Error(`set ${setNumber} has no readable mutator entries`);

  return { set: base, setNumber, available };
}

/**
 * Turn the payload for one set into rows.
 *
 * Throws rather than returning empty rows: a set that produces no units is a
 * payload change, and writing that would empty the catalogue that the site and
 * the review tooling read.
 */
export function buildCatalogue(
  payload: CdragonPayload,
  options: { setNumber?: number; mutator?: string } = {},
): Catalogue {
  const { set, setNumber } = pickSet(payload, options);

  const itemsById = new Map<string, CdragonItem>();
  for (const item of payload.items ?? []) {
    if (item.apiName) itemsById.set(item.apiName, item);
  }

  const resolve = (entry: string | CdragonItem): CdragonItem | null => {
    if (typeof entry === "string") return itemsById.get(entry) ?? null;
    if (entry.apiName && !entry.name) return itemsById.get(entry.apiName) ?? entry;
    return entry.apiName ? entry : null;
  };

  const skipped: Catalogue["skipped"] = {
    champions: 0,
    items: [],
    augments: [],
    unmatchedTraits: [],
    duplicateIds: [],
  };
  const unmatchedTraitNames = new Set<string>();

  /* --- traits first: units reference them --------------------------------- */
  // Keyed by id, because a payload can list the same apiName twice (set 15 does
  // for one champion) and a duplicate row would make the upsert fail outright.
  const traitsById = new Map<string, TraitRow>();
  const traitIdByName = new Map<string, string>();

  for (const trait of set.traits ?? []) {
    const traitId = trait.apiName?.trim();
    const name = trait.name?.trim();
    if (!traitId || !name) continue;
    if (traitsById.has(traitId)) {
      skipped.duplicateIds.push(traitId);
      continue;
    }

    // Activation counts, deduped and ascending; `maxUnits` is only the upper
    // bound of a tier, so it is not a breakpoint.
    const breakpoints = [
      ...new Set(
        (trait.effects ?? [])
          .map((effect) => effect.minUnits)
          .filter((value): value is number => typeof value === "number" && value > 0),
      ),
    ].sort((a, b) => a - b);

    traitIdByName.set(name.toLowerCase(), traitId);
    traitsById.set(traitId, {
      trait_id: traitId,
      set_number: setNumber,
      name,
      breakpoints,
      image_url: imageUrl(trait.icon),
    });
  }

  const traitRows = [...traitsById.values()];

  /* --- units -------------------------------------------------------------- */
  const unitsById = new Map<string, UnitRow>();
  let unitsWithoutTraits = 0;

  for (const champion of set.champions ?? []) {
    const unitId = champion.apiName?.trim();
    const name = champion.name?.trim();
    if (!unitId || !name) {
      skipped.champions += 1;
      continue;
    }
    if (unitsById.has(unitId)) {
      skipped.duplicateIds.push(unitId);
      continue;
    }

    const traits: string[] = [];
    for (const displayName of champion.traits ?? []) {
      const traitId = traitIdByName.get(displayName.trim().toLowerCase());
      if (traitId) {
        traits.push(traitId);
      } else {
        unmatchedTraitNames.add(displayName);
      }
    }
    if (traits.length === 0) unitsWithoutTraits += 1;

    const cost = Number(champion.cost);
    unitsById.set(unitId, {
      unit_id: unitId,
      set_number: setNumber,
      name,
      // Summons (Training Dummy, Voidspawn) carry cost 0 — keep it, do not
      // round them up into the shop.
      cost: Number.isFinite(cost) ? Math.max(0, Math.round(cost)) : 0,
      traits,
      image_url: imageUrl(champion.squareIcon ?? champion.icon),
    });
  }

  const unitRows = [...unitsById.values()];

  if (unitRows.length === 0) {
    throw new Error(
      `set ${setNumber} (${set.mutator ?? "unknown mutator"}) has no usable champions — ` +
        `the payload shape changed, refusing to write an empty catalogue`,
    );
  }

  /* --- items -------------------------------------------------------------- */
  const itemRows: ItemRow[] = [];
  const seenItems = new Set<string>();
  for (const entry of set.items ?? []) {
    const item = resolve(entry);
    if (!item?.apiName || !item.name) {
      skipped.items.push(typeof entry === "string" ? entry : (entry.apiName ?? "?"));
      continue;
    }
    if (seenItems.has(item.apiName)) continue;
    seenItems.add(item.apiName);
    itemRows.push({
      item_id: item.apiName,
      set_number: setNumber,
      name: item.name,
      kind: itemKind(item),
      image_url: imageUrl(item.icon),
    });
  }

  /* --- augments ----------------------------------------------------------- */
  const resolvedAugments: CdragonItem[] = [];
  const seenAugments = new Set<string>();

  for (const entry of set.augments ?? []) {
    const augment = resolve(entry);
    if (!augment?.apiName || !augment.name) {
      skipped.augments.push(typeof entry === "string" ? entry : (entry.apiName ?? "?"));
      continue;
    }
    if (seenAugments.has(augment.apiName)) continue;
    seenAugments.add(augment.apiName);
    resolvedAugments.push(augment);
  }

  const tagTiers = learnTagTiers(resolvedAugments);
  const augmentRows: AugmentRow[] = resolvedAugments.map((augment) => {
    const fromTag = (augment.tags ?? [])
      .map((tag) => tagTiers.get(tag))
      .find((tier): tier is string => tier !== undefined);

    return {
      augment_id: augment.apiName as string,
      set_number: setNumber,
      name: augment.name as string,
      tier: fromTag ?? tierFromIcon(augment.icon),
      image_url: imageUrl(augment.icon),
    };
  });

  skipped.unmatchedTraits = [...unmatchedTraitNames].sort();

  const rows = [...unitRows, ...traitRows, ...itemRows, ...augmentRows];
  const missingImages = rows.filter((row) => row.image_url === null).length;

  return {
    setNumber,
    mutator: set.mutator ?? `set-${setNumber}`,
    units: unitRows,
    traits: traitRows,
    items: itemRows,
    augments: augmentRows,
    skipped,
    itemKinds: tally(itemRows.map((row) => row.kind)),
    augmentTiers: tally(augmentRows.map((row) => row.tier)),
    unitsWithoutTraits,
    images: { total: rows.length, missing: missingImages },
  };
}

function tally(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

/* -------------------------------------------------------------------------- */
/* Postgres                                                                   */
/* -------------------------------------------------------------------------- */

const CHUNK = 500;

/** Upsert everything for one set, then prune rows the payload no longer has. */
export async function writeCatalogue(catalogue: Catalogue): Promise<LoadReport["stale"]> {
  const sql = db();
  const stale = { units: 0, traits: 0, items: 0, augments: 0 };

  await sql.begin(async (tx) => {
    for (const chunk of chunks(catalogue.units, CHUNK)) {
      await tx`
        INSERT INTO units ${tx(chunk, "unit_id", "set_number", "name", "cost", "traits", "image_url")}
        ON CONFLICT (unit_id) DO UPDATE SET
          set_number = excluded.set_number,
          name = excluded.name,
          cost = excluded.cost,
          traits = excluded.traits,
          image_url = excluded.image_url
      `;
    }
    stale.units = await prune(
      tx,
      "units",
      "unit_id",
      catalogue.setNumber,
      catalogue.units.map((row) => row.unit_id),
    );

    for (const chunk of chunks(catalogue.traits, CHUNK)) {
      await tx`
        INSERT INTO traits ${tx(chunk, "trait_id", "set_number", "name", "breakpoints", "image_url")}
        ON CONFLICT (trait_id) DO UPDATE SET
          set_number = excluded.set_number,
          name = excluded.name,
          breakpoints = excluded.breakpoints,
          image_url = excluded.image_url
      `;
    }
    stale.traits = await prune(
      tx,
      "traits",
      "trait_id",
      catalogue.setNumber,
      catalogue.traits.map((row) => row.trait_id),
    );

    for (const chunk of chunks(catalogue.items, CHUNK)) {
      // Item ids are global (TFT_Item_InfinityEdge is in every set), so a shared
      // item keeps the set_number of the load that touched it last.
      await tx`
        INSERT INTO items ${tx(chunk, "item_id", "set_number", "name", "kind", "image_url")}
        ON CONFLICT (item_id) DO UPDATE SET
          set_number = excluded.set_number,
          name = excluded.name,
          kind = excluded.kind,
          image_url = excluded.image_url
      `;
    }
    stale.items = await prune(
      tx,
      "items",
      "item_id",
      catalogue.setNumber,
      catalogue.items.map((row) => row.item_id),
    );

    for (const chunk of chunks(catalogue.augments, CHUNK)) {
      await tx`
        INSERT INTO augments ${tx(chunk, "augment_id", "set_number", "name", "tier", "image_url")}
        ON CONFLICT (augment_id) DO UPDATE SET
          set_number = excluded.set_number,
          name = excluded.name,
          tier = excluded.tier,
          image_url = excluded.image_url
      `;
    }
    stale.augments = await prune(
      tx,
      "augments",
      "augment_id",
      catalogue.setNumber,
      catalogue.augments.map((row) => row.augment_id),
    );
  });

  return stale;
}

function chunks<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < rows.length; index += size) out.push(rows.slice(index, index + size));
  return out;
}

type Tx = TransactionSql<Record<string, unknown>>;

/** Delete rows of this set that the payload no longer lists. */
async function prune(
  tx: Tx,
  table: string,
  idColumn: string,
  setNumber: number,
  keep: string[],
): Promise<number> {
  if (keep.length === 0) return 0;
  const result = await tx.unsafe(
    `DELETE FROM ${table} WHERE set_number = $1 AND NOT (${idColumn} = ANY($2::text[]))`,
    [setNumber, keep],
  );
  return result.count;
}

/**
 * How much of the crawled data this catalogue can name.
 *
 * Scoped to the loaded set, because that is the question an operator has:
 * "the new set just launched — do the ids I am crawling resolve?" A stub or
 * pre-release corpus shows up here as 0 resolved, which is the honest answer.
 */
export async function measureCoverage(setNumber: number): Promise<Coverage | null> {
  const sql = db();

  const boards = await sql<{ boards: number }[]>`
    SELECT count(*)::int AS boards FROM matches WHERE set_number = ${setNumber}
  `;
  const boardCount = boards[0]?.boards ?? 0;
  if (boardCount === 0) return null;

  const units = await sql<{ id: string; known: boolean }[]>`
    SELECT DISTINCT u.unit_id AS id, (c.unit_id IS NOT NULL) AS known
    FROM participant_units u
    JOIN matches m ON m.match_id = u.match_id
    LEFT JOIN units c ON c.unit_id = u.unit_id
    WHERE m.set_number = ${setNumber}
  `;

  const traits = await sql<{ id: string; known: boolean }[]>`
    SELECT DISTINCT t.trait_id AS id, (c.trait_id IS NOT NULL) AS known
    FROM participant_traits t
    JOIN matches m ON m.match_id = t.match_id
    LEFT JOIN traits c ON c.trait_id = t.trait_id
    WHERE m.set_number = ${setNumber}
  `;

  const items = await sql<{ id: string; known: boolean }[]>`
    SELECT DISTINCT s.item_id AS id, (c.item_id IS NOT NULL) AS known
    FROM (
      SELECT unnest(ARRAY[item_0, item_1, item_2]) AS item_id
      FROM participant_units u
      JOIN matches m ON m.match_id = u.match_id
      WHERE m.set_number = ${setNumber}
    ) s
    LEFT JOIN items c ON c.item_id = s.item_id
    WHERE s.item_id IS NOT NULL
  `;

  return {
    setNumber,
    boards: boardCount,
    groups: [
      group("units", units),
      group("traits", traits),
      group("items", items),
    ],
  };
}

function group(label: string, rows: { id: string; known: boolean }[]): CoverageGroup {
  const missing = rows
    .filter((row) => !row.known)
    .map((row) => row.id)
    .sort();
  return {
    label,
    ids: rows.length,
    resolved: rows.length - missing.length,
    // Enough to recognise the class of id without drowning the report.
    missing: missing.slice(0, 8),
  };
}

/* -------------------------------------------------------------------------- */
/* Job                                                                        */
/* -------------------------------------------------------------------------- */

export async function loadAssets(
  options: { setNumber?: number; mutator?: string; source?: string } = {},
): Promise<LoadReport> {
  log.info("fetching catalogue", { source: options.source ?? "CDRAGON_URL" });
  const fetched = await fetchCatalogue({ url: options.source });
  log.info("catalogue downloaded", { bytes: fetched.bytes });

  const catalogue = buildCatalogue(fetched.payload, {
    setNumber: options.setNumber,
    mutator: options.mutator,
  });
  log.info("set selected", {
    set: catalogue.setNumber,
    mutator: catalogue.mutator,
    units: catalogue.units.length,
    traits: catalogue.traits.length,
    items: catalogue.items.length,
    augments: catalogue.augments.length,
  });

  const stale = await writeCatalogue(catalogue);
  const coverage = await measureCoverage(catalogue.setNumber);

  return { ...catalogue, source: fetched.url, bytes: fetched.bytes, stale, coverage };
}

/** Human-readable load report. Counts first: they are what an operator checks. */
export function formatAssetReport(report: LoadReport): string {
  const lines: string[] = [];
  const set = `set ${report.setNumber}`;

  lines.push(`source    ${report.source}`);
  lines.push(`          ${(report.bytes / 1_048_576).toFixed(1)} MiB · mutator ${report.mutator}`);
  lines.push("");
  lines.push(`units     ${report.units.length}${report.unitsWithoutTraits > 0 ? `  (${report.unitsWithoutTraits} traitless summons kept)` : ""}`);
  lines.push(`traits    ${report.traits.length}`);
  lines.push(`items     ${report.items.length}  ${describe(report.itemKinds)}`);
  lines.push(`augments  ${report.augments.length}  ${describe(report.augmentTiers)}`);
  lines.push(
    `images    ${report.images.total - report.images.missing}/${report.images.total} rows have a URL` +
      (report.images.missing > 0 ? `  (${report.images.missing} missing in payload)` : ""),
  );

  const pruned = Object.entries(report.stale)
    .filter(([, count]) => count > 0)
    .map(([table, count]) => `${table} ${count}`);
  lines.push(`pruned    ${pruned.length > 0 ? pruned.join(", ") : "nothing stale"}`);

  if (
    report.skipped.items.length > 0 ||
    report.skipped.augments.length > 0 ||
    report.skipped.unmatchedTraits.length > 0 ||
    report.skipped.duplicateIds.length > 0
  ) {
    lines.push("");
    lines.push("skipped");
    if (report.skipped.items.length > 0) {
      lines.push(`  items      ${report.skipped.items.length}: ${list(report.skipped.items)}`);
    }
    if (report.skipped.augments.length > 0) {
      lines.push(`  augments   ${report.skipped.augments.length}: ${list(report.skipped.augments)}`);
    }
    if (report.skipped.unmatchedTraits.length > 0) {
      lines.push(
        `  traits     champion trait names with no trait entry: ${list(report.skipped.unmatchedTraits)}`,
      );
    }
    if (report.skipped.duplicateIds.length > 0) {
      lines.push(
        `  ids        listed twice in the payload, first row kept: ${list(report.skipped.duplicateIds.slice(0, 8))}`,
      );
    }
  }

  lines.push("");
  if (report.coverage === null) {
    lines.push(`coverage  no crawled ${set} matches yet — nothing to resolve`);
    return lines.join("\n");
  }

  lines.push(
    `coverage  ${set} · ${report.coverage.boards} boards crawled`,
  );
  for (const entry of report.coverage.groups) {
    const pct = entry.ids === 0 ? 0 : Math.round((entry.resolved / entry.ids) * 1000) / 10;
    lines.push(
      `  ${entry.label.padEnd(7)} ${String(entry.resolved).padStart(4)}/${String(entry.ids).padEnd(4)} ids resolved (${pct}%)`,
    );
    if (entry.missing.length > 0) {
      lines.push(`          unresolved: ${list(entry.missing)}`);
    }
  }

  return lines.join("\n");
}

function describe(counts: Record<string, number>): string {
  const parts = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([key, n]) => `${key} ${n}`);
  return parts.length > 0 ? `(${parts.join(", ")})` : "";
}

function list(values: string[]): string {
  return values.join(", ");
}
