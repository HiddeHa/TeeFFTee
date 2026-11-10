import type { ReactNode } from "react";

/**
 * The honest empty state.
 *
 * Wherever there is no sample, the site says so explicitly. Never render 0% as
 * if it were a measurement — see blueprint §8 and the roadmap's "never cut" list.
 */
export function DataNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-line bg-surface/60 px-3 py-2 text-xs leading-relaxed text-muted">
      {children}
    </p>
  );
}
