import Link from "next/link";

export type FilterOption = { label: string; value: string };

/**
 * URL-driven filter chips — no client JS, no state. Every filter is a real,
 * shareable, server-rendered URL, which is what makes filtered views indexable
 * and lets the crawler's output be linked to directly.
 */
export function FilterRow({
  label,
  paramName,
  options,
  activeValue,
  basePath,
  current,
}: {
  label: string;
  paramName: string;
  options: FilterOption[];
  /** "" means "no filter" */
  activeValue: string;
  basePath: string;
  current: Record<string, string | undefined>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const query = new URLSearchParams();
          for (const [key, value] of Object.entries(current)) {
            if (value) query.set(key, value);
          }
          if (option.value) query.set(paramName, option.value);
          else query.delete(paramName);

          const qs = query.toString();
          return (
            <Link
              key={option.value || "all"}
              href={qs ? `${basePath}?${qs}` : basePath}
              className="chip"
              data-active={option.value === activeValue}
            >
              {option.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
