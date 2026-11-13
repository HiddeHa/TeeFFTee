/**
 * Export the loaded set catalogue into src/content/catalogue.json.
 *
 * Why this exists (docs/decisions.md D1, plan.md S2): the deployed site runs on
 * Workers with no Postgres, and `src/lib/units.ts` deliberately has no made-up
 * fallback — so without a snapshot every board slot renders a raw Riot id. The
 * snapshot is the honest stand-in: the same rows `load-assets` wrote, keyed by
 * set, so a board still resolves to a real champion.
 *
 *   npm run catalogue:export            # every set present in `units`
 *   npm run catalogue:export -- 19      # one set, others preserved
 *
 * Merge semantics: sets not named on the command line are kept, so exporting set
 * 19 does not delete set 18 from the site's snapshot. A new set is this command,
 * not a code change.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import "../worker/load-env";

import { closeDb, db } from "../worker/db";

type CatalogueUnit = {
  id: string;
  name: string;
  /** 0 is a summons (Training Dummy); costs come from Community Dragon verbatim. */
  cost: number;
  imageUrl: string | null;
  /** Trait ids the unit belongs to, so a board can count breakpoints. */
  traits: string[];
};

type CatalogueItem = {
  id: string;
  name: string;
  kind: string;
  imageUrl: string | null;
};

type CatalogueTrait = {
  id: string;
  name: string;
  breakpoints: number[];
  imageUrl: string | null;
};

type CatalogueAugment = {
  id: string;
  name: string;
  tier: string;
  imageUrl: string | null;
};

type CatalogueFile = {
  /** Stamped so a stale snapshot is visible, not guessed at. */
  generatedAt: string;
  source: string;
  /** Units keep their original key so `src/lib/units.ts` needs no migration. */
  sets: Record<string, CatalogueUnit[]>;
  /** Added for the redesign plan R1: items, traits and augments, keyed by set. */
  items?: Record<string, CatalogueItem[]>;
  traits?: Record<string, CatalogueTrait[]>;
  augments?: Record<string, CatalogueAugment[]>;
};

const OUT = path.join("src", "content", "catalogue.json");

async function readExisting(): Promise<CatalogueFile> {
  try {
    const raw = await readFile(OUT, "utf8");
    const parsed = JSON.parse(raw) as CatalogueFile;
    if (parsed && typeof parsed.sets === "object" && parsed.sets !== null) return parsed;
  } catch (error) {
    // Missing or unparseable: start clean rather than half-merge into a broken file.
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.warn(`[catalogue] ignoring unreadable ${OUT}: ${(error as Error).message}`);
    }
  }
  return { generatedAt: "", source: "", sets: {} };
}

async function main(): Promise<void> {
  const requested = process.argv
    .slice(2)
    .filter((arg) => /^\d+$/.test(arg))
    .map(Number);

  const sql = db();
  const existing = await readExisting();
  const next: CatalogueFile = {
    generatedAt: new Date().toISOString(),
    source: "units/items/traits/augments tables (Community Dragon via `npm run crawl -- load-assets`)",
    sets: { ...existing.sets },
    items: { ...(existing.items ?? {}) },
    traits: { ...(existing.traits ?? {}) },
    augments: { ...(existing.augments ?? {}) },
  };

  const setNumbers =
    requested.length > 0
      ? requested
      : (
          await sql<{ setNumber: number }[]>`
            SELECT DISTINCT set_number AS "setNumber" FROM units ORDER BY set_number
          `
        ).map((row) => row.setNumber);

  for (const setNumber of setNumbers) {
    const rows = await sql<CatalogueUnit[]>`
      SELECT unit_id AS "id", name, cost, image_url AS "imageUrl", traits
      FROM units
      WHERE set_number = ${setNumber}
      ORDER BY cost, name
    `;

    if (rows.length === 0) {
      // Do not keep an empty set: a stale empty list reads as "catalogue loaded and
      // empty", which is a different fact from "never loaded".
      delete next.sets[String(setNumber)];
      console.warn(`[catalogue] set ${setNumber}: no rows in \`units\`, omitted from the snapshot`);
      continue;
    }

    next.sets[String(setNumber)] = rows;
    const withImage = rows.filter((row) => row.imageUrl !== null).length;
    console.log(
      `[catalogue] set ${setNumber}: ${rows.length} units (${withImage} with an icon)`,
    );

    // Items, traits and augments travel in the same snapshot because the deployed
    // Worker has no Postgres and every one of them is icon-bearing on the comp
    // page. Each is pruned per set on export, so a renamed item cannot linger.
    const itemRows = await sql<CatalogueItem[]>`
      SELECT item_id AS "id", name, kind, image_url AS "imageUrl"
      FROM items
      WHERE set_number = ${setNumber}
      ORDER BY kind, name
    `;
    const traitRows = await sql<CatalogueTrait[]>`
      SELECT trait_id AS "id", name, breakpoints, image_url AS "imageUrl"
      FROM traits
      WHERE set_number = ${setNumber}
      ORDER BY name
    `;
    const augmentRows = await sql<CatalogueAugment[]>`
      SELECT augment_id AS "id", name, tier, image_url AS "imageUrl"
      FROM augments
      WHERE set_number = ${setNumber}
      ORDER BY tier, name
    `;

    if (itemRows.length > 0) next.items![String(setNumber)] = itemRows;
    if (traitRows.length > 0) next.traits![String(setNumber)] = traitRows;
    if (augmentRows.length > 0) next.augments![String(setNumber)] = augmentRows;

    console.log(
      `[catalogue] set ${setNumber}: ${itemRows.length} items, ${traitRows.length} traits, ` +
        `${augmentRows.length} augments`,
    );
  }

  if (Object.keys(next.sets).length === 0) {
    throw new Error("Nothing to write: `units` is empty. Run `npm run crawl -- load-assets` first.");
  }

  await writeFile(OUT, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  const kb = Math.round(Buffer.byteLength(JSON.stringify(next)) / 1024);
  console.log(
    `[catalogue] wrote ${OUT} — sets ${Object.keys(next.sets).sort().join(", ")} (${kb} KB)`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(`[catalogue] failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
