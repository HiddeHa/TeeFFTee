import type { Metadata } from "next";
import Link from "next/link";
import { SignInWithFreebuff, SignOutButton } from "@freebuff/auth/react";

import { DataNote } from "@/components/data-note";
import { site } from "@/content/site";
import { getFreebuffUser, isFreebuffConfigured } from "@/lib/freebuff";

/**
 * The login page.
 *
 * Dynamic because its whole answer is "who is this request", which is a cookie.
 * A cached login page would show one visitor's name to the next one.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Sign in to ${site.name} with your Freebuff account.`,
  alternates: { canonical: "/login" },
  // A login page is not a search result.
  robots: { index: false, follow: true },
};

const BUTTON =
  "inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-[#1a1204] transition-opacity hover:opacity-90";

export default async function LoginPage() {
  const configured = isFreebuffConfigured();
  const user = configured ? await getFreebuffUser() : null;

  // Rendered as text, never as HTML. Every profile field except `sub` can be
  // absent, so the label falls back rather than printing "Signed in as undefined".
  const label = user?.name ?? user?.email ?? null;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6">
      <nav className="pt-6 text-xs text-muted">
        <Link href="/" className="hover:text-accent">
          Home
        </Link>
        <span className="px-2">/</span>
        <span className="text-fg/70">Sign in</span>
      </nav>

      <header className="mt-4">
        <h1 className="text-3xl font-semibold sm:text-4xl">Sign in</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
          {site.name} uses Sign in with Freebuff, so there is no password to choose or store
          here. Freebuff verifies who you are and this site only learns a stable account id —
          plus your name and email if your account shares them.
        </p>
      </header>

      {!configured ? (
        <div className="mt-6">
          <DataNote>
            Sign in is not configured in this environment: <code className="text-fg/70">
              FREEBUFF_CLIENT_ID
            </code>{" "}
            and <code className="text-fg/70">APP_ORIGIN</code> are both required. Sites injects
            them on deploy; for local work, put the development values into{" "}
            <code className="text-fg/70">.env</code>. The rest of the site is unaffected — every
            page renders without an account.
          </DataNote>
        </div>
      ) : user ? (
        <section className="card mt-6 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Signed in
          </p>
          <p className="mt-2 text-lg font-semibold">{label ?? "Your Freebuff account"}</p>
          {user.email && label !== user.email ? (
            <p className="mt-0.5 text-xs text-muted">{user.email}</p>
          ) : null}
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            This session lasts up to 30 days of inactivity. Signing out ends it at Freebuff as
            well, not just in this browser.
          </p>
          <div className="mt-4">
            {/* Sign-out is a POST: a link would let another site sign you out. */}
            <SignOutButton
              returnTo="/login"
              className="inline-flex items-center justify-center rounded-md border border-line px-4 py-2 text-sm font-semibold text-fg/85 transition-colors hover:border-accent/60 hover:text-accent"
            >
              Sign out
            </SignOutButton>
          </div>
        </section>
      ) : (
        <section className="card mt-6 p-5">
          <p className="text-sm leading-relaxed text-muted">
            Signing in gives this site your Freebuff identity. No page is restricted behind an
            account yet — the point is that anything per-account later keys on the id Freebuff
            returns, never on an email or an id the browser claims.
          </p>
          <div className="mt-4">
            {/* `returnTo` is a local path; the SDK rejects another origin. */}
            <SignInWithFreebuff returnTo="/login" className={BUTTON}>
              Sign in with Freebuff
            </SignInWithFreebuff>
          </div>
        </section>
      )}
    </div>
  );
}
