import type { PositionedUnit } from "@/content/types";
import { AssetImage } from "@/components/asset-image";
import { COST_EDGE, COST_LABEL } from "@/lib/costs";
import { classNames } from "@/lib/format";

const ROWS = 4;
const COLS = 7;

/**
 * The starting layout, drawn on the player's half-board (4 rows × 7 columns).
 *
 * These coordinates are **authored** in `src/content/comps.ts`, not derived from
 * crawled matches: the TFT payload has no board coordinates at all, and
 * `participant_units.slot` is array order. So this is a sound default to adjust,
 * not a solved board — the page says as much next to it.
 *
 * Row 0 is the front line. Nothing here is a made-up champion: a position whose
 * unit id the catalogue cannot resolve renders as its raw id, exactly like an
 * unresolved board slot.
 */
export function PositioningBoard({ units }: { units: PositionedUnit[] }) {
  const byCell = new Map(units.map((unit) => [`${unit.row}:${unit.col}`, unit]));

  return (
    <div>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
        role="img"
        aria-label="Starting board layout"
      >
        {Array.from({ length: ROWS }).map((_, row) =>
          Array.from({ length: COLS }).map((__, col) => {
            const unit = byCell.get(`${row}:${col}`);
            const key = `${row}:${col}`;

            if (!unit) {
              return (
                <div
                  key={key}
                  className="aspect-square rounded border border-dashed border-line/50 bg-ink/40"
                />
              );
            }

            const unresolved = unit.name === null;

            return (
              <div
                key={key}
                className={classNames(
                  "aspect-square overflow-hidden rounded border border-l-2 border-line bg-raised",
                  unresolved ? "border-l-line" : (COST_EDGE[unit.cost ?? 0] ?? "border-l-line"),
                )}
                title={`${unit.name ?? unit.unitId}${unit.cost === null ? "" : ` · ${COST_LABEL[unit.cost] ?? unit.cost}`}`}
              >
                <div className="flex h-full flex-col items-center justify-center gap-0.5 p-1">
                  <AssetImage
                    src={unit.imageUrl}
                    className="h-full max-h-10 w-full object-contain"
                    fallback={
                      <span className="px-0.5 text-center font-mono text-[8px] leading-tight text-muted">
                        {unit.name ?? unit.unitId}
                      </span>
                    }
                  />
                </div>
              </div>
            );
          }),
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted">
        <span>Front line</span>
        <span>Back line</span>
      </div>
    </div>
  );
}
