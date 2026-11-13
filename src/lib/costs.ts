/** Full border colour per cost, for portrait tiles where there is no left edge. */
export const COST_BORDER: Record<number, string> = {
  0: "border-slate-600",
  1: "border-slate-400",
  2: "border-emerald-400",
  3: "border-sky-400",
  4: "border-violet-400",
  5: "border-amber-400",
};

/** Left border encodes champion cost, the way the in-game shop does. */
export const COST_EDGE: Record<number, string> = {
  0: "border-l-slate-600",
  1: "border-l-slate-500",
  2: "border-l-emerald-500",
  3: "border-l-sky-500",
  4: "border-l-violet-500",
  5: "border-l-amber-400",
};

export const COST_LABEL: Record<number, string> = {
  0: "Summon",
  1: "1 cost",
  2: "2 cost",
  3: "3 cost",
  4: "4 cost",
  5: "5 cost",
};
