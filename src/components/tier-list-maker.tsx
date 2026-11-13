"use client";

import type { DragEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { AssetImage } from "@/components/asset-image";
import { classNames } from "@/lib/format";
import {
  KIND_LABELS,
  STORAGE_KEY,
  TIER_LIST_KINDS,
  TIER_ROWS,
  countPlaced,
  emptyRows,
  parseStoredLists,
  type CatalogueOption,
  type CustomTierList,
  type TierListKind,
  type TierRow,
} from "@/lib/tier-lists";

/**
 * The tier board reads like the tier lists players already know: a solid coloured
 * band per row, a dense grid of square portraits inside it, and the pool of
 * unranked cards underneath with type tabs and filters above. Everything is
 * stored in this browser — there is no account behind it.
 */

const BAND: Record<TierRow, string> = {
  S: "bg-tier-s text-[#241a04]",
  A: "bg-tier-a text-[#04241a]",
  B: "bg-tier-b text-[#041a2c]",
  C: "bg-tier-c text-[#12161d]",
  D: "bg-[#2a3040] text-muted",
};

const KIND_COPY: Record<TierListKind, string> = {
  augments: "augment",
  units: "unit",
  items: "item",
};

const KIND_ARTICLE: Record<TierListKind, string> = {
  augments: "an",
  units: "a",
  items: "an",
};

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `list-${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
}

function Tile({
  option,
  selected,
  fluid = false,
  onSelect,
  onDragStart,
}: {
  option: CatalogueOption;
  selected: boolean;
  /** Fill the pool's grid cell instead of a fixed tile width. */
  fluid?: boolean;
  onSelect: () => void;
  onDragStart: (event: DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={(event) => {
        // The row and pool behind the tile are click targets too.
        event.stopPropagation();
        onSelect();
      }}
      aria-pressed={selected}
      title={`${option.name}${option.meta ? ` · ${option.meta}` : ""}`}
      className={classNames(
        "group flex flex-col items-center gap-1",
        fluid ? "w-full" : "w-[68px] shrink-0 sm:w-[76px]",
      )}
    >
      <span
        className={classNames(
          "relative block aspect-square w-full overflow-hidden rounded-md border-2 bg-surface transition-transform duration-100 group-hover:-translate-y-0.5",
          option.tone,
          selected && "ring-2 ring-accent ring-offset-2 ring-offset-surface",
        )}
      >
        <AssetImage
          src={option.imageUrl}
          width={76}
          height={76}
          className="h-full w-full object-cover"
          fallback={
            <span className="flex h-full w-full items-center justify-center px-1 text-center text-[10px] leading-tight text-muted">
              {option.name.slice(0, 2).toUpperCase()}
            </span>
          }
        />
        {option.meta ? (
          <span className="absolute inset-x-0 bottom-0 truncate bg-ink/85 px-1 py-0.5 text-center text-[9px] font-semibold uppercase tracking-wide text-fg/90">
            {option.meta}
          </span>
        ) : null}
      </span>
      <span className="w-full truncate text-center text-[10px] leading-tight text-muted group-hover:text-fg">
        {option.name}
      </span>
    </button>
  );
}

export function TierListMaker({
  setNumber,
  pools,
  facets,
}: {
  setNumber: number;
  pools: Record<TierListKind, CatalogueOption[]>;
  facets: Record<TierListKind, string[]>;
}) {
  const [lists, setLists] = useState<CustomTierList[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeKind, setActiveKind] = useState<TierListKind>("units");
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [facet, setFacet] = useState("");
  const [dragOver, setDragOver] = useState<TierRow | "pool" | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [draftName, setDraftName] = useState("");

  // Load once, after hydration: the server cannot know what this browser saved.
  useEffect(() => {
    try {
      const stored = parseStoredLists(window.localStorage.getItem(STORAGE_KEY));
      setLists(stored);
      setActiveId(stored[0]?.id ?? null);
      setActiveKind(stored[0]?.kind ?? "units");
    } catch {
      setStorageError("This browser blocked local storage, so lists cannot be saved.");
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
    } catch {
      setStorageError("This browser blocked local storage, so changes are not being saved.");
    }
  }, [lists, hydrated]);

  const kindLists = useMemo(
    () => lists.filter((list) => list.kind === activeKind),
    [lists, activeKind],
  );

  const active = useMemo(
    () => kindLists.find((list) => list.id === activeId) ?? kindLists[0] ?? null,
    [kindLists, activeId],
  );

  // A selection or search from one list means nothing in another.
  const activeListId = active?.id ?? null;
  useEffect(() => {
    setSelected(null);
    setQuery("");
    setFacet("");
  }, [activeListId]);

  const optionIndex = useMemo(() => {
    const index = new Map<string, CatalogueOption>();
    for (const kind of TIER_LIST_KINDS) {
      for (const option of pools[kind]) {
        if (!index.has(option.id)) index.set(option.id, option);
      }
    }
    return index;
  }, [pools]);

  const placedIds = useMemo(() => {
    const ids = new Set<string>();
    if (active) {
      for (const row of TIER_ROWS) {
        for (const id of active.rows[row]) ids.add(id);
      }
    }
    return ids;
  }, [active]);

  const placedCount = active ? countPlaced(active) : 0;
  const pool = active ? pools[active.kind] : [];

  const available = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return pool.filter(
      (option) =>
        !placedIds.has(option.id) &&
        (facet === "" || option.meta === facet) &&
        (needle === "" || option.name.toLowerCase().includes(needle)),
    );
  }, [pool, placedIds, query, facet]);

  // Saved ids the current set's catalogue cannot name. Counted, never hidden.
  const missing = useMemo(() => {
    if (!active) return 0;
    return TIER_ROWS.reduce(
      (total, row) => total + active.rows[row].filter((id) => !optionIndex.has(id)).length,
      0,
    );
  }, [active, optionIndex]);

  function selectKind(kind: TierListKind) {
    setActiveKind(kind);
    const first = lists.find((list) => list.kind === kind);
    setActiveId(first?.id ?? null);
    setShowForm(false);
  }

  function updateActive(update: (list: CustomTierList) => CustomTierList) {
    if (!active) return;
    const targetId = active.id;
    setLists((previous) =>
      previous.map((list) =>
        list.id === targetId
          ? { ...update(list), updatedAt: new Date().toISOString() }
          : list,
      ),
    );
  }

  function move(itemId: string, target: TierRow | null) {
    if (!active) return;
    const targetId = active.id;
    setLists((previous) =>
      previous.map((list) => {
        if (list.id !== targetId) return list;

        const rows = emptyRows();
        for (const row of TIER_ROWS) {
          rows[row] = list.rows[row].filter((id) => id !== itemId);
        }
        if (target) rows[target] = [...rows[target], itemId];

        return { ...list, rows, updatedAt: new Date().toISOString() };
      }),
    );
    setSelected(null);
  }

  function createList(name: string, kind: TierListKind) {
    const trimmed = name.trim();
    if (!trimmed) return;

    const now = new Date().toISOString();
    const list: CustomTierList = {
      id: newId(),
      name: trimmed.slice(0, 80),
      kind,
      rows: emptyRows(),
      createdAt: now,
      updatedAt: now,
    };

    setLists((previous) => [...previous, list]);
    setActiveKind(kind);
    setActiveId(list.id);
    setDraftName("");
    setShowForm(false);
  }

  function deleteList(list: CustomTierList) {
    if (!window.confirm(`Delete "${list.name}"? This cannot be undone.`)) return;
    setLists((previous) => previous.filter((entry) => entry.id !== list.id));
    setActiveId((previous) => (previous === list.id ? null : previous));
  }

  function clearTiers() {
    if (!window.confirm("Move every card back to unranked?")) return;
    updateActive((list) => ({ ...list, rows: emptyRows() }));
  }

  function startDrag(event: DragEvent<HTMLButtonElement>, id: string) {
    event.dataTransfer.setData("text/plain", id);
    event.dataTransfer.effectAllowed = "move";
  }

  function handleDrop(event: DragEvent<HTMLElement>, target: TierRow | null) {
    event.preventDefault();
    setDragOver(null);
    const id = event.dataTransfer.getData("text/plain");
    if (id) move(id, target);
  }

  const kindLabel = KIND_LABELS[activeKind];
  const totalForKind = kindLists.reduce((total, list) => total + countPlaced(list), 0);

  return (
    <div>
      {/* Type tabs, the way every tier list site splits champions / items / augments. */}
      <div className="flex items-center gap-1 border-b border-line">
        {TIER_LIST_KINDS.map((kind) => {
          const count = lists.filter((list) => list.kind === kind).length;
          const isActive = kind === activeKind;
          return (
            <button
              key={kind}
              type="button"
              onClick={() => selectKind(kind)}
              aria-current={isActive ? "page" : undefined}
              className={classNames(
                "relative px-3 py-2.5 text-sm font-semibold transition-colors",
                isActive ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {KIND_LABELS[kind]}
              <span className="ml-1.5 text-[10px] font-normal text-muted">
                {pools[kind].length}
              </span>
              {isActive ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
              ) : null}
            </button>
          );
        })}
        <span className="ml-auto hidden pr-1 text-[11px] text-muted sm:block">
          {totalForKind} placed across {kindLists.length}{" "}
          {kindLists.length === 1 ? "list" : "lists"}
        </span>
      </div>

      {/* The visitor's lists of this type. */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {kindLists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setActiveId(list.id)}
            className="chip max-w-[16rem]"
            data-active={list.id === active?.id}
            title={list.name}
          >
            <span className="truncate">{list.name}</span>
            <span className="ml-1.5 text-[10px] opacity-70">{countPlaced(list)}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="chip border-dashed"
        >
          + New {kindLabel.toLowerCase()} list
        </button>
      </div>

      {showForm ? (
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            createList(draftName, activeKind);
          }}
        >
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder={`Name your ${KIND_COPY[activeKind]} list`}
            maxLength={80}
            autoFocus
            className="w-64 rounded-md border border-line bg-ink px-2.5 py-1.5 text-sm text-fg placeholder:text-muted/50"
          />
          <button
            type="submit"
            disabled={draftName.trim() === ""}
            className="btn btn-primary btn-sm disabled:opacity-40"
          >
            Create list
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowForm(false)}
          >
            Cancel
          </button>
          <span className="text-[11px] text-muted">Cards: {kindLabel}</span>
        </form>
      ) : null}

      {storageError ? <p className="mt-3 text-xs text-bad">{storageError}</p> : null}

      {!hydrated ? (
        <div className="mt-5 rounded-xl border border-line bg-surface p-8 text-sm text-muted">
          Loading your lists…
        </div>
      ) : active ? (
        <>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <input
              value={active.name}
              maxLength={80}
              aria-label="List name"
              onChange={(event) =>
                updateActive((list) => ({ ...list, name: event.target.value }))
              }
              className="min-w-[10rem] max-w-sm flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xl font-semibold text-fg hover:border-line focus:border-line focus:bg-ink"
            />
            <span className="chip">{placedCount} placed</span>
            <div className="ml-auto flex flex-wrap gap-2">
              {selected && placedIds.has(selected) ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => move(selected, null)}
                >
                  Unrank selected
                </button>
              ) : null}
              <button type="button" className="btn btn-ghost btn-sm" onClick={clearTiers}>
                Clear tiers
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-bad"
                onClick={() => deleteList(active)}
              >
                Delete
              </button>
            </div>
          </div>

          <p className="mt-1 px-1 text-[11px] text-muted">
            Drag a card into a row, or click a card then a row. Saved in this browser
            only.
          </p>

          {missing > 0 ? (
            <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted">
              {missing} saved card{missing === 1 ? " is" : "s are"} not in the Set{" "}
              {setNumber} catalogue, so hidden here — the id is still saved, not deleted.
            </p>
          ) : null}

          {/* The board */}
          <div className="mt-3 overflow-hidden rounded-xl border border-line">
            {TIER_ROWS.map((row) => {
              const ids = active.rows[row];
              return (
                <div
                  key={row}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOver(row);
                  }}
                  onDragLeave={() =>
                    setDragOver((previous) => (previous === row ? null : previous))
                  }
                  onDrop={(event) => handleDrop(event, row)}
                  onClick={() => {
                    if (selected) move(selected, row);
                  }}
                  className={classNames(
                    "flex border-b border-line last:border-b-0",
                    selected && "cursor-pointer",
                    dragOver === row && "ring-2 ring-inset ring-accent",
                  )}
                >
                  <div
                    className={classNames(
                      "flex w-14 shrink-0 flex-col items-center justify-center gap-0.5 sm:w-20",
                      BAND[row],
                    )}
                  >
                    <span className="text-2xl font-black leading-none sm:text-3xl">
                      {row}
                    </span>
                    <span className="text-[8px] font-bold uppercase tracking-[0.18em] opacity-60">
                      tier
                    </span>
                  </div>

                  <div
                    className={classNames(
                      "flex min-h-[6.5rem] flex-1 flex-wrap content-start gap-1.5 p-2.5",
                      dragOver === row ? "bg-accent/5" : "bg-surface",
                    )}
                  >
                    {ids.length === 0 ? (
                      <p className="self-center py-3 text-[11px] text-muted/60">
                        {selected
                          ? "Click here to place the selected card"
                          : "Drop cards here"}
                      </p>
                    ) : (
                      ids.map((id) => {
                        const option = optionIndex.get(id);
                        if (!option) return null;
                        return (
                          <Tile
                            key={id}
                            option={option}
                            selected={selected === id}
                            onSelect={() =>
                              setSelected((previous) => (previous === id ? null : id))
                            }
                            onDragStart={(event) => startDrag(event, id)}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pool */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver("pool");
            }}
            onDragLeave={() =>
              setDragOver((previous) => (previous === "pool" ? null : previous))
            }
            onDrop={(event) => handleDrop(event, null)}
            onClick={() => {
              if (selected && placedIds.has(selected)) move(selected, null);
            }}
            className={classNames(
              "mt-5 rounded-xl border border-line bg-surface",
              dragOver === "pool" && "ring-2 ring-inset ring-accent",
            )}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
                Unranked {kindLabel.toLowerCase()}
                <span className="ml-1.5 font-normal text-muted/60">
                  {available.length}
                </span>
              </h2>
              <label
                className="ml-auto flex items-center gap-2 rounded-md border border-line bg-ink px-2 py-1"
                onClick={(event) => event.stopPropagation()}
              >
                <span aria-hidden className="text-xs text-muted">
                  ⌕
                </span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={`Search ${kindLabel.toLowerCase()}…`}
                  aria-label={`Search ${kindLabel.toLowerCase()}`}
                  className="w-36 bg-transparent text-xs text-fg placeholder:text-muted/50 focus:outline-none sm:w-52"
                />
              </label>
            </div>

            {facets[active.kind].length > 0 ? (
              <div
                className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="chip"
                  data-active={facet === ""}
                  onClick={() => setFacet("")}
                >
                  All
                </button>
                {facets[active.kind].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className="chip"
                    data-active={facet === value}
                    onClick={() => setFacet(facet === value ? "" : value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="max-h-[28rem] overflow-y-auto p-3">
              {pool.length === 0 ? (
                <p className="text-xs leading-relaxed text-muted">
                  No {kindLabel.toLowerCase()} in the Set {setNumber} catalogue. Load the
                  set&apos;s assets, then this pool fills in.
                </p>
              ) : available.length === 0 ? (
                <p className="text-xs text-muted">
                  {query || facet ? "Nothing matches those filters." : "Every card is placed."}
                </p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-x-1.5 gap-y-2.5">
                  {available.map((option) => (
                    <Tile
                      key={option.id}
                      option={option}
                      fluid
                      selected={selected === option.id}
                      onSelect={() =>
                        setSelected((previous) => (previous === option.id ? null : option.id))
                      }
                      onDragStart={(event) => startDrag(event, option.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            <p className="border-t border-line px-3 py-2 text-[11px] text-muted/70">
              {selected
                ? placedIds.has(selected)
                  ? "Click a tier to move it, or this panel to unrank it."
                  : "Now click a tier row to place it."
                : "Drag a card into a tier, or click a card and then a tier."}
            </p>
          </div>
        </>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-line bg-surface/60 p-8">
          <h2 className="text-lg font-semibold">
            No {kindLabel.toLowerCase()} list yet
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
            Make one, then rank the {kindLabel.toLowerCase()} in it from S down to D.
            Cards come from the Set {setNumber} catalogue, so nothing is invented.
          </p>
          <button
            type="button"
            className="btn btn-primary mt-4"
            onClick={() => setShowForm(true)}
          >
            Create {KIND_ARTICLE[activeKind]} {KIND_COPY[activeKind]} list
          </button>
        </div>
      )}
    </div>
  );
}
