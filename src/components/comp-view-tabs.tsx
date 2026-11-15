import Link from "next/link";

import { classNames } from "@/lib/format";

/**
 * Board / Stats — two routes, not one page with a query parameter.
 *
 * Separate routes keep both pages statically generated and revalidated; a
 * `?view=` parameter would opt the tier list into dynamic rendering on every
 * request just to switch a table. The active state is passed in, because a link
 * cannot know which page rendered it.
 */
const VIEWS = [
  { key: "board", label: "Board", href: "/meta" },
  { key: "stats", label: "Stats", href: "/meta/stats" },
] as const;

export type CompView = (typeof VIEWS)[number]["key"];

export function CompViewTabs({ active }: { active: CompView }) {
  return (
    <nav aria-label="View" className="flex items-center gap-1 border-b border-line">
      {VIEWS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          aria-current={active === tab.key ? "page" : undefined}
          className={classNames(
            "relative px-3 py-2.5 text-sm font-semibold transition-colors",
            active === tab.key ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {tab.label}
          {active === tab.key ? (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
