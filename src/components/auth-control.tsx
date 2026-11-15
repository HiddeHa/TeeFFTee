"use client";

import { SignInWithFreebuff, SignOutButton, useFreebuffUser } from "@freebuff/auth/react";

/**
 * Who is signed in, in the site header.
 *
 * A CLIENT ISLAND ON PURPOSE
 *  - The header sits in the root layout, so reading the session here on the
 *    server would touch cookies on every route and make every page dynamic —
 *    losing the prerendering the whole site is built on.
 *  - This reads `/auth/freebuff/session` from the browser instead. Pages stay
 *    static, and the header fills in once, after hydration.
 *  - It is display only. Access is decided on the server by `getUser`; hiding
 *    or showing this control grants nothing.
 */
export function AuthControl() {
  const { user, isLoading } = useFreebuffUser();

  // A placeholder rather than a "Sign in" link, so a signed-in visitor never
  // sees the signed-out label flash before the session arrives.
  if (isLoading) {
    return (
      <span
        aria-hidden
        className="hidden h-4 w-14 animate-pulse rounded bg-raised/60 sm:block"
      />
    );
  }

  if (!user) {
    return (
      <SignInWithFreebuff
        returnTo="/login"
        className="hidden text-xs font-medium text-muted transition-colors hover:text-accent sm:block"
      >
        Sign in
      </SignInWithFreebuff>
    );
  }

  // Every profile field but `sub` can be absent, so the label falls back rather
  // than printing "Signed in as undefined". Rendered as text, never as HTML.
  const label = user.name ?? user.email ?? "Your account";

  return (
    <span className="hidden items-center gap-2 sm:flex">
      <span className="max-w-28 truncate text-xs font-medium text-fg/85" title={label}>
        {label}
      </span>
      <SignOutButton
        returnTo="/"
        className="rounded border border-line px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent/60 hover:text-accent"
      >
        Sign out
      </SignOutButton>
    </span>
  );
}
