import { eq } from "drizzle-orm";

import catalogue from "@/content/catalogue.json";
import { getDb } from "@/db/client";
import { items } from "@/db/schema";

/**
 * Read-side of the item catalogue.
 *
 * Same two sources, same rules as `units.ts`: the `items` table when Postgres is
 * reachable, the committed snapshot otherwise. The snapshot exists for the
 * deployed Worker, which has no database — without it every comp renders item
 * *names as text* and no icons at all, which is the gap this closes.
 *
 * The important property is the same one units have: an id the catalogue does not
 * know resolves to `null`, and the UI says so. It never invents a name.
 */

export type CatalogueItem = {
  name: string;
  /** craftable | component | completed | emblem | special — from Community Dragon. */
  kind: string;
  imageUrl: string | null;
};

export type ItemIndex = Map<string, CatalogueItem>;

type SnapshotItem = {
  id: string;
  name: string;
  kind: string;
  imageUrl: string | null;
};

type CatalogueFile = {
  generatedAt: string;
  source: string;
  items?: Record<string, SnapshotItem[]>;
};

/**
 * Generated data, not hand-written, so this cast is a promise about the
 * generator's output rather than a way around types we control.
 */
const SNAPSHOT = catalogue as unknown as CatalogueFile;

let warnedAboutDatabase = false;

function snapshotIndex(setNumber: number): ItemIndex | null {
  const rows = SNAPSHOT.items?.[String(setNumber)];
  if (!rows || rows.length === 0) return null;

  const index: ItemIndex = new Map();
  for (const row of rows) {
    index.set(row.id, { name: row.name, kind: row.kind, imageUrl: row.imageUrl });
  }
  return index;
}

/** Null means "no item catalogue available" — which renders unresolved, not blank. */
export async function loadItemCatalogue(setNumber: number): Promise<ItemIndex | null> {
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
        itemId: items.itemId,
        name: items.name,
        kind: items.kind,
        imageUrl: items.imageUrl,
      })
      .from(items)
      .where(eq(items.setNumber, setNumber));

    const index: ItemIndex = new Map();
    for (const row of rows) {
      index.set(row.itemId, { name: row.name, kind: row.kind, imageUrl: row.imageUrl });
    }
    return index;
  } catch (error) {
    if (!warnedAboutDatabase) {
      warnedAboutDatabase = true;
      console.warn(
        `[items] Postgres unavailable, serving the committed catalogue snapshot: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return snapshotIndex(setNumber);
  }
}
