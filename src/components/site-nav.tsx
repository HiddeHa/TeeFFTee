"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { site } from "@/content/site";

import { classNames } from "@/lib/format";

const NAV = [
  { href: "/meta", label: "Meta" },
  { href: "/leaderboards", label: "Leaderboards" },
  { href: "/tier-lists", label: "My tier lists" },
  { href: "/teambuilder", label: "Teambuilder" },
  { href: "/guides", label: "Guides" },
  { href: `/patch/${site.currentPatch}`, label: "Patch notes" },
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
    <nav className={classNames("items-center gap-1.5", className)}>
      {NAV.map((item) => {
        const current = isCurrent(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={current ? "page" : undefined}
            className={classNames(
              "inline-flex items-center whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
              current
                ? "border-accent bg-accent font-semibold text-[#1a1204]"
                : "border-line bg-raised text-muted hover:border-[#343a4b] hover:bg-[#1c2030] hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
