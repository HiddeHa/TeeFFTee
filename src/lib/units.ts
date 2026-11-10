import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { units } from "@/db/schema";

/**
 * Read-side of the static game data.
 *
 * The crawler stores Riot's unit ids verbatim on every board. This turns them
 * into something renderable — name, cost, icon — from the `units` table that
 * `load-assets` fills from Community Dragon.
 *
 * It is a *separate* seam from `stats-source.ts` on purpose: stats fall back to
 * the curated content snapshot when Postgres is unreachable (numbers have a
 * meaning without a database), while unit identity has no content fallback —
 * inventing one is exactly what this replaces.
 */

export type CatalogueUnit = {
  name: string;
  /** 0 is a summons (Training Dummy, Voidspawn). */
  cost: number;
  imageUrl: string | null;
};

export type UnitIndex = Map<string, CatalogueUnit>;

let warnedAboutDatabase = false;

/**
 * Null means "no catalogue available" — no DATABASE_URL, or Postgres did not
 * answer. An empty Map means the database answered and nobody has loaded this
 * set yet, which is a different message and must not be hidden: it renders as
 * every slot being unresolved rather than as an outage.
 */
export async function loadUnitCatalogue(setNumber: number): Promise<UnitIndex | null> {
  if (!process.env.DATABASE_URL) return null;

  let db: ReturnType<typeof getDb>;
  try {
    db = getDb();
  } catch {
    return null;
  }

  try {
    const rows = await db
      .select({
        unitId: units.unitId,
        name: units.name,
        cost: units.cost,
        imageUrl: units.imageUrl,
      })
      .from(units)
      .where(eq(units.setNumber, setNumber));

    const index: UnitIndex = new Map();
    for (const row of rows) {
      index.set(row.unitId, {
        name: row.name,
        cost: row.cost,
        imageUrl: row.imageUrl,
      });
    }
    return index;
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[units] Postgres unavailable, boards will show raw unit ids: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return null;
  }
}
