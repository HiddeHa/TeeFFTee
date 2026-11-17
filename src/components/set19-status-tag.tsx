import type { RevealStatus } from "@/content/set-19";
import { classNames } from "@/lib/format";

const LABEL: Record<RevealStatus, string> = {
  riot: "From Riot",
  devdrop: "Dev Drop",
  coverage: "Coverage, not Riot",
  unknown: "Not announced",
};

/** Where one Set 19 claim came from, rendered the same way on every page. */
export function Set19StatusTag({ status }: { status: RevealStatus }) {
  return (
    <span
      className={classNames(
        "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        status === "riot" && "border-accent/40 bg-accent/10 text-accent",
        status === "devdrop" && "border-good/40 bg-good/10 text-good",
        status === "coverage" && "border-line bg-raised text-muted",
        status === "unknown" && "border-dashed border-line bg-transparent text-muted/80",
      )}
    >
      {LABEL[status]}
    </span>
  );
}
