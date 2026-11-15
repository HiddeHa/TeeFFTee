import type { Comp } from "./types";

/**
 * CURATED COMPS — rebuilt 2026-11-13.
 *
 * The previous guides were deleted and replaced by this set, chosen by consensus
 * rather than by taste. `tier` is the band of `consensus.score`, which is the mean
 * of the letters nine published tier lists gave the comp (S/S+ = 4, A = 3, B = 2,
 * C = 1, D = 0). Every letter used is stored on the comp, so the average can be
 * audited instead of trusted; /meta renders the arithmetic.
 *
 * Sources averaged: TFT Academy, TFTactics, EmblemComp, MetaTFT, SeeMeta, Blitz,
 * tft.ninja, MID.GG, Mobalytics, TFT Flow. Where a site names the same board
 * differently (Flora Fatalis Azir / Sprykin Zyra / Executioner Azir), the mapping
 * is recorded next to the letter.
 *
 * Rules that keep this credible:
 *  - `stats: null` is allowed and renders as "collecting data", never as zero.
 *  - `coreUnits` is also the assignment signature (blueprint §8, 60% overlap).
 *  - `definingTrait` is a hard gate, not a hint.
 *  - Items are Riot item ids (`DA_GuinsoosRageblade`), so they resolve an icon and
 *    join to `participant_units` later (decisions.md D11).
 *  - Positioning is authored and each row must match the unit's attack range.
 *  - Numbers in the notes are measurements from our own crawl, dated and scoped in
 *    the sentence that uses them. Nothing else is presented as measured.
 */
export const comps: Comp[] = [
  {
    slug: "riftbeast-brambleback",
    name: "Riftbeast Brambleback",
    tier: "S",
    consensus: {
      score: 3.75,
      sources: [
        { source: "TFT Academy (Tempo Riftbeast)", tier: "A" },
        { source: "EmblemComp", tier: "S" },
        { source: "TFTactics (Riftbeast Ravagers)", tier: "S" },
        { source: "SeeMeta (S+)", tier: "S+" },
        { source: "MetaTFT", tier: "S" },
        { source: "Blitz", tier: "S" },
        { source: "tft.ninja (Riftbeast Elder Dragon)", tier: "S" },
        { source: "MID.GG (Riftbeast Elder Dragon)", tier: "A" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 8",
    difficulty: "Medium",
    summary:
      "Six Riftbeast bodies behind Brambleback, with Elder Dragon as the reason the board is worth playing at all. A level-8 fast-8 that becomes a level-9 threat the moment the Dragon lands.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 8 on 4-2 with 30+ gold. Roll at 8 for Brambleback, Krug and Sentinel, then stop and hold for Elder Dragon at 9 — the level-8 board is a holding pattern, not the finish line.",
    preconditions: [
      "Brambleback is uncontested, or you are the player with two copies before 3-5.",
      "You can field six Riftbeast bodies by 4-2 without rolling below 30 gold.",
      "At least one Rod or Tear item exists for Elder Dragon, or you accept the board being a top-4 instead of a win.",
    ],
    abandon: {
      when: "Two players have Brambleback two-star before 4-2 and your Krug is still one-star.",
      instead: "Riftbeast Elder Dragon at 8 — keep the frontline, make Draven or Sett the damage, stop chasing the six-piece.",
    },
    counterCase:
      "Without Elder Dragon this is not an S-tier board. In our own crawl the six-piece Riftbeast board *without* the Dragon is 145 boards at a 4.97 average and 36.6% top-4; Brambleback plus Dragon is 333 boards at 3.81 and 61.9%. The tier belongs to the Dragon version.",
    stages: [
      {
        stage: "2",
        plan: "Hold every Riftbeast body and take Belt or Chain first. Level 5 on 2-5; the stage-2 board is Krug and Scuttlecrab with anything behind them.",
      },
      {
        stage: "3",
        plan: "6 on 3-2. Do not roll. Slam Gargoyle Stoneplate on Brambleback and bank the rest — everything that matters is at 8.",
      },
      {
        stage: "4",
        plan: "8 on 4-2 with 30+ gold, roll to two-star Brambleback and find Sentinel and Krug, then stop. If health is under 30, roll deeper here and settle for top 4.",
      },
      {
        stage: "5+",
        plan: "9 for Elder Dragon. Until it lands, spend nothing beyond the level — a Riftbeast board without the Dragon is the most expensive way to finish sixth.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_Brambleback18",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_BrambleVest", "DA_Component_ChainVest"],
      },
      {
        unitId: "DA_18_ElderDragon",
        chain: ["DA_RabadonsDeathcap", "DA_JeweledGauntlet", "DA_ArchangelsStaff"],
      },
    ],
    augmentPriority: ["ITEMS", "COMBAT", "ECON"],
    positioning: [
      { unitId: "DA_Brambleback18", row: 0, col: 3 },
      { unitId: "DA_Krug18", row: 0, col: 2 },
      { unitId: "DA_Taric18", row: 0, col: 4 },
      { unitId: "DA_Scuttlecrab18", row: 0, col: 5 },
      { unitId: "DA_Murkwolf18", row: 1, col: 3 },
      { unitId: "DA_Sentinel18", row: 1, col: 1 },
      { unitId: "DA_18_Sentry", row: 2, col: 2 },
      { unitId: "DA_18_ElderDragon", row: 2, col: 5 },
    ],
    board: [
      { id: "DA_Brambleback18", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_BrambleVest"] },
      { id: "DA_18_ElderDragon", star: 2, items: ["DA_RabadonsDeathcap", "DA_JeweledGauntlet", "DA_ArchangelsStaff"] },
      { id: "DA_Krug18", star: 2, items: [] },
      { id: "DA_18_Sentry", star: 2, items: [] },
      { id: "DA_Murkwolf18", star: 2, items: [] },
      { id: "DA_Scuttlecrab18", star: 2, items: [] },
      { id: "DA_Sentinel18", star: 2, items: [] },
      { id: "DA_Taric18", star: 2, items: [] },
    ],
    coreUnits: ["DA_Brambleback18", "DA_Krug18", "DA_18_Sentry", "DA_Sentinel18", "DA_18_ElderDragon"],
    flexUnits: ["DA_Murkwolf18", "DA_Scuttlecrab18", "DA_Taric18"],
    definingTrait: "DA_Riftbeast18",
    augments: [
      "Item augments first: Brambleback needs three real tank items before the board functions, and every component you get on 2-1 compounds into the Dragon later.",
      "One combat augment is enough. The board wins by not dying, so defensive stats and healing are worth more than a third damage augment.",
      "Econ is a fallback, not a plan — you are rolling at 8, so gold augments only pay if they arrive at 2-1.",
      "Do not take an augment that only buffs a single unit's attack damage. Nothing on this board is built to carry through damage alone.",
    ],
    notes: {
      whyNow:
        "This is the one comp every source agrees on: S on EmblemComp, MetaTFT, Blitz, SeeMeta and tft.ninja, A on TFT Academy and MID.GG, and a consensus score of 3.75 — the highest here. The reason is structural rather than patch-driven: six Riftbeast units give Brambleback a wall that costs almost nothing, and Elder Dragon turns that wall into a board that actually kills things. Our own crawl sees 333 Brambleback plus Dragon boards at 3.81 average and 61.9% top-4.",
      howToPlay:
        "Play it as a fast 8 with a level-9 payoff, not as a reroll. Take tank components early, slam Gargoyle's on Brambleback, and treat your health as the budget for reaching 8 with 30 gold. At 8 you are looking for two-star Brambleback, Krug and Sentinel — not for a three-star. The Dragon is the win condition, and every gold spent rerolling at 8 is gold you do not have at 9.",
      mistakes:
        "The defining mistake is playing for six Riftbeast and never finding Elder Dragon: that is a 4.97-average board in our data, which is a sixth place. The second is rolling at 8 for a three-star Brambleback — it is a four-cost, the odds are terrible, and the payoff is smaller than one Dragon. The third is itemising the Dragon before the wall; a Rabadon's on a Dragon behind three dead Riftbeast bodies does nothing.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "zyra-sprykin",
    name: "Sprykin Zyra",
    tier: "S",
    consensus: {
      score: 3.57,
      sources: [
        { source: "MID.GG (Sprykin Zyra)", tier: "S" },
        { source: "EmblemComp (Flora Fatalis Azir)", tier: "A" },
        { source: "TFTactics (Sprykin Summoners)", tier: "S" },
        { source: "SeeMeta (Executioner Azir)", tier: "S" },
        { source: "MetaTFT (Flora Fatalis Azir)", tier: "S" },
        { source: "Blitz (Sprykin Executioner Reroll)", tier: "S" },
        { source: "tft.ninja (Azir Reroll)", tier: "B" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Slow roll",
    difficulty: "Medium",
    summary:
      "A level-7 slow roll on Sprykin bodies: Zyra and Azir do the damage, Rammus and Fiddlesticks hold, and the fifth Sprykin breakpoint is the actual win condition.",
    leveling:
      "Level 4 on 2-1, 6 on 3-2, then park at 7 and slow roll above 50 gold. Zyra, Azir and Rammus are the three you are buying; go to 8 only when the board is upgraded or you need Fiddlesticks for the fifth Sprykin.",
    preconditions: [
      "You have at least three Sprykin units by 3-2 without rolling.",
      "One mana item exists for Zyra — she is the damage and she has to cast.",
      "The lobby is not three players deep on Azir, because two of you cannot both hit.",
    ],
    abandon: {
      when: "You are at 6 with under 30 gold and only two Sprykin units.",
      instead: "Invoker Teemo at 8 — same Invoker and Defender pieces, cheaper to finish, and it does not need the Sprykin vertical.",
    },
    counterCase:
      "Our own crawl is less impressed than the tier lists: 247 Zyra plus Azir boards average 4.33 with 54.7% top-4, which is a small edge over the 4.5 baseline, not an S-tier one. If you are choosing between this and Vanguard Alune on equal openers, the data says take Alune.",
    stages: [
      {
        stage: "2",
        plan: "Hold Sprykin units and take Tear or Gloves first. Level 4 on 2-1 only if it upgrades the board; this is not a stage-2 comp.",
      },
      {
        stage: "3",
        plan: "6 on 3-2. Roll above 50 gold for Zyra, Azir and Rammus — all three are the same roll, which is why the comp works at all.",
      },
      {
        stage: "4",
        plan: "Stay at 7 and keep rolling above 50 for the second and third Sprykin upgrades. Do not level to 8 to 'stabilise' — the board is finished here.",
      },
      {
        stage: "5+",
        plan: "8 only for Fiddlesticks if it completes the fifth Sprykin, or for a five-cost that upgrades the board. 9 is not part of the plan.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_18_Zyra",
        chain: ["DA_BlueBuff", "DA_RabadonsDeathcap", "DA_JeweledGauntlet", "DA_Component_TearOfTheGoddess"],
      },
      {
        unitId: "DA_18_Azir",
        chain: ["DA_SpearOfShojin", "DA_JeweledGauntlet", "DA_ArchangelsStaff"],
      },
      {
        unitId: "DA_18_Rammus",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_BrambleVest"],
      },
    ],
    augmentPriority: ["ECON", "ITEMS", "COMBAT"],
    positioning: [
      { unitId: "DA_18_Rammus", row: 0, col: 3 },
      { unitId: "DA_Fiddlesticks18", row: 0, col: 2 },
      { unitId: "DA_18_Kobuko", row: 0, col: 4 },
      { unitId: "DA_18_Soraka", row: 3, col: 1 },
      { unitId: "DA_18_Zyra", row: 3, col: 2 },
      { unitId: "DA_18_Veigar", row: 3, col: 3 },
      { unitId: "DA_18_Azir", row: 3, col: 4 },
      { unitId: "DA_18_Teemo", row: 3, col: 5 },
    ],
    board: [
      { id: "DA_18_Zyra", star: 2, items: ["DA_BlueBuff", "DA_RabadonsDeathcap", "DA_JeweledGauntlet"] },
      { id: "DA_18_Azir", star: 2, items: ["DA_SpearOfShojin", "DA_JeweledGauntlet", "DA_ArchangelsStaff"] },
      { id: "DA_18_Rammus", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_BrambleVest"] },
      { id: "DA_Fiddlesticks18", star: 2, items: [] },
      { id: "DA_18_Teemo", star: 2, items: [] },
      { id: "DA_18_Veigar", star: 2, items: [] },
      { id: "DA_18_Soraka", star: 2, items: [] },
      { id: "DA_18_Kobuko", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_Zyra", "DA_18_Azir", "DA_18_Rammus", "DA_18_Teemo", "DA_18_Veigar"],
    flexUnits: ["DA_Fiddlesticks18", "DA_18_Soraka", "DA_18_Kobuko"],
    definingTrait: "DA_18_Sprykin",
    augments: [
      "Roll augments beat econ here. You are slow rolling at 7, so anything that makes each roll cheaper is worth more than a one-time gold payout.",
      "One item augment for Zyra's mana is the second priority — she has to cast to do anything.",
      "A defensive augment for Rammus is quietly strong: he is the only real body between the carries and the lobby.",
      "Avoid augments that assume level 9. This board is finished at 7 and never buys the level.",
    ],
    notes: {
      whyNow:
        "S on four of the seven sites that list it, and the same board is published under three different names — Sprykin Zyra on MID.GG, Flora Fatalis Azir on EmblemComp and MetaTFT, Executioner Azir on SeeMeta and OP.GG — which is why the consensus needed a mapping rather than a name match. The pitch is a level-7 board in a patch where most of the ladder is trying to reach 8 or 9. Our crawl puts it at 4.33 over 247 boards, so the edge is real but modest.",
      howToPlay:
        "Park at 7 and roll above 50 gold. The reason this comp is cheap is that Zyra, Azir and Rammus all live on the same roll, so one bucket of gold upgrades three slots. Take Tear and Gloves early, put Blue Buff on Zyra the moment you have her, and treat the fifth Sprykin breakpoint as the actual win condition rather than a bonus. Fiddlesticks is melee — he belongs in the front, not behind the carries.",
      mistakes:
        "The first is levelling to 8 to stabilise. The board is finished at 7 and the level costs you the roll that completes it. The second is itemising Azir first: Zyra is the cheaper unit with the faster payoff. The third is playing six Sprykin for the vertical when five plus a real frontline is the stronger board.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "vanguard-alune",
    name: "Vanguard Alune",
    tier: "S",
    consensus: {
      score: 3.56,
      sources: [
        { source: "TFT Academy (Vanguard Alune)", tier: "A" },
        { source: "EmblemComp", tier: "S" },
        { source: "MID.GG (Vanguard Alune)", tier: "S" },
        { source: "MetaTFT", tier: "S" },
        { source: "Blitz", tier: "S" },
        { source: "SeeMeta", tier: "B" },
        { source: "tft.ninja (AP Fast 9)", tier: "A" },
        { source: "Mobalytics (AP Exodia)", tier: "S" },
        { source: "TFTactics (Vanguard Alune)", tier: "S" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 9",
    difficulty: "Hard",
    summary:
      "Four Vanguard bodies in a wall, Alune casting from behind it, and the whole thing pointed at level 9. The most expensive comp here and the one with the highest ceiling.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 8 on 4-2, then hold 50+ and go 9 on 5-3 or later. Roll only at 8 for Alune and two-star Vanguard; the level is the win condition and every roll before 9 delays it.",
    preconditions: [
      "You reach 4-2 at 60+ health — this comp needs the runway, and a 40-health 4-2 is a top-6 board.",
      "Alune is not contested by more than one player.",
      "You have a Rod or Tear start, because Alune without a mana item does not cast enough to justify the wall.",
    ],
    abandon: {
      when: "You are below 40 health at 4-2 and still have one-star Vanguard units.",
      instead: "Invoker Teemo or Sprykin Zyra — both finish at 7 or 8 and neither needs the level 9 you can no longer afford.",
    },
    counterCase:
      "Everything here assumes you get to 9. In our crawl the Alune, Taric and Sentinel core is 178 boards at 3.35 average and 69.1% top-4 — the best top-4 rate of any board we measured, and the reason the comp is rated S even though SeeMeta has it at B. It is a placement comp, not a win-rate comp: if you need firsts, this is the wrong choice.",
    stages: [
      {
        stage: "2",
        plan: "Take Rod or Tear, hold Vanguard units and level on 2-1 and 2-5. Stage 2 is about health, not damage.",
      },
      {
        stage: "3",
        plan: "6 on 3-2 and do not roll. Slam Alune's first item if you already have her; otherwise bank everything.",
      },
      {
        stage: "4",
        plan: "8 on 4-2. Roll for Alune and two-star Taric and Sentinel, then stop at 30 gold. Below 40 health, roll deeper and accept top 4.",
      },
      {
        stage: "5+",
        plan: "9 on 5-3 or later with 40+ gold, then roll for the second five-cost. This is the stage the comp is built for.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_18_Alune",
        chain: ["DA_ArchangelsStaff", "DA_JeweledGauntlet", "DA_BlueBuff", "DA_Component_TearOfTheGoddess"],
      },
      {
        unitId: "DA_Taric18",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"],
      },
    ],
    augmentPriority: ["ECON", "ITEMS", "COMBAT"],
    positioning: [
      { unitId: "DA_Sentinel18", row: 0, col: 2 },
      { unitId: "DA_Taric18", row: 0, col: 3 },
      { unitId: "DA_18_Diana", row: 0, col: 4 },
      { unitId: "DA_18_Rakan", row: 1, col: 1 },
      { unitId: "DA_Fiddlesticks18", row: 1, col: 2 },
      { unitId: "DA_18_Lillia", row: 1, col: 5 },
      { unitId: "DA_18_Morgana", row: 2, col: 4 },
      { unitId: "DA_18_Alune", row: 3, col: 3 },
      { unitId: "DA_18_Ivern", row: 3, col: 5 },
    ],
    board: [
      { id: "DA_18_Alune", star: 2, items: ["DA_ArchangelsStaff", "DA_JeweledGauntlet", "DA_BlueBuff"] },
      { id: "DA_Taric18", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"] },
      { id: "DA_Sentinel18", star: 2, items: [] },
      { id: "DA_18_Diana", star: 2, items: [] },
      { id: "DA_18_Rakan", star: 2, items: [] },
      { id: "DA_18_Ivern", star: 2, items: [] },
      { id: "DA_18_Lillia", star: 2, items: [] },
      { id: "DA_Fiddlesticks18", star: 2, items: [] },
      { id: "DA_18_Morgana", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_Alune", "DA_Taric18", "DA_Sentinel18", "DA_18_Diana", "DA_18_Ivern"],
    flexUnits: ["DA_18_Rakan", "DA_18_Lillia", "DA_Fiddlesticks18", "DA_18_Morgana"],
    definingTrait: "DA_18_Vanguard",
    augments: [
      "Econ first, without exception. The comp is a race to 9 and a gold augment at 2-1 is worth more than any combat stat on this board.",
      "One item augment for Alune's mana, second priority. Archangel's plus a mana source is the whole damage engine.",
      "A Vanguard or defensive augment is fine at 3-2 if the econ choices are gone — the wall exists to buy Alune time to scale.",
      "Do not take combat augments that only pay off in long fights if you are already losing health; you will not get the fight.",
    ],
    notes: {
      whyNow:
        "Five of nine sources have this at S, and the same board is published as Vanguard Alune, AP Exodia and AP Fast 9 — three names, one composition, which is exactly the kind of rename the consensus has to see through. The measured case is the strongest part: 178 Alune plus Taric plus Sentinel boards at 3.35 average and 69.1% top-4 in our crawl. SeeMeta rates it B, which is the honest dissent — it is a top-4 machine that rarely converts to first.",
      howToPlay:
        "This is a health-management comp with a damage unit attached. Your job for eight minutes is to arrive at 4-2 with 60+ health and 50 gold; the wall is what makes that possible. Slam tank items on Taric early and mana on Alune the moment she appears. At 8, roll only enough to two-star the frontline, then go straight to 9 and spend there — the second five-cost is where the placements become wins.",
      mistakes:
        "Rolling at 8 for a three-star Alune is the classic way to lose with this comp; she is a four-cost on a board that wants the level. The second mistake is building damage on the wall — Taric with a Deathblade is a wasted item on a unit whose job is to be hit. The third is playing it from 40 health: the comp has no fast stabiliser, and a low-health 4-2 is a top-6 finish no matter how well you play the rest.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "maokai-draven",
    name: "Maokai Draven",
    tier: "A",
    consensus: {
      score: 3.33,
      sources: [
        { source: "MID.GG", tier: "S" },
        { source: "EmblemComp", tier: "A" },
        { source: "TFT Academy", tier: "A" },
        { source: "tft.ninja", tier: "S" },
        { source: "Blitz", tier: "S" },
        { source: "SeeMeta", tier: "B" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 8",
    difficulty: "Easy",
    summary:
      "A Juggernaut frontline around Maokai with Draven throwing axes from the back. The most forgiving board in this set: it wants items nobody else is contesting and finishes on a level 6 curve.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 7 on 3-5, 8 on 4-2. Roll once at 6 for Maokai and Amumu, then bank to 8 for Draven.",
    preconditions: [
      "You have a Bow or Sword start — Draven without attack speed is a slow loss.",
      "Maokai or Amumu is two-star by 4-1.",
      "You are not fighting two other players for Draven, who is the only four-cost the board cannot replace.",
    ],
    abandon: {
      when: "Two players are on Juggernaut and your Maokai is still one-star at 4-2.",
      instead: "Riftbeast Brambleback — the frontline pieces overlap, and Brambleback does not need a contested four-cost to function.",
    },
    counterCase:
      "Our crawl is the least flattering number on this page relative to its rating: 348 Maokai plus Draven boards average 4.06 with 57.2% top-4. That is a real edge, but it makes this an A for consistency, not an S for power — the comp is easy to play and hard to win with.",
    stages: [
      {
        stage: "2",
        plan: "Level 4 on 2-1 and 5 on 2-5 with whatever frontline you have. Take Bow and Sword and slam Guinsoo's on the first unit that can hold it.",
      },
      {
        stage: "3",
        plan: "6 on 3-2, one roll bucket for Maokai and Amumu, then 7 on 3-5. Do not chase three-stars.",
      },
      {
        stage: "4",
        plan: "8 on 4-2 with 30+ gold and roll for Draven plus two-star Maokai. Stop at 20 gold once both are upgraded.",
      },
      {
        stage: "5+",
        plan: "9 only if you are above 50 health and Draven is two-star. Otherwise sit at 8 and spend on the last upgrades — this board does not need level 9.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_Draven18",
        chain: ["DA_GuinsoosRageblade", "DA_InfinityEdge", "DA_LastWhisper", "DA_Component_RecurveBow"],
      },
      {
        unitId: "DA_18_Maokai",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"],
      },
    ],
    augmentPriority: ["ECON", "ITEMS", "COMBAT"],
    positioning: [
      { unitId: "DA_18_Alistar", row: 0, col: 1 },
      { unitId: "DA_18_Maokai", row: 0, col: 2 },
      { unitId: "DA_Amumu18", row: 0, col: 3 },
      { unitId: "DA_Taric18", row: 0, col: 4 },
      { unitId: "DA_18_Kennen", row: 2, col: 5 },
      { unitId: "DA_18_Ivern", row: 3, col: 4 },
      { unitId: "DA_Draven18", row: 3, col: 2 },
      { unitId: "DA_18_Ezreal", row: 3, col: 5 },
    ],
    board: [
      { id: "DA_Draven18", star: 2, items: ["DA_GuinsoosRageblade", "DA_InfinityEdge", "DA_LastWhisper"] },
      { id: "DA_18_Maokai", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"] },
      { id: "DA_Amumu18", star: 2, items: [] },
      { id: "DA_Taric18", star: 2, items: [] },
      { id: "DA_18_Alistar", star: 2, items: [] },
      { id: "DA_18_Kennen", star: 2, items: [] },
      { id: "DA_18_Ezreal", star: 2, items: [] },
      { id: "DA_18_Ivern", star: 2, items: [] },
    ],
    coreUnits: ["DA_Draven18", "DA_18_Maokai", "DA_Amumu18", "DA_Taric18", "DA_18_Kennen"],
    flexUnits: ["DA_18_Alistar", "DA_18_Ezreal", "DA_18_Ivern"],
    definingTrait: "DA_Juggernaut18",
    augments: [
      "Item augments first — Draven needs three real items and the board has no second damage source to fall back on.",
      "Econ at 2-1 if the item augment is bad; the curve to 8 is the comp's main skill test.",
      "One frontline augment is enough. Juggernaut units already have the stats; healing and shields are the useful additions.",
      "Skip anything that wants you to stay at 6 or 7 — the four-cost is the point.",
    ],
    notes: {
      whyNow:
        "S on MID.GG, tft.ninja and Blitz, A on EmblemComp and TFT Academy, B on SeeMeta — a 3.33 average and the easiest board on this list to actually execute. The reason it holds up is itemisation: Guinsoo's, Infinity Edge and Last Whisper are contested by nobody else in a Riftbeast or Alune lobby. Our crawl has 348 Maokai plus Draven boards at 4.06 average and 57.2% top-4.",
      howToPlay:
        "Treat the early game as a level curve, not a fight. Maokai and Amumu are two-stars you get on the way to 8, not units you reroll for. Slam Guinsoo's early on a placeholder so it is stacked by the time Draven arrives, and hold Bow for him. At 8, roll for Draven and the last frontline upgrades, then stop — this board is finished at 8 and level 9 is usually a mistake.",
      mistakes:
        "Rerolling at 6 for three-star Maokai is the most common failure; the payoff is far below reaching Draven a round earlier. The second is putting Draven in the front row because his range is long — six hexes is long until something dives him. The third is taking a second damage carry item set when the frontline is still one-star; a two-star frontline is worth more than any item on the board.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "adaptor-master-yi",
    name: "Adaptor Master Yi",
    tier: "A",
    consensus: {
      score: 3.33,
      sources: [
        { source: "EmblemComp", tier: "S" },
        { source: "TFT Academy", tier: "A" },
        { source: "TFTactics", tier: "S" },
        { source: "tft.ninja", tier: "B" },
        { source: "MetaTFT", tier: "A" },
        { source: "Blitz", tier: "S" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 8",
    difficulty: "Medium",
    summary:
      "Master Yi in the middle of an Adaptor shell, with Kog'Maw and Nidalee turning the trait's adaptive stats into damage. A bruiser board that wins by outlasting rather than out-bursting.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 8 on 4-2 with 30+ gold. Roll at 8 for Master Yi and Kog'Maw; do not level to 9 unless the board is already two-star.",
    preconditions: [
      "You have two Adaptor units by 3-2 — the trait is the comp, not a bonus.",
      "Master Yi has at least one completed item before 4-2.",
      "You are not the third player on Riftbeast, because Kog'Maw and Nidalee are shared with that comp.",
    ],
    abandon: {
      when: "You are at 8 with 30 gold and neither Master Yi nor Kog'Maw is on the board.",
      instead: "Invoker Teemo — the frontline overlaps, it does not need the two four-costs, and it finishes at 7.",
    },
    counterCase:
      "The A here is a consensus of six sites that disagree: two have it at S, two at A, one at B. In our crawl 155 Master Yi plus Kog'Maw boards average 4.14 with 58.7% top-4 — good, but on a sample small enough that a single lobby can move it.",
    stages: [
      {
        stage: "2",
        plan: "Level on curve with whatever frontline you have and take Bow or Sword. Adaptor units are cheap — hold them all.",
      },
      {
        stage: "3",
        plan: "6 on 3-2, no roll. Slam Guinsoo's on the first melee body that can hold it; Master Yi inherits it at 8.",
      },
      {
        stage: "4",
        plan: "8 on 4-2, roll for Master Yi, Kog'Maw and Nidalee. Stop when the core is two-star, not when the gold is gone.",
      },
      {
        stage: "5+",
        plan: "Sit at 8 and upgrade. Level 9 is worth it only if you already have every two-star and a spare item for a five-cost.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_18_MasterYi_AD",
        chain: ["DA_GuinsoosRageblade", "DA_InfinityEdge", "DA_GiantSlayer", "DA_Component_RecurveBow"],
      },
      {
        unitId: "DA_KogMaw18_AD",
        chain: ["DA_KrakensFury", "DA_GiantSlayer", "DA_LastWhisper"],
      },
    ],
    augmentPriority: ["ITEMS", "ECON", "COMBAT"],
    positioning: [
      { unitId: "DA_Krug18", row: 0, col: 1 },
      { unitId: "DA_Vi18", row: 0, col: 2 },
      { unitId: "DA_18_MasterYi_AD", row: 0, col: 3 },
      { unitId: "DA_18_Sett", row: 0, col: 4 },
      { unitId: "DA_18_Yorick", row: 0, col: 5 },
      { unitId: "DA_18_Rengar", row: 1, col: 3 },
      { unitId: "DA_Nidalee18_AP", row: 1, col: 4 },
      { unitId: "DA_KogMaw18_AD", row: 3, col: 2 },
    ],
    board: [
      { id: "DA_18_MasterYi_AD", star: 2, items: ["DA_GuinsoosRageblade", "DA_InfinityEdge", "DA_GiantSlayer"] },
      { id: "DA_KogMaw18_AD", star: 2, items: ["DA_KrakensFury", "DA_GiantSlayer", "DA_LastWhisper"] },
      { id: "DA_Nidalee18_AP", star: 2, items: [] },
      { id: "DA_Vi18", star: 2, items: [] },
      { id: "DA_18_Sett", star: 2, items: [] },
      { id: "DA_Krug18", star: 2, items: [] },
      { id: "DA_18_Yorick", star: 2, items: [] },
      { id: "DA_18_Rengar", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_MasterYi_AD", "DA_KogMaw18_AD", "DA_Nidalee18_AP", "DA_Vi18", "DA_18_Sett"],
    flexUnits: ["DA_Krug18", "DA_18_Yorick", "DA_18_Rengar"],
    definingTrait: "DA_18_Adaptor",
    augments: [
      "Item augments first. Master Yi with two items is a different unit from Master Yi with three.",
      "Econ at 2-1 as the fallback — the board lives or dies on reaching 8 on time.",
      "One bruiser-flavoured combat augment is fine: resistances and healing suit a board that expects to be hit.",
      "Avoid augments that only work if you three-star a one-cost. This comp never rerolls.",
    ],
    notes: {
      whyNow:
        "Three sites have it at S, two at A and one at B — the widest disagreement of any comp in the set, which is exactly what an average is for. It lands at 3.33. The board is a Master Yi shell: Adaptor gives him stats, Kog'Maw and Nidalee convert them into ranged damage, and the rest of the frontline is cheap bodies. Our crawl measures 155 Master Yi plus Kog'Maw boards at 4.14 average and 58.7% top-4.",
      howToPlay:
        "Play the level curve and let the shell do the work. Yi wants Guinsoo's and a real damage item before 4-2, and everything else goes into whichever frontline body is two-star. Adaptor rewards being alive next to other Adaptor units, so keep them adjacent rather than spread across the board. At 8 you are rolling for three specific units; if you find two of them, stop and stabilise.",
      mistakes:
        "Spreading the Adaptor units across three rows is the most common error — the trait wants them together, and Yi is melee, so he cannot be behind the carries. The second is itemising Kog'Maw before Yi; the melee unit has to survive to use the items. The third is levelling to 9 with a one-star frontline, which trades the board you have for a five-cost you cannot protect.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "invoker-teemo",
    name: "Invoker Teemo",
    tier: "A",
    consensus: {
      score: 3.33,
      sources: [
        { source: "EmblemComp", tier: "A" },
        { source: "MetaTFT", tier: "S" },
        { source: "SeeMeta", tier: "S+" },
        { source: "TFT Flow", tier: "B" },
        { source: "tft.ninja", tier: "A" },
        { source: "Blitz", tier: "S" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 8",
    difficulty: "Easy",
    summary:
      "Teemo and Morgana as the Invoker pair, with a Defender shell in front and a level-7 board that does not need to reach 9 to win.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 7 on 4-1, 8 on 4-5. Roll at 7 for Teemo and Morgana, then at 8 for the last frontline upgrades.",
    preconditions: [
      "Teemo is two-star by 4-1 — he is the damage and the board has no replacement.",
      "You have a Tear or Rod for his first item.",
      "At least three Invoker units are on the board by 7, not two with a promise.",
    ],
    abandon: {
      when: "Teemo is still one-star at 4-1 and you are below 40 health.",
      instead: "Defender Rengar — same Defender frontline, cheaper carry, and it does not depend on a single three-cost.",
    },
    counterCase:
      "The board is strong but the sample is thin: 111 Teemo plus Morgana boards at 3.99 average and 61.3% top-4 in our crawl. The top-4 rate is excellent; the average says it converts those placements into seconds and thirds rather than firsts.",
    stages: [
      {
        stage: "2",
        plan: "Hold Teemo and Morgana, level on curve, take Tear or Rod. Stage 2 is a health stage; this board does not spike early.",
      },
      {
        stage: "3",
        plan: "6 on 3-2 and roll lightly for Teemo if you are win-streaking. Otherwise bank to 7.",
      },
      {
        stage: "4",
        plan: "7 on 4-1, roll for Teemo two-star and Morgana, then 8 on 4-5. Stop rolling at 8 once the frontline is upgraded.",
      },
      {
        stage: "5+",
        plan: "Stay at 8. Every gold goes into upgrades and the last Invoker breakpoint; level 9 adds nothing this board needs.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_18_Teemo",
        chain: ["DA_BlueBuff", "DA_RabadonsDeathcap", "DA_JeweledGauntlet", "DA_Component_TearOfTheGoddess"],
      },
      {
        unitId: "DA_Sentinel18",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"],
      },
    ],
    augmentPriority: ["ITEMS", "COMBAT", "ECON"],
    positioning: [
      { unitId: "DA_18_Kobuko", row: 0, col: 1 },
      { unitId: "DA_Sentinel18", row: 0, col: 2 },
      { unitId: "DA_18_Alistar", row: 0, col: 3 },
      { unitId: "DA_18_Hecarim", row: 0, col: 4 },
      { unitId: "DA_18_Morgana", row: 2, col: 4 },
      { unitId: "DA_18_Teemo", row: 3, col: 2 },
      { unitId: "DA_18_LeBlanc", row: 3, col: 4 },
      { unitId: "DA_18_Veigar", row: 3, col: 5 },
    ],
    board: [
      { id: "DA_18_Teemo", star: 2, items: ["DA_BlueBuff", "DA_RabadonsDeathcap", "DA_JeweledGauntlet"] },
      { id: "DA_Sentinel18", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"] },
      { id: "DA_18_Morgana", star: 2, items: [] },
      { id: "DA_18_Alistar", star: 2, items: [] },
      { id: "DA_18_LeBlanc", star: 2, items: [] },
      { id: "DA_18_Hecarim", star: 2, items: [] },
      { id: "DA_18_Kobuko", star: 2, items: [] },
      { id: "DA_18_Veigar", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_Teemo", "DA_18_Morgana", "DA_Sentinel18", "DA_18_Alistar", "DA_18_LeBlanc"],
    flexUnits: ["DA_18_Hecarim", "DA_18_Kobuko", "DA_18_Veigar"],
    definingTrait: "DA_18_Invoker",
    augments: [
      "Item augments first: Teemo with three items is the entire damage plan.",
      "One combat augment that helps the Defender shell survive is worth taking at 3-2.",
      "Econ only as a fallback at 2-1, and only if the item augment is unplayable.",
      "Do not take an augment that requires level 9 — the board's whole advantage is that it finishes at 8.",
    ],
    notes: {
      whyNow:
        "SeeMeta has it at S+, MetaTFT and Blitz at S, EmblemComp and tft.ninja at A and TFT Flow at B, which averages to 3.33. It is the cheapest board on this list: Invoker plus a Defender front is a level-7 composition, so it does not compete with the lobby for levels. Our crawl sees 111 Teemo plus Morgana boards at 3.99 average and 61.3% top-4.",
      howToPlay:
        "Roll at 7, not at 8. Teemo and Morgana are cheap enough to find on a 7 roll, and the tempo you gain is worth more than the higher-cost units you would see one level later. Put Blue Buff on Teemo the moment he appears and keep him behind the Defender line — Morgana's row placement matters less than keeping him alive. Once the Invoker breakpoint is live, the board plays itself.",
      mistakes:
        "The most common mistake is levelling to 8 before rolling and then having 20 gold to find Teemo. The second is front-lining Morgana because her range is shorter than Teemo's — she still dies instantly. The third is treating Invoker as a vertical: four Invokers with a weak frontline loses to three Invokers plus real bodies.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "solar-karma-reroll",
    name: "Solar Karma",
    tier: "A",
    consensus: {
      score: 3,
      sources: [
        { source: "EmblemComp", tier: "A" },
        { source: "TFT Academy", tier: "A" },
        { source: "Mobalytics", tier: "S" },
        { source: "SeeMeta", tier: "B" },
        { source: "tft.ninja", tier: "S" },
        { source: "Blitz", tier: "B" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 8",
    difficulty: "Medium",
    summary:
      "Karma and Yunara as a two-carry board behind a Solar frontline, with Yorick tanking and Kayle providing the third threat nobody itemises.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 8 on 4-2. Roll at 8 for Karma, Yunara and Sejuani; the board is playable at 7 only if two of those three are already owned.",
    preconditions: [
      "You have both a Rod and a Bow start, because Karma and Yunara want different items and neither can be skipped.",
      "Sejuani is two-star by 4-2.",
      "The lobby is not on Alune, which shares your Rods and your level-8 timing.",
    ],
    abandon: {
      when: "You reach 8 with 30 gold and can only find one of Karma or Yunara.",
      instead: "Ahri Spellweavers — Karma and Zyra overlap, and the board functions with one carry instead of two.",
    },
    counterCase:
      "The two-carry structure is the risk as well as the reward. Our crawl has 299 Karma plus Yunara boards at 4.26 average and 54.8% top-4 — a thin edge, and the worst of the three 'good' boards we measured. If you cannot itemise both carries, this is a B-tier board with an A-tier price.",
    stages: [
      {
        stage: "2",
        plan: "Level on curve and take Rod first. Hold Karma if she appears; she is the unit the comp is named for.",
      },
      {
        stage: "3",
        plan: "6 on 3-2, no roll. Slam a mana item on a placeholder to keep your health, and bank for 8.",
      },
      {
        stage: "4",
        plan: "8 on 4-2 with 40 gold. Roll for Karma, Yunara and Sejuani; stop when both carries are on the board, even if the frontline is imperfect.",
      },
      {
        stage: "5+",
        plan: "9 only if both carries are itemised and the frontline is two-star. Otherwise spend the gold on the last upgrades at 8.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_Karma18",
        chain: ["DA_BlueBuff", "DA_JeweledGauntlet", "DA_RabadonsDeathcap", "DA_Component_NeedlesslyLargeRod"],
      },
      {
        unitId: "DA_18_Yunara",
        chain: ["DA_Deathblade", "DA_LastWhisper", "DA_SpearOfShojin"],
      },
      {
        unitId: "DA_18_Sejuani",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"],
      },
    ],
    augmentPriority: ["ECON", "ITEMS", "COMBAT"],
    positioning: [
      { unitId: "DA_18_Leona", row: 0, col: 2 },
      { unitId: "DA_18_Sejuani", row: 0, col: 3 },
      { unitId: "DA_18_Yorick", row: 1, col: 4 },
      { unitId: "DA_18_Yunara", row: 2, col: 2 },
      { unitId: "DA_18_Kayle", row: 2, col: 5 },
      { unitId: "DA_Karma18", row: 3, col: 2 },
      { unitId: "DA_18_LeBlanc", row: 3, col: 3 },
      { unitId: "DA_18_Azir", row: 3, col: 5 },
    ],
    board: [
      { id: "DA_Karma18", star: 2, items: ["DA_BlueBuff", "DA_JeweledGauntlet", "DA_RabadonsDeathcap"] },
      { id: "DA_18_Yunara", star: 2, items: ["DA_Deathblade", "DA_LastWhisper", "DA_SpearOfShojin"] },
      { id: "DA_18_Sejuani", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"] },
      { id: "DA_18_Yorick", star: 2, items: [] },
      { id: "DA_18_Leona", star: 2, items: [] },
      { id: "DA_18_Kayle", star: 2, items: [] },
      { id: "DA_18_LeBlanc", star: 2, items: [] },
      { id: "DA_18_Azir", star: 2, items: [] },
    ],
    coreUnits: ["DA_Karma18", "DA_18_Yunara", "DA_18_Sejuani", "DA_18_Yorick", "DA_18_Leona"],
    flexUnits: ["DA_18_LeBlanc", "DA_18_Kayle", "DA_18_Azir"],
    definingTrait: "DA_18_Solar",
    augments: [
      "Econ first if you are not already above 8; the comp needs both carries and that means a lot of gold at 8.",
      "Item augments are the second priority — Karma and Yunara each want a full set and you are itemising two units.",
      "A defensive augment on Sejuani is nearly as good as an econ augment, because the frontline is what lets both carries cast.",
      "Skip augments that only buff one damage type. Half your damage is physical and half is magic.",
    ],
    notes: {
      whyNow:
        "Two sites have it at S, two at A and two at B, averaging three — the definition of an A. The structure is unusual: Karma is magic, Yunara is physical, so no single resistance item on the enemy frontline blanks your board. Our crawl finds 299 Karma plus Yunara boards at 4.26 average and 54.8% top-4, which is an edge but not a commanding one.",
      howToPlay:
        "Itemise both carries or do not play it. Karma gets Blue Buff and a Rod item, Yunara gets Deathblade and Last Whisper, and Sejuani gets whatever tank components are left. The two carries sit together in the back corner so a single dive threat cannot reach both, with Kayle and Azir as the secondary row. Roll at 8 until both carries are present, then stop rolling and start stabilising.",
      mistakes:
        "Itemising one carry and leaving the other with a component is the failure mode; the board's whole point is that the enemy cannot itemise against both damage types. The second mistake is front-lining Yorick for the Solar count and losing your only real tank on the first cast. The third is going 9 with one-star carries, which is the same mistake as every fast-8 comp: the level is not the payoff, the units are.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "ahri-spellweavers",
    name: "Ahri Spellweavers",
    tier: "A",
    consensus: {
      score: 2.86,
      sources: [
        { source: "TFT Academy", tier: "A" },
        { source: "EmblemComp (Invoker Ahri)", tier: "A" },
        { source: "TFTactics", tier: "A" },
        { source: "SeeMeta", tier: "A" },
        { source: "MID.GG", tier: "A" },
        { source: "Blitz", tier: "A" },
        { source: "tft.ninja", tier: "B" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 8",
    difficulty: "Hard",
    summary:
      "Ahri as the single carry with Zyra and Karma adding spell damage from the same back line, and an Invoker pair behind a cheap Sett frontline.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 8 on 4-2. Roll at 8 for Ahri and Sett; the board needs Ahri two-star more than it needs a second carry.",
    preconditions: [
      "You have a Rod start and at least one mana component for Ahri.",
      "Sett is two-star by 4-2, because he is the only unit actually holding the line.",
      "You can reach 8 at 50+ health; this board has no early spike to lean on.",
    ],
    abandon: {
      when: "You are at 8 with Ahri one-star and Sett one-star after a full roll.",
      instead: "Sprykin Zyra — Zyra and Karma overlap, the board finishes at 7, and it does not need Ahri to function.",
    },
    counterCase:
      "This is the clearest disagreement between the sites and our own data. Seven sites average it to A, but in our crawl 390 Ahri plus Zyra boards average 4.71 with only 46.9% top-4 — the largest sample here and the worst result of any A-tier board. Play it because the lobby does, not because the measurement supports it.",
    stages: [
      {
        stage: "2",
        plan: "Take Rod, hold Ahri and Zyra, level on curve. Do not commit items to a placeholder carry.",
      },
      {
        stage: "3",
        plan: "6 on 3-2 and do not roll. This is the weakest stage for the comp; play for health, not for wins.",
      },
      {
        stage: "4",
        plan: "8 on 4-2, roll for Ahri and two-star Sett. Stop when Ahri is two-star; a third carry is a luxury, not a requirement.",
      },
      {
        stage: "5+",
        plan: "9 only with a two-star Ahri and a healthy frontline. Otherwise sit at 8 and buy the last Sett and Morgana upgrades.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_18_Ahri",
        chain: ["DA_SpearOfShojin", "DA_JeweledGauntlet", "DA_RabadonsDeathcap", "DA_Component_NeedlesslyLargeRod"],
      },
      {
        unitId: "DA_18_Sett",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_DragonsClaw"],
      },
    ],
    augmentPriority: ["ITEMS", "ECON", "COMBAT"],
    positioning: [
      { unitId: "DA_Taric18", row: 0, col: 2 },
      { unitId: "DA_18_Sett", row: 0, col: 3 },
      { unitId: "DA_Sentinel18", row: 0, col: 4 },
      { unitId: "DA_18_Yorick", row: 1, col: 3 },
      { unitId: "DA_18_Morgana", row: 2, col: 4 },
      { unitId: "DA_18_Ahri", row: 3, col: 2 },
      { unitId: "DA_18_Zyra", row: 3, col: 5 },
      { unitId: "DA_Karma18", row: 3, col: 4 },
    ],
    board: [
      { id: "DA_18_Ahri", star: 2, items: ["DA_SpearOfShojin", "DA_JeweledGauntlet", "DA_RabadonsDeathcap"] },
      { id: "DA_18_Sett", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_DragonsClaw"] },
      { id: "DA_18_Zyra", star: 2, items: [] },
      { id: "DA_Karma18", star: 2, items: [] },
      { id: "DA_18_Morgana", star: 2, items: [] },
      { id: "DA_Sentinel18", star: 2, items: [] },
      { id: "DA_Taric18", star: 2, items: [] },
      { id: "DA_18_Yorick", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_Ahri", "DA_18_Zyra", "DA_Karma18", "DA_18_Sett", "DA_18_Morgana"],
    flexUnits: ["DA_Sentinel18", "DA_Taric18", "DA_18_Yorick"],
    definingTrait: "DA_18_Spellweaver",
    augments: [
      "Item augments first: Ahri needs a full three-item set before the board does anything.",
      "Econ second — the comp is a race to 8 and then a single roll bucket.",
      "A defensive augment for Sett is worth more than a second damage augment, because the carries do not need help killing.",
      "Do not take an augment that scales with fight length if you are already bleeding health; you will not reach the late fight.",
    ],
    notes: {
      whyNow:
        "Strictly an A: six sites at A, tft.ninja at B, consensus 2.86 — the lowest score among the A-tier boards here. EmblemComp publishes it as 'Invoker Ahri', which is the same board under a name that does not match Ahri's own traits. Our crawl is the reason this guide is honest rather than enthusiastic: 390 Ahri plus Zyra boards at 4.71 average and 46.9% top-4, on the largest sample in this set. It is popular and it underperforms.",
      howToPlay:
        "Play it only if you are comfortable being the most contested board at 8. Ahri gets Shojin and two Rod items; Sett gets the tank set and stands in the middle, because a two-star Sett in the corner is a dead unit. Sentinel and Taric flank him, with Morgana mid-row for the Invoker count and a second spell threat. The comp spikes at 8 and then stops, so spend the rest of your gold on Sett and the second carry rather than on the level.",
      mistakes:
        "The biggest one is playing this because it is popular: our own measurement says the board loses more often than the tier lists imply, and the lobby's Ahri is your Ahri. The second is front-lining Ahri for range coverage — four range is long, not safe. The third is buying a second damage carry before Sett is two-star, which leaves the whole back line unprotected.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "elderwood-ezreal",
    name: "Elderwood Ezreal",
    tier: "A",
    consensus: {
      score: 2.71,
      sources: [
        { source: "EmblemComp", tier: "S" },
        { source: "TFT Academy", tier: "A" },
        { source: "TFTactics", tier: "A" },
        { source: "SeeMeta", tier: "B" },
        { source: "MID.GG", tier: "B" },
        { source: "Blitz", tier: "S" },
        { source: "tft.ninja", tier: "C" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Fast 8",
    difficulty: "Medium",
    summary:
      "Ezreal and Soraka as a two-carry back line behind Ornn and Alistar, with the Elderwood trait doing the stat work. A board that scales with units, not with items.",
    leveling:
      "Level 4 on 2-1, 5 on 2-5, 6 on 3-2, 8 on 4-2. Roll at 8 for Ezreal, Soraka and Ornn; the board is finished at 8 and rarely buys 9.",
    preconditions: [
      "You have four Elderwood units by 4-2 — the trait is the comp's stat engine.",
      "Ezreal has a Sword or Bow item before 4-2.",
      "Ornn or Alistar is two-star, because Ezreal cannot carry through a collapsed front line.",
    ],
    abandon: {
      when: "You are at 8 at 30 health and Ezreal is still one-star.",
      instead: "Maokai Draven — the frontline overlaps, and a single physical carry is easier to itemise than two.",
    },
    counterCase:
      "The lowest-scoring A on this page, and the sites are not kind: tft.ninja has it at C and two others at B. Our crawl agrees more with the doubters than the believers — 241 Ezreal plus Soraka boards at 4.35 average and 54.4% top-4, which is barely above the 4.5 baseline.",
    stages: [
      {
        stage: "2",
        plan: "Level on curve, hold every Elderwood unit, take Sword or Bow. This is a collection stage.",
      },
      {
        stage: "3",
        plan: "6 on 3-2, no roll. Use a placeholder carry with Ezreal's items to hold health.",
      },
      {
        stage: "4",
        plan: "8 on 4-2, roll for Ezreal, Soraka and two-star Ornn. Stop rolling once Ezreal is two-star and the frontline is upgraded.",
      },
      {
        stage: "5+",
        plan: "Stay at 8 and buy the last Elderwood upgrades. Level 9 is a mistake on this board unless you are already top two.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_18_Ezreal",
        chain: ["DA_Deathblade", "DA_LastWhisper", "DA_GiantSlayer", "DA_Component_BFSword"],
      },
      {
        unitId: "DA_18_Aphelios",
        chain: ["DA_GuinsoosRageblade", "DA_InfinityEdge", "DA_LastWhisper"],
      },
      {
        unitId: "DA_18_Ornn",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"],
      },
    ],
    augmentPriority: ["ITEMS", "COMBAT", "ECON"],
    positioning: [
      { unitId: "DA_18_Ornn", row: 0, col: 2 },
      { unitId: "DA_18_Hecarim", row: 0, col: 3 },
      { unitId: "DA_18_Alistar", row: 0, col: 4 },
      { unitId: "DA_18_LeBlanc", row: 2, col: 3 },
      { unitId: "DA_18_Aphelios", row: 2, col: 5 },
      { unitId: "DA_18_Ezreal", row: 3, col: 2 },
      { unitId: "DA_18_Soraka", row: 3, col: 4 },
      { unitId: "DA_18_Xayah", row: 3, col: 5 },
    ],
    board: [
      { id: "DA_18_Ezreal", star: 2, items: ["DA_Deathblade", "DA_LastWhisper", "DA_GiantSlayer"] },
      { id: "DA_18_Aphelios", star: 2, items: ["DA_GuinsoosRageblade", "DA_InfinityEdge", "DA_LastWhisper"] },
      { id: "DA_18_Ornn", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_SpiritVisage"] },
      { id: "DA_18_Soraka", star: 2, items: [] },
      { id: "DA_18_Alistar", star: 2, items: [] },
      { id: "DA_18_Hecarim", star: 2, items: [] },
      { id: "DA_18_Xayah", star: 2, items: [] },
      { id: "DA_18_LeBlanc", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_Ezreal", "DA_18_Soraka", "DA_18_Ornn", "DA_18_Hecarim", "DA_18_Alistar"],
    flexUnits: ["DA_18_Xayah", "DA_18_LeBlanc", "DA_18_Aphelios"],
    definingTrait: "DA_18_Elderwood",
    augments: [
      "Item augments first, and specifically physical ones — the board's damage is attack-based.",
      "One combat augment that buffs the frontline is worth more than a second damage augment.",
      "Econ is a distant third; you are not chasing 9 and the comp does not need extra gold after 8.",
      "Avoid augments that scale with ability casts. Only Soraka casts enough to matter.",
    ],
    notes: {
      whyNow:
        "S on EmblemComp and Blitz, A on TFT Academy and TFTactics, B on SeeMeta and MID.GG, C on tft.ninja — a 2.71 average, the thinnest A here. Elderwood is why it is played: the trait hands the whole board stats for standing together, so the comp works with mediocre item luck. Our crawl shows the cost of that: 241 Ezreal plus Soraka boards average 4.35 with 54.4% top-4.",
      howToPlay:
        "Collect Elderwood units and let the trait carry the stat check. Ezreal takes the physical items, Aphelios the second set if you have one, and Ornn the tank components. The board wants to be compact: frontline in two rows, carries in one corner behind them, no unit isolated to catch a dive. Roll at 8 until Ezreal and Ornn are two-star, then stop — there is no level-9 payoff worth the gold.",
      mistakes:
        "Splitting the back line across both corners is the usual error; Ezreal and Soraka want to be reachable by the same frontline. The second is itemising Aphelios before Ezreal, which delays your real spike by a full roll. The third is paying for level 9, which this board cannot use.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
  {
    slug: "defender-rengar",
    name: "Defender Rengar",
    tier: "B",
    consensus: {
      score: 2.5,
      sources: [
        { source: "EmblemComp", tier: "S" },
        { source: "TFTactics", tier: "A" },
        { source: "Blitz", tier: "A" },
        { source: "TFT Flow", tier: "D" },
      ],
    },
    setNumber: 18,
    patch: "18.6",
    playstyle: "Slow roll",
    difficulty: "Hard",
    summary:
      "Rengar jumping the back line behind a Defender wall, with Cassiopeia as the second threat. The most contested rating here: one source has it at S, another at D.",
    leveling:
      "Level 4 on 2-1, 6 on 3-2, then slow roll at 7 above 50 gold for Rengar and Rammus. Go to 8 only once both are two-star.",
    preconditions: [
      "Rengar is two-star by 4-2 — a one-star Rengar does not kill anything.",
      "You have at least three Defender units by 3-5.",
      "You are the only Rengar player in the lobby; the comp has no substitute carry.",
    ],
    abandon: {
      when: "Two players are holding Rengar at 4-1 and you have one copy.",
      instead: "Invoker Teemo — the Defender frontline is already built, and Teemo does not need a contested three-cost.",
    },
    counterCase:
      "The letters could hardly disagree more: S on EmblemComp, A on TFTactics and Blitz, D on TFT Flow. Our crawl sides with the pessimists — 77 Rengar plus Rammus boards at 4.97 average and 39.0% top-4, the smallest sample and one of the worst results we measured. This is a B because the average is a B, not because the board is safe.",
    stages: [
      {
        stage: "2",
        plan: "Hold Rengar and Rammus, level on curve, take Gloves or Sword. Do not commit items before Rengar is two-star.",
      },
      {
        stage: "3",
        plan: "6 on 3-2 with one roll bucket. If Rengar is not two-star by 3-5, start planning the exit.",
      },
      {
        stage: "4",
        plan: "7 at 4-1 and slow roll above 50 for Rengar, Rammus and Cassiopeia. This is the stage that decides the game.",
      },
      {
        stage: "5+",
        plan: "8 only after Rengar and Rammus are two-star. The level buys Fiddlesticks and Lillia for the Defender count, nothing more.",
      },
    ],
    itemPriority: [
      {
        unitId: "DA_18_Cassiopeia",
        chain: ["DA_BlueBuff", "DA_RabadonsDeathcap", "DA_Morellonomicon", "DA_Component_TearOfTheGoddess"],
      },
      {
        unitId: "DA_18_Rammus",
        chain: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_BrambleVest"],
      },
    ],
    augmentPriority: ["ITEMS", "ECON", "COMBAT"],
    positioning: [
      { unitId: "DA_18_Ornn", row: 0, col: 1 },
      { unitId: "DA_Fiddlesticks18", row: 0, col: 2 },
      { unitId: "DA_18_Rammus", row: 0, col: 3 },
      { unitId: "DA_18_Shen", row: 0, col: 4 },
      { unitId: "DA_18_Kobuko", row: 0, col: 5 },
      { unitId: "DA_18_Rengar", row: 1, col: 3 },
      { unitId: "DA_18_Lillia", row: 1, col: 4 },
      { unitId: "DA_18_Cassiopeia", row: 3, col: 2 },
    ],
    board: [
      { id: "DA_18_Rengar", star: 2, items: [] },
      { id: "DA_18_Cassiopeia", star: 2, items: ["DA_BlueBuff", "DA_RabadonsDeathcap", "DA_Morellonomicon"] },
      { id: "DA_18_Rammus", star: 2, items: ["DA_GargoyleStoneplate", "DA_WarmogsArmor", "DA_BrambleVest"] },
      { id: "DA_Fiddlesticks18", star: 2, items: [] },
      { id: "DA_18_Lillia", star: 2, items: [] },
      { id: "DA_18_Shen", star: 2, items: [] },
      { id: "DA_18_Ornn", star: 2, items: [] },
      { id: "DA_18_Kobuko", star: 2, items: [] },
    ],
    coreUnits: ["DA_18_Rengar", "DA_18_Rammus", "DA_Fiddlesticks18", "DA_18_Lillia", "DA_18_Cassiopeia"],
    flexUnits: ["DA_18_Shen", "DA_18_Ornn", "DA_18_Kobuko"],
    definingTrait: "DA_18_Defender",
    augments: [
      "Item augments first — Cassiopeia is the damage and she is a two-item unit until you finish her set.",
      "Econ second, because the comp is a slow roll and every roll saved is a roll earned.",
      "A defensive augment for Rammus is the third priority; the wall is what lets Rengar do anything.",
      "Do not take an augment built around a trait you are not running at its breakpoint.",
    ],
    notes: {
      whyNow:
        "Four sources, four wildly different opinions: S, A, A and D, averaging 2.5. That is what a B means here — not agreement that the board is mediocre, but genuine disagreement about it. EmblemComp's six-unit core is the version that works; the Rammus six-Defender shell gives Rengar enough time to jump the back line twice. Our crawl is blunt about the risk: 77 Rengar plus Rammus boards at 4.97 average and 39.0% top-4.",
      howToPlay:
        "Slow roll at 7 and treat Rengar's second star as the win condition. Rammus holds the middle with three tank items, Fiddlesticks and Lillia sit in the second row for the Defender count, and Rengar is placed opposite the enemy's squishiest corner so his jump lands on a carry. Cassiopeia is the damage you can rely on when Rengar's jump goes wrong, which is most of the time.",
      mistakes:
        "Itemising Rengar like a carry is the classic error — he is a diver, and AD items on a unit that dies after one jump are wasted; give the damage items to Cassiopeia. The second is playing it without three Defenders, which turns the wall into four bodies that die in a cast. The third is forcing the comp when two other players hold Rengar, which the sample says ends at a 4.97 average.",
    },
    stats: null,
    published: true,
    updatedAt: "2026-11-13",
  },
];
