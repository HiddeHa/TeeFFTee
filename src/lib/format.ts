/** Small formatting helpers. Kept dumb and dependency-free. */

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatPlace(value: number): string {
  return value.toFixed(2);
}

/** 4820 -> "4.8k", 12400 -> "12k" */
export function formatGames(games: number): string {
  if (games < 1000) return String(games);
  if (games < 10_000) return `${(games / 1000).toFixed(1)}k`;
  return `${Math.round(games / 1000)}k`;
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function classNames(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
