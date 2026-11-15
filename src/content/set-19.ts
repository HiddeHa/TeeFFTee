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
 * Values that do not exist yet (per-breakpoint percentages, most unlock quest
 * thresholds) are absent rather than estimated. The breakpoint *tiers* are in,
 * because those are integers the reveal data carries; the "?%" inside each tier
 * mostly is not, and a plausible stand-in would be worse than a gap.
 *
 * AS OF 15 NOVEMBER 2026 the Dev Drop has aired, so the roster, the trait list
 * with its breakpoints, and the unlock quests are published. What is still missing
 * is the *magnitude* inside most breakpoints — the tier a trait needs and what it
 * does are in, the numbers those effects scale with are not. The roster is also
 * pre-PBE and may change on 17 November.
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
  {
    value: "94",
    label: "champions",
    note: "Across 24 genres from 14 bands and 10 solo artists.",
  },
  { value: "47", label: "traits", note: "27 regular traits and 20 unique ones." },
  { value: "36", label: "unlockable", note: "Of the 94, across three unlock categories." },
  {
    value: "5",
    label: "Prismatic traits",
    note: "Pentakill, Ionic Spark, K/DA, Heartsteel, True Damage.",
  },
  { value: "350+", label: "augments", note: "Including 6 hero augments." },
  { value: "10k+", label: "soundtrack mixes", note: "Riot's figure for the adaptive score." },
];

/**
 * The roster by cost. Counts are Riot's; the four 7-costs are the only tier named
 * in full here because it is short enough to name in full, and because all four
 * being unlocks is the fact that matters about it.
 */
export type CostBucket = { cost: string; count: number; note: string };

export const set19CostCurve: CostBucket[] = [
  { cost: "1-cost", count: 15, note: "Fifteen openers, the widest tier after the 4-costs." },
  { cost: "2-cost", count: 18, note: "Eighteen, including four unlocks such as Ashe." },
  { cost: "3-cost", count: 16, note: "Sixteen, including the Composer that unlocks Baron Nashor." },
  { cost: "4-cost", count: 22, note: "The largest tier in the set — twenty-two." },
  { cost: "5-cost", count: 19, note: "Nineteen, and the tier that carries both Akalis." },
  {
    cost: "7-cost",
    count: 4,
    note: "Baron Nashor, Rakan, Smeech and Sona. All four are unlocks.",
  },
];

/** One trait row: the breakpoints, what it does, and who has it. */
export type TraitEntry = {
  name: string;
  /** Breakpoint tiers as the reveal data lists them. */
  breakpoints: string;
  gist: string;
  /** Champion and cost, in the order the reveal lists them. */
  champions: string;
  /** One of the five with a Prismatic tier. */
  prismatic?: boolean;
};

export const set19Traits: TraitEntry[] = [
  {
    name: "Arcanist",
    breakpoints: "2 / 4 / 6",
    gist: "The team gains Ability Power and Arcanists gain more — a classic stacking caster line.",
    champions: "Ziggs 1, Zoe 1, Annie 2, Karthus 2, Swain 3, Mel 4, Vladimir 5",
  },
  {
    name: "Beach Pop",
    breakpoints: "3 / 5 / 7",
    gist:
      "Placeable instruments empower adjacent allies; at 7 an ocean breeze also heals Beach Pop champions and gives them mana.",
    champions: "Taric 1, Zoe 1, Ashe 2, Renekton 2, Syndra 3, Graves 4, Zac 4, Taliyah 5",
  },
  {
    name: "Bodyguard",
    breakpoints: "2 / 4 / 6",
    gist:
      "While at least one Bodyguard lives, the team gains Armor and Magic Resist, and Bodyguards gain more.",
    champions: "Kennen 1, Lillia 1, Jax 2, Nasus 2, K'Sante 3, Tibbers 3, Leona 4",
  },
  {
    name: "Choreographer",
    breakpoints: "2 / 3 / 4 / 5",
    gist:
      "Allies starting in the front two rows gain a Shield and everyone else gains Damage Amp; Choreographers get double.",
    champions: "Lulu 2, Renata Glasc 2, Syndra 3, Viego 3, Ahri 4, Garen 4, Nidalee 5",
  },
  {
    name: "Classical",
    breakpoints: "2 / 4 / 6",
    gist:
      "Classical champions Captivate enemies; by 6 the Captivated can join your bench when they die.",
    champions: "Katarina 1, Nasus 2, Renata Glasc 2, Samira 2, Jhin 4, Thresh 4, Vladimir 5",
  },
  {
    name: "EDM",
    breakpoints: "2",
    gist: "A two-unit trait: EDM Abilities become harder, better, faster and stronger.",
    champions: "Jax 2, Vi 5",
  },
  {
    name: "Encore",
    breakpoints: "2 / 4",
    gist:
      "Encore champions fire an extra projectile with their ability, at reduced effectiveness.",
    champions: "Neeko 1, Varus 1, Ezreal 2, Lucian 2, Jhin 4, Yuumi 4, Taliyah 5",
  },
  {
    name: "Frontman",
    breakpoints: "2 / 4 / 6",
    gist:
      "The team gains Health and Frontmen gain more, which increases again after their first cast.",
    champions:
      "Elise 1, Kobuko 1, Sett 1, Illaoi 2, Renekton 2, Galio 3, Swain 3, Shyvana 4, Thresh 4, Nunu & Willump 5",
  },
  {
    name: "Gu Feng",
    breakpoints: "2 / 3 / 4",
    gist:
      "Champions gain stats that scale with your player level; at 4 you choose between two Scrolls, and one of them opens a path to Level 11.",
    champions: "Wukong 4, Xayah 4, Janna 5, Lee Sin 5",
  },
  {
    name: "Heartsteel",
    breakpoints: "1 / 3 / 5 / 7",
    gist:
      "Members grant the team bonuses and you pick a Bias at 3 and a second at 5, empowering that champion's Ability; 7 adds a share of active bonuses to Heartsteel champions.",
    champions: "Kayn 1, Sett 1, Ezreal 2, K'Sante 3, Alune 4, Yone 4, Aphelios 5",
    prismatic: true,
  },
  {
    name: "Hitmaker",
    breakpoints: "2 / 4",
    gist:
      "The Hitmakers holding the most items become Big Shots and gain extra Attack Damage.",
    champions: "Lucian 2, Tristana 2, Senna 3, Jinx 4, Xayah 4, Miss Fortune 5",
  },
  {
    name: "Hyperpop",
    breakpoints: "2 / 3 / 4 / 5",
    gist:
      "Champions generate 4/6/12/40 Hype by star level plus 1 per takedown, and every Hype Level pays a reward; higher tiers multiply the Hype.",
    champions: "Kobuko 1, Ziggs 1, Lulu 2, Tristana 2, Teemo 5",
  },
  {
    name: "Illbeats",
    breakpoints: "2 / 3 / 4",
    gist:
      "Open the Illbeats Mixer and allocate Decibels between Health, Attack Damage, Ability Power and gold chance on takedown; your team gets a share of the mix.",
    champions: "Illaoi 2, Braum 3, Draven 3, Yuumi 4",
  },
  {
    name: "Ionic Spark",
    breakpoints: "3 / 5 / 7 / 10",
    gist:
      "Fans cheer on members with gifts — letters, then personalised gifts, then gold and a consumable — and at 10 the fans rush the stage.",
    champions:
      "Elise 1, Yunara 1, Annie 2, Lux 2, Briar 3, Tibbers 3, Aurora 4, Jinx 4, Shyvana 4, Gwen 5",
    prismatic: true,
  },
  {
    name: "Jazz",
    breakpoints: "2 / 3 / 4",
    gist: "For each active trait except uniques, the team gains Health and Damage Amp.",
    champions: "Lucian 2, Bard 3, Galio 3, Smeech 7",
  },
  {
    name: "Juggernaut",
    breakpoints: "2 / 4 / 6",
    gist: "Juggernauts gain Durability that increases as their Health falls.",
    champions:
      "Olaf 1, Taric 1, Annie 2, Gragas 2, Braum 3, Ekko 3, Yorick 4, Zac 4, Vi 5",
  },
  {
    name: "K|DA",
    breakpoints: "3 / 5 / 7 / 10 / 13 / 15 / 21",
    gist:
      "Members release songs as their total star level climbs — POP|STARS, DRUM GO DUM, VILLAIN, I'LL SHOW YOU, WATCH ME, FIRESTARTER — and at 21 they ascend to 4-star with GIRLS.",
    champions: "Lillia 1, Neeko 1, Gragas 2, Evelynn 3, Kai'Sa 3, Ahri 4, Leona 4, Akali (K|DA) 5",
    prismatic: true,
  },
  {
    name: "Manager",
    breakpoints: "2 / 3 / 4",
    gist:
      "Gain a Spotlight Hex: the ally who starts combat in it gains Attack Damage and Ability Power, then Mana at 3 and gold at 4.",
    champions: "Alune 4, Leona 4, Dr. Mundo 5",
  },
  {
    name: "Pentakill",
    breakpoints: "3 / 5 / 7",
    gist:
      "The first enemies to drop below a Health threshold are executed and replaced by allied ghouls; at 7 the first death summons the Iron Maiden instead.",
    champions: "Gnar 1, Olaf 1, Karthus 2, Viego 3, Kayle 4, Yorick 4, Mordekaiser 5",
    prismatic: true,
  },
  {
    name: "Prodigy",
    breakpoints: "2 / 3 / 4 / 5",
    gist:
      "The team gains Mana Regen and Prodigies gain more; at 5 the lowest-Health ally heals for a share of Prodigy ability damage.",
    champions: "Neeko 1, Lux 2, Ekko 3, Malzahar 3, Alune 4, Janna 5",
  },
  {
    name: "R&B",
    breakpoints: "1 / 2",
    gist:
      "A two-champion line: your strongest Mel and Rell are soul-linked, with damage redirected to Rell and healing flowing back.",
    champions: "Mel 4, Rell 5",
  },
  {
    name: "Renegade",
    breakpoints: "2 / 3 / 4 / 5",
    gist:
      "Renegades gain Precision, Critical Strike Chance and Critical Strike Damage; at 5 they also gain Durability.",
    champions: "Qiyana 2, Samira 2, Evelynn 3, Aurora 4, Graves 4, Pyke 5",
  },
  {
    name: "Rock",
    breakpoints: "3 / 4 / 5 / 7",
    gist:
      "Summons the Infernal Idol, which grows with the star level of your Rock champions and gains a blast, then periodic bolts.",
    champions: "Olaf 1, Varus 1, Camille 2, Swain 3, Locke 4, Vayne 4, Pyke 5",
  },
  {
    name: "Slayer",
    breakpoints: "2 / 4 / 6",
    gist:
      "Slayers gain Attack Speed and Omnivamp that rise toward a cap as their Health drops.",
    champions:
      "Katarina 1, Kayn 1, Camille 2, Briar 3, Viego 3, Yasuo 4, Yone 4, Smeech 7",
  },
  {
    name: "Swiftstriker",
    breakpoints: "2 / 3 / 4 / 5",
    gist:
      "The team gains Attack Speed and Swiftstrikers gain more periodically, up to a stack limit.",
    champions:
      "Yunara 1, Ziggs 1, Ashe 2, Jax 2, Bard 3, Kayle 4, Locke 4, Zeri 5",
  },
  {
    name: "Trickshot",
    breakpoints: "2 / 3 / 4",
    gist:
      "Attacks and abilities ricochet, each bounce dealing a percentage of the previous one.",
    champions: "Gnar 1, Samira 2, Draven 3, Kai'Sa 3, Vayne 4, Twisted Fate 5",
  },
  {
    name: "True Damage",
    breakpoints: "3 / 5 + Prismatic",
    gist:
      "A record with two sides: the A-Side earns Bling for winning player combat, the B-Side for losing, and every few rounds you choose to cash in or Keep Rising.",
    champions: "Kennen 1, Qiyana 2, Ekko 3, Senna 3, Yasuo 4, Akali (True Damage) 5",
    prismatic: true,
  },
];

export const set19UniqueTraits: TraitEntry[] = [
  {
    name: "8-Bit",
    breakpoints: "1",
    gist:
      "Keeps score of your team's damage, with Miss Fortune counting triple; beating a high score pays a prize.",
    champions: "Miss Fortune 5",
  },
  {
    name: "Beat Master",
    breakpoints: "1",
    gist:
      "At a Health threshold Rell mounts up, heals over time, loses max Mana and blasts Armor and Magic Resist on every third attack.",
    champions: "Rell 5",
  },
  {
    name: "Boy Band",
    breakpoints: "1",
    gist: "Rakan is joined by placeable clones that copy his Completed and Radiant items.",
    champions: "Rakan 7",
  },
  {
    name: "Collab",
    breakpoints: "3 / 5",
    gist:
      "Collab champions become inspired and gain Attack Damage and Ability Power, paying copies of them as it triggers — and a different set of champions has the trait each game.",
    champions: "Sona 7 (inspires others)",
  },
  {
    name: "Composer",
    breakpoints: "1",
    gist:
      "Mystical Instruments can appear in your shop; with all five and enough damage, Malzahar writes his masterpiece and unlocks Baron Nashor.",
    champions: "Malzahar 3",
  },
  {
    name: "Country",
    breakpoints: "1",
    gist: "A durable Alistar: at combat start, enough bonus Health becomes Durability.",
    champions: "Alistar 4",
  },
  {
    name: "Disco",
    breakpoints: "1",
    gist:
      "The team heals per second, and enough casts enter Disco Fever for team Attack Speed.",
    champions: "Nunu & Willump 5",
  },
  {
    name: "Emo",
    breakpoints: "1",
    gist: "Amumu gains Armor and Magic Resist when he starts combat with no adjacent allies.",
    champions: "Amumu 3",
  },
  {
    name: "Freestyle",
    breakpoints: "1",
    gist:
      "Akali's passive changes with the side of the True Damage record: gold on the A-Side, player Health on the B-Side.",
    champions: "Akali (True Damage) 5",
  },
  {
    name: "Goth",
    breakpoints: "1",
    gist:
      "The first time Zeri damages an enemy each combat, bats steal Attack Damage from them and give it to her.",
    champions: "Zeri 5",
  },
  {
    name: "Hype Man",
    breakpoints: "1",
    gist: "Teemo banks extra Hyperpop Hype whenever a Hyperpop champion deals or takes damage.",
    champions: "Teemo 5",
  },
  {
    name: "Indie",
    breakpoints: "1",
    gist:
      "Seraphine attracts followers that grant champions, promotes 3-stars to Rising Stars, and eventually becomes a Superstar.",
    champions: "Seraphine 2",
  },
  {
    name: "Mariachi",
    breakpoints: "1",
    gist:
      "Nidalee transforms into Cougar Form above a Health threshold and leaps away when she drops below it.",
    champions: "Nidalee 5",
  },
  {
    name: "Melodic Heart",
    breakpoints: "1",
    gist:
      "Gwen starts combat untargetable inside Mist, and allies standing in it gain Durability.",
    champions: "Gwen 5",
  },
  {
    name: "One Monster Band",
    breakpoints: "1",
    gist:
      "Baron Nashor takes two team slots and is unstoppable; after his first cast he steals stats from every enemy.",
    champions: "Baron Nashor 7",
  },
  {
    name: "Producer",
    breakpoints: "1",
    gist:
      "Sona picks a band to feature and gains their trait, and converts all bonus Attack Damage and Attack Speed into Ability Power.",
    champions: "Sona 7",
  },
  {
    name: "Record Mogul",
    breakpoints: "1",
    gist:
      "Dr. Mundo hands out Record Contracts that grant Damage Amp and permanent Health on their kills.",
    champions: "Dr. Mundo 5",
  },
  {
    name: "Synthwave",
    breakpoints: "1",
    gist:
      "At a Health threshold Garen shields for a share of the Healing and Shielding he received.",
    champions: "Garen 4",
  },
  {
    name: "Tango",
    breakpoints: "1",
    gist:
      "Twisted Fate marks a Tango Partner: both gain Attack Speed and their damage burns and wounds.",
    champions: "Twisted Fate 5",
  },
  {
    name: "Windblessed",
    breakpoints: "1",
    gist: "Janna opens combat with a tornado that knocks up everything in its path.",
    champions: "Janna 5",
  },
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
  /** Integer breakpoint tiers that the reveal data carries. */
  tiers: string;
  gist: string;
};

export const set19PrismaticTraits: PrismaticTrait[] = [
  {
    name: "True Damage",
    tiers: "3 / 5 · A-Side and B-Side",
    gist:
      "A-Side: members deal bonus true damage and earn Bling on kill plus more for winning; B-Side: Bling for losing, and at 5 healing and XP every round. The Prismatic tier plays a track — KNOW MY NAME on the A-Side, GIANTS on the B-Side — and sets members to 99% bonus true damage, with double Bling or gold on kill depending on the side.",
  },
  {
    name: "K/DA",
    tiers: "3 / 5 / 7 / 10 / 13 / 15 / 21",
    gist:
      "Each breakpoint is a song: reduced max Mana, a shield, decaying Attack Speed, a boost to everything before it, a stun, and max-Health burn — then GIRLS at 21 ascends K/DA members to 4-star.",
  },
  {
    name: "Pentakill",
    tiers: "3 / 5 / 7, plus a Prismatic line at 7",
    gist:
      "Members gain Attack Damage and Ability Power and execute the first enemies to fall below a threshold, replacing them with ghouls; at 7 the first death summons the Iron Maiden. The Prismatic line at the same breakpoint reads MOSH PIT.",
  },
  {
    name: "Heartsteel",
    tiers: "1 / 3 / 5 / 7",
    gist:
      "Members grant the team a stat each — Sett Health, Kayn Attack Damage, Ezreal crit chance, K'Sante Armor and Magic Resist, Alune Ability Power, Yone Omnivamp, Aphelios Attack Speed, Sona healing and shielding — and you choose a Bias at 3 and a second at 5. The reveal gave the stat each one shares, not its size.",
  },
  {
    name: "Ionic Spark",
    tiers: "3 / 5 / 7 / 10",
    gist:
      "Fans send gifts on a timer: letters that heal and grant Attack Speed, then personalised gifts of Attack Damage or Ability Power, then gold and a consumable. At 10 the fans rush the stage.",
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
    title: "The whole roster is out, and it is 94 champions",
    body:
      "The 15 November Dev Drop published every champion with cost and traits, the full trait list with its breakpoints, and the unlock conditions. The shape is 15 one-costs, 18 two-costs, 16 three-costs, 22 four-costs, 19 five-costs and 4 seven-costs, across 24 genres. It is pre-PBE, so the roster can still change after 17 November.",
    status: "devdrop",
  },
  {
    title: "Two Akalis, and both are unlocks",
    body:
      "Akali appears twice as a five-cost unlock: Akali (K|DA) with K/DA alone, and Akali (True Damage) with True Damage and Freestyle. They are separate champions with separate quests, not one card that switches — which matters when you are counting your K/DA copies.",
    status: "devdrop",
  },
  {
    title: "True Damage has two sides",
    body:
      "A streak trait you set like a record: the A-side is built for win streaking, the B-side for a loss streak, and the Dev Drop filled in the currency — Bling — and the choice every few rounds to cash out or keep the streak alive. Its Prismatic tier is the only place the numbers got concrete: 99% bonus true damage.",
    status: "devdrop",
  },
  {
    title: "Unlocks are back",
    body:
      "Some champions are not in the shop when a game starts. Each has a quest, and finishing it adds that champion to your next shop for the rest of the game. Exactly 36 of the 94 unlock this way, in three categories.",
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

/**
 * The unlock conditions the Dev Drop published. Thresholds are described, not
 * numbered: the reveal names the condition and leaves the count to the client.
 */
export type UnlockQuest = { champion: string; cost: string; quest: string };

export const set19UnlockQuests: UnlockQuest[] = [
  {
    champion: "Kobuko",
    cost: "1",
    quest: "Reach the required star level on Ziggs and equip the required number of items to him",
  },
  {
    champion: "Ashe",
    cost: "2",
    quest: "Equip the required number of items to a Beach Pop champion",
  },
  {
    champion: "Alistar",
    cost: "4",
    quest: "A Chain Vest equipped to a Caster or Marksman, at level 7",
  },
  {
    champion: "Alune",
    cost: "4",
    quest: "Field the required number of unique Heartsteel or Prodigy champions, at level 7",
  },
  {
    champion: "Jinx",
    cost: "4",
    quest: "Equip the required number of items to an Ionic Spark or Hitmaker champion, at level 7",
  },
  {
    champion: "Kayle",
    cost: "4",
    quest: "Field the required number of unique Pentakill or Swiftstriker champions, at level 7",
  },
  {
    champion: "Thresh",
    cost: "4",
    quest: "Have enemies spend the required number of seconds Captivated by Classical",
  },
  {
    champion: "Vayne",
    cost: "4",
    quest: "Field Rock for the required number of combats, at level 7",
  },
  {
    champion: "Wukong",
    cost: "4",
    quest: "Have allies deal the required damage while fielding Xayah",
  },
  {
    champion: "Yasuo",
    cost: "4",
    quest: "Field the required number of star levels of True Damage and Slayer champions, at level 7",
  },
  {
    champion: "Zac",
    cost: "4",
    quest: "Field the required number of unique Beach Pop or Juggernaut champions, at level 7",
  },
  { champion: "Aphelios", cost: "5", quest: "Reach the required star level on Alune or Yone" },
  {
    champion: "Akali (True Damage)",
    cost: "5",
    quest: "Earn the required True Damage Bling without K/DA",
  },
  {
    champion: "Pyke",
    cost: "5",
    quest: "Have at least the required amount of gold at the end of combat, at level 7",
  },
  {
    champion: "Baron Nashor",
    cost: "7",
    quest: "Collect all members of Baron's ensemble, then deal the required damage with your strongest Malzahar",
  },
  {
    champion: "Rakan",
    cost: "7",
    quest: "At level 8+, win or lose the required number of consecutive combats",
  },
  {
    champion: "Smeech",
    cost: "7",
    quest: "Have at least the required number of non-unique traits active, at level 9",
  },
  {
    champion: "Sona",
    cost: "7",
    quest: "Inspire Collab champions the required number of times, at level 10",
  },
  {
    champion: "Tibbers",
    cost: "3",
    quest: "Reach the required star level on Annie and equip the required number of items to her",
  },
];

export type Unknown = { topic: string; why: string };

export const set19Unknowns: Unknown[] = [
  {
    topic: "The magnitude inside almost every breakpoint",
    why:
      "The Dev Drop published which tiers a trait needs and what each tier does, but mostly in words: “bonus Attack Damage”, “a portion of previous damage”, “the required number of combos”. A handful of concrete numbers slipped out — 99% on the Prismatic True Damage tier, 4/6/12/40 Hype in Hyperpop — and the rest is described rather than quantified. Riot's patch notes are where the values land.",
  },
  {
    topic: "The counts inside the unlock quests",
    why:
      "The reveal names each condition — a star level on Ziggs, items on a Beach Pop champion, Rock fielded for a number of combats — but writes “the required number” instead of the number. Of the 36 unlockables, 19 have a published condition and none have the thresholds.",
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
    label: "TFT Set 19 — champions, traits and unlocks",
    publisher: "TFT Ninja",
    href: "https://tft.ninja/sets/19",
    date: "updated 15 November 2026",
    kind: "coverage",
  },
  {
    label: "TFT Set 19 Champions: all 94 units, costs & traits",
    publisher: "TFT Ninja",
    href: "https://tft.ninja/sets/19/units",
    date: "updated 15 November 2026",
    kind: "coverage",
  },
  {
    label: "TFT Set 19 Traits: all 47 traits & breakpoints",
    publisher: "TFT Ninja",
    href: "https://tft.ninja/sets/19/traits",
    date: "updated 15 November 2026",
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
