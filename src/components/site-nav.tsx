"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { site } from "@/content/site";

import { classNames } from "@/lib/format";

type NavItem = { href: string; label: string; feature?: boolean };

/**
 * `feature` is the set still to come: it sits behind a divider, runs larger and
 * uses the accent, because it is the one tab that is not about the set the site
 * currently analyses.
 */
const NAV: NavItem[] = [
  { href: "/meta", label: "Meta" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/tier-lists", label: "My tier lists" },
  { href: "/teambuilder", label: "Teambuilder" },
  { href: "/ainalyses", label: "AInalyses" },
  { href: "/lab", label: "Lab" },
  { href: "/guides", label: "Guides" },
  { href: `/patch/${site.currentPatch}`, label: "Patch notes" },
  { href: "/set-19", label: "Set 19", feature: true },
  { href: "/coaching", label: "Coaching" },
  { href: "/about", label: "About" },
];

/**
 * The tab row, styled as outlined buttons (design option A).
 *
 * Client-side only because the current page needs `usePathname`; the header itself
 * stays a server component. A tab is current when the path is the tab or sits
 * beneath it, so /meta/riftbeast-brambleback still lights up "Meta".
 */
export function SiteNav({ className }: { className?: string }) {
  const pathname = usePathname();

  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className={classNames("items-center gap-1", className)}>
      {NAV.map((item) => {
        const current = isCurrent(item.href);
        return (
          <Fragment key={item.href}>
            {item.feature ? (
              <span aria-hidden className="mx-1.5 h-5 w-px shrink-0 bg-line" />
            ) : null}
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className={classNames(
                "inline-flex items-center whitespace-nowrap rounded-lg border transition-colors",
                item.feature ? "px-3.5 py-2 text-base font-semibold" : "px-2 py-1.5 text-sm",
                current
                  ? "border-accent bg-accent font-semibold text-[#1a1204]"
                  : item.feature
                    ? "border-accent/50 bg-accent/10 text-accent hover:border-accent hover:bg-accent/15 hover:text-accent"
                    : "border-line bg-raised text-muted hover:border-[#343a4b] hover:bg-[#1c2030] hover:text-fg",
              )}
            >
              {item.label}
            </Link>
          </Fragment>
        );
      })}
    </nav>
  );
}
