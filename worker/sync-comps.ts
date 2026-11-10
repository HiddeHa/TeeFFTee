import { comps } from "../src/content/comps";

import { db } from "./db";
import { createLogger } from "./log";

const log = createLogger("sync-comps");

export type SyncResult = { synced: number; items: number; orphans: string[] };

/**
 * Push the curated comps from src/content/comps.ts into Postgres.
 *
 * The content file stays the source of truth for editorial work — it is typed,
 * reviewed in git, and readable without a database. This job turns it into rows
 * so `comp_stats` has something to hang off, and so aggregates survive a content
 * edit that does not touch the DB by hand.
 *
 * Idempotent: comps upsert on slug, and their item rows are replaced wholesale.
 */
export async function syncComps(): Promise<SyncResult> {
  const sql = db();
  let items = 0;

  for (const comp of comps) {
    await sql.begin(async (tx) => {
      const rows = await tx<{ comp_id: string }[]>`
        INSERT INTO comps (
          set_number, slug, name, tier, core_units, flex_units, defining_trait,
          difficulty, playstyle, summary, leveling,
          notes_why_now, notes_how_to_play, notes_mistakes, published, updated_at
        ) VALUES (
          ${comp.setNumber}, ${comp.slug}, ${comp.name}, ${comp.tier},
          ${comp.coreUnits}, ${comp.flexUnits}, ${comp.definingTrait ?? null},
          ${comp.difficulty}, ${comp.playstyle}, ${comp.summary}, ${comp.leveling},
          ${comp.notes.whyNow}, ${comp.notes.howToPlay}, ${comp.notes.mistakes},
          ${comp.published}, ${new Date(comp.updatedAt)}
        )
        ON CONFLICT (slug) DO UPDATE SET
          set_number = excluded.set_number,
          name = excluded.name,
          tier = excluded.tier,
          core_units = excluded.core_units,
          flex_units = excluded.flex_units,
          defining_trait = excluded.defining_trait,
          difficulty = excluded.difficulty,
          playstyle = excluded.playstyle,
          summary = excluded.summary,
          leveling = excluded.leveling,
          notes_why_now = excluded.notes_why_now,
          notes_how_to_play = excluded.notes_how_to_play,
          notes_mistakes = excluded.notes_mistakes,
          published = excluded.published,
          updated_at = excluded.updated_at
        RETURNING comp_id
      `;

      const compId = rows[0]?.comp_id;
      if (!compId) throw new Error(`could not upsert comp ${comp.slug}`);

      await tx`DELETE FROM comp_items WHERE comp_id = ${compId}`;

      const itemRows = comp.board
        .map((unit, index) => ({
          comp_id: compId,
          unit_id: unit.id,
          item_ids: unit.items,
          priority: index,
          star_level: unit.star,
        }))
        .filter((row) => row.item_ids.length > 0);

      if (itemRows.length > 0) {
        await tx`
          INSERT INTO comp_items ${tx(itemRows, "comp_id", "unit_id", "item_ids", "priority", "star_level")}
        `;
        items += itemRows.length;
      }
    });
  }

  // A comp removed from content would otherwise keep its published row and keep
  // collecting stats. Surface it instead of deleting editorial work silently.
  const dbSlugs = await sql<{ slug: string }[]>`SELECT slug FROM comps`;
  const contentSlugs = new Set(comps.map((comp) => comp.slug));
  const orphans = dbSlugs.map((row) => row.slug).filter((slug) => !contentSlugs.has(slug));

  if (orphans.length > 0) {
    log.warn("comps in the database with no content entry (still published)", { orphans });
  }

  return { synced: comps.length, items, orphans };
}
