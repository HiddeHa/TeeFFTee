/**
 * Board ⇄ URL.
 *
 * A teambuilder board is small enough to live in a query string, which is what
 * makes a board shareable without a database, a login or a saved draft:
 *
 *   /teambuilder?b=0:DA_18_Ashe:3:TFT_Item_GuinsoosRageblade,TFT_Item_InfinityEdge;7:DA_18_Akali:1:
 *
 * One slot per `;`, fields split on `:`, items split on `,`. Hex, unit id, star
 * level and items — everything else on the page (name, cost, icon, traits) is
 * looked up from the set catalogue, so a link stays short and a renamed unit
 * resolves as unresolved rather than as a different champion.
 *
 * `+` is deliberately not a separator: a query string decodes it to a space, so a
 * link containing it would silently arrive as `TFT_Item_X TFT_Item_Y`.
 *
 * Anything malformed is dropped, never repaired: a hand-edited or truncated link
 * renders the slots it could parse and an empty board is a safe default. This is
 * the same rule the rest of the site uses for catalogue ids — a bad input is
 * dropped rather than guessed at.
 */

import type { BoardPosition, UnitSlot } from "@/content/types";

export const BOARD_ROWS = 4;
export const BOARD_COLS = 7;
export const BOARD_HEXES = BOARD_ROWS * BOARD_COLS;
export const MAX_ITEMS = 3;

export type BoardStar = 1 | 2 | 3;

/** One occupied hex, as it travels in the URL. */
export type CodedSlot = {
  /** 0 is the leftmost front-line hex; BOARD_HEXES - 1 is the back-right. */
  index: number;
  unitId: string;
  star: BoardStar;
  items: string[];
};

/** Riot ids: letters, digits and underscores (`DA_18_Ashe`, `TFT_Item_InfinityEdge`). */
const SAFE_ID = /^[A-Za-z0-9_]+$/;

function clampIndex(row: number, col: number): number | null {
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null;
  if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) return null;
  return row * BOARD_COLS + col;
}

export function encodeBoard(slots: CodedSlot[]): string {
  return [...slots]
    .sort((a, b) => a.index - b.index)
    .map((slot) => {
      const items = slot.items.filter((item) => SAFE_ID.test(item)).slice(0, MAX_ITEMS);
      return `${slot.index}:${slot.unitId}:${slot.star}:${items.join(",")}`;
    })
    .join(";");
}

/**
 * Parse `?b=` into slots. Never throws: every field is checked, and an entry
 * that fails is skipped. A later entry for the same hex wins, so a malformed
 * link cannot produce two champions on one hex.
 */
export function decodeBoard(
  value: string | string[] | undefined | null,
  hexCount: number = BOARD_HEXES,
): CodedSlot[] {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return [];

  const byIndex = new Map<number, CodedSlot>();

  for (const entry of raw.split(";")) {
    if (entry.length === 0) continue;

    const [indexText, unitId, starText, itemsText] = entry.split(":");
    const index = Number(indexText);
    if (!Number.isInteger(index) || index < 0 || index >= hexCount) continue;
    if (!unitId || !SAFE_ID.test(unitId)) continue;

    const items = [
      ...new Set(
        (itemsText ?? "")
          .split(",")
          .filter((item) => item.length > 0 && SAFE_ID.test(item)),
      ),
    ].slice(0, MAX_ITEMS);

    const starNumber = Number(starText);
    const star: BoardStar = starNumber === 2 || starNumber === 3 ? starNumber : 1;

    byIndex.set(index, { index, unitId, star, items });
  }

  return [...byIndex.values()].sort((a, b) => a.index - b.index);
}

/**
 * A curated comp's board as a teambuilder link.
 *
 * Positioned comps keep their authored layout. Comps without one fill the front
 * line left to right, in the order the board is written — a default to rearrange,
 * which is exactly what the page already tells the reader positioning is. The
 * comp's star levels and items travel too, because the point of the link is to
 * open on the same board, not on an empty one.
 */
export function encodeCompBoard(
  board: UnitSlot[],
  positioning?: BoardPosition[],
): string {
  const byUnit = new Map<string, BoardPosition>();
  for (const position of positioning ?? []) byUnit.set(position.unitId, position);

  const used = new Set<number>();
  const slots: CodedSlot[] = [];
  const displaced: UnitSlot[] = [];

  for (const unit of board) {
    const position = byUnit.get(unit.id);
    const index = position ? clampIndex(position.row, position.col) : null;

    // A hex already taken (two positioning entries on one cell) sends the unit to
    // the fallback pass rather than silently dropping it.
    if (index !== null && !used.has(index)) {
      used.add(index);
      slots.push({ index, unitId: unit.id, star: unit.star, items: unit.items });
    } else {
      displaced.push(unit);
    }
  }

  for (const unit of displaced) {
    let index = 0;
    while (index < BOARD_HEXES && used.has(index)) index += 1;
    if (index >= BOARD_HEXES) break;
    used.add(index);
    slots.push({ index, unitId: unit.id, star: unit.star, items: unit.items });
  }

  return encodeBoard(slots);
}
