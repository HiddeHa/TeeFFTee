import { AssetImage } from "@/components/asset-image";
import type { ResolvedItem } from "@/content/types";
import { classNames } from "@/lib/format";

/**
 * One item, as an icon (and optionally its name).
 *
 * Same rule as every other catalogue lookup on the site: an id the item catalogue
 * does not know gets a dashed placeholder and its raw id, never a guessed name.
 * Icons are plain `<img>` for the reason `CompBoard` documents — these PNGs are
 * already small and the Next image optimizer would proxy every one of them.
 */
export function ItemIcon({
  item,
  size = 20,
  showName = false,
  className,
}: {
  item: ResolvedItem;
  size?: number;
  showName?: boolean;
  className?: string;
}) {
  const unresolved = item.name === null;

  return (
    <span
      className={classNames("inline-flex min-w-0 items-center gap-1.5", className)}
      title={unresolved ? `${item.id} — not in the item catalogue` : (item.name ?? item.id)}
    >
      <AssetImage
        src={item.imageUrl}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded border border-line bg-surface object-cover"
        fallback={
          <span
            aria-hidden
            style={{ width: size, height: size }}
            className="shrink-0 rounded border border-dashed border-line bg-surface"
          />
        }
      />
      {showName ? (
        <span
          className={classNames(
            "truncate",
            unresolved ? "font-mono text-[10px] text-muted/70" : "text-[11px] text-fg/80",
          )}
        >
          {item.name ?? item.id}
        </span>
      ) : null}
    </span>
  );
}
