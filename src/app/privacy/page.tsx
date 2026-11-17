import type { Metadata } from "next";

import { DataNote } from "@/components/data-note";
import { LegalSection } from "@/components/legal-section";
import { RIOT_DISCLAIMER, site } from "@/content/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `What ${site.name} collects, what it deliberately does not collect, and how game data is handled.`,
  alternates: { canonical: "/privacy" },
};

/**
 * ⚠️ STARTER TEXT, NOT LEGAL ADVICE.
 * Keep it accurate: if you add analytics, accounts or payments later, update
 * sections 2, 4 and 6 to match what is actually collected.
 */
export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <header className="py-12">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">
          Legal
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Privacy policy</h1>
        <p className="mt-3 text-sm text-muted">
          Last updated: [date]. Controller: [your legal name], [country].
        </p>
      </header>

      <DataNote>
        This is starter text, not legal advice. It describes what the site collects today —
        update it whenever you add analytics, accounts or payments.
      </DataNote>

      <LegalSection n={1} title="In short">
        <p>
          There are no accounts and no logins. The site counts visits in aggregate, and it
          shows aggregate game statistics. It does not publish or sell information about
          individual players.
        </p>
      </LegalSection>

      <LegalSection n={2} title="What we collect">
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong className="text-fg">Server logs:</strong> IP address, browser type,
            requested page and timestamp, retained briefly for security and debugging.
          </li>
          <li>
            <strong className="text-fg">Aggregate analytics:</strong> page views and
            referring site, in a form that does not identify you individually.
          </li>
          <li>
            <strong className="text-fg">Coaching enquiries:</strong> whatever you choose to
            send when you book a session, handled by our booking provider.
          </li>
        </ul>
      </LegalSection>

      <LegalSection n={3} title="What we do not collect">
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>No Riot accounts, passwords or login credentials.</li>
          <li>No published player names, Riot IDs or match histories.</li>
          <li>No payment card details — payments are handled by the booking provider.</li>
          <li>No advertising trackers or third-party retargeting pixels.</li>
        </ul>
      </LegalSection>

      <LegalSection n={4} title="Cookies and analytics">
        <p>
          The site sets no cookies and no advertising or retargeting trackers. It counts
          page views with Umami, a cookieless analytics service: a page view records the
          path, the referring site, and coarse device, browser and country information —
          nothing that identifies you. No cookie is written, no identifier is stored on
          your device, and no full IP address is retained, which is why there is no
          consent banner.
        </p>
        <p className="mt-3">
          Coaching links are counted the same way, as an aggregate click with the placement
          it appeared in. If analytics is ever changed to something that stores an
          identifier, this section changes before it takes effect.
        </p>
      </LegalSection>

      <LegalSection n={5} title="Game data from Riot">
        <p>
          Match data is retrieved from the Riot Games API under Riot's developer policies.
          It is used to compute aggregate statistics such as average placement and pick
          rate per composition. Player identifiers are used only to discover matches and are
          never displayed on the site.
        </p>
        <p>
          Per Riot's policy, this site does not present win rates for Legends or
          Legend-based augments, and does not provide live in-game recommendations.
        </p>
      </LegalSection>

      <LegalSection n={6} title="Third-party services">
        <p>
          We rely on a hosting provider, a database provider and a booking provider. These
          process data on our behalf under their own terms. Links to Discord, Twitch or
          social platforms leave this site and are governed by those platforms' policies.
        </p>
      </LegalSection>

      <LegalSection n={7} title="Legal basis">
        <p>
          Where the GDPR applies, we rely on legitimate interests for security logging and
          aggregate analytics, and on the performance of a contract for information you send
          in order to book coaching.
        </p>
      </LegalSection>

      <LegalSection n={8} title="Retention">
        <p>
          Server logs are kept for a short period and then deleted. Coaching correspondence
          is kept while the coaching relationship is active and for as long as required for
          accounting or tax purposes.
        </p>
      </LegalSection>

      <LegalSection n={9} title="Your rights">
        <p>
          Depending on where you live, you may have the right to access, correct, delete or
          restrict the processing of your personal data, and to object to processing. To
          exercise any of these, email{" "}
          <a href={`mailto:${site.contactEmail}`} className="text-accent hover:underline">
            {site.contactEmail}
          </a>
          . You also have the right to complain to your local data protection authority.
        </p>
      </LegalSection>

      <LegalSection n={10} title="Children">
        <p>
          The site is not directed at children under 16, and we do not knowingly collect
          their personal data.
        </p>
      </LegalSection>

      <LegalSection n={11} title="Changes">
        <p>
          If this policy changes materially, the date at the top changes and, where
          appropriate, we will note it on the site.
        </p>
      </LegalSection>

      <LegalSection n={12} title="Contact">
        <p>
          Privacy questions:{" "}
          <a href={`mailto:${site.contactEmail}`} className="text-accent hover:underline">
            {site.contactEmail}
          </a>
          .
        </p>
        <p className="mt-4 border-t border-line pt-4 text-xs text-muted">
          {RIOT_DISCLAIMER}
        </p>
      </LegalSection>
    </div>
  );
}
