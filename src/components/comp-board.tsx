import type { BoardUnit } from "@/content/types";
import { AssetImage } from "@/components/asset-image";
import { COST_EDGE } from "@/lib/costs";
import { classNames } from "@/lib/format";

import { ItemIcon } from "./item-icon";

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
              <AssetImage
                src={unit.imageUrl}
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded border border-line bg-surface object-cover"
                fallback={
                  <span
                    aria-hidden
                    className="h-10 w-10 shrink-0 rounded border border-dashed border-line bg-surface"
                  />
                }
              />

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

            {unit.resolvedItems.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {unit.resolvedItems.map((item, index) => (
                  <li key={`${item.id}-${index}`} className="min-w-0">
                    <ItemIcon item={item} size={16} showName />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[11px] leading-snug text-muted/50">No items</p>
            )}

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
