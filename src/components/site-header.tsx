import Link from "next/link";

import { site } from "@/content/site";

import { CoachingCTA } from "./coaching-cta";

const NAV = [
  { href: "/comps", label: "Tier list" },
  { href: `/patch/${site.currentPatch}`, label: "Patch notes" },
  { href: "/coaching", label: "Coaching" },
  { href: "/about", label: "About" },
];

function NavLinks({ className }: { className?: string }) {
  return (
    <nav className={className}>
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="whitespace-nowrap rounded px-2 py-1 text-sm text-muted transition-colors hover:text-fg"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/80 bg-ink/85 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              aria-hidden
              className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-black text-[#1a1204]"
            >
              m
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight">{site.name}</span>
              <span className="mt-1 text-[11px] text-muted">
                Set {site.setNumber} · patch {site.currentPatch}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <NavLinks className="hidden items-center gap-1 md:flex" />
            <CoachingCTA variant="header" placement="header" />
          </div>
        </div>

        <NavLinks className="flex items-center gap-1 overflow-x-auto pb-2 md:hidden" />
      </div>
    </header>
  );
}
