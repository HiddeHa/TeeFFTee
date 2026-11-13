import { eq } from "drizzle-orm";

import catalogue from "@/content/catalogue.json";
import { getDb } from "@/db/client";
import { augments } from "@/db/schema";

/**
 * Read-side of the augment catalogue.
 *
 * Same two sources, same rules as `units.ts` and `items.ts`: the `augments` table
 * when Postgres is reachable, the committed snapshot otherwise. Augment rarity
 * comes from the loader in `worker/assets.ts`, which infers it from the icon and
 * the rarity tag — it is the only place that knows a tier, so it is copied here
 * rather than guessed again.
 */

export type CatalogueAugment = {
  name: string;
  /** Prismatic | Gold | Silver — as loaded from Community Dragon. */
  tier: string;
  imageUrl: string | null;
};

export type AugmentIndex = Map<string, CatalogueAugment>;

type SnapshotAugment = {
  id: string;
  name: string;
  tier: string;
  imageUrl: string | null;
};

type CatalogueFile = {
  generatedAt: string;
  source: string;
  augments?: Record<string, SnapshotAugment[]>;
};

/**
 * Generated data, not hand-written, so this cast is a promise about the
 * generator's output rather than a way around types we control.
 */
const SNAPSHOT = catalogue as unknown as CatalogueFile;

let warnedAboutDatabase = false;

function snapshotIndex(setNumber: number): AugmentIndex | null {
  const rows = SNAPSHOT.augments?.[String(setNumber)];
  if (!rows || rows.length === 0) return null;

  const index: AugmentIndex = new Map();
  for (const row of rows) {
    index.set(row.id, { name: row.name, tier: row.tier, imageUrl: row.imageUrl });
  }
  return index;
}

/** Null means "no augment catalogue available" — which renders as an empty pool, not as data. */
export async function loadAugmentCatalogue(setNumber: number): Promise<AugmentIndex | null> {
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
        augmentId: augments.augmentId,
        name: augments.name,
        tier: augments.tier,
        imageUrl: augments.imageUrl,
      })
      .from(augments)
      .where(eq(augments.setNumber, setNumber));

    const index: AugmentIndex = new Map();
    for (const row of rows) {
      index.set(row.augmentId, {
        name: row.name,
        tier: row.tier,
        imageUrl: row.imageUrl,
      });
    }
    return index;
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[augments] Postgres unavailable, serving the committed catalogue snapshot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return snapshotIndex(setNumber);
  }
}
