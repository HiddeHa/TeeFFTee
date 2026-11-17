import type { Guide } from "./types";

/**
 * LONG-FORM GUIDES — written 2026-11-15.
 *
 * These follow docs/guide-standard.md: every claim is either measured or judgement
 * and the page says which, every guide names one situation in which it is wrong,
 * and none of them carries a stats payload — a guide whose value collapses when
 * `comp_stats` is empty is a table with prose around it.
 */
export const guides: Guide[] = [
  {
    slug: "reading-a-tier-list",
    title: "How to read a tier list",
    dek: "The letter at the top of every comp page is an average of other sites' letters, printed beside a sample you have to check. Here is how to read ours, and what to ignore.",
    answers: "Is this comp actually good, or does it just look it?",
    setNumber: 19,
    patch: "19.1",
    readingMinutes: 6,
    updatedAt: "2026-11-15",
    measured:
      "Average placement, top-4 and win rate, pick rate and contested-ness — all from our own crawl, each printed with the number of boards behind it.",
    judgement:
      "The tier letters (averaged from the published tier lists), positioning, roll timing, and every recommendation on a comp page.",
    counterCase:
      "If you play below Diamond, this is mostly the wrong lens. The mistakes that decide those lobbies happen before comp choice matters — a strong board played badly loses to a mediocre board played well — and a tier list says nothing about either. The second case is a first-place bet: the ordering below deliberately favours the safe comp, so it is biased against the answer you want. Read win rate instead and ignore the order.",
    // Every comp page prints a consensus letter and a sample, so this guide is the
    // method behind each of them.
    compSlugs: [
      "riftbeast-brambleback",
      "zyra-sprykin",
      "vanguard-alune",
      "maokai-draven",
      "adaptor-master-yi",
      "invoker-teemo",
      "solar-karma-reroll",
      "ahri-spellweavers",
      "elderwood-ezreal",
      "defender-rengar",
    ],
    sections: [
      {
        id: "letter",
        heading: "The letter is not a measurement",
        blocks: [
          {
            kind: "paragraph",
            text: "The letter on a comp page here is not ours. It is the mean of the published tier lists that cover the comp: S and S+ become 4, A becomes 3, B is 2, C is 1, D is 0, and a comp needs at least two sources before it is lettered at all. Every source's letter is printed next to the score, so the arithmetic can be audited instead of trusted.",
          },
          {
            kind: "paragraph",
            text: "So the letter tells you what a group of sites currently think. What it cannot tell you is whether any of them measured anything — some publish a rating with no sample behind it, and the same board travels under different names from one list to the next. Read the letter as a map of consensus, not as a result.",
          },
        ],
      },
      {
        id: "sample",
        heading: "Find the n before you read the rate",
        blocks: [
          {
            kind: "paragraph",
            text: "Every rate on this site prints the number of boards it came from. That is not decoration: top-4 over 40 boards moves several points on a single game, and top-4 over 4,000 barely moves at all. The distance between those two readings is the whole argument.",
          },
          {
            kind: "list",
            items: [
              "Under about 100 boards, read the direction and nothing else. The decimal is noise.",
              "In the hundreds, the rate is real, but one hot lobby can still move it.",
              "In the thousands, the number will survive next week's crawl.",
            ],
          },
          {
            kind: "paragraph",
            text: "It is also why the tier list is ordered by the Wilson 95% lower bound of the top-4 rate rather than the raw rate. A 40-board comp cannot outrank a 5,000-board one on a lucky week. That tilts the list towards the boring answer, on purpose.",
          },
        ],
      },
      {
        id: "floor-ceiling",
        heading: "Floor and ceiling are different comps",
        blocks: [
          {
            kind: "paragraph",
            text: "A tier letter is a claim about the ceiling. Two comps near the top of our own list are not the same product: one finishes at level 7 and wins by being ready before the lobby, the other is a health-management comp that reaches level 9 and converts those games into top-4s. Both are lettered S. Only one of them is right for you at 40 health.",
          },
          {
            kind: "paragraph",
            text: "Before you follow a letter, ask what it is claiming. A comp that top-4s from behind is a climbing comp — it does not need you to be ahead, it needs you to not be dead. A comp that only wins from ahead is a tournament comp: it needs the health you spent in stage 2. Playing the second one from 40 health is how you lose slowly while feeling certain you made the correct choice.",
          },
        ],
      },
      {
        id: "disagreement",
        heading: "Read the disagreement, not the average",
        blocks: [
          {
            kind: "paragraph",
            text: "The sites disagree, and the mean hides it. Where one source has a comp at B and seven have it at A or S, the interesting fact is not the score — it is that a source with a different method reached the opposite conclusion. The spread is the information; the average is only the summary of it.",
          },
          {
            kind: "paragraph",
            text: "Names matter for the same reason. The same board can travel under different names depending on who published it. A name match would count one comp several times and multiply its apparent support. Where we pooled a board, the published name is printed beside each letter so you can see which site meant what.",
          },
        ],
      },
      {
        id: "labels",
        heading: "What is measured here, and what is not",
        blocks: [
          {
            kind: "paragraph",
            text: "Measured: average placement, top-4, win rate, pick rate, contested-ness, and the size of every sample. Those come from full eight-player matches crawled from the EUW and KR ladders, and they carry their n wherever they appear.",
          },
          {
            kind: "paragraph",
            text: "Judgement: which comp to play, where each unit stands, when to roll, and what beats what. Positioning is authored — the match payload carries no board coordinates, so any site showing you a “most common position” is inferring it from array order or replacing it with taste. Augment advice here is ordered by category and never scored, because the corpus for this set has no augment rows to score. When a page states one of those as measured, treat it as a bug.",
          },
        ],
      },
    ],
  },
  {
    slug: "roll-or-level",
    title: "When to roll and when to level",
    dek: "One decision decides more games than the comp you pick, and almost nobody writes down the number they make it with. Here is the order to think about it, and the gold floors we use.",
    answers: "Do I spend gold on a level, or on rolling?",
    setNumber: 19,
    patch: "19.1",
    readingMinutes: 5,
    updatedAt: "2026-11-15",
    measured: "Nothing on this page is measured. That is the point of the label above it.",
    judgement:
      "All of it — roll timing, gold floors and health thresholds. Written from games at Master and above on EUW.",
    counterCase:
      "In a slow lobby, or on a patch where a reroll comp is dominant, the correct play is often to sit at 6 and roll for three-stars, and none of the floors below apply. And if you have never tracked your gold at 4-2, the specific numbers matter far less than the habit of having one.",
    // The comps whose plan turns on one gold decision: a level-9 payoff, a slow roll
    // that must not level, and the boards that roll at 7 rather than 8.
    compSlugs: [
      "riftbeast-brambleback",
      "zyra-sprykin",
      "vanguard-alune",
      "invoker-teemo",
      "defender-rengar",
    ],
    sections: [
      {
        id: "rule",
        heading: "The rule, before the detail",
        blocks: [
          {
            kind: "paragraph",
            text: "Level when the extra slot is worth more than the units you would find by rolling. Roll when the units you need are already in the pool at the level you are on and the board is dying. Every other case is one of those two with a reason attached.",
          },
          {
            kind: "paragraph",
            text: "The failure mode is doing both: half a level, half a roll, and arriving at 4-2 with a board that is neither upgraded nor a level ahead of the lobby. Pick one per round and commit. The cost of the wrong call is a placement; the cost of both is the game.",
          },
        ],
      },
      {
        id: "curve",
        heading: "Stage 2 and 3: buy the curve, hold the gold",
        blocks: [
          {
            kind: "paragraph",
            text: "The default curve is level 4 on 2-1, 5 on 2-5, 6 on 3-2. It exists because early levels are what hold your health without spending the gold you need at 4-2, and because a two-star one-cost in stage 2 is the cheapest board strength in the game.",
          },
          {
            kind: "list",
            items: [
              "Slam the item on 2-1 or 2-2. A component on the bench is not a decision you can postpone — the unit it belongs to may never arrive.",
              "Roll at 6 only when one upgrade flips a losing streak into a winning one, and stop with 10 gold. A deep roll at 6 is a commitment to a level-7 comp.",
              "3-2 is a level, not a board. If you are winning, take the level and keep the streak; if you are not, take the level and treat stage 3 as a health stage.",
            ],
          },
          {
            kind: "paragraph",
            text: "By 4-1 you should be able to answer one question: which level does this board finish on? A comp that finishes at 7 should not be racing to 9, and a comp that finishes at 9 should not be rolled for at 8.",
          },
        ],
      },
      {
        id: "decision",
        heading: "The 4-2 decision",
        blocks: [
          {
            kind: "paragraph",
            text: "There are two positions at 4-2 and they are different games: level 8 with 30 gold and 60 health, or level 7 with 50 gold and 40 health. Any guide that gives you one instruction for both is giving you the wrong instruction for one of them.",
          },
          {
            kind: "paragraph",
            text: "At 8 with 30 gold, roll until every unit on the board is two-star or is a trait body you have decided not to upgrade, then stop at 10 gold. That floor is not superstition: interest and the units you find while levelling pay for the rest of the game, and a board at 0 gold cannot buy the last upgrade it sees.",
          },
          {
            kind: "paragraph",
            text: "At 7 with 40 health, you are not going to 8 to stabilise. Stabilising at 7 with 30 gold buys a placement; going 8 with no gold buys sixth. Roll at 7 and take the top-4 the lobby is offering you.",
          },
        ],
      },
      {
        id: "budget",
        heading: "Health is the level budget, gold is the roll budget",
        blocks: [
          {
            kind: "paragraph",
            text: "Track the two resources separately instead of adding them up. 60 health and 20 gold is a levelling position: you can afford to be patient because you are not about to die. 30 health and 60 gold is a rolling position: you have the gold to fix the board and no time left to spend it.",
          },
          {
            kind: "paragraph",
            text: "The mistake is using the wrong resource in both cases — levelling from 30 health because “level 8 is the plan”, or rolling at 60 health because a unit is one copy short. A comp's plan is written for its average game. Your health tells you which game you are actually in.",
          },
        ],
      },
      {
        id: "bad-rolls",
        heading: "The rolls you should not take",
        blocks: [
          {
            kind: "paragraph",
            text: "Rolling at 8 for a three-star four-cost is the most expensive way to finish sixth: the odds are against you, the payoff is one unit, and the gold is worth two levels in the games where you are behind.",
          },
          {
            kind: "paragraph",
            text: "The other roll not to take is the structural one. If the board's win condition is a five-cost at level 9, no amount of rolling at 8 produces it — you are not unlucky, you are rolling for a unit that is not in your pool yet. Decide which of the two boards you are building before you start spending.",
          },
        ],
      },
    ],
  },
  {
    slug: "gold-income",
    title: "What a round of gold actually buys",
    dek: "Interest, streaks and XP are three ways of turning the same gold into a different board. Here is what each one pays, and the two numbers to check at 4-2.",
    answers: "Where is my gold going, and what is it buying?",
    setNumber: 19,
    patch: "19.1",
    readingMinutes: 7,
    updatedAt: "2026-11-15",
    measured:
      "The mechanics — interest of 1 gold per 10 held capped at 50, streak tiers of 1/2/3, 2 gold a roll, 4 gold for 4 XP — are Riot's rules, checked against the last published client rules; there is no Set 19 balance data to check them against yet. Nothing on this page is a measurement of a board.",
    judgement:
      "Every recommendation: when to hold, when to spend, and how to weigh health against gold.",
    counterCase:
      "This is the frame for a standard lobby where the plan is to reach level 8 with gold. In a reroll patch the correct economy is the opposite: you sit at 6 or 7 and roll for three-stars, interest above 50 is money you should already have spent, and a loss streak is a fine place to be because your spike arrives two stages earlier than theirs. The other case is a lobby where everyone is win-streaking — interest is then worth less than the health you saved by rolling, because you will not get the four rounds it needs to pay.",
    sources: [
      { label: "TFTSense — econ guide", href: "https://tftsense.gg/study-hall/tft-economy-guide" },
      { label: "SenseOS — gold, interest and streaks", href: "https://senseos.gg/guides/tft/gold-interest-and-streaks" },
    ],
    compSlugs: ["vanguard-alune", "zyra-sprykin", "riftbeast-brambleback", "defender-rengar"],
    sections: [
      {
        id: "income",
        heading: "The four lines of income",
        blocks: [
          {
            kind: "paragraph",
            text: "Every round pays you from four places: base income, interest on the gold you are holding, a bonus for a win or loss streak, and one gold for winning a player round. The gold hover next to the shop prints all four before you commit to anything, which makes it the cheapest place in the client to learn this.",
          },
          {
            kind: "paragraph",
            text: "Base income is the same for everyone, so it is not a decision. The other three are. Interest is a decision about holding, streak gold is a decision about how strong your board is allowed to be, and the win bonus is the reason a win is worth more than a loss on an identical round.",
          },
        ],
      },
      {
        id: "interest",
        heading: "Interest is a small share of your income, and that is the point",
        blocks: [
          {
            kind: "paragraph",
            text: "Interest pays 1 gold for every 10 you hold, capped at 5 at 50 gold. In a won round at 50 gold you are earning about 5 interest out of roughly 12 total; at 20 gold it is 2 out of 9. Sitting on gold is not the engine it is made out to be.",
          },
          {
            kind: "paragraph",
            text: "What makes it worth caring about is the ceiling, not the average: 5 gold a round for five rounds is 25 gold, which is most of a level-8 roll-down. The other half is the breakpoints. Ending a round on 38 gold pays 3; ending on 40 pays 4. Two gold buys a gold every round for the rest of the stage, so selling a bench unit you are not going to play to reach the next ten is usually correct.",
          },
          {
            kind: "paragraph",
            text: "Above 50, interest stops. That is why “stay above 50” is only half a rule — gold above 50 is doing nothing except waiting to be spent.",
          },
        ],
      },
      {
        id: "level-cost",
        heading: "A level and twenty-eight rolls cost the same",
        blocks: [
          {
            kind: "paragraph",
            text: "A roll is 2 gold. Buying XP is 4 gold for 4 XP, so reaching level 8 on 56 XP costs 56 gold — the same money as 28 rolls. That equivalence is the whole roll-or-level argument in one line: you are never choosing between being strong and being rich, you are choosing which of two purchases the board actually needs.",
          },
          {
            kind: "paragraph",
            text: "The asymmetry is that rolls are paid to the shop and never come back, while XP is paid to a number that stays. That is why the standard answer to “I am not sure” is to buy the level: a bad roll is gone, a level is still there next round.",
          },
        ],
      },
      {
        id: "streaks",
        heading: "Streak gold is paid in health",
        blocks: [
          {
            kind: "paragraph",
            text: "Win streaks and loss streaks pay the same: 1 gold for a run of two to four, 2 at five, 3 at six or more. A win also pays its own gold, which makes a win streak strictly better than the loss streak it replaces. Streak gold is worth the most in stage 2, because the same single gold compounds over more rounds and buys the board you stabilise on at 4-2.",
          },
          {
            kind: "paragraph",
            text: "The trap is treating a loss streak as free income. It is paid for in health, and health is the budget for levels. A five-loss streak that leaves you stabilising at 4-2 on 35 health has bought you gold you can only spend on placements.",
          },
        ],
      },
      {
        id: "benchmark",
        heading: "The only benchmark worth memorising",
        blocks: [
          {
            kind: "paragraph",
            text: "Track two numbers at 4-2, not one: health and gold. Level 8 with 50 gold and 60 health is a game where you choose between pushing 9 and rolling to a finished board. Level 8 with 50 gold and 35 health is the same gold and no choice at all — you roll, you take the top-4, and the level 9 you were saving for was never going to happen.",
          },
          {
            kind: "paragraph",
            text: "If you remember one thing from this page: at 4-2, gold above 30 with health below 40 is a mistake, and health above 60 with gold below 20 is a different mistake. Both are fixable in stage 3. Neither is fixable after the roll-down.",
          },
        ],
      },
    ],
  },
  {
    slug: "positioning-basics",
    title: "Positioning: three jobs and one scout",
    dek: "Rows are the easy part. The hard part is deciding what each fight is asking your board to do, and then moving one hex because of the answer.",
    answers: "Where does each unit stand, and why?",
    setNumber: 19,
    patch: "19.1",
    readingMinutes: 6,
    updatedAt: "2026-11-15",
    measured:
      "Nothing here is measured. The match payload carries no board coordinates, so any claim about where high-elo players stand would be inferred from array order. Every placement below is authored.",
    judgement: "All of it: rows, formations, scouting and the review question.",
    counterCase:
      "If the board is twenty gold behind theirs, no formation saves it — positioning decides close fights and does nothing for lost ones. The other case is the reverse of everything above: comps that win by stacking, with adjacency traits or aura items, want the clump, and spreading them for safety is the mistake.",
    sources: [
      { label: "TFT Ninja — positioning basics", href: "https://tft.ninja/guides/positioning/basics" },
      {
        label: "Blitz — positioning fundamentals",
        href: "https://blitz.gg/tft/articles/tft-positioning-fundamentals-stop-throwing-away",
      },
    ],
    compSlugs: ["ahri-spellweavers", "solar-karma-reroll", "maokai-draven", "adaptor-master-yi"],
    sections: [
      {
        id: "rows",
        heading: "The two-row rule, and why it is not enough",
        blocks: [
          {
            kind: "paragraph",
            text: "Start with the rule that is never wrong: units that want to be hit go in the front two rows, units that want to attack go in the back two. Melee bodies in the back row walk into the fight late and usually alone. A ranged carry in the front row is a free kill.",
          },
          {
            kind: "paragraph",
            text: "Then notice that a board following that rule still loses. It loses to a diver that jumps the furthest unit, to an area spell that catches a clump, and to a carry that never gets in range because its own frontline died first. Rows get you to a functional board. The rest of positioning is answering those three failure modes, one at a time.",
          },
        ],
      },
      {
        id: "jobs",
        heading: "Three jobs, every round",
        blocks: [
          {
            kind: "paragraph",
            text: "Give every unit one of three jobs and the board stops being decoration. That produces a strong side and a weak side, and most players build neither:",
          },
          {
            kind: "list",
            items: [
              "The main tank takes the pressure that matters — not the most damage, the damage in front of their carry.",
              "The carry gets clean damage time. Range means nothing if pathing, crowd control or a dead frontline stops it attacking.",
              "The weak units still cast once. A utility unit that gets touched first does nothing; the same unit one hex back changes a fight.",
            ],
          },
          {
            kind: "paragraph",
            text: "Put the tank and the support you trust on the strong side, and the units that need a few seconds to cast on the weak side. A frontline spread evenly across the board like a fence is the most common way to waste a board you have already paid for.",
          },
        ],
      },
      {
        id: "shapes",
        heading: "Four shapes, and what each one is for",
        blocks: [
          {
            kind: "list",
            items: [
              "Corner: maximum distance from melee, and the enemy has to walk through your frontline to reach it. The worst choice against anything that jumps the furthest target.",
              "Tucked: the carry one hex off the corner with a body beside it. The default answer to divers, and the position most players never try because it looks untidy.",
              "Split: two damage threats in opposite corners so one area spell cannot catch both. Costs the adjacency bonuses some traits want — a trade, not an upgrade.",
              "Spread: everything separated, against area damage and multi-hit spells. Costs frontline integrity, so use it when the clump is what is killing you, not by default.",
            ],
          },
        ],
      },
      {
        id: "range",
        heading: "Range decides the row, not the tier list",
        blocks: [
          {
            kind: "paragraph",
            text: "Melee in the front two rows, ranged in the back two. That is not a stylistic preference; it is what the unit's attack range allows. A four-hex caster on the front row is a body, not a carry, and a melee unit tucked behind the carries is a unit that arrives after the fight is decided.",
          },
          {
            kind: "paragraph",
            text: "The exception is the unit whose job is to die usefully — the tank whose stun has to land before the carry is reachable. That unit belongs in front even when its range says otherwise.",
          },
        ],
      },
      {
        id: "scout",
        heading: "One scout, one hex",
        blocks: [
          {
            kind: "paragraph",
            text: "Open their board before you touch yours. You are looking for something specific: where their carry stands, what frontline is in front of it, and whether anything they have jumps the furthest target. Positioning becomes a skill at the moment it is answering a threat instead of arranging units tidily.",
          },
          {
            kind: "paragraph",
            text: "Then move something, even one hex. A board identical every round gets countered by anyone paying attention, and one hex is often the whole difference against a diver. Late in the game this is the only change you can make between two rounds, which makes it the cheapest improvement on the board.",
          },
        ],
      },
      {
        id: "review",
        heading: "The review question",
        blocks: [
          {
            kind: "paragraph",
            text: "After a loss, ask one question: what killed the carry, and when did that path open? If the answer is “after the side tank died”, fix the shell rather than the carry. If the answer is “one spell hit four units”, spread. If the answer is “the carry walked forward”, check its range and its target access. Three answers, three different fixes — which is why “position better” is not advice.",
          },
        ],
      },
    ],
  },
  {
    slug: "item-economy",
    title: "Items: slam, hold, or regret",
    dek: "An item built on 2-2 fights for the rest of the game. One built in stage 5 fights for four rounds. The whole art is knowing which of those you are doing.",
    answers: "Do I build the item now, or hold the components?",
    setNumber: 19,
    patch: "19.1",
    readingMinutes: 6,
    updatedAt: "2026-11-15",
    measured:
      "No item measurement on this page. The corpus cannot yet attribute a single item to a placement for a specific unit, so item advice here is authored — the same rule the comp pages follow.",
    judgement: "Every slam, hold and priority call below.",
    counterCase:
      "If you are healthy and win-streaking with a comp that caps at 9, holding for best-in-slot is correct and slamming a mediocre item is the mistake, because you have the rounds to spare. The other case is a reroll comp: at 6 with three one-costs to upgrade, a completed item on a unit you will three-star is worth more than any plan for a four-cost you never buy.",
    sources: [
      {
        label: "TFT Ninja — item strategy",
        href: "https://tft.ninja/guides/game-mechanics/items/item-strategy",
      },
      { label: "Bamboo Gaming — items", href: "https://www.bamboogaming.net/tft/items" },
    ],
    compSlugs: ["maokai-draven", "riftbeast-brambleback", "ahri-spellweavers", "solar-karma-reroll"],
    sections: [
      {
        id: "rounds",
        heading: "The value of an item is the rounds it fights",
        blocks: [
          {
            kind: "paragraph",
            text: "The reason to slam early is arithmetic: an item completed on 2-2 participates in most of your game, while an item completed on 5-1 participates in four fights. Two components on the bench are not an item — they are a plan you have not committed to.",
          },
          {
            kind: "paragraph",
            text: "That cuts both ways. A component you hold because it is the wrong half of a best-in-slot is doing exactly as much as a component you never found. Holding is a decision, not a neutral state.",
          },
        ],
      },
      {
        id: "slam",
        heading: "Slam when the game is asking for it",
        blocks: [
          {
            kind: "list",
            items: [
              "You are losing fights by a small margin and one completed item flips them.",
              "It starts or preserves a win streak — streak gold plus health is worth more than a perfect recipe.",
              "The item is good on almost anything, so the slam costs you no flexibility.",
              "It is stage 2 or early stage 3. Early slams get the most rounds, which is when the decision is worth the most.",
            ],
          },
          {
            kind: "paragraph",
            text: "Tank items are the cheapest slam on the board. A completed tank item is useful in every comp and on nearly every frontline unit, which is why the standard opening is to build the frontline first and hold damage components for whoever the game gives you.",
          },
        ],
      },
      {
        id: "hold",
        heading: "Hold when the components are the point",
        blocks: [
          {
            kind: "list",
            items: [
              "You know which carry is coming and one component is decisive for it — the Bow that makes Guinsoo's, the Tear that makes Blue Buff.",
              "The board is temporary and the item would lock onto a unit you are about to sell.",
              "The component is flexible and the next carousel or PvE round decides what it should become.",
            ],
          },
          {
            kind: "paragraph",
            text: "The difference between a hold and a hoard is whether you can name the item you are waiting for and the unit that will hold it. If you cannot name both, you are hoarding.",
          },
        ],
      },
      {
        id: "board",
        heading: "Build the board, not the carry",
        blocks: [
          {
            kind: "paragraph",
            text: "A three-item carry behind a one-item frontline loses to the reverse, because the carry never gets the seconds it needs. Once the main carry has two items and the tank has two, the next question is not “third carry item” but “what does this board not have yet” — shred against tanks, anti-heal against healing, mana on the second caster.",
          },
          {
            kind: "paragraph",
            text: "Utility is the last thing most lobbies build and the first thing that decides a stage-4 fight. A shred item on a unit that casts twice is worth more than a third damage item on a unit that already kills what it touches.",
          },
        ],
      },
      {
        id: "holder",
        heading: "Who holds it before the carry exists",
        blocks: [
          {
            kind: "paragraph",
            text: "Components have to live somewhere, and the wrong somewhere costs you the transition. Put them on a unit you will sell — a spare ranged body, an extra melee frontliner — and the item comes back when you sell it. Put them on a unit the comp keeps and the item stays there, which is fine only if that unit is also a real holder.",
          },
          {
            kind: "paragraph",
            text: "The practical version: slam Guinsoo's on the first ranged unit that can stack it, then move it to the four-cost when it arrives. Never leave three components on a two-star one-cost you are about to cut for board space.",
          },
        ],
      },
      {
        id: "leftover",
        heading: "Count the components you have left",
        blocks: [
          {
            kind: "paragraph",
            text: "The component left over after a slam decides your next two rounds. Two Bows and a Cloak is a different game from two Bows and a Tear, and the second is a carry item for a carry you do not have yet. Before combining, look at what the recipe leaves behind, not only at what it builds.",
          },
          {
            kind: "paragraph",
            text: "That is the item economy argument in one habit: every slam is a choice about your next slam.",
          },
        ],
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return guides.find((guide) => guide.slug === slug);
}
