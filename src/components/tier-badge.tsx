import type { Tier } from "@/content/types";
import { classNames } from "@/lib/format";

const STYLES: Record<Tier, string> = {
  S: "border-tier-s/35 bg-tier-s/15 text-tier-s",
  A: "border-tier-a/35 bg-tier-a/15 text-tier-a",
  B: "border-tier-b/35 bg-tier-b/15 text-tier-b",
  C: "border-tier-c/35 bg-tier-c/15 text-tier-c",
};

export function TierBadge({
  tier,
  size = "md",
}: {
  tier: Tier;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={classNames(
        "inline-flex shrink-0 items-center justify-center rounded-md border font-bold",
        size === "md" ? "h-8 w-8 text-sm" : "h-6 w-6 text-xs",
        STYLES[tier],
      )}
      title={`Tier ${tier}`}
    >
      {tier}
    </span>
  );
}
