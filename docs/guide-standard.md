# Guide-writing standard

Written 2026-11-13. The authority on **what a comp guide must answer**, in what order, and how
to label what is measured versus what is judgement.

Read alongside [blueprint.md](blueprint.md) (the product), [redesign-plan.md](redesign-plan.md)
(the comp-page structure this standard fills) and [decisions.md](decisions.md) (D11–D15, which
constrain what counts as measured). Where this file and a guide disagree, this file wins.

This applies to every comp in `src/content/comps.ts`, to the guides that replace them later, and
to anything published under a comp name — including patch reads that recommend a board.

---

## 1. Why this exists

A comp guide is not a description of a board. It is an **answer sheet to the decisions a player
makes in order**, from seeing their opener to reviewing the loss.

Two failure modes the standard exists to prevent:

- **The gallery.** A beautiful board, an item list, and four paragraphs of prose. The reader
  learns what the comp looks like but not when to play it, so they play it in the wrong games.
- **The horoscope.** Claims that cannot be wrong ("play your strongest board", "position well",
  "econ is important"). Unfalsifiable advice cannot be followed and cannot be corrected.

The test for every sentence: **could a reader know, at the moment they are reading, whether they
are doing it right?** If not, delete it or replace it with a number.

---

## 2. The question set, by decision point

Every guide answers these six blocks. The order is the order a player asks them, which is not the
order the board is displayed in.

### Block 1 — Before the game: should I play this at all?

| Question | A good answer looks like | A bad answer looks like |
|---|---|---|
| What board am I building, in one sentence? | Names the carry, the trait that defines it, and what makes it different from the comp it resembles | "A strong AP board" |
| What must be true for this to be correct? | 1–3 checkable conditions: an augment, an emblem, an opener, a slow lobby | "When you hit your units" |
| What is the **abandon condition**? | The first signal to leave, stated as an event ("no econ augment by 3-2") | Silence |
| Am I buying the floor or the ceiling? | "Floor comp, A not S: it top-4s from behind" or "ceiling comp: only from ahead" | Tier letter with no interpretation |
| How contested is it, and what is the pivot? | A rate with its sample ("3.4% of boards"), plus the named pivot | "Be careful if contested" |

### Block 2 — Stage 2: commit or not

- Which opener units or items mean **this is my game**?
- What do I hold, what do I sell, and when?
- Level or econ — with **exact gold thresholds per round**.
- Which item do I slam first, and **who holds it before the carry exists**?
- Which augments change the plan here, and which look good and are traps?

### Block 3 — Stage 3: the pivot

- Roll or level, at which level, with what gold floor?
- What is the **minimum viable board at 3-5** that stops the bleeding?
- If contested or unupgraded, what is the **downgrade** — not the pivot, the cheaper version of
  the same comp?

### Block 4 — Stage 4-5: execute

- Which star levels are non-negotiable, and which units are trait bodies to stop upgrading?
- Where does each unit stand **and why** — side versus their carry, corner, spread versus stack?
- Item priority: best-in-slot, then the components you settle for, and who holds components
  meanwhile.
- What is the cap — level 9, a three-star, an emblem — and what does capping cost?
- What does the board look like at level 8, so a reader who never reaches the cap is not stranded?

### Block 5 — Failure modes

- The three ways this loses, **each with the moment it is still fixable**.
- The most common misplay at this rank bracket, not in general.
- **One situation in which this guide is wrong.** This is the cheapest credibility on the site
  and the fastest way to make the guide falsifiable.

### Block 6 — Trust and maintenance

- Which patch is this for, and what changed for *this* comp in it?
- Which claims are measured and which are judgement? (See §4 — this is not optional.)
- When was it last verified, and by whom?

---

## 3. The six-answer template

Above the fold, in this order, before any prose. A reader must be able to decide yes or no in
**ten seconds**.

```
1. WHAT IT IS      one sentence: carry + defining trait + the comp it resembles
2. PLAY IT WHEN    the preconditions, as a list of checkable events
3. SKIP IT WHEN    the abandon condition and the downgrade
4. FIRST ITEM      what you slam first on 2-1, and who holds it
5. THE DECISION     the one roll-or-level call that decides the game, with gold
6. THE CAP         what "finished" means, and what it costs to get there
```

Everything below the fold is depth: board, positioning, stage plan, item chains, augment
categories, matchups, and the notes. This is the sheet order already implemented on
`/comps/[slug]`; what is missing is answers 1–3 and 6 as *explicit* fields rather than prose.

Word budget: answers 1–6 together should fit in about 80 words. If they do not, the comp is being
described rather than decided, or two comps are being written as one.

---

## 4. The measured-versus-judgement rule

**Every factual claim in a guide carries one of two labels, and the label is visible to the
reader, not just known to the author.**

- **Measured** — comes from `comp_stats` or from an aggregation over `participants`,
  `participant_units`, `participant_traits`. Always shown with its sample size. Never rounded in a
  way that hides the sample ("60% of games" with n=12 is a lie by presentation).
- **Judgement** — the author's read. Allowed, valuable, and clearly not a measurement.

Three hard rules follow from it:

1. **No number without `n`.** Applies to pick rate, top-4, win, delta, everything. `n` is the
   number of boards, not unit rows.
2. **No causal claim from correlation.** "Boards with this item place 0.3 better" is measured.
   "This item wins games" is judgement, and must be written as such.
3. **No borrowing authority from a source that does not publish its method.** "S tier" without a
   tier source is judgement; cite it as one, including when sources disagree (see AP Fast 9's
   "why now", which states the S-versus-A split rather than picking one silently).

### What is answerable today

| Question | Measured? | Where it comes from |
|---|---|---|
| Floor versus ceiling, pick rate, avg place, top-4 | Yes | `comp_stats` (counts + Wilson bound) |
| Contested-ness ("3.4% of boards") | Yes | `games / boards` in `comp_stats` |
| Which items help *this* unit | Yes, once R3 aggregation exists | `participant_units` item ids + placement, versus that unit's baseline |
| Star-level dependence | Yes, once R3 exists | `star_level` distribution versus placement |
| Roll timing realism | Roughly | `participants.level`, `gold_left`, `last_round` |
| Positioning | **No — authored only** | Payload has no board coordinates (D15) |
| Augment questions | **No — categories only** | `participant_augments` is empty; 0 of 577 payloads carry `augments` (D13) |
| "What beats this" | **Partly — lobby mix, not head-to-head** | No per-opponent data in the payload |
| Abandon condition, pivot, misplays | **No — judgement** | Author only |

The split is the whole editorial discipline: **data owns what happened, the author owns what to
do.** A guide that lets data answer an editorial question is inventing authority it does not have,
and a guide that lets judgement masquerade as measurement is the thing this site exists to be
better than.

---

## 5. The other rules

- **One number per question.** If an answer needs three numbers, it is two questions.
- **Name your counter-case.** Every guide states one situation where it is wrong (Block 5).
- **Second person, present tense.** "You level to 6 on 3-2", not "players should consider".
- **No patch-note paraphrase.** If Riot's notes are the source, quote the effect that matters to
  *this* comp and link out; do not re-summarise the patch.
- **No hedging as analysis.** "It depends" is allowed only when followed by what it depends on.
- **The tier is a claim about the ceiling.** Any guide whose tier is above A must say so, and must
  describe the from-behind case, not only the high-roll.
- **Every guide works without stats.** A guide whose value collapses when `comp_stats` is empty is
  a table with prose around it; the test suite of the design, from the start, has been that a
  page must look finished while collecting data.

---

## 6. Mapping to the content model

What exists in `Comp` (`src/content/types.ts`) and what each block still needs:

| Block | Existing field | State |
|---|---|---|
| 1. What it is | `summary`, `playstyle`, `difficulty`, `tier` | Good |
| 1. Play/skip conditions | — | **Missing**: `preconditions`, `abandon` |
| 2. Opener, holds | `stages` (stage "2") | Partial — prose only |
| 2. First item, holder | `itemPriority` | Partial — no "who holds it before the carry" |
| 3. Roll/level decision | `stages` (stage "3") | Good |
| 3. Downgrade | — | **Missing** |
| 4. Star levels | `board[].star`, `coreUnits` | Good |
| 4. Positioning | `positioning` | Good, and authored by rule |
| 4. Item chains | `itemPriority` | Good |
| 4. Augment priority | `augmentPriority`, `augments` | Good — categories, no scores |
| 4. The cap | `stages` (stage "5+") | Partial |
| 5. Failure modes | `notes.mistakes` | Good, but not tied to fixable moments |
| 5. Counter-case | — | **Missing** (could live in `notes.mistakes`) |
| 6. Freshness | `updatedAt`, `patch` | Good |
| 6. Measured versus judgement | — | **Missing**: no per-claim label |

Proposed additions, in value order — **not implemented, and not authorised until decided**:

1. `preconditions: string[]` — the "only play this if" list.
2. `abandon: { when: string; instead: string }` — the leave signal and the downgrade.
3. `counterCase: string` — the one situation in which the guide is wrong.
4. `componentHolder: { unitId: string; holdsFor: string }[]` — who carries items before the cap.
5. A `measured` flag or marker set for stats blocks, so the UI can label them without copy changes.

Items 1–3 are copy, not engineering. Item 4 is one more field on the same shape as
`itemPriority`. Item 5 is a UI convention, and the cheapest of the five to ship.

---

## 7. Checklist before publishing a guide

Run this against the comp before it goes live. A "no" is a blocking defect, not a note.

- [ ] Answers 1–6 of the template exist, in order, and fit in ~80 words.
- [ ] Every condition in "play it when" is checkable in game (an augment, a unit, a gold count).
- [ ] The abandon condition names a **moment**, not a feeling.
- [ ] Every number is shown with its `n`, and `n` is boards, not rows.
- [ ] Each claim is either labelled measured or written as judgement.
- [ ] No augment is given a score or a win rate — categories only (D13).
- [ ] Positioning is present, and every unit is in a row that matches its attack range
      (`npm run check:content`, plus the range audit: melee in rows 0–1, ranged in rows 2–3).
- [ ] Item ids all resolve; no raw id appears on the page without saying it is unresolved.
- [ ] The stage plan states exact levels and gold floors, and matches the `leveling` summary.
- [ ] The counter-case is present.
- [ ] `patch` and `updatedAt` are current, and the tier's ceiling claim is explained.
- [ ] The page reads correctly with `comp_stats` empty ("collecting data"), not just with data.

---

## 8. What this standard forbids

- Invented game counts, win rates or sample sizes. Ever. (decisions.md D5 exists because this
  already happened once.)
- Per-augment rankings or win rates this set cannot support.
- Positioning presented as measured, or derived from `participant_units.slot`.
- Matchup claims presented as head-to-head data; only lobby-mix statements are measurable.
- A tier letter with no stated ceiling/floor interpretation.
- Republishing another site's guide as ours. Sources may be cited; conclusions must be ours.
