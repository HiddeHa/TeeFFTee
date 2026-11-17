import Link from "next/link";

import { classNames } from "@/lib/format";

/**
 * Set 19's sections, as routes rather than one long page with a query parameter.
 *
 * Separate routes keep every section statically rendered and deep-linkable; a
 * `?section=` parameter would opt the page into dynamic rendering on every
 * request just to hide two thirds of it. The active state is passed in because a
 * link cannot know which page rendered it.
 */
const SECTIONS = [
  { key: "overview", label: "Overview", href: "/set-19" },
  { key: "units", label: "Units", href: "/set-19/units" },
  { key: "traits", label: "Traits", href: "/set-19/traits" },
  { key: "unlockables", label: "Unlockables", href: "/set-19/unlockables" },
] as const;

export type Set19Section = (typeof SECTIONS)[number]["key"];

export function Set19Tabs({ active }: { active: Set19Section }) {
  return (
    <nav
      aria-label="Set 19 sections"
      className="flex items-center gap-1 overflow-x-auto border-b border-line"
    >
      {SECTIONS.map((section) => (
        <Link
          key={section.key}
          href={section.href}
          aria-current={active === section.key ? "page" : undefined}
          className={classNames(
            "relative whitespace-nowrap px-2.5 py-2.5 text-sm font-semibold transition-colors sm:px-3",
            active === section.key ? "text-fg" : "text-muted hover:text-fg",
          )}
        >
          {section.label}
          {active === section.key ? (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
          ) : null}
        </Link>
      ))}
    </nav>
  );
}
