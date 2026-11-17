/**
 * Content integrity check for curated comps.
 *
 * The comp page now resolves units, items and board positions against the set
 * catalogue. When one of those ids is wrong the page still renders — it shows the
 * raw id — which is the right behaviour in production and a bad way to find out
 * you typo'd a champion. This script turns those mistakes into a non-zero exit
 * before they ship.
 *
 * It checks, for every published comp:
 *   - every board unit id exists in the catalogue
 *   - every board item id exists in the item catalogue
 *   - every itemPriority / positioning unit id is on that comp's board
 *   - positioning coordinates are inside the 4×7 half-board
 *   - two units do not occupy the same cell
 *   - stages cover exactly the four plan steps, once each
 *
 *   npm run check:content
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import { comps } from "../src/content/comps";
import {
  set19CostCurve,
  set19PrismaticTraits,
  set19Traits,
  set19UniqueTraits,
  set19Units,
  set19UnlockQuests,
  set19Unlocks,
} from "../src/content/set-19";
import { staleSetWarning } from "../src/lib/set-launch";
import { set19FactProblems } from "../src/lib/set19-invariants";

type CatalogueUnit = { id: string; name: string };
type CatalogueItem = { id: string; name: string };

type CatalogueFile = {
  sets: Record<string, CatalogueUnit[]>;
  items?: Record<string, CatalogueItem[]>;
};

const ROWS = 4;
const COLS = 7;
const STAGES = ["2", "3", "4", "5+"];

async function main(): Promise<void> {
  const raw = await readFile(path.join("src", "content", "catalogue.json"), "utf8");
  const catalogue = JSON.parse(raw) as CatalogueFile;

  const problems: string[] = [];
  const published = comps.filter((comp) => comp.published);

  // A set switch is a content edit, not a deploy step; catch a forgotten one here,
  // before it ships. `tests/set-launch.test.ts` pins the rule with a faked clock.
  const setSwitchWarning = staleSetWarning();
  if (setSwitchWarning) problems.push(setSwitchWarning);

  // Set 19 is transcribed from Riot's Dev Drop as read through a third-party
  // reveal, and every slip there renders as sourced fact. Check the arithmetic
  // and the cross-references rather than trusting the transcription.
  problems.push(
    ...set19FactProblems({
      units: set19Units,
      costCurve: set19CostCurve,
      traits: set19Traits,
      uniqueTraits: set19UniqueTraits,
      prismaticTraits: set19PrismaticTraits,
      quests: set19UnlockQuests,
      cards: set19Unlocks,
    }),
  );

  if (published.length === 0 && problems.length === 0) {
    console.log("[content] no published comps — nothing to check");
    return;
  }

  for (const comp of published) {
    const units = new Set((catalogue.sets[String(comp.setNumber)] ?? []).map((row) => row.id));
    const items = new Set(
      (catalogue.items?.[String(comp.setNumber)] ?? []).map((row) => row.id),
    );
    const ifMissing = (kind: string, id: string) =>
      `${comp.slug}: ${kind} "${id}" is not in the set ${comp.setNumber} catalogue`;

    if (units.size === 0) {
      problems.push(`${comp.slug}: no units in the catalogue snapshot for set ${comp.setNumber}`);
    }

    const boardIds = new Set<string>();
    for (const slot of comp.board) {
      boardIds.add(slot.id);
      if (units.size > 0 && !units.has(slot.id)) problems.push(ifMissing("unit", slot.id));
      for (const itemId of slot.items) {
        if (items.size > 0 && !items.has(itemId)) problems.push(ifMissing("item", itemId));
      }
    }

    for (const entry of comp.itemPriority) {
      if (!boardIds.has(entry.unitId)) {
        problems.push(`${comp.slug}: itemPriority unit "${entry.unitId}" is not on the board`);
      }
      for (const itemId of entry.chain) {
        if (items.size > 0 && !items.has(itemId)) problems.push(ifMissing("item", itemId));
      }
    }

    const positions = comp.positioning ?? [];
    if (positions.length === 0) {
      problems.push(`${comp.slug}: no positioning authored`);
    }

    const cells = new Set<string>();
    for (const position of positions) {
      if (!boardIds.has(position.unitId)) {
        problems.push(`${comp.slug}: positioning unit "${position.unitId}" is not on the board`);
      }
      if (position.row < 0 || position.row >= ROWS || position.col < 0 || position.col >= COLS) {
        problems.push(
          `${comp.slug}: position ${position.row},${position.col} is outside the ${ROWS}×${COLS} board`,
        );
      }
      const cell = `${position.row}:${position.col}`;
      if (cells.has(cell)) problems.push(`${comp.slug}: two units at cell ${cell}`);
      cells.add(cell);
    }

    const seen = positions.map((position) => position.unitId);
    const duplicates = seen.filter((id, index) => seen.indexOf(id) !== index);
    for (const id of new Set(duplicates)) {
      problems.push(`${comp.slug}: "${id}" is placed twice`);
    }
    for (const id of boardIds) {
      if (!seen.includes(id)) problems.push(`${comp.slug}: "${id}" is on the board but not placed`);
    }

    const stages = comp.stages.map((stage) => stage.stage);
    for (const stage of STAGES) {
      const count = stages.filter((entry) => entry === stage).length;
      if (count !== 1) problems.push(`${comp.slug}: stage "${stage}" appears ${count} times`);
    }
  }

  if (problems.length > 0) {
    console.error(`[content] ${problems.length} problem(s):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `[content] ok — ${published.length} comps: ids, item chains, positioning and stages all ` +
      `resolve; Set 19 facts consistent (${set19Units.length} units, ` +
      `${set19Traits.length + set19UniqueTraits.length} traits)`,
  );
}

main().catch((error: unknown) => {
  console.error(`[content] failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
