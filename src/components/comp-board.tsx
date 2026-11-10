import type { BoardUnit } from "@/content/types";
import { classNames } from "@/lib/format";

/** Left border encodes champion cost, the way the in-game shop does. */
const COST_EDGE: Record<number, string> = {
  0: "border-l-slate-600",
  1: "border-l-slate-500",
  2: "border-l-emerald-500",
  3: "border-l-sky-500",
  4: "border-l-violet-500",
  5: "border-l-amber-400",
};

/**
 * The board.
 *
 * Every name, cost and icon here comes from the set catalogue (`units`, loaded by
 * `npm run crawl -- load-assets`), keyed by the Riot unit id in the content file.
 * Nothing on this component is authored copy — which is why a slot the catalogue
 * cannot resolve renders its raw id and says so, instead of falling back to a
 * placeholder name that would look like a real unit.
 *
 * Icons are plain `<img>` rather than `next/image`: the optimizer needs `sharp`
 * in production and would proxy every icon through the site, and these PNGs are
 * already small.
 */
export function CompBoard({ board }: { board: BoardUnit[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {board.map((unit) => {
        const unresolved = unit.name === null;
        return (
          <div
            key={unit.id}
            className={classNames(
              "rounded-lg border border-l-4 border-line bg-raised p-3",
              unresolved ? "border-l-line" : (COST_EDGE[unit.cost ?? 0] ?? "border-l-line"),
            )}
          >
            <div className="flex items-start gap-2.5">
              {unit.imageUrl ? (
                <img
                  src={unit.imageUrl}
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  decoding="async"
                  className="h-10 w-10 shrink-0 rounded border border-line bg-surface object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="h-10 w-10 shrink-0 rounded border border-dashed border-line bg-surface"
                />
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={classNames(
                      "leading-tight",
                      unresolved
                        ? "font-mono text-[11px] text-muted"
                        : "text-sm font-semibold",
                    )}
                  >
                    {unit.name ?? unit.id}
                  </span>
                  <span className="stat-value shrink-0 text-[10px] text-muted">
                    {unit.cost === null ? "—" : `${unit.cost}c`}
                  </span>
                </div>
                <div
                  className="mt-1 text-[11px] tracking-tight text-accent"
                  aria-label={`${unit.star} star`}
                >
                  {"★".repeat(unit.star)}
                </div>
              </div>
            </div>

            <ul className="mt-2 space-y-1 text-[11px] leading-snug text-muted">
              {unit.items.length > 0 ? (
                unit.items.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li className="text-muted/50">No items</li>
              )}
            </ul>

            {unresolved ? (
              <p className="mt-2 text-[10px] leading-snug text-muted/70">
                Not in the set catalogue
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
