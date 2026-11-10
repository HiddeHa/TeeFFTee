import type { Metadata } from "next";

import { DataNote } from "@/components/data-note";
import { LegalSection } from "@/components/legal-section";
import { RIOT_DISCLAIMER, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms that apply to using ${site.name} and booking coaching.`,
  alternates: { canonical: "/terms" },
};

/**
 * ⚠️ STARTER TEXT, NOT LEGAL ADVICE.
 * Riot's production key process checks for a real terms page, so this exists to
 * satisfy that — but have it reviewed before you publish or take payments.
 */
export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Terms of service</h1>
        <p className="mt-3 text-sm text-muted">
          Last updated: [date]. Operator: [your legal name], [country].
        </p>
      </header>

      <DataNote>
        This is starter text, not legal advice. Replace the bracketed placeholders and
        have it reviewed before publishing or accepting payments.
      </DataNote>

      <LegalSection n={1} title="Agreement">
        <p>
          By using {site.name} (the “site”) you agree to these terms. If you do not agree,
          do not use the site. These terms apply to the website and to coaching services
          arranged through it.
        </p>
      </LegalSection>

      <LegalSection n={2} title="What this site is">
        <p>
          {site.name} publishes aggregate statistics and commentary about Teamfight Tactics,
          a game owned by Riot Games, together with offers for one-to-one coaching. The
          statistics are computed from matches retrieved through the Riot Games API. The
          commentary is opinion.
        </p>
      </LegalSection>

      <LegalSection n={3} title="No affiliation with Riot Games">
        <p>{RIOT_DISCLAIMER}</p>
        <p>
          Riot Games does not sponsor or endorse this site, and has no responsibility for
          its content.
        </p>
      </LegalSection>

      <LegalSection n={4} title="Acceptable use">
        <p>You agree not to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            scrape, mirror or resell the site's data, or place unreasonable load on it;
          </li>
          <li>attempt to access parts of the site that are not public;</li>
          <li>use the site in any way that breaks Riot Games' own terms or policies.</li>
        </ul>
      </LegalSection>

      <LegalSection n={5} title="Coaching services">
        <p>
          Coaching sessions are booked through a third-party scheduling service and are
          subject to that provider's terms and payment rules. Sessions are personal to the
          buyer, are not transferable, and are not a licence to resell the material.
        </p>
        <p>
          Rescheduling is available up to 24 hours before a session. No-shows are not
          refunded. Nothing in these terms removes rights you have under mandatory consumer
          law in your country.
        </p>
      </LegalSection>

      <LegalSection n={6} title="No guarantee of results">
        <p>
          Coaching is advice. It is not a promise of a rank, a placement or an outcome, and
          no refund is offered on the basis of results. We do not play on your account, and
          we will refuse any request to do so.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Intellectual property">
        <p>
          The written analysis, comp names and site design are ours. Game assets, champion
          names and patch information belong to Riot Games and are used under Riot's
          community and developer policies.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Third-party links">
        <p>
          The site links to external services, including the booking provider, Discord and
          social platforms. We do not control those services and are not responsible for
          their content or their handling of your data.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Availability and changes">
        <p>
          The site is provided as-is and may be unavailable, incomplete or wrong. Statistics
          depend on third-party data that can be delayed, rate-limited or changed without
          notice. We may change, suspend or discontinue any part of the site at any time.
          Material changes to these terms will be reflected in the date above.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Limitation of liability">
        <p>
          To the extent permitted by law, we are not liable for indirect or consequential
          loss, loss of data, or loss arising from decisions you make about a video game.
          Nothing here limits liability that cannot be limited by law.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Governing law">
        <p>
          These terms are governed by the laws of [country], without regard to conflict of
          law rules, and the courts of [jurisdiction] have exclusive jurisdiction.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Contact">
        <p>
          Questions about these terms:{" "}
          <a href={`mailto:${site.contactEmail}`} className="text-accent hover:underline">
            {site.contactEmail}
          </a>
          .
        </p>
      </LegalSection>
    </div>
  );
}
