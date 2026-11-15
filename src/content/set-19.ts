/**
 * SET 19 — PRISMATIC TOUR
 *
 * This is the one page on the site about a set that is not live yet, so it follows
 * a stricter rule than the rest: every claim carries where it came from, and
 * nothing is inferred from a leak or a datamine. Statuses, rendered differently:
 *
 *   "riot"      — stated by Riot in a dev post, patch note, schedule or their own video.
 *   "devdrop"   — shown in Riot's 15 November Dev Drop, read here through a
 *                 third-party reveal page. Riot's numbers, second-hand source.
 *   "coverage"  — reported by a third party and not contradicted by Riot.
 *   "unknown"   — nobody has published it. Listed on purpose: a page about an
 *                 unreleased set that only lists what is known reads as complete,
 *                 and that is how a reader ends up planning around a guess.
 *
 * Values that do not exist yet (per-breakpoint percentages, most unlock quests)
 * are absent rather than estimated. The breakpoint *tiers* are in, because those
 * are integers the client data carries; the "?%" inside each tier is not, and a
 * plausible stand-in would be worse than a gap.
 */

/** The day this page's claims were last checked against their sources. */
export const SET_19_AS_OF = "2026-11-15";

export type RevealStatus = "riot" | "devdrop" | "coverage" | "unknown";

export type SetFact = {
  title: string;
  body: string;
  status: RevealStatus;
};

export const set19 = {
  number: 19,
  name: "Prismatic Tour",
  /** The live set the rest of the site still analyses. */
  liveSet: 18,
  liveSetName: "Enchanted Wilds",

  /**
   * Riot's own unlocks video ends on "live on December 2nd"; Riot's patch schedule
   * lists patch 19.1 for December 1. Both are Riot sources and they disagree by a
   * day, so both are shown instead of picking the tidier one. The PBE date is a
   * third-party expectation, not a Riot announcement.
   */
  patch: "19.1",
  scheduleDate: "1 December 2026",
  launchDate: "2 December 2026",
  nextPatch: "19.2",
  nextPatchDate: "15 December 2026",
  pbeDate: "17 November 2026",
  devDropDate: "15 November 2026",
  cinematicDate: "14 November 2026",
} as const;

export type ScheduleRow = {
  patch: string;
  date: string;
  note: string;
  status: RevealStatus;
};

export const set19Schedule: ScheduleRow[] = [
  {
    patch: "18.6",
    date: "4 November 2026",
    note: "Last regular Set 18 patch, and the standalone client launch.",
    status: "riot",
  },
  {
    patch: "18.6B",
    date: "11 November 2026",
    note: "Balance follow-up on the Set 18 ladder.",
    status: "riot",
  },
  {
    patch: "PBE",
    date: "17 November 2026",
    note: "Set 19 on the test server. Expected, not announced by Riot.",
    status: "coverage",
  },
  {
    patch: "19.1",
    date: "1 December 2026",
    note: "Riot's published patch schedule: the patch that opens Set 19.",
    status: "riot",
  },
  {
    patch: "19.1",
    date: "2 December 2026",
    note: "The date Riot's own Set 19 video gives for the set going live.",
    status: "riot",
  },
  {
    patch: "19.2",
    date: "15 December 2026",
    note: "First balance patch of the set.",
    status: "riot",
  },
];

/** The Dev Drop's headline numbers, all from Riot's own set reveal. */
export type DevDropStat = { value: string; label: string; note: string };

export const set19DevDropStats: DevDropStat[] = [
  { value: "94", label: "champions", note: "Riot's own count for the set, across 24 genres." },
  { value: "24", label: "genres", note: "From 14 bands and 10 solo artists." },
  { value: "30+", label: "unlockable", note: "Of the 94, across three unlock categories." },
  { value: "5", label: "Prismatic traits", note: "Pentakill, Ionic Spark, K/DA, Heartsteel, True Damage." },
  { value: "350+", label: "augments", note: "Including 6 hero augments." },
  { value: "10k+", label: "soundtrack mixes", note: "Riot's figure for the adaptive score." },
];

export type DevDropMechanic = { title: string; body: string };

export const set19Mechanics: DevDropMechanic[] = [
  {
    title: "The music is the mechanic, not the menu",
    body:
      "The soundtrack remixes itself against your board: each genre has its own track, reaching a new trait tier plays a more hyped version of that genre, and the planning phase gets a calmer mix before combat. Riot puts the score at over ten thousand combinations, which matters for one practical reason — what you hear is a read on what you have.",
  },
  {
    title: "Solo artists take the lead",
    body:
      "Ten of the roster are solo artists rather than bands. They can trade solos or take over the backing track, and each one gets their own song — including Baron Nashor, who occupies two team slots as a 7-cost.",
  },
  {
    title: "Prismatic traits come from quests, not emblems",
    body:
      "The five Prismatic traits can no longer be forced with an emblem. You pick one of the five and complete a quest line that unlocks its Prismatic tier, which is a redesign of how a board reaches its ceiling — the top tier is something you commit to, not something a carousel hands you.",
  },
];

export type PrismaticTrait = {
  name: string;
  /** Integer breakpoint tiers that the client data carries. */
  tiers: string;
  gist: string;
};

export const set19PrismaticTraits: PrismaticTrait[] = [
  {
    name: "True Damage",
    tiers: "3 / 5, plus a Prismatic tier",
    gist:
      "A streak trait with two sides. A-Side earns Bling from winning player combat, B-Side from losing; every few rounds you either cash the Bling in or Keep Rising. Its Prismatic tier plays a track — KNOW MY NAME on the A-Side, GIANTS on the B-Side — and boosts the whole band's true damage.",
  },
  {
    name: "K/DA",
    tiers: "3 / 5 / 7 / 10 / 13 / 15 / 21",
    gist:
      "K/DA champions release a new song as their total star level climbs, and each song adds power: mana reduction, a health shield, attack speed, then a boost to everything before it, a stun, and max-health burn. At 21 the members ascend to 4-star.",
  },
  {
    name: "Pentakill",
    tiers: "3 / 5 / 7",
    gist:
      "Members gain attack damage and ability power, and the first enemies to drop below a health threshold are executed and replaced by an allied ghoul. At the top tier the first death summons the Iron Maiden instead.",
  },
  {
    name: "Heartsteel",
    tiers: "Prismatic quest trait",
    gist:
      "Back from Remix Rumble, with its payouts tied to its own champions' stats rather than a flat team buff. The exact per-champion numbers were still placeholders in the reveal data.",
  },
  {
    name: "Ionic Spark",
    tiers: "Prismatic quest trait",
    gist:
      "An item name turned into a trait, sitting alongside Heartsteel as one of the two Prismatic lines whose effect text was not readable in the reveal data at the time of writing.",
  },
];

export type UnlockCategory = { name: string; body: string };

export const set19UnlockCategories: UnlockCategory[] = [
  {
    name: "Flexible",
    body:
      "Cheap quests that ask for something you were probably doing anyway. Aphelios is the example Riot gave: put a Recurve Bow on a Heartsteel champion.",
  },
  {
    name: "Capstone",
    body:
      "Quests that pay a board already committed to a band. Mordekaiser wants eleven unique Pentakill star levels, so he rewards depth rather than a pivot.",
  },
  {
    name: "Chase",
    body:
      "The 7-costs — Smeech, Baron Nashor, Rakan and Sona — with conditions that read like late-game objectives: level 9 with a set number of non-unique traits, a win and loss streak at level 8, and so on.",
  },
];

export const set19Confirmed: SetFact[] = [
  {
    title: "The name and the theme",
    body:
      "Set 19 is Prismatic Tour, a music set built around League's bands. Riot promised a global music event on its 2026 roadmap and confirmed the theme in its 2 November dev post; the name and reveal schedule went out on 12–13 November, and the cinematic landed on 14 November.",
    status: "riot",
  },
  {
    title: "True Damage has two sides",
    body:
      "A streak trait you set like a record: the A-side is built for win streaking, the B-side for a loss streak, and the Dev Drop filled in the currency — Bling — and the choice every few rounds to cash out or keep the streak alive. What each tier pays in percentages was still a placeholder in the reveal data.",
    status: "devdrop",
  },
  {
    title: "Unlocks are back",
    body:
      "Some champions are not in the shop when a game starts. Each has a quest, and finishing it adds that champion to your next shop for the rest of the game. Over 30 of the 94 champions unlock this way, in three categories.",
    status: "devdrop",
  },
  {
    title: "The Tour Collection",
    body:
      "A room in the client you decorate as you play Set 19, with memorabilia from the set's bands and more than 70 customization options. It arrives with patch 19.1 and is the first in-client feature Riot built the standalone client for.",
    status: "riot",
  },
  {
    title: "Rewards for the Unreal move",
    body:
      "Player appreciation missions open in 19.1: one game of Set 19 pays 500 Treasure Tokens, twenty games pays a random Mythic Chibi from a Mythic-only banner. Owners of a Mythic Tactician or Arena from before 18.7 get two Mythic Medallions; Prestige Tactician owners get an unannounced Mythic Chibi.",
    status: "coverage",
  },
  {
    title: "Cosmetics stop being shared with League",
    body:
      "From 19.1, Little Legends released with Set 19 can no longer follow you into ARAM, though everything released earlier still can. TFT emotes split from League's at 19.2. Both changes come from the move to a separate client and engine.",
    status: "riot",
  },
  {
    title: "Convergence Fest follows the launch",
    body:
      "Riot's in-person TFT and Riftbound event runs 11–13 December 2026 at the Las Vegas Convention Center: the TFT Vegas Open open bracket, the Riftbound North America Regional Championship, dev panels and showmatches. Riot has not said which set the Vegas Open is played on.",
    status: "riot",
  },
];

export type UnlockCard = {
  champion: string;
  quest: string;
  shown: string;
};

/** The five cards in Riot's 13 November unlocks video. Only two came with a quest. */
export const set19Unlocks: UnlockCard[] = [
  {
    champion: "Aphelios",
    quest: "Equip a Recurve Bow on a Heartsteel champion",
    shown: "Quest given, priced as the easy end",
  },
  {
    champion: "Mordekaiser",
    quest: "Have 11 unique star levels of Pentakill",
    shown: "Quest given, priced as the hard end",
  },
  { champion: "Akali", quest: "Not shown in the video", shown: "Shown arriving in the next shop as a K/DA unit" },
  { champion: "Baron Nashor", quest: "A 7-cost chase unlock", shown: "Card only in the video" },
  { champion: "Teemo", quest: "Collect Hyperpop Hype", shown: "Card only in the video" },
];

export type Unknown = { topic: string; why: string };

export const set19Unknowns: Unknown[] = [
  {
    topic: "The numbers inside every breakpoint",
    why:
      "The tiers are published — 3/5/7 and so on — but the reveal data carries “?%” where the actual values belong. Riot's patch notes are where those land, and until then a comp page has nothing honest to compute.",
  },
  {
    topic: "Most unlock quests",
    why:
      "Riot showed five cards and gave the quest for two. The other 25-plus unlockables are named in the roster but their conditions are not published yet.",
  },
  {
    topic: "Which augment is which, beyond the count",
    why:
      "350+ augments including 6 hero augments is the count. The pool itself, and what the reworked Blue Buff, Crownguard and Rabadon's Deathcap do now, is not something to transcribe from a teaser.",
  },
  {
    topic: "Whether this site will have Set 19 comps on day one",
    why:
      "No. See below — comps and tier lists here are built from crawled Challenger and Grandmaster boards, and on day one there are none.",
  },
];

export type Set19Source = {
  label: string;
  publisher: string;
  href: string;
  date: string;
  kind: "official" | "coverage";
};

export const set19Sources: Set19Source[] = [
  {
    label: "TFT Dev: Client, Next Set Sneak Peek & Appreciation Missions",
    publisher: "Riot Games",
    href: "https://teamfighttactics.leagueoflegends.com/en-us/news/dev/new-client-set-19-tease-and-compensation-rewards",
    date: "2 November 2026",
    kind: "official",
  },
  {
    label: "Patch schedule — Teamfight Tactics",
    publisher: "Riot Games Support",
    href: "https://support.riotgames.com/en-us/tft/events/patch-schedule-teamfight-tactics",
    date: "patch dates for 18.6B, 19.1 and 19.2",
    kind: "official",
  },
  {
    label: "Teamfight Tactics patch 18.6 notes",
    publisher: "Riot Games",
    href: "https://teamfighttactics.leagueoflegends.com/en-us/news/game-updates/teamfight-tactics-patch-18-6",
    date: "4 November 2026",
    kind: "official",
  },
  {
    label: "TFT Set 19: Prismatic Tour Reveal (Dev Drop summary)",
    publisher: "Blitz",
    href: "https://blitz.gg/tft/set19",
    date: "read 15 November 2026",
    kind: "coverage",
  },
  {
    label: "TFT Set 19 Traits: Breakpoints & Champions",
    publisher: "Blitz",
    href: "https://blitz.gg/tft/set19/traits",
    date: "read 15 November 2026",
    kind: "coverage",
  },
  {
    label: "TFT Set 19 Champions: Costs & Traits",
    publisher: "Blitz",
    href: "https://blitz.gg/tft/set19/champions",
    date: "read 15 November 2026",
    kind: "coverage",
  },
  {
    label: "TFT Set 19 Prismatic Tour: Release Date and Reveal Schedule",
    publisher: "Blitz",
    href: "https://blitz.gg/tft/articles/tft-set-19-prismatic-tour",
    date: "13 November 2026",
    kind: "coverage",
  },
  {
    label:
      "Teamfight Tactics is bringing back unlocks, and the champions come from Heartsteel, Pentakill and K/DA",
    publisher: "Output Lag",
    href: "https://outputlag.com/news/teamfight-tactics-unlocks-return-prismatic-tour-heartsteel-pentakill-kda/",
    date: "13 November 2026",
    kind: "coverage",
  },
];
