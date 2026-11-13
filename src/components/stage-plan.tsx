import type { CompStage } from "@/content/types";

/**
 * The gameplan, stage by stage.
 *
 * This replaces the single `leveling` paragraph as the thing a reader scans: the
 * same plan, broken at the points where the decision actually changes. `leveling`
 * stays on the comp as the summary line.
 */
export function StagePlan({ stages }: { stages: CompStage[] }) {
  if (stages.length === 0) return null;

  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {stages.map((stage) => (
        <li key={stage.stage} className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
            {stage.stage === "5+" ? "Stage 5+" : `Stage ${stage.stage}`}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-fg/80">{stage.plan}</p>
        </li>
      ))}
    </ol>
  );
}
