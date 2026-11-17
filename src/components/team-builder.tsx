"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent } from "react";

import {
  BOARD_COLS,
  BOARD_HEXES,
  BOARD_ROWS,
  MAX_ITEMS,
  encodeBoard,
  type BoardStar,
  type CodedSlot,
} from "@/lib/board-codec";
import { AssetImage } from "@/components/asset-image";
import { COST_EDGE, COST_LABEL } from "@/lib/costs";
import { classNames } from "@/lib/format";

/**
 * The teambuilder.
 *
 * Three pools and one board, all of it from the set catalogue: every champion the
 * set ships, the same item catalogue the comp pages resolve against, and the
 * player's half-board drawn hex by hex.
 *
 * Two rules are deliberately the game's, not the designer's:
 *  - a unit holds at most three items, and
 *  - the same item cannot be stacked twice on one unit.
 *
 * Nothing here is measured: it is a plan you lay out, not a match result. The board
 * also lives in the URL (`src/lib/board-codec.ts`), which is the whole of its
 * persistence — a shared link restores it, and a reload of a plain `/teambuilder`
 * starts empty rather than implying saved data.
 */

export type BuilderUnit = {
  id: string;
  name: string;
  cost: number;
  imageUrl: string | null;
  /** Trait ids this unit counts toward. */
  traits: string[];
};

export type BuilderItem = {
  id: string;
  name: string;
  /** completed | component | emblem */
  kind: string;
  imageUrl: string | null;
};

export type BuilderTrait = {
  id: string;
  name: string;
  /** Activation counts, ascending. */
  breakpoints: number[];
  imageUrl: string | null;
};

/** Pointy-sided hexagon, the shape the board is actually made of. */
const HEX_CLIP = "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";

const COST_TEXT: Record<number, string> = {
  0: "text-slate-400",
  1: "text-slate-400",
  2: "text-emerald-400",
  3: "text-sky-400",
  4: "text-violet-400",
  5: "text-amber-300",
  7: "text-fuchsia-300",
};

const ITEM_KINDS = [
  { value: "completed", label: "Completed" },
  { value: "component", label: "Components" },
  { value: "emblem", label: "Emblems" },
] as const;

/** Star level of a placed champion — the same three the game has. */
type Star = BoardStar;

const STARS: Star[] = [1, 2, 3];

/** What a champion on the board is: who, how many items, and at what star. */
type Slot = { unitId: string; items: string[]; star: Star } | null;

/**
 * TFT's half-board reads front line first, so hex 0 is the leftmost front-line
 * hex and the last row is the back line.
 */
function emptyBoard(): Slot[] {
  return Array.from({ length: BOARD_HEXES }, () => null);
}

/** Rebuild a board from a decoded link. Slots the codec rejected never get here. */
function boardFromSlots(slots: CodedSlot[]): Slot[] {
  const board = emptyBoard();
  for (const slot of slots) {
    board[slot.index] = { unitId: slot.unitId, items: slot.items, star: slot.star };
  }
  return board;
}

/** One trait as the board currently stands. */
type TraitOnBoard = {
  id: string;
  name: string;
  count: number;
  imageUrl: string | null;
  breakpoints: number[];
  /** Breakpoints the board has reached. */
  reached: number[];
  active: boolean;
  /** Next threshold to reach; null when the trait is maxed or unbounded. */
  next: number | null;
};

type Props = {
  units: BuilderUnit[];
  items: BuilderItem[];
  traits: BuilderTrait[];
  /** Slots decoded from `?b=` — empty for a plain visit. */
  initialBoard: CodedSlot[];
  setNumber: number;
  patch: string;
};

export function TeamBuilder({ units, items, traits, initialBoard, setNumber, patch }: Props) {
  const [board, setBoard] = useState<Slot[]>(() => boardFromSlots(initialBoard));
  const [selectedHex, setSelectedHex] = useState<number | null>(null);
  const [brush, setBrush] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * Where the last champion landed. Placement used to be invisible: the board sat
   * above the pool, so on any window shorter than the page a click looked like it
   * did nothing at all. The board is pinned beside the pools from `lg` up, and this
   * marks the hex just for the cases where the board is still off-screen.
   */
  const [lastPlaced, setLastPlaced] = useState<number | null>(null);
  const boardRef = useRef<HTMLElement | null>(null);

  /**
   * What is in flight: a champion from the pool, an item from the palette, or a
   * champion already on the board.
   */
  const [drag, setDrag] = useState<
    | { kind: "unit"; unitId: string }
    | { kind: "item"; itemId: string }
    | { kind: "hex"; index: number }
    | null
  >(null);
  /** Hex the pointer is over while dragging, so the drop is visible before it lands. */
  const [dropTarget, setDropTarget] = useState<number | null>(null);

  const [unitQuery, setUnitQuery] = useState("");
  const [costFilter, setCostFilter] = useState<"all" | number>("all");
  const [itemQuery, setItemQuery] = useState("");
  const [itemKind, setItemKind] = useState<(typeof ITEM_KINDS)[number]["value"]>("completed");

  /**
   * Keep the address bar in step with the board, which is what makes the link
   * shareable at any moment. `replaceState` rather than a router push: a
   * navigation would refetch the page and reset the board on every click.
   */
  useEffect(() => {
    const encoded = encodeBoard(
      board.flatMap((slot, index) =>
        slot ? [{ index, unitId: slot.unitId, star: slot.star, items: slot.items }] : [],
      ),
    );
    const search = encoded.length > 0 ? `?b=${encoded}` : "";
    window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, [board]);

  const unitsById = useMemo(() => new Map(units.map((unit) => [unit.id, unit])), [units]);
  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const traitsById = useMemo(() => new Map(traits.map((trait) => [trait.id, trait])), [traits]);

  const placedCount = board.filter((slot) => slot !== null).length;

  /**
   * Trait counts come from the set catalogue, one count per placed copy — the same
   * way the game counts them. A trait whose id the catalogue cannot resolve still
   * shows up by id, so a stale catalogue is visible instead of silently reading "no
   * traits".
   */
  const boardTraits = useMemo<TraitOnBoard[]>(() => {
    const counts = new Map<string, number>();
    for (const slot of board) {
      if (!slot) continue;
      for (const traitId of unitsById.get(slot.unitId)?.traits ?? []) {
        counts.set(traitId, (counts.get(traitId) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([id, count]) => {
        const trait = traitsById.get(id) ?? null;
        const breakpoints = [...(trait?.breakpoints ?? [])].sort((a, b) => a - b);
        const reached = breakpoints.filter((value) => count >= value);

        return {
          id,
          name: trait?.name ?? id,
          imageUrl: trait?.imageUrl ?? null,
          count,
          breakpoints,
          reached,
          active: reached.length > 0,
          next: breakpoints.find((value) => value > count) ?? null,
        };
      })
      .sort(
        (a, b) =>
          Number(b.active) - Number(a.active) ||
          b.reached.length - a.reached.length ||
          b.count - a.count ||
          a.name.localeCompare(b.name),
      );
  }, [board, unitsById, traitsById]);

  const activeTraitCount = boardTraits.filter((trait) => trait.active).length;
  const selectedSlot = selectedHex === null ? null : (board[selectedHex] ?? null);
  const selectedUnit = selectedSlot ? (unitsById.get(selectedSlot.unitId) ?? null) : null;
  const brushItem = brush ? (itemsById.get(brush) ?? null) : null;

  const visibleUnits = useMemo(() => {
    const query = unitQuery.trim().toLowerCase();
    return units.filter(
      (unit) =>
        (costFilter === "all" || unit.cost === costFilter) &&
        (query === "" || unit.name.toLowerCase().includes(query)),
    );
  }, [units, costFilter, unitQuery]);

  const visibleItems = useMemo(() => {
    const query = itemQuery.trim().toLowerCase();
    return items.filter(
      (item) =>
        item.kind === itemKind &&
        (query === "" || item.name.toLowerCase().includes(query)),
    );
  }, [items, itemKind, itemQuery]);

  /**
   * Bring a freshly placed champion into view, and only that: below `lg` the board
   * sits above the pools, so a placement there would otherwise happen off-screen.
   * The guard is the hex itself, not the card — the card is taller than a laptop
   * viewport, and scrolling to "the whole board" would jump the page every click.
   */
  useEffect(() => {
    if (lastPlaced === null) return;
    const hex = boardRef.current?.querySelector<HTMLElement>(`[data-hex="${lastPlaced}"]`);
    if (!hex) return;
    const rect = hex.getBoundingClientRect();
    if (rect.top >= 0 && rect.bottom <= window.innerHeight) return;
    // Instant, not `behavior: "smooth"`: a browser with reduced motion (or none
    // configured) treats the smooth variant as a no-op, which is how a placement
    // looks like nothing happening in the first place.
    hex.scrollIntoView({ block: "center" });
  }, [lastPlaced]);

  function placeUnit(unitId: string) {
    const target =
      selectedHex !== null && board[selectedHex] === null
        ? selectedHex
        : board.findIndex((slot) => slot === null);
    if (target === -1) return;

    setBoard((prev) => {
      const next = [...prev];
      next[target] = { unitId, items: [], star: 1 };
      return next;
    });
    setSelectedHex(null);
    setLastPlaced(target);
  }

  /**
   * Drag and drop.
   *
   * HTML5 drag events, which covers mouse and trackpad: a pool champion lands on
   * a hex of your choosing, and a champion already on the board can be dragged to
   * another hex (items and star level travel with it). Touch has no drag events,
   * so click-to-place stays the path there — the two share every state update.
   */
  function startUnitDrag(unitId: string) {
    return (event: ReactDragEvent<HTMLButtonElement>) => {
      setDrag({ kind: "unit", unitId });
      event.dataTransfer.effectAllowed = "copy";
      // Firefox refuses to start a drag with an empty payload; the value is a formality.
      event.dataTransfer.setData("text/plain", unitId);
    };
  }

  function startItemDrag(itemId: string) {
    return (event: ReactDragEvent<HTMLButtonElement>) => {
      setDrag({ kind: "item", itemId });
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("text/plain", itemId);
    };
  }

  function startHexDrag(index: number) {
    const slot = board[index];
    return (event: ReactDragEvent<HTMLButtonElement>) => {
      if (!slot) return;
      setDrag({ kind: "hex", index });
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", slot.unitId);
    };
  }

  function endDrag() {
    setDrag(null);
    setDropTarget(null);
  }

  /**
   * A pool champion only lands on an empty hex — dropping it on an occupied one
   * would silently throw away that champion's star level and items. A champion
   * from the board swaps instead, which keeps both. An item needs a champion that
   * can take it: the same three-item cap and no-duplicate rule as clicking one on.
   */
  function canDropOn(index: number): boolean {
    if (!drag) return false;
    if (drag.kind === "hex") return drag.index !== index;

    const slot = board[index];
    if (drag.kind === "unit") return slot === null;
    if (!slot) return false;
    return slot.items.length < MAX_ITEMS && !slot.items.includes(drag.itemId);
  }

  function handleDragOver(index: number) {
    return (event: ReactDragEvent<HTMLButtonElement>) => {
      if (!canDropOn(index)) return;
      // Without preventDefault the browser refuses the drop, which also suppresses
      // the dragged tile's "move"/"copy" cursor on a valid target.
      event.preventDefault();
      event.dataTransfer.dropEffect = drag?.kind === "hex" ? "move" : "copy";
      if (dropTarget !== index) setDropTarget(index);
    };
  }

  function handleDragLeave(index: number) {
    return () => setDropTarget((current) => (current === index ? null : current));
  }

  function handleDrop(index: number) {
    return (event: ReactDragEvent<HTMLButtonElement>) => {
      const source = drag;
      event.preventDefault();
      endDrag();
      if (!source || !canDropOn(index)) return;

      if (source.kind === "item") {
        setBoard((prev) => {
          const target = prev[index];
          if (!target) return prev;
          if (target.items.length >= MAX_ITEMS) return prev;
          if (target.items.includes(source.itemId)) return prev;
          const next = [...prev];
          next[index] = { ...target, items: [...target.items, source.itemId] };
          return next;
        });
        // Open the champion's panel, the same place a click on it lands.
        setSelectedHex(index);
        return;
      }

      if (source.kind === "unit") {
        setBoard((prev) => {
          const next = [...prev];
          next[index] = { unitId: source.unitId, items: [], star: 1 };
          return next;
        });
        setSelectedHex(null);
        setLastPlaced(index);
        return;
      }

      setBoard((prev) => {
        const moving = prev[source.index];
        if (!moving || source.index === index) return prev;
        const next = [...prev];
        next[source.index] = prev[index] ?? null;
        next[index] = moving;
        return next;
      });
      setSelectedHex(null);
      setLastPlaced(index);
    };
  }

  function handleHexClick(index: number) {
    const slot = board[index];

    if (brush && slot) {
      if (slot.items.length >= MAX_ITEMS) return;
      if (slot.items.includes(brush)) return;

      setBoard((prev) => {
        const next = [...prev];
        const current = next[index];
        if (!current) return prev;
        next[index] = { ...current, items: [...current.items, brush] };
        return next;
      });
      setSelectedHex(index);
      return;
    }

    setSelectedHex((current) => (current === index ? null : index));
  }

  function removeUnit(index: number) {
    setBoard((prev) => {
      const next = [...prev];
      next[index] = null;
      return next;
    });
    setSelectedHex(null);
    setLastPlaced(null);
  }

  function setStar(index: number, star: Star) {
    setBoard((prev) => {
      const next = [...prev];
      const slot = next[index];
      if (!slot) return prev;
      next[index] = { ...slot, star };
      return next;
    });
  }

  function removeItem(index: number, itemIndex: number) {
    setBoard((prev) => {
      const next = [...prev];
      const slot = next[index];
      if (!slot) return prev;
      next[index] = { ...slot, items: slot.items.filter((_, i) => i !== itemIndex) };
      return next;
    });
  }

  function clearBoard() {
    setBoard(emptyBoard());
    setSelectedHex(null);
    setLastPlaced(null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused; the address bar still holds the link.
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      {/* Board — pinned beside the pools from `lg` up, because a champion dropped
          from a pool a screen below it lands on a board you cannot see. */}
      <section ref={boardRef} className="card p-4 sm:p-5 lg:sticky lg:top-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
              Your board
            </h2>
            <p className="mt-1 text-xs text-muted">
              {placedCount} of {BOARD_HEXES} hexes filled · {MAX_ITEMS} items per champion
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyLink}
              disabled={placedCount === 0}
              className="btn btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              {copied ? "Link copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={clearBoard}
              disabled={placedCount === 0}
              className="btn btn-ghost btn-sm disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear board
            </button>
          </div>
        </div>

        {/* Front line is the top row: the game's board is four rows of seven
            hexes, and this half is drawn the way it is played, front nearest the
            enemy. */}
        <div className="mx-auto mt-4 flex w-full max-w-[620px] items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
          <span>Front line</span>
          <span aria-hidden className="h-px flex-1 bg-line" />
          <span className="normal-case tracking-normal">
            {BOARD_ROWS} × {BOARD_COLS}
          </span>
        </div>

        <div className="mx-auto mt-2 w-full max-w-[620px]">
          {Array.from({ length: BOARD_ROWS }).map((_, row) => (
            <div
              key={row}
              className="flex gap-[3px]"
              style={{
                marginTop: row > 0 ? "-3.4%" : undefined,
                marginLeft: row % 2 === 1 ? "7.05%" : undefined,
              }}
            >
              {Array.from({ length: BOARD_COLS }).map((__, col) => {
                const index = row * BOARD_COLS + col;
                const slot = board[index] ?? null;
                const unit = slot ? (unitsById.get(slot.unitId) ?? null) : null;
                const isSelected = selectedHex === index;
                const isDropTarget = dropTarget === index && canDropOn(index);
                const canEquip =
                  brush !== null &&
                  slot !== null &&
                  slot.items.length < MAX_ITEMS &&
                  !slot.items.includes(brush);

                return (
                  <button
                    key={index}
                    type="button"
                    data-hex={index}
                    onClick={() => handleHexClick(index)}
                    draggable={slot !== null}
                    onDragStart={startHexDrag(index)}
                    onDragEnd={endDrag}
                    onDragOver={handleDragOver(index)}
                    onDragLeave={handleDragLeave(index)}
                    onDrop={handleDrop(index)}
                    aria-label={
                      slot
                        ? `${unit?.name ?? slot.unitId} — ${slot.star} star — ${slot.items.length} of ${MAX_ITEMS} items`
                        : "Empty hex"
                    }
                    aria-pressed={isSelected}
                    title={
                      slot
                        ? [
                            unit?.name ?? slot.unitId,
                            unit ? COST_LABEL[unit.cost] : null,
                            `${slot.star} star`,
                            ...slot.items.map((id) => itemsById.get(id)?.name ?? id),
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "Empty hex"
                    }
                    style={{ clipPath: HEX_CLIP, backgroundColor: "var(--color-line)" }}
                    className={classNames(
                      "relative aspect-square flex-1 transition",
                      slot ? "cursor-grab active:cursor-grabbing" : null,
                      canEquip && "cursor-copy",
                      drag?.kind === "unit" && !slot && "cursor-copy",
                      drag?.kind === "item" && canDropOn(index) && "cursor-copy",
                    )}
                  >
                    <span
                      aria-hidden
                      style={{ clipPath: HEX_CLIP }}
                      className={classNames(
                        "absolute inset-px",
                        slot ? "bg-raised" : "bg-surface",
                        isSelected ? "bg-accent/20" : null,
                      )}
                    />

                    <AssetImage
                      src={unit?.imageUrl ?? null}
                      className="absolute inset-0 h-full w-full object-cover"
                      fallback={
                        slot ? (
                          <span className="absolute inset-0 flex items-center justify-center px-1 text-center font-mono text-[9px] leading-tight text-muted">
                            {unit?.name ?? slot.unitId}
                          </span>
                        ) : null
                      }
                    />

                    {unit ? (
                      <span
                        className={classNames(
                          "stat-value absolute left-1/2 top-[3px] -translate-x-1/2 rounded bg-ink/80 px-1 text-[9px] font-semibold",
                          COST_TEXT[unit.cost] ?? "text-muted",
                        )}
                      >
                        {unit.cost}
                      </span>
                    ) : null}

                    {/* One star is the default and the usual case, so only a
                        starred-up champion carries a marker. */}
                    {slot && slot.star > 1 ? (
                      <span
                        aria-hidden
                        className="absolute left-1/2 top-[15px] -translate-x-1/2 text-[8px] leading-none tracking-[-0.08em] text-accent [text-shadow:0_1px_2px_rgba(0,0,0,0.9)]"
                      >
                        {"★".repeat(slot.star)}
                      </span>
                    ) : null}

                    {lastPlaced === index ? (
                      <span
                        aria-hidden
                        style={{ clipPath: HEX_CLIP }}
                        className="pointer-events-none absolute inset-0 border-2 border-accent"
                      />
                    ) : null}

                    {isDropTarget ? (
                      <span
                        aria-hidden
                        style={{ clipPath: HEX_CLIP }}
                        className="pointer-events-none absolute inset-0 border-2 border-accent bg-accent/20"
                      />
                    ) : null}

                    {slot && slot.items.length > 0 ? (
                      <span className="absolute bottom-[2px] left-1/2 flex -translate-x-1/2 items-center gap-[2px]">
                        {slot.items.map((itemId, itemIndex) => {
                          const item = itemsById.get(itemId);
                          return (
                            <AssetImage
                              key={`${itemId}-${itemIndex}`}
                              src={item?.imageUrl ?? null}
                              className="h-3 w-3 rounded-sm border border-ink/70 bg-surface object-cover"
                              fallback={
                                <span
                                  aria-hidden
                                  className="h-3 w-3 rounded-sm border border-line bg-ink"
                                />
                              }
                            />
                          );
                        })}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mx-auto mt-2 flex w-full max-w-[620px] items-center gap-2 text-[10px] uppercase tracking-wider text-muted">
          <span>Back line</span>
          <span aria-hidden className="h-px flex-1 bg-line" />
          <span className="normal-case tracking-normal">{BOARD_HEXES} hexes</span>
        </div>

        {/* Traits, counted from the champions currently on the board. */}
        <div className="mt-5 border-t border-line pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              Traits
            </h3>
            <p className="text-[11px] text-muted">
              {boardTraits.length === 0
                ? "Nothing on the board yet"
                : `${activeTraitCount} active · ${boardTraits.length} in play`}
            </p>
          </div>

          {boardTraits.length === 0 ? (
            <p className="mt-2 text-xs text-muted">
              Breakpoints count up as you place champions. A trait only lights up at its
              first threshold.
            </p>
          ) : (
            <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
              {boardTraits.map((trait) => (
                <li
                  key={trait.id}
                  title={
                    trait.breakpoints.length > 0
                      ? `${trait.name} · breakpoints ${trait.breakpoints.join(" / ")} · ${trait.count} on board`
                      : `${trait.name} · ${trait.count} on board`
                  }
                  className={classNames(
                    "flex items-center gap-2 rounded-md border px-2 py-1.5",
                    trait.active ? "border-accent/50 bg-accent/10" : "border-line bg-raised/40",
                  )}
                >
                  <AssetImage
                    src={trait.imageUrl}
                    className="h-5 w-5 shrink-0 rounded-sm border border-line bg-surface object-cover"
                    fallback={
                      <span
                        aria-hidden
                        className="h-5 w-5 shrink-0 rounded-sm border border-dashed border-line bg-surface"
                      />
                    }
                  />

                  <span
                    className={classNames(
                      "min-w-0 flex-1 truncate text-[11px]",
                      trait.active ? "font-semibold text-fg" : "text-muted",
                    )}
                  >
                    {trait.name}
                  </span>

                  <span className="stat-value shrink-0 text-xs">
                    <span
                      className={classNames(
                        trait.active ? "font-semibold text-accent" : "text-muted",
                      )}
                    >
                      {trait.count}
                    </span>
                    {trait.breakpoints.length > 0 ? (
                      <span className="text-muted/60">
                        /{trait.next ?? trait.breakpoints[trait.breakpoints.length - 1]}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {brushItem ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2">
            <p className="flex items-center gap-2 text-xs text-fg">
              <AssetImage
                src={brushItem.imageUrl}
                className="h-5 w-5 rounded border border-line bg-surface object-cover"
              />
              Put <span className="font-semibold">{brushItem.name}</span> on a champion
            </p>
            <button
              type="button"
              onClick={() => setBrush(null)}
              className="text-xs font-semibold text-accent hover:underline"
            >
              Done
            </button>
          </div>
        ) : null}

        {selectedSlot && selectedUnit ? (
          <div className="mt-4 rounded-lg border border-line bg-raised p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">
                {selectedUnit.name}{" "}
                <span className="font-normal text-muted">
                  · {COST_LABEL[selectedUnit.cost] ?? selectedUnit.cost} ·
                </span>{" "}
                <span className="text-accent" aria-label={`${selectedSlot.star} star`}>
                  {"★".repeat(selectedSlot.star)}
                </span>
              </p>
              <button
                type="button"
                onClick={() => removeUnit(selectedHex as number)}
                className="btn btn-ghost btn-sm"
              >
                Remove champion
              </button>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-muted">
                Star
              </span>
              {STARS.map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setStar(selectedHex as number, star)}
                  data-active={selectedSlot.star === star}
                  aria-pressed={selectedSlot.star === star}
                  aria-label={`Set ${star} star`}
                  className="chip"
                >
                  {"★".repeat(star)}
                </button>
              ))}
            </div>

            {selectedSlot.items.length === 0 ? (
              <p className="mt-2 text-xs text-muted">
                No items yet — pick one from the item palette, then click this champion.
              </p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {selectedSlot.items.map((itemId, itemIndex) => {
                  const item = itemsById.get(itemId) ?? null;
                  return (
                    <li key={`${itemId}-${itemIndex}`}>
                      <button
                        type="button"
                        onClick={() => removeItem(selectedHex as number, itemIndex)}
                        title={`Remove ${item?.name ?? itemId}`}
                        className="flex items-center gap-1.5 rounded border border-line bg-surface px-1.5 py-1 text-[11px] hover:border-bad/60 hover:text-bad"
                      >
                        <AssetImage
                          src={item?.imageUrl ?? null}
                          className="h-4 w-4 rounded-sm border border-line object-cover"
                        />
                        <span className="max-w-[150px] truncate">
                          {item?.name ?? itemId}
                        </span>
                        <span aria-hidden className="text-muted">
                          ×
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Drag a champion onto a hex, or click one to drop it on the front line. Drag
            a placed champion to move it, and onto another champion to swap them. Click
            a hex to select it, or an item icon to take it back off.
          </p>
        )}
      </section>

      <div className="grid gap-4">
        {/* Champion pool */}
        <section className="card flex flex-col p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Champions
          </h2>
          <p className="mt-1 text-xs text-muted">
            All {units.length} units in the Set {setNumber} catalogue.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCostFilter("all")}
              data-active={costFilter === "all"}
              className="chip"
            >
              All
            </button>
            {[1, 2, 3, 4, 5, 7].map((cost) => (
              <button
                key={cost}
                type="button"
                onClick={() => setCostFilter(cost)}
                data-active={costFilter === cost}
                className="chip"
              >
                {cost}c
              </button>
            ))}
            <input
              type="search"
              value={unitQuery}
              onChange={(event) => setUnitQuery(event.target.value)}
              placeholder="Search champions"
              aria-label="Search champions"
              className="ml-auto w-full rounded-md border border-line bg-ink px-2 py-1 text-xs text-fg placeholder:text-muted/70 sm:w-36"
            />
          </div>

          {units.length === 0 ? (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              The Set {setNumber} unit catalogue is empty or unavailable, so there is
              nothing to place. Load it with{" "}
              <code className="font-mono text-[11px]">npm run crawl -- load-assets</code>.
            </p>
          ) : (
            <div className="mt-3 max-h-[420px] overflow-y-auto pr-1">
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {visibleUnits.map((unit) => (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => placeUnit(unit.id)}
                    draggable
                    onDragStart={startUnitDrag(unit.id)}
                    onDragEnd={endDrag}
                    title={`${unit.name} · ${COST_LABEL[unit.cost] ?? `${unit.cost} cost`}`}
                    className={classNames(
                      "group flex cursor-grab flex-col items-center gap-1 rounded-md border border-l-2 border-line bg-raised p-1.5 text-center transition-colors hover:border-accent/50 hover:bg-surface active:cursor-grabbing",
                      COST_EDGE[unit.cost] ?? "border-l-line",
                    )}
                  >
                    <AssetImage
                      src={unit.imageUrl}
                      className="h-12 w-full rounded object-cover"
                      fallback={
                        <span
                          aria-hidden
                          className="h-12 w-full rounded border border-dashed border-line bg-surface"
                        />
                      }
                    />
                    <span className="w-full truncate text-[10px] leading-tight text-fg/85 group-hover:text-fg">
                      {unit.name}
                    </span>
                  </button>
                ))}
              </div>

              {visibleUnits.length === 0 ? (
                <p className="mt-6 text-center text-xs text-muted">
                  No champion matches that filter.
                </p>
              ) : null}
            </div>
          )}
        </section>

        {/* Item palette */}
        <section className="card flex flex-col p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">
            Items
          </h2>
          <p className="mt-1 text-xs text-muted">
            Drag an item onto a champion, or pick one and click the champion to put it on.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {ITEM_KINDS.map((kind) => (
              <button
                key={kind.value}
                type="button"
                onClick={() => setItemKind(kind.value)}
                data-active={itemKind === kind.value}
                className="chip"
              >
                {kind.label}
              </button>
            ))}
            <input
              type="search"
              value={itemQuery}
              onChange={(event) => setItemQuery(event.target.value)}
              placeholder="Search items"
              aria-label="Search items"
              className="ml-auto w-full rounded-md border border-line bg-ink px-2 py-1 text-xs text-fg placeholder:text-muted/70 sm:w-32"
            />
          </div>

          <div className="mt-3 max-h-[420px] overflow-y-auto pr-1">
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {visibleItems.map((item) => {
                const active = brush === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setBrush(active ? null : item.id)}
                      draggable
                      onDragStart={startItemDrag(item.id)}
                      onDragEnd={endDrag}
                      aria-pressed={active}
                      className={classNames(
                        "flex w-full cursor-grab items-center gap-2 rounded-md border px-1.5 py-1 text-left transition-colors active:cursor-grabbing",
                        active
                          ? "border-accent bg-accent/15 text-fg"
                          : "border-line bg-raised text-fg/85 hover:border-accent/50 hover:text-fg",
                      )}
                    >
                      <AssetImage
                        src={item.imageUrl}
                        className="h-5 w-5 shrink-0 rounded border border-line bg-surface object-cover"
                        fallback={
                          <span
                            aria-hidden
                            className="h-5 w-5 shrink-0 rounded border border-dashed border-line bg-surface"
                          />
                        }
                      />
                      <span className="min-w-0 flex-1 truncate text-[11px]">
                        {item.name}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {visibleItems.length === 0 ? (
              <p className="mt-6 text-center text-xs text-muted">
                No item matches that filter.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <p className="text-[11px] leading-relaxed text-muted/80 lg:col-span-2">
        Built from the Set {setNumber} catalogue for patch {patch}: champion names,
        costs and traits, with the shared item list the comp pages resolve against. Icons
        appear when the set catalogue is loaded. A board is a plan, not a match result —
        it lives in this page's URL and nowhere else.
      </p>
    </div>
  );
}
