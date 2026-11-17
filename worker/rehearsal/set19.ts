// First import on purpose: it populates process.env before ./config reads it.
import "../load-env";

import { aggregate } from "../aggregate";
import { assignBoard, type CompSignature } from "../assign";
import { closeDb, db } from "../db";
import { resolveComps } from "./resolve";
import { set19RehearsalComps } from "./set19-comps";

/**
 * Set rollover rehearsal.
 *
 * Run against a scratch database only: it writes rehearsal comps into `comps`
 * (published, so aggregation will use them) and then asks `aggregate` to
 * classify whatever boards that database holds. The database name must contain
 * "rehearsal" unless `--force` is passed, because the one way this job can do
 * harm is being pointed at production.
 *
 * What it proves:
 *   1. every champion and trait the drafted comps name exists in the loaded set;
 *   2. the comps can be written and read back by the aggregator;
 *   3. every comp's own five-unit board classifies to that comp, and no two
 *      shells collide on their own board (a collision here is a comp definition
 *      bug, not a data problem).
 *
 * What it cannot prove before launch: the real unclassified rate, because there
 * are no Set 19 boards yet. The report says so instead of printing 0/0 as a
 * result; the rate is measured from crawled boards on launch morning.
 */

const setNumber = Number(process.env.REHEARSAL_SET ?? 19);
const forced = process.argv.includes("--force");
const url = process.env.DATABASE_URL ?? "";

if (!url) {
  throw new Error("DATABASE_URL is not set. Point it at the scratch rehearsal database.");
}
if (!forced && !url.toLowerCase().includes("rehearsal")) {
  throw new Error(
    "Refusing to write rehearsal comps to a database whose name does not contain " +
      `"rehearsal" (${url}). Pass --force only if this really is a scratch database.`,
  );
}

async function main(): Promise<void> {
  const sql = db();

  const units = await sql<{ id: string; name: string }[]>`
    SELECT unit_id AS id, name FROM units WHERE set_number = ${setNumber}
  `;
  if (units.length === 0) {
    throw new Error(
      `the catalogue has no units for set ${setNumber}. Load it first: ` +
        `CDRAGON_URL=https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json ` +
        `npm run crawl -- load-assets --set ${setNumber}`,
    );
  }
  const traits = await sql<{ id: string; name: string }[]>`
    SELECT trait_id AS id, name FROM traits WHERE set_number = ${setNumber}
  `;

  const { resolved, missing, duplicateSlugs } = resolveComps(
    set19RehearsalComps,
    units,
    traits,
  );

  if (duplicateSlugs.length > 0) {
    throw new Error(`duplicate rehearsal comp slugs: ${duplicateSlugs.join(", ")}`);
  }
  if (missing.length > 0) {
    console.error("");
    console.error(`[rehearsal] set ${setNumber}: ${missing.length} unresolved name(s)`);
    for (const line of missing) console.error(`  - ${line}`);
    console.error("");
    console.error("Fix the comp draft or the name in the catalogue before seeding anything.");
    process.exitCode = 1;
    return;
  }

  console.log(
    `[rehearsal] set ${setNumber}: ${resolved.length} comps, ${units.length} units, ` +
      `${traits.length} traits resolved`,
  );

  for (const comp of resolved) {
    await sql`
      INSERT INTO comps (
        set_number, slug, name, tier, core_units, flex_units, defining_trait,
        difficulty, playstyle, summary, leveling,
        notes_why_now, notes_how_to_play, notes_mistakes, published, updated_at
      ) VALUES (
        ${setNumber}, ${comp.slug}, ${comp.name}, 'B', ${comp.coreIds}, ${[]},
        ${comp.traitId}, 'Rehearsal', 'Rehearsal fixture',
        ${comp.why}, 'Rehearsal fixture — not editorial content.',
        'Rehearsal fixture — not editorial content.',
        'Rehearsal fixture — not editorial content.',
        'Rehearsal fixture — not editorial content.', true, now()
      )
      ON CONFLICT (slug) DO UPDATE SET
        set_number = excluded.set_number,
        name = excluded.name,
        core_units = excluded.core_units,
        flex_units = excluded.flex_units,
        defining_trait = excluded.defining_trait,
        summary = excluded.summary,
        published = excluded.published,
        updated_at = excluded.updated_at
    `;
  }

  const summary = await aggregate({ set: setNumber });
  console.log("");
  console.log(`[rehearsal] aggregate: ${summary.rowsWritten} comp_stats rows`);
  if (summary.scopes.length === 0) {
    console.log(
      `[rehearsal] no crawled set ${setNumber} boards in this database — ` +
        "the real unclassified rate is not measurable yet.",
    );
  } else {
    for (const scope of summary.scopes) {
      const share =
        scope.boards === 0 ? 0 : Math.round((scope.unclassified / scope.boards) * 1000) / 10;
      console.log(
        `  ${scope.patch} ${scope.region.padEnd(4)} boards=${scope.boards} ` +
          `classified=${scope.classified} unclassified=${scope.unclassified} (${share}%)`,
      );
    }
  }

  // Every comp's own board must classify to itself. Two shells sharing enough
  // units for one to claim the other is a comp-definition bug that would show up
  // as an inflated shared pick rate rather than as an error.
  const signatures: CompSignature[] = resolved.map((comp) => ({
    compId: comp.slug,
    slug: comp.slug,
    setName: setNumber,
    coreUnits: comp.coreIds,
    definingTrait: comp.traitId,
  }));

  const collisions: string[] = [];
  for (const comp of resolved) {
    const assignment = assignBoard(
      {
        units: comp.coreIds,
        traits: comp.traitId === null ? [] : [comp.traitId],
        placement: 4,
      },
      signatures,
      0.6,
    );
    if (assignment.compId !== comp.slug) {
      collisions.push(
        `${comp.slug} classified as ${assignment.compId ?? assignment.reason}`,
      );
    }
  }

  console.log("");
  if (collisions.length === 0) {
    console.log(
      `[rehearsal] synthetic check: ${resolved.length}/${resolved.length} comps claim their own board`,
    );
  } else {
    console.error(`[rehearsal] synthetic check failed (${collisions.length}):`);
    for (const line of collisions) console.error(`  - ${line}`);
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      `[rehearsal] ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
