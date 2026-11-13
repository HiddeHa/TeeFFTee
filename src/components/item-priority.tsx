import { Fragment } from "react";

import type { ResolvedPriority } from "@/content/types";

import { ItemIcon } from "./item-icon";

/**
 * Best-in-slot first, then the components you settle for — the tftacademy
 * pattern, rendered from item ids so every step carries its icon.
 *
 * The chain is deliberately not a per-unit item table: it answers "what do I
 * build first, and what do I do when I do not get it", which is the question a
 * player actually has in stage 3.
 */
export function ItemPriority({ entries }: { entries: ResolvedPriority[] }) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div key={entry.unitId}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
            {entry.unitName ?? entry.unitId}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {entry.chain.map((item, index) => (
              <Fragment key={`${item.id}-${index}`}>
                {index > 0 ? (
                  <span aria-hidden className="text-xs text-muted/60">
                    →
                  </span>
                ) : null}
                <span
                  className="card flex items-center gap-1.5 px-2 py-1"
                  data-best-in-slot={index === 0 ? "true" : undefined}
                >
                  <ItemIcon item={item} size={20} showName />
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
