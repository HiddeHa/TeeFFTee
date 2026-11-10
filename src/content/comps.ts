import type { Comp } from "./types";

/**
 * CURATED COMPS
 *
 * ⚠️ MIXED CONTENT. The three "Example …" comps are illustration: their boards
 * are real Set 18 lineups — every id resolves against the `units` table, and
 * every trait counts to a breakpoint that actually exists — but their matchups,
 * notes and stats are placeholders. Draven Fast 9 is written as a real guide and
 * carries no stats, because none have been crawled. Replace the examples with
 * comps you actually play before launch — see docs/roadmap.md Phase 2.
 *
 * A comp's board lists only which unit, its target star and its items: names,
 * costs and icons come from the set catalogue (`npm run crawl -- load-assets`).
 * An id the catalogue does not know renders as a raw id plus "Not in the set
 * catalogue", so this file stays honest across a set change instead of quietly
 * showing the wrong champion.
 *
 * When the crawler is online these rows move to Postgres (`comps` table) and
 * this file becomes the seed script instead of the source of truth. Nothing in
 * the UI should have to change: src/lib/data.ts is the only seam.
 *
 * Rules that keep the site credible:
 *  - `stats: null` is allowed and is rendered as "collecting data", never as zero.
 *  - `coreUnits` is also the assignment signature (docs/blueprint.md §8).
 *  - `definingTrait` is a hard gate, not a hint: a board only counts as this
 *    comp when that trait is active on it. It must therefore be active on the
 *    board below too — a comp that fails its own gate can never collect stats.
 *    See docs/blueprint.md §8 and the methodology text in src/content/site.ts.
 *  - Item names are real Set 18 items; keep them real when you replace the units.
 *  - Trait counts below are done by hand against `traits.breakpoints`. Each board
 *    activates at least three real breakpoints — recount before you swap a unit.
 */
export const comps: Comp[] = [
  {
    slug: "example-fast-8",
    name: "Example Fast 8",
    tier: "S",
    setNumber: 18,
    patch: "18.5",
    playstyle: "Fast 8",
    difficulty: "Medium",
    summary:
      "A two-carry level-8 board that stabilises on 4-1 and caps out with two five-costs.",
    leveling:
      "Level 6 on 3-2, level 8 on 4-1. Roll to 30 gold, not to zero. Push 9 only with a win streak or a gold augment.",
    // Primal 3 (2), Vanguard 4 (4), Juggernaut 2 (2). Two 4-cost carries, the
    // two 5-costs are the cap: Taric for the frontline, Lux for the second bar.
    board: [
      { id: "DA_18_Sivir", star: 2, items: ["Infinity Edge", "Giant Slayer", "Bloodthirster"] },
      {
        id: "DA_18_Ahri",
        star: 2,
        items: ["Blue Buff", "Rabadon's Deathcap", "Jeweled Gauntlet"],
      },
      {
        id: "DA_Sentinel18",
        star: 2,
        items: ["Warmog's Armor", "Bramble Vest", "Dragon's Claw"],
      },
      { id: "DA_Vi18", star: 2, items: ["Sunfire Cape", "Protector's Vow"] },
      { id: "DA_18_Elise", star: 2, items: ["Evenshroud"] },
      { id: "DA_18_Rakan", star: 2, items: [] },
      { id: "DA_18_Lux_Primal", star: 1, items: ["Void Staff"] },
      { id: "DA_Taric18", star: 1, items: [] },
    ],
    coreUnits: ["DA_18_Sivir", "DA_18_Ahri", "DA_Sentinel18", "DA_Vi18"],
    flexUnits: ["DA_18_Elise", "DA_18_Rakan", "DA_18_Lux_Primal", "DA_Taric18"],
    // The frontline is what makes this a board rather than a pile of carries:
    // four Vanguard units is the tier-4 breakpoint, and Vanguard/Sentinel are
    // two of the four core units, so the gate is never the reason a real board
    // falls through.
    definingTrait: "DA_18_Vanguard",
    augments: [
      "Economy augment (gold) — take it early if you see it",
      "Combat augment (prismatic) for the primary carry",
      "Trait augment to make the board legal without a dead slot",
    ],
    notes: {
      whyNow:
        "This is the cleanest level-8 board on the patch: two four-cost carries sitting behind a shared frontline, so a late roll still produces a finished board. It is forgiving of bad item luck and that is most of why it is rated this high.",
      howToPlay:
        "Push levels on 4-1 and roll to about 30 gold. Hold a spare copy of the main tank while you roll — the difference between a two-star and a one-star frontline decides whether this is a top-four board or an eighth. Do not level to 9 unless you are already stable.",
      mistakes:
        "Holding components for a perfect triple. Slam offence early and let the third item arrive at 4-5; this board wins on tempo, not on capping out. The other common error is rolling past 30 gold on 4-1 chasing a five-cost that will not appear until 4-5 anyway.",
    },
    matchups: {
      beats: ["Single-carry reroll boards", "Slow-roll comps that need time"],
      losesTo: ["Heavy frontline boards with healing reduction", "Assassin-style backline access"],
    },
    stats: {
      patch: "18.5",
      region: "KR",
      rankBucket: "master+",
      games: 4820,
      avgPlace: 3.91,
      top4Rate: 0.583,
      winRate: 0.142,
      pickRate: 0.087,
      top4CiLow: 0.569,
      computedAt: "2026-10-27T02:00:00.000Z",
    },
    published: true,
    updatedAt: "2026-10-27",
  },
  {
    slug: "example-reroll",
    name: "Example Reroll",
    tier: "A",
    setNumber: 18,
    patch: "18.5",
    playstyle: "Reroll",
    difficulty: "Hard",
    summary:
      "Three-cost reroll: high ceiling, but the whole game is decided by when you hit.",
    leveling:
      "Level 6 on 3-2, then roll above 50 gold until the main carry is three-star. Only then push 8.",
    // Sprykin 6 (5), Hunter 3 (3), Brawler 2 (2). Both three-costs are the roll
    // targets; the legendaries are the level-8 cap, one per side of the board.
    board: [
      {
        id: "DA_18_Tristana",
        star: 3,
        items: ["Giant Slayer", "Last Whisper", "Bloodthirster"],
      },
      {
        id: "DA_18_Rammus",
        star: 3,
        items: ["Warmog's Armor", "Bramble Vest", "Sunfire Cape"],
      },
      { id: "DA_18_Teemo", star: 2, items: ["Blue Buff", "Morellonomicon"] },
      { id: "DA_18_Kobuko", star: 2, items: [] },
      { id: "DA_18_Caitlyn", star: 2, items: [] },
      { id: "DA_18_Veigar", star: 2, items: [] },
      { id: "DA_18_GnarSmall", star: 1, items: ["Dragon's Claw"] },
      { id: "DA_18_Ashe", star: 1, items: ["Kraken's Fury"] },
    ],
    coreUnits: ["DA_18_Tristana", "DA_18_Rammus", "DA_18_Teemo"],
    // Six Sprykin is the tier-5 breakpoint. Tristana, Rammus and Teemo all
    // carry Sprykin themselves, so a board that clears the core-unit threshold
    // has the trait active by construction — the gate rejects boards that
    // happen to hold those units without playing the line.
    definingTrait: "DA_18_Sprykin",
    flexUnits: [
      "DA_18_Kobuko",
      "DA_18_Caitlyn",
      "DA_18_Veigar",
      "DA_18_GnarSmall",
      "DA_18_Ashe",
    ],
    augments: [
      "Rolling/economy augment (silver or gold) if you get it before 3-2",
      "Combat augment for the reroll carry",
      "Avoid taking prismatic economy on this line — you need board strength, not gold",
    ],
    notes: {
      whyNow:
        "Reroll is strong whenever the contested three-costs are strong, and this patch they are. The catch is that the average is carried by the games where you hit; the games where you do not hit are genuinely bad, which is why the average placement looks worse than the top-four rate suggests.",
      howToPlay:
        "Do not commit until you have two copies of the main carry by 3-2. If you have them, roll above 50 gold and only leave the roll when the carry is three-star or you are about to die. Everything else on the board is a passenger.",
      mistakes:
        "Rolling at 4-1 with no copies. Contesting when two other players are on the same three-cost — check the lobby before you commit. And over-levelling: level 8 does nothing for this board until the carry is finished.",
    },
    matchups: {
      beats: ["Boards that need time to stabilise", "Fast 8 lines that low-roll"],
      losesTo: ["Heavy early pressure", "Lobbies with three players on the same units"],
    },
    stats: {
      patch: "18.5",
      region: "EUW",
      rankBucket: "master+",
      games: 3915,
      avgPlace: 4.12,
      top4Rate: 0.552,
      winRate: 0.118,
      pickRate: 0.071,
      top4CiLow: 0.537,
      computedAt: "2026-10-27T02:00:00.000Z",
    },
    published: true,
    updatedAt: "2026-10-27",
  },
  {
    slug: "example-flex",
    name: "Example Flex",
    tier: "B",
    setNumber: 18,
    patch: "18.5",
    playstyle: "Flex",
    difficulty: "Hard",
    summary:
      "Play what the shop gives you, holding three possible carries until 4-1. No stats yet — this is what a comp looks like before the crawler has seen it.",
    leveling:
      "Level 5 on 2-5, 6 on 3-2, 7 on 3-7. Decide your carry at 4-1 based on what you hit, then commit.",
    // Blossom 7 (7), Juggernaut 2 (2), Spellweaver 2 (2). Seven of the eight
    // slots share one trait, so the carry slot is the choice: Ashe, Ahri or
    // Master Yi all keep the top breakpoint lit.
    board: [
      { id: "DA_18_Ashe", star: 2, items: ["Infinity Edge", "Giant Slayer"] },
      { id: "DA_18_Ahri", star: 2, items: ["Blue Buff", "Rabadon's Deathcap"] },
      { id: "DA_18_Sett", star: 2, items: ["Warmog's Armor"] },
      { id: "DA_18_Yorick", star: 3, items: ["Bramble Vest"] },
      { id: "DA_Karma18", star: 2, items: ["Evenshroud"] },
      { id: "DA_18_Yunara", star: 2, items: [] },
      { id: "DA_18_MasterYi_AD", star: 1, items: [] },
      { id: "DA_18_Rakan", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_Sett", "DA_18_Yorick", "DA_Karma18"],
    flexUnits: ["DA_18_Ashe", "DA_18_Ahri", "DA_18_Yunara", "DA_18_MasterYi_AD", "DA_18_Rakan"],
    // Seven Blossom is the top breakpoint the board reaches; the front is the
    // fixed part of the comp, the carry is the choice. Gating on Blossom is
    // what keeps this from swallowing every board that happens to run Sett.
    definingTrait: "DA_18_Blossom",
    augments: [
      "Any item or economy augment — this line is about flexibility",
      "Avoid augment choices that lock you to one damage type before 4-1",
    ],
    notes: {
      whyNow:
        "This is the honest state of a comp the ladder has not converged on yet. It exists in the curated list because it is the board I expect to matter after the next patch, and I would rather show the empty state than invent a number to fill the column.",
      howToPlay:
        "Hold three carry pairs through stage 3 and keep your components uncommitted until 4-1. The value of the line is that you are never contested, and the cost is that you are always one decision behind the players who know their board.",
      mistakes:
        "Committing to a carry at 3-2 because you hit one copy. That converts a flexible board into a worse version of a comp somebody else is already playing.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-10-27",
  },
  {
    slug: "draven-fast-9",
    name: "Draven Fast 9",
    tier: "S",
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 9",
    difficulty: "Hard",
    summary:
      "An economy comp with a real board at the end of it: streak to level 9, then roll for Draven, Maokai and the five-costs that make them unkillable.",
    leveling:
      "Level 4 on 2-1 only with an upgrade and a usable item; 5 on 2-2 unless you are on a three-loss streak; 6 on 3-2 without dropping below 30 gold; 7 on 3-7; 8 on 4-2 without rolling at all. Level 9 only when you can roll 40 gold or more — or when your health is low enough that the gold stops mattering. Then roll until Draven and Maokai are two-star and itemised.",
    // Nine slots, a level-9 board. Gnar is the ninth: the level-8 version of this
    // comp is the same board minus him, which is why he is flex rather than core.
    // Trait counts, counted against TFTSet18 breakpoints: Elderwood 3 (3), Brawler
    // 2 (2), Executioner 2 (2), Inferno 2 (2), Juggernaut 2 (2), plus four
    // single-unit traits — Bounty Seeker, Emerald Aspect, Old Growth,
    // Greenfather. Every one of those breakpoints exists in the catalogue.
    board: [
      {
        id: "DA_18_Maokai",
        star: 2,
        items: ["Gargoyle Stoneplate", "Warmog's Armor", "Spirit Visage"],
      },
      { id: "DA_Amumu18", star: 2, items: [] },
      { id: "DA_Taric18", star: 1, items: [] },
      { id: "DA_18_GnarSmall", star: 1, items: [] },
      { id: "DA_18_Alistar", star: 2, items: [] },
      {
        id: "DA_Draven18",
        star: 2,
        items: ["Guinsoo's Rageblade", "Kraken's Fury", "Giant Slayer"],
      },
      {
        id: "DA_18_Ezreal",
        star: 2,
        items: ["Spear of Shojin", "Last Whisper", "Red Buff"],
      },
      { id: "DA_18_Kennen", star: 1, items: [] },
      { id: "DA_18_Ivern", star: 1, items: [] },
    ],
    coreUnits: [
      "DA_Draven18",
      "DA_18_Maokai",
      "DA_18_Ezreal",
      "DA_Amumu18",
      "DA_18_Kennen",
    ],
    flexUnits: ["DA_Taric18", "DA_18_GnarSmall", "DA_18_Alistar", "DA_18_Ivern"],
    // Draven is the comp, so his own trait is the gate. It is active on this board
    // by construction, and unlike gating on Elderwood it still counts the Elder
    // Dragon version, which drops the Elderwood count to one.
    definingTrait: "DA_DravenUniqueTrait18",
    augments: [
      "An econ augment first — Capital Gains I, Money Hungry or Invested. Without one of those, or a win streak already running, the level-9 plan does not happen.",
      "Level Up! and Late Game Specialist are the next best: both pay for the levels this comp actually buys, and both are worth roughly half a tier here.",
      "Birthday Present, Slice of Life, One Two Five! and Rolling For Days each buy board, gold or tempo at the exact moment the line needs it.",
      "Executioner Emblem on Draven is the only emblem worth making — it buffs both carries and he can wear it. Take it after the econ augment, never instead of it.",
      "Do not take a prismatic combat augment on 2-1 over a good econ augment. You are not playing for stage 3.",
    ],
    notes: {
      whyNow:
        "This is rated on the ceiling, not the average. When the line comes together it is the best AD board in the set: Draven's bleed wins the long fight, Maokai refuses to die in front of him, and Ezreal supplies the frontloaded damage Draven cannot produce on his own. It is also one of the most-played level-9 lines in high elo, across both its Elderwood and Elder Dragon versions. The condition is the whole game — you need the win streak or the econ augment, and 80+ health going into stage 4, or you are a level-8 player with no board. 18.6 barely touches it: the Elderwood nerf is the nine-piece, not the three this board runs, and the Sentinel buff only helps the Dragon version.",
      howToPlay:
        "The game is decided in stages 2 and 3, before the comp exists. Level on the tempo schedule — 5 on 2-2, 6 on 3-2, 7 on 3-7, 8 on 4-2 — and stay above 30 gold the whole way. Take a Bow first and Sparring Gloves second: Guinsoo's Rageblade is non-negotiable on Draven, Last Whisper is core too, and both can sit on a holder until he arrives. At 9, roll for two-star Draven and Maokai before anything else, then finish the five-costs. Leftover tank items go on Amumu, not spread thin. And do not two-star Ivern before your key upgrades — five gold for very little until the board is real.",
      mistakes:
        "Three ways this goes wrong, and they are the same mistake wearing different hats. Rolling at 8 to stabilise — the moment you spend 30 gold there, you are playing a worse version of a Fast 8 comp. Playing it from a weak opener with no econ augment and no streak, which is not a gamble but a slow loss. And itemising Draven without attack speed: a Deathblade and Infinity Edge Draven looks right on paper and does nothing, because his damage never starts. The quiet fourth is buying emblems over gold — an Executioner Emblem is nice; 17 gold for one when you still need the XP is not.",
    },
    matchups: {
      beats: [
        "Cassiopeia reroll — the same attrition plan, with more damage at the end of it",
        "Single-carry boards that lose a long fight",
        "Slow boards that need three rounds to come online",
      ],
      losesTo: [
        "Anything that punishes a level-8 board while you are still holding gold",
        "Frontloaded burst and backline access that kills Draven before the bleed ramps",
        "Contested lobbies: two or three players on the same five-costs",
      ],
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-10",
  },
];
