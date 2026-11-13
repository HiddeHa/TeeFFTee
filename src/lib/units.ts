import { eq } from "drizzle-orm";

import catalogue from "@/content/catalogue.json";
import { getDb } from "@/db/client";
import { units } from "@/db/schema";

/**
 * Read-side of the static game data.
 *
 * The crawler stores Riot's unit ids verbatim on every board. This turns them
 * into something renderable — name, cost, icon — from two sources, in order:
 *
 *  1. the `units` table that `load-assets` fills from Community Dragon;
 *  2. `src/content/catalogue.json`, a committed snapshot of those same rows,
 *     written by `npm run catalogue:export` (scripts/export-catalogue.ts).
 *     It exists because the deployed Worker has no Postgres: without it every
 *     board slot renders a raw Riot id on the page a reviewer looks at first.
 *
 * The snapshot is a copy of database rows, never authored content: a set it does
 * not contain, or an id it does not know, renders as unresolved. That is what
 * makes it safe — a stale snapshot looks stale, it cannot invent a champion.
 * Stats have a *content* fallback; identity has a *snapshot* fallback. Neither
 * may pass something made up off as measured.
 */

export type CatalogueUnit = {
  name: string;
  /** 0 is a summons (Training Dummy, Voidspawn). */
  cost: number;
  imageUrl: string | null;
  /**
   * Riot trait ids, e.g. `DA_18_Elderwood` — resolved by `./traits.ts` into names
   * and breakpoints. Empty for summons and units with no trait.
   */
  traits: string[];
};

export type UnitIndex = Map<string, CatalogueUnit>;

type SnapshotUnit = {
  id: string;
  name: string;
  cost: number;
  imageUrl: string | null;
  /** Absent in snapshots exported before units carried their traits. */
  traits?: string[];
};

type CatalogueFile = {
  generatedAt: string;
  source: string;
  sets: Record<string, SnapshotUnit[]>;
};

/**
 * Generated data, not hand-written, so the cast is a promise about the
 * generator's output rather than a shortcut around types we control here.
 */
const SNAPSHOT = catalogue as unknown as CatalogueFile;

let warnedAboutDatabase = false;

/**
 * The bundled catalogue for one set.
 *
 * Null means the snapshot does not cover that set — an honest answer for a set
 * whose assets were never exported, which renders exactly as it would with no
 * catalogue at all rather than as a set whose units have all vanished.
 */
function snapshotIndex(setNumber: number): UnitIndex | null {
  const rows = SNAPSHOT.sets[String(setNumber)];
  if (!rows || rows.length === 0) return null;

  const index: UnitIndex = new Map();
  for (const row of rows) {
    index.set(row.id, {
      name: row.name,
      cost: row.cost,
      imageUrl: row.imageUrl,
      traits: row.traits ?? [],
    });
  }
  return index;
}

/**
 * Null means "no catalogue available" — no DATABASE_URL and no snapshot for the
 * set, or Postgres did not answer and no snapshot exists either. An empty Map
 * means a source answered and nobody has loaded this set yet, which is a
 * different message and must not be hidden: it renders as every slot being
 * unresolved rather than as an outage.
 */
export async function loadUnitCatalogue(setNumber: number): Promise<UnitIndex | null> {
  if (!process.env.DATABASE_URL) return snapshotIndex(setNumber);

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return snapshotIndex(setNumber);
  }

  try {
    const rows = await db
      .select({
        unitId: units.unitId,
        name: units.name,
        cost: units.cost,
        imageUrl: units.imageUrl,
        traits: units.traits,
      })
      .from(units)
      .where(eq(units.setNumber, setNumber));

    const index: UnitIndex = new Map();
    for (const row of rows) {
      index.set(row.unitId, {
        name: row.name,
        cost: row.cost,
        imageUrl: row.imageUrl,
        traits: row.traits ?? [],
      });
    }
    return index;
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[units] Postgres unavailable, serving the committed catalogue snapshot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return snapshotIndex(setNumber);
  }
}
