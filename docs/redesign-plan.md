# Redesign plan — take the best of tftacademy, tactics.tools, tftactics.gg

Written 2026-11-13. Companion to [blueprint.md](blueprint.md) (what the product is),
[decisions.md](decisions.md) (what has been decided) and [plan.md](plan.md) (the schedule).
This file is a **proposal**: it changes the shop window, not the data model, and it needs one
owner decision before any lane starts (see [§9](#9-decisions-this-request-forces)).

---

## 1. What this request changes

The user wants the site to combine the three reference products. That is a positioning change
from "curated comps with numbers attached" to **"the site with tactics.tools' tables, tftacademy's
gameplan pages, and tftactics' reference layer — where every number carries its sample size"**.

It directly supersedes **decisions.md D7** ("Design stays. Dark surfaces, amber accent, mono
tabular numerals. No redesign.") and softens blueprint §4's "deliberately deferred: unit pages,
augment pages, item pages". Those were deferrals because the corpus was thin; the corpus is no
longer zero (§2), so the reason has expired.

Keep D7's visual language (dark surfaces, amber accent, tabular numerals). What changes is the
**information architecture and the density**, not the palette.

---

## 2. Verified state this plan starts from — checked 2026-11-13

| Fact | Evidence |
|---|---|
| Crawl is real, live Riot data | `npm run crawl -- stats` → 577 matches, 4,553 participants, 36,630 unit rows, 48,616 trait rows, 2,000 players, all set 18 / patch 18.6 |
| Numbers reach the site | 7 published comps, 14 `comp_stats` rows |
| Catalogue snapshot ships **units only** | `scripts/export-catalogue.ts` selects `unit_id, name, cost, image_url`; no items, traits or augments |
| Comp items are **display names**, crawl items are **ids** | `src/content/comps.ts` → `"Guinsoo's Rageblade"`; `participant_units.item_0` → `TFT_Item_GuinsoosRageblade` |
| Comp augments are display strings | `Comp.augments: string[]`, rendered as bullet text on `/comps/[slug]` |
| **No augment data at all** | `participant_augments` = 0 rows; 0 of 577 raw payloads contain an `augments` key on any participant |
| Board position is **not** in the payload | `participant_units.slot` is array order; the TFT match payload carries no hex coordinates |
| Momentum measurement already exists | `PatchMomentum` type + `npm run momentum:measure` (first/second half of a patch window) |

Consequences that shape every phase below:

1. **Unit, item and trait pages are feasible today** — `participant_units` (with items), `participant_traits` and `participants.placement` are populated. They need aggregation, not new crawling.
2. **Augment pages are not feasible as a stats product** — there is no augment row to count. Ship augments as a reference list (name, tier, icon, description) or not at all, and say which.
3. **Positioning must stay authored.** tftacademy's positioning example is hand-drawn; ours must be too. Do not staff a "data-derived positioning heatmap" workstream on the belief that `slot` is a coordinate.
4. **Icons are the biggest visible gap.** All three competitors are icon-forward. Our deployed board renders item and augment names as text because the snapshot has no item/augment images.

---

## 3. Teardown: what is actually best in each, and what we take

### tftacademy — the comp page is a gameplan, not a table

Best things, verified on their set-18 pages:

| Pattern | Detail | Take? |
|---|---|---|
| Tier bands S/A/B/C + **X (Situational)** | Explicitly editorial, with an honest empty-tier message when nothing qualifies | **Yes** — X fits our "situational" comps; the empty-tier copy fits our honesty rule |
| Momentum badges **Rising / Falling / New / Risky** | On the list and the detail page | **Yes, but measured** — we already compute intra-patch momentum, so ours is data-backed rather than vibes |
| Comp header: `Playstyle: 4-Cost Fast 8 (MEDIUM)` | Archetype + difficulty as one tag | **Yes** — becomes our `playstyle` taxonomy (see §4) |
| Augment **priority categories** `ECON → ITEMS → COMBAT` | An ordering of categories, not a score for each augment | **Yes** — the right shape while we have no augment data |
| **Item priority chain** `Blue Buff → Infinity Edge → Chain Vest → BF Sword` | BIS then fallback components, as a 3-slot chain | **Yes** — cheap, high-value, and works with authored content |
| Early units / flex units / alt builds | Board variants side by side | **Yes** (alt builds post-launch) |
| **Stage 2 / 3 / 4 plan** | Concrete level-and-roll instructions per stage | **Yes** — this is the thing our `leveling` string currently flattens into one paragraph |
| Positioning example | Hand-authored hex board | **Yes** — authored, not derived |
| Tips block ("why this comp works") | Free-text, opinionated | **Yes** — we already have `notes.whyNow / howToPlay / mistakes` |
| Freshness: patch + "Last updated 6 hours ago" + changelog | Per-dataset update log | **Yes** — ours is `comp_stats.computedAt`; surface it on the list, not just the detail page |
| No numbers anywhere | No games, no top-4 rate | **No** — this is exactly where we beat them. Keep every stat and its `n` |

Deliberately not taken: their guide/podcast/overlay/Patreon layers. Overlay is a Riot non-goal
(blueprint §13: no live in-game recommendations), and creator programs are a different product.

### tactics.tools — the tables and the deltas

| Pattern | Detail | Take? |
|---|---|---|
| Dense stat columns | `Games · Play rate · Place · Top 4 · Win`, with `Games` visible in the table | **Yes** — we have all of these counts already in `comp_stats`; the tier list is halfway there |
| **Adjusted placement / delta vs baseline** | "is this item good *on this champion*", `Delta` and `Rel. Delta` | **Yes** — the single best statistical idea in the teardown. Needs a baseline per unit, computed at aggregation time |
| Unit detail: star distribution, placement distribution, item matrix (**single / pairs / trios**) | Each bucket with % and avg place | **Yes** — all derivable from `participant_units` + `participants.placement` |
| Item detail: which champions use it, and whether they place better than those champions' baseline | `Units · Traits` tabs with deltas | **Yes** — same baseline machinery as above |
| Trait rows **per breakpoint** (`2 Vanguard` and `4 Vanguard` as separate rows) | Not per trait | **Yes** — `participant_traits.num_units` / `tier_current` has it |
| Trends: patch-over-patch movers, split up/down | Text lists, no charts | **Yes** — `/patch/[patch]` already has risers/fallers; extend to units and items |
| URL-state scope: `/comps/plat`, `/latest` | Path segments, shareable | **Partly** — we already use query params and they work; keep query params (decisions.md D1 SEO note) |
| Minimum sample size / "show low play rate" | Explicit suppression of thin rows | **Yes** — mandatory for us; pairs with the Wilson bound we already publish |
| Explorer (filter-builder) | Powerful, patron-gated | **No for now** — `/lab` already fills this role privately (blueprint §4) |
| Player profiles, leaderboards, Wrapped | Match history per player | **No** — needs RSO, a hard non-goal (blueprint §1, §13) |

Not taken: their confidence-free presentation. We already do Wilson bounds, and no competitor
shows one. That is a differentiator to lean on, not drop.

### tftactics.gg — the reference layer and the filter vocabulary

| Pattern | Detail | Take? |
|---|---|---|
| Comp-style filters | Standard / Slow Roll / Fast 8 / Fast 9 / Emblem / Augment | **Yes** — as real filter chips derived from our `playstyle` field |
| Champions index | Cost + trait filters, search, per-champion page with recommended items and ability | **Yes** — `/units` |
| Item cheat sheet with **recipes** (`Recipe → Combines Into → Tier`) | Component-combination table | **Yes** — post-launch `/items` tab; the CDragon payload has `composition` |
| Rolling chances per level | The classic odds table | **Yes** — cheap static reference page, high search value |
| Augment database (name / tier / description) | Reference, not ranking | **Yes, reference only** — matches the data reality in §2 |
| Team builder | Pick champions, items, show partial traits, share | **Post-launch** — high value, high cost; needs shareable state |
| Dense icon/name cards, no charts | — | **Partly** — icons yes; we keep the tabular numbers they lack |

Not taken: their comp list carries no detail page worth the name (no stage plan, no board), and
there is no evidence of a working patch-notes page.

---

## 4. The synthesis: target IA

One sentence per route: **what it is, whose pattern it is.**

| Route | Shape | Lineage |
|---|---|---|
| `/` | Meta snapshot: top comps with `n`, patch read, biggest movers, data-health line ("577 matches · EUW+KR · updated 2h ago") | tactics.tools density + our patch read |
| `/comps` | **Two views of the same data**: tier bands (cards) and a dense sortable table. Filters: patch, region, rank, **comp style**, unit/trait search | tftacademy bands + tactics.tools columns + tftactics style chips |
| `/comps/[slug]` | The money page: tier + playstyle/difficulty, stat strip with `n`, positioning board, item priority chain, augment **priority categories**, early/flex units, stage 2/3/4 plan, tips, alt builds, matchup deltas | tftacademy sheet + tactics.tools numbers |
| `/units` + `/units/[id]` | Index with games/place/top-4; detail with star + placement distributions, item matrix (single/pairs/trios) with adjusted place, traits, strong/weak | tactics.tools |
| `/items` + `/items/[id]` | Index by kind (craftable / artifact / emblem / radiant); detail = "who builds it and do they place better than their baseline" | tactics.tools + tftactics recipe table |
| `/traits` | Rows per breakpoint with games/place/top-4/win | tactics.tools |
| `/augments` | **Reference list only** (name, tier, icon, description). No stats until augment rows exist | tftactics database |
| `/patch/[patch]` | Notes + meta read + movers (comps, units, items) + intra-patch momentum | already built; extend scope |
| `/learn` | Rolling odds, item recipes, set mechanics — the evergreen search surface | tftactics database |
| `/builder` | Team builder with shareable board | tftacademy + tftactics — **post-launch** |

Navigation becomes: **Tier list · Units · Items · Traits · Patch · Coaching**, with the builder and
learn pages under a "Tools" grouping once they exist. Keep the coaching CTA in the header.

**The one rule that must survive all of this:** no number without its `n`, no sample presented as
the meta, and an empty state that says "collecting data" rather than showing a zero. Every
competitor breaks this somewhere; it is the whole reason this site can exist.

---

## 5. Content-model changes (SURFACE + CONTENT)

These are prerequisites for the pages, not cosmetic work.

1. **Items become ids, not names.** `UnitSlot.items: string[]` holds display names today, so it
   can never join to `participant_units.item_0` or render an icon. Change to Riot item ids
   (`TFT_Item_GuinsoosRageblade`) and resolve name + icon through the catalogue, exactly as
   boards already resolve units. A `scripts/` migration can map the seven comps' current names to
   ids against the `items` table, and any name it cannot resolve must fail loudly, not silently.
2. **Add item priority chains.** `itemPriority: { unitId: string; chain: string[] }[]` — BIS plus
   fallback components, per carry.
3. **Add stage plans.** `stages: { stage: "2" | "3" | "4" | "5"; plan: string }[]`, replacing the
   single `leveling` blob (keep `leveling` as the summary line so nothing 404s mid-migration).
4. **A real `playstyle` vocabulary.** Enum: `Fast 8`, `Fast 9`, `Slow roll`, `Reroll`, `Standard`,
   `Emblem`, `Augment`, `Flex` — the tftactics filter set, which also becomes the filter chips.
   Today `playstyle` is free text (`"Fast 9"`), so it cannot filter.
5. **Augment priority categories** on the comp: `augmentPriority: ("ECON" | "ITEMS" | "COMBAT" | "EMBLEM" | "HERO")[]`.
6. **Positioning.** `positioning?: { unitId: string; row: number; col: number }[]` — authored.
   Absent means "no positioning shown", never a guessed layout.

Catalogue snapshot must grow from units-only to **units + traits + items (+ augments for
reference)** so the deployed Worker can render icons with no database. `scripts/export-catalogue.ts`
changes, `src/lib/units.ts` becomes a general catalogue reader (or gains siblings), and
`src/content/catalogue.json` grows from 16 KB to a few hundred KB — check that against the
deployed asset budget before committing.

---

## 6. Data work (DATA lane)

New derived tables, all keyed `(set_number, patch, region, rank_bucket)` and storing **counts**,
following the rule already in `comp_stats` (counts add across regions; rates do not):

| Table | Grain | Feeds |
|---|---|---|
| `unit_stats` | unit × star level | `/units`, unit cards, "best units this patch" |
| `unit_item_stats` | unit × item | item matrix, **adjusted place vs unit baseline** |
| `item_stats` | item | `/items` index and detail |
| `trait_stats` | trait × breakpoint | `/traits` |
| `augment_stats` | augment × slot index | **blocked — zero augment data (§2)** |

Two things these need that `comp_stats` did not:

- **A baseline.** "Adjusted place" is `avgPlace(unit with item X) − avgPlace(unit overall)`, so the
  aggregation must write the unit-level baseline alongside the item-level rows, in the same
  transaction, or the delta will be computed against a stale baseline.
- **Sample floors.** Every consumer filters `games >= minGames` (default 100, mirroring
  tactics.tools) *and* still prints `n`. A row below the floor is omitted, not greyed out.

Reuse what exists: `worker/limiter.ts`, `worker/normalize.ts` and `worker/candidates.ts` already
know how to read `participant_units` item columns; the aggregation is new SQL, not a new pipeline.
`worker/aggregate.ts` gains sibling modules (`aggregate-units.ts`, `aggregate-items.ts`,
`aggregate-traits.ts`) rather than one giant function, and `npm run crawl -- aggregate` runs all of
them, reporting per-table row counts.

**Before building augment anything:** confirm where augments went. Set 18 comp pages on
tftacademy name augments, so augments exist in the game — but 0 of 577 stored payloads carry the
field. Fetch three live matches with the current key and inspect the participant keys. If Riot
genuinely omits augments for this queue/set, say so on `/augments` and skip the stats table
entirely. Do not build a UI that implies data we do not have.

---

## 7. Phasing

18 days to the Set 19 target (Dec 1), at 15–30 h/week. Estimates assume one working lane at a
time; parallel lanes across SURFACE and DATA are the only way this fits.

### Phase R1 — the comp page becomes a gameplan (≈20 h, highest value) — **shipped 2026-11-13**
- Playstyle vocabulary + `stages` + `itemPriority` + `augmentPriority` in `types.ts` and `comps.ts`.
- `/comps/[slug]` rebuilt to the tftacademy sheet order, keeping our stat strip and `n` on top.
- Item/priority/augment icons via the widened catalogue snapshot.
- Positioning authored for the 7 comps.
- **Done when:** every published comp renders a stage plan, an item chain and a positioning board,
  with item icons, and typecheck is green.

**Status:** done. Delivered as `positioning-board.tsx`, `item-priority.tsx`, `stage-plan.tsx`,
`item-icon.tsx`, the widened snapshot (units + 772 items + 36 traits + 594 augments, 357 KB on
disk), and
`npm run check:content` — which proves every id resolves, every board unit is placed exactly once,
coordinates are in bounds and each comp has all four stages. `typecheck` exit 0, `DATABASE_URL=`
`build` exit 0, all 7 comp pages prerendered with 0 unresolved units and 0 unresolved items.

Not in R1, deliberately: the tier list still renders one table view (R2), the item/unit stat pages
do not exist yet (R3), and augment *scores* remain impossible (D13).

### Phase R2 — the tier list earns the word "table" (≈12 h)
- Two views (bands + dense table), persisted in the URL.
- Comp-style chips from the enum; unit/trait search across comps.
- Momentum badges from `momentum:measure` (Rising/Falling/New), X tier for situational comps.
- Freshness line from `computedAt`.
- **Done when:** a filtered, shareable URL reproduces the same rows, and a comp with no sample
  still shows "collecting data" in both views.

### Phase R3 — unit and item pages from data we already have (≈24 h)
- The four derived tables + aggregation + sample floors.
- `/units`, `/units/[id]` (distributions + item matrix + adjusted place), `/items`, `/items/[id]`,
  `/traits`.
- **Done when:** a unit page states games, top-4 and its best three items with `n`, and a unit under
  100 games is omitted rather than shown thin.

### Phase R4 — reference layer + patch depth (≈12 h)
- `/learn`: rolling odds, item recipes, set mechanics. `/augments`: reference list.
- `/patch/[patch]`: movers extended to units and items; momentum band.
- **Done when:** every reference page is accurate against CDragon for set 18 and has a real
  `updatedAt`.

### Post-launch
`/builder` with shareable boards, alt builds on comp pages, comp changelog, saved views. Each is
additive and none blocks launch.

### Cut list, in order
1. `/learn` and `/augments` reference pages (search value, not product value).
2. Trait page (units and items carry it).
3. Momentum badges (keep the numbers, drop the badge).
4. Item **pairs/trios** matrix (ship singles first).
5. Positioning boards (the one tftacademy pattern that costs authoring time per comp).

**Never cut:** `n` on every stat, the sample floor, the "collecting data" empty state, the Riot
disclaimer, or the legal pages.

---

## 8. Guardrails from Riot's rules (blueprint §13) — these constrain the teardown

- **No player profiles, leaderboards or match-history lookup.** tactics.tools' best retention
  features are off the table without RSO and a separate use case. This plan does not touch them.
- **No overlay, no in-game or live-opponent recommendations.** tftacademy's overlay is a non-goal.
- **No win rates for Legends or Legend-based augments** — relevant the moment augment pages exist.
- **Free tier mandatory**; paid content must be transformative. The tier list, unit and item pages
  stay free; coaching stays the paid layer.
- **Keep Riot marks out of the name and domain** — unchanged, and worth re-checking before the
  production-key application.

---

## 9. Decisions this request forces

| # | Decision | Recommendation |
|---|---|---|
| **D10** | D7 ("design stays, no redesign") is superseded for **IA and density**; palette and type stay | Accept. Record in decisions.md so no lane guesses |
| **D11** | `UnitSlot.items` moves from display names to Riot ids (breaking change to `comps.ts` and to any DB rows already synced) | Accept, with a name→id script and a hard failure on unresolved names |
| **D12** | Unit/item/trait pages move **into** the launch scope, reversing blueprint §4's deferral | Accept only if R3 lands; otherwise ship the reference layer and defer the stats pages to post-launch |
| **D13** | Augments are reference-only this set, because the corpus has no augment rows | Accept unless the live-payload check in §6 finds them |
| **D14** | Comp `playstyle` becomes a closed enum (breaking content change) | Accept — free text cannot filter |
| **D15** | Positioning is authored per comp, never derived from `participant_units.slot` | Accept |

---

## 10. Verification, per phase

- `npm run typecheck` and `DATABASE_URL= npm run build` exit 0 (the Worker path has no Postgres —
  this is what catches a catalogue regression before it becomes a 500 on `/comps/[slug]`).
- `/`, `/comps`, one comp, `/units`, one unit, `/items`, one item, `/traits`, `/patch/18.6`,
  `/coaching`, `/about`, `/terms`, `/privacy` all 200.
- `npm run crawl -- aggregate` reports non-zero rows for each new table and the same
  `match_id`/board totals as `comp_stats` — a mismatch means the joins duplicate boards.
- Spot-check one unit and one item by hand against a raw payload: the games count must equal the
  number of distinct boards containing it, not the number of unit rows.
- Any stat rendered without `n` is a bug, not a style choice.

---

## 11. What this plan deliberately does not do

- Does not add accounts, saved boards or player lookup (RSO, separate product).
- Does not add charts. tactics.tools proves distribution bars beat charts for this audience.
- Does not copy tftacademy's or tftactics' visual identity — palette, type and layout stay ours;
  what is taken is structure and information.
- Does not touch the crawler's fetch/limiter/queue path, which is verified and working.
