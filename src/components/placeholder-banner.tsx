import { PLACEHOLDER_CONTENT } from "@/content/flags";

/**
 * Renders while the site still contains seeded placeholder content.
 * Deliberately impossible to miss — see src/content/flags.ts.
 */
export function PlaceholderBanner() {
  if (!PLACEHOLDER_CONTENT) return null;

  return (
    <div className="border-b border-accent/25 bg-accent/10">
      <div className="mx-auto max-w-6xl px-4 py-2 text-xs leading-relaxed text-accent sm:px-6">
        <span className="font-semibold">Preview build.</span> Comps, prices, the booking
        link and the author block are placeholders. Replace{" "}
        <code className="rounded bg-ink/40 px-1 py-0.5 font-mono text-[11px]">
          src/content/*
        </code>{" "}
        then set the flag in{" "}
        <code className="rounded bg-ink/40 px-1 py-0.5 font-mono text-[11px]">
          src/content/flags.ts
        </code>{" "}
        to <code className="font-mono text-[11px]">false</code>.
      </div>
    </div>
  );
}
