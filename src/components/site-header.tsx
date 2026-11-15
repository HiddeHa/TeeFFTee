import Link from "next/link";

import { site } from "@/content/site";

import { CoachingCTA } from "./coaching-cta";
import { SiteNav } from "./site-nav";

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
            <SiteNav className="hidden xl:flex" />
            {/* A plain link, not the session hook: the header is on every page,
                and reading the session here would make all of them dynamic. */}
            <Link
              href="/login"
              className="hidden text-xs font-medium text-muted transition-colors hover:text-accent sm:block"
            >
              Sign in
            </Link>
            <CoachingCTA variant="header" placement="header" />
          </div>
        </div>

        <SiteNav className="flex overflow-x-auto pb-2 xl:hidden" />
      </div>
    </header>
  );
}
