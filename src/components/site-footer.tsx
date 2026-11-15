import Link from "next/link";

import { RIOT_DISCLAIMER, site } from "@/content/site";

const PRODUCT_LINKS = [
  { href: "/meta", label: "Meta" },
  { href: "/teambuilder", label: "Teambuilder" },
  { href: `/patch/${site.currentPatch}`, label: "Patch notes" },
  { href: "/set-19", label: "Set 19" },
  { href: "/coaching", label: "Coaching" },
];

const SITE_LINKS = [
  { href: "/about", label: "About & methodology" },
  { href: "/terms", label: "Terms of service" },
  { href: "/privacy", label: "Privacy policy" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line/80">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm font-semibold">{site.name}</p>
            <p className="mt-2 max-w-xs text-xs leading-relaxed text-muted">
              {site.tagline}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Product
            </p>
            <ul className="mt-3 space-y-2">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-fg/80 hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Site
            </p>
            <ul className="mt-3 space-y-2">
              {SITE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-fg/80 hover:text-accent">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">
              Elsewhere
            </p>
            <ul className="mt-3 space-y-2">
              {site.socials.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-fg/80 hover:text-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Required by Riot's developer policy — keep it visible and verbatim. */}
        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-muted">
          {RIOT_DISCLAIMER}
        </p>
        <p className="mt-3 text-xs text-muted">
          Game data from the Riot Games API. Stats are aggregated across players; no
          individual player data is published.
        </p>
      </div>
    </footer>
  );
}
