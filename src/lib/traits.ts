import { eq } from "drizzle-orm";

import catalogue from "@/content/catalogue.json";
import { getDb } from "@/db/client";
import { traits } from "@/db/schema";

/**
 * Read-side of the trait catalogue.
 *
 * Same two sources and the same rule as `units.ts` and `items.ts`: the `traits`
 * table when Postgres is reachable, the committed snapshot otherwise. A trait a
 * source does not know resolves to `null` and the UI says so — it never invents a
 * breakpoint, which would turn "not loaded" into a made-up activation count.
 *
 * Breakpoints are Riot's `minUnits` values, ascending; a trait with an empty list
 * (unique traits, some set mechanics) activates from its first unit and says so by
 * carrying no thresholds.
 */

export type CatalogueTrait = {
  name: string;
  /** Activation counts, ascending — e.g. [2, 3, 4]. */
  breakpoints: number[];
  imageUrl: string | null;
};

export type TraitIndex = Map<string, CatalogueTrait>;

type SnapshotTrait = {
  id: string;
  name: string;
  breakpoints: number[];
  imageUrl: string | null;
};

type CatalogueFile = {
  generatedAt: string;
  source: string;
  traits?: Record<string, SnapshotTrait[]>;
};

/** Generated data, not hand-written — the cast is a promise about the exporter. */
const SNAPSHOT = catalogue as unknown as CatalogueFile;

let warnedAboutDatabase = false;

function snapshotIndex(setNumber: number): TraitIndex | null {
  const rows = SNAPSHOT.traits?.[String(setNumber)];
  if (!rows || rows.length === 0) return null;

  const index: TraitIndex = new Map();
  for (const row of rows) {
    index.set(row.id, {
      name: row.name,
      breakpoints: row.breakpoints ?? [],
      imageUrl: row.imageUrl,
    });
  }
  return index;
}

/** Null means "no trait catalogue available" — unresolved, not empty. */
export async function loadTraitCatalogue(setNumber: number): Promise<TraitIndex | null> {
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
        traitId: traits.traitId,
        name: traits.name,
        breakpoints: traits.breakpoints,
        imageUrl: traits.imageUrl,
      })
      .from(traits)
      .where(eq(traits.setNumber, setNumber));

    const index: TraitIndex = new Map();
    for (const row of rows) {
      index.set(row.traitId, {
        name: row.name,
        breakpoints: row.breakpoints ?? [],
        imageUrl: row.imageUrl,
      });
    }
    return index;
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[traits] Postgres unavailable, serving the committed catalogue snapshot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return snapshotIndex(setNumber);
  }
}
