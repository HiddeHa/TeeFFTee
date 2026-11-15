import { redirect } from "next/navigation";

/**
 * The tracked-player list became the leaderboard on 2026-11-15, and the tab is
 * named for it. Only the list moved — profiles still live at /players/[puuid] —
 * so this redirects the bare path rather than the whole branch.
 *
 * A permanent redirect would be tidier in `next.config.ts`, but that file is
 * carrying another rename at the moment; a page-level redirect keeps the move
 * self-contained.
 */
export default function PlayersIndexPage() {
  redirect("/leaderboards");
}
