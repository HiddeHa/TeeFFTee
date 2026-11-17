/**
 * Custom tier lists — the shape, and the one place that reads and validates
 * what a browser hands back from storage.
 *
 * These lists belong to the visitor, not to the site's data: there is no account
 * system and no per-user database, so they live in `localStorage` and never leave
 * the browser. The parsing here is deliberately strict — stored JSON is user-editable
 * and may be from an older version — and a malformed entry is dropped rather than
 * rendered as a broken row.
 */

/** Best to worst. D exists because five rows is what a real tier list looks like. */
export const TIER_ROWS = ["S", "A", "B", "C", "D"] as const;
export type TierRow = (typeof TIER_ROWS)[number];

export const TIER_LIST_KINDS = ["augments", "units", "items"] as const;
export type TierListKind = (typeof TIER_LIST_KINDS)[number];

export const KIND_LABELS: Record<TierListKind, string> = {
  augments: "Augments",
  units: "Units",
  items: "Items",
};

/** One card in the pool: a catalogue row reduced to what a tier list needs. */
export type CatalogueOption = {
  /** Riot id — what gets stored, so a renamed display name does not orphan a card. */
  id: string;
  name: string;
  imageUrl: string | null;
  /** Cost for units, rarity for augments, kind for items — shown on the card and used as a filter facet. */
  meta: string | null;
  /** Border colour for the tile, chosen per kind by the page (cost, rarity, item kind). */
  tone: string;
};

export type CustomTierList = {
  id: string;
  name: string;
  kind: TierListKind;
  rows: Record<TierRow, string[]>;
  createdAt: string;
  updatedAt: string;
};

export const STORAGE_KEY = "teeftee.custom-tier-lists.v2";

export function emptyRows(): Record<TierRow, string[]> {
  return { S: [], A: [], B: [], C: [], D: [] };
}

export function countPlaced(list: CustomTierList): number {
  return TIER_ROWS.reduce((total, row) => total + list.rows[row].length, 0);
}

function parseDate(value: unknown): string {
  if (typeof value === "string" && !Number.isNaN(new Date(value).getTime())) return value;
  return new Date(0).toISOString();
}

/**
 * Parse whatever is in storage into usable lists.
 *
 * Anything that does not match the shape is dropped; ids stay as saved strings,
 * including ids the current set's catalogue no longer lists. Those are hidden by
 * the editor and counted, so a stale id is visible rather than silently lost.
 */
export function parseStoredLists(raw: string | null): CustomTierList[] {
  if (!raw) return [];

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];

  const lists: CustomTierList[] = [];
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const candidate = entry as Record<string, unknown>;

    const id = candidate.id;
    const name = candidate.name;
    const kind = candidate.kind;
    if (typeof id !== "string" || typeof name !== "string") continue;
    if (typeof kind !== "string") continue;
    if (!(TIER_LIST_KINDS as readonly string[]).includes(kind)) continue;

    const rawRows = candidate.rows;
    if (!rawRows || typeof rawRows !== "object") continue;

    const rows = emptyRows();
    for (const row of TIER_ROWS) {
      const ids = (rawRows as Record<string, unknown>)[row];
      if (!Array.isArray(ids)) continue;
      rows[row] = [
        ...new Set(ids.filter((value): value is string => typeof value === "string")),
      ];
    }

    lists.push({
      id,
      name,
      kind: kind as TierListKind,
      rows,
      createdAt: parseDate(candidate.createdAt),
      updatedAt: parseDate(candidate.updatedAt),
    });
  }

  return lists;
}
