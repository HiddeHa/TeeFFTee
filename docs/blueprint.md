# Meta Site Blueprint

A TFT meta/stats site built by a top player: **objective numbers plus your read**, with coaching as the commercial layer.

- **Live set at time of writing:** Set 18 "Enchanted Wilds", patch 18.5 (Oct 20, 2026)
- **Target launch:** Set 19, week of **Dec 1, 2026**
- **Name:** `TeeFFTee` (was `metaread` while unnamed — see [Naming](#13-legal--riot-compliance))

---

## 1. What we are building

A public TFT stats site with a curated meta layer, plus a private analysis workbench that you use to form your own reads.

Two loops, one database:

1. **Public loop** — players land on a tier list or comp page, see numbers *and* your explanation of why the comp works, then get offered coaching.
2. **Private loop** — you query the same data to answer "what's actually strong right now?", publish that as a meta read, and promote anything the data surfaced into a curated comp.

The private loop is not a side feature. It is the reason the site can say something MetaTFT can't, and it is the reason you'll keep opening it after launch.

### Non-goals for v1

Explicitly **not** in the December launch:

- Player profile / match-history lookup (needs Riot Sign-On, per-user auth, and a separate Riot use case — weeks of work)
- Desktop overlay / in-game recommendations (Riot restricts live opponent scouting and in-game advice)
- Accounts, login, saved boards
- Multiple regions beyond KR + EUW
- Rolling your own comp-discovery ML (see [§8](#8-comp-assignment--discovery) — the seeded approach does the job first)

---

## 2. Decisions log

| # | Decision | Choice | Why |
|---|---|---|---|
| 1 | Data engine | **Hybrid**: curated comps + own crawler | Curated comps ship in days; crawler makes them credible. Site is never blocked on Riot approval. |
| 2 | Positioning | Stats site comparable to MetaTFT/tftacademy, **with your meta reads layered on**; site doubles as your practice tool | Your edge is interpretation at the top of the ladder, not corpus size. |
| 3 | Launch | **Soft launch on Set 19 day 1** (~Dec 1) | A new set resets the ladder and spikes search demand — the one moment a new site gets attention cheaply. |
| 4 | Time budget | 15–30 h/week (~120 h total to launch) | Plan in §Roadmap is budgeted at ~116 h. |
| 5 | Stack | **Next.js + Postgres** (recommended, confirmed below) | Static-friendly SEO pages + real SQL for aggregation and your own ad-hoc analysis. |
| 6 | Coaching | External booking link + CTA blocks | No booking code to maintain; conversion tracked as click events. |
| 7 | v1 pages | Tier list, comp detail, patch notes, coaching page | Smallest set that is a real product and can sell. |
| 8 | Region | **KR + EUW** | Most respected metas; enough volume for comp-level stats without global crawler cost. |
| 9 | Audit surface | Aggregate stats only, no player names | Keeps the product in Riot's "no RSO required" bucket. |

---

## 3. Positioning & audience

### The honest competitive picture

MetaTFT advertises **2M+ games/day**. A production-key crawler over KR + EUW Challenger/GM will realistically give you **~20k–80k matches/day**. You cannot win on volume, and you should not try.

You can win on three things:

1. **Signal-to-noise.** "Challenger/GM only" is a *feature*. Emerald-inclusive averages are famously misleading, and your audience knows it. Every number on the site carries a visible sample size.
2. **Interpretation.** A comp page that says *why* this board is strong this patch, *what* it beats, and *when* to abandon it — written by someone who actually plays there.
3. **Access.** Coaching is the conversion, and a tier list is the top of that funnel.

### Audience, in priority order

| Segment | What they want | What you give them |
|---|---|---|
| Diamond–Master climbers | "What do I play, and how?" | Tier list + comp detail + leveling/roll guidance |
| Coaches & grinders | Numbers they can defend | Filterable stats, sample sizes, patch deltas |
| Beginners arriving from search | One clear answer | Handled by SEO landing content; not your monetizable core |

### Voice

First person, specific, opinionated. Every comp page takes a position ("this is the best 4-cost reroll right now, but only if you hit X"). No hedging filler, no AI-slop phrasing. Your credibility *is* the product.

---

## 4. Product surface

### v1 pages

| Route | Contents | Notes |
|---|---|---|
| `/` | Current patch snapshot: top 5 comps, patch number, latest meta read teaser, coaching CTA | Server-rendered, cheap to rebuild |
| `/comps` | Tier list table: tier badge, comp, avg placement, top-4 %, win %, pick rate, sample | Filters: patch, region, rank bucket |
| `/comps/[slug]` | Board, core/flex units, items per carry, augments, leveling curve, **your notes** (why now / how to play / common mistakes), matchup notes, coaching CTA | The money page. One per comp, always shows latest patch, patch history via `?patch=` |
| `/patch/[patch]` | Riot patch notes summary + your meta read + data-driven risers/fallers | Your highest-authority content; also your SEO hook each patch |
| `/coaching` | Offer, packages, prices, booking link, proof, FAQ | See §10 |
| `/about` | Who you are, rank, credentials, why the site exists | Also the page a new visitor needs to trust the numbers |
| `/terms`, `/privacy` | Legal | **Required for Riot production key approval — ship in Phase 0** |

### Internal (not public in v1)

| Route | Purpose |
|---|---|
| `/lab` | Query workbench: filter by units/traits/items/augments, compare patches, inspect emerging-comp candidates. Behind a password or localhost-only. This is your practice tool. |

### Deliberately deferred

Unit pages, augment pages, item pages, player lookup, blog index, newsletter. Each is additive later — see [Roadmap §Post-launch](roadmap.md#post-launch-milestones).

> **Why defer the stat deep-dives:** they look weak without data volume. A unit page showing 400 games reads as amateur; a comp page showing 1,800 games reads as credible. Ship the surface your corpus can actually support.

---

## 5. Data strategy

### What Riot does and does not give you

| Available | Not available |
|---|---|
| `GET /tft/match/v1/matches/by-puuid/{puuid}/ids` — match IDs per player | ❌ Any comps/tier-list endpoint |
| `GET /tft/match/v1/matches/{matchId}` — full 8-player match: placements, level, last round, augments, units, unit items, traits | ❌ Aggregate win rates |
| `GET /tft/league/v1/{challenger,grandmaster,master}?queue=RANKED_TFT` — ladder seeding | ❌ Global match feed / matches-by-queue |
| `account-v1` — Riot ID → PUUID | ❌ Rank-at-time-of-match (league entries are a *current* snapshot only) |
| Data Dragon / Community Dragon — units, traits, items, augments, images per set | ❌ Historical rank, so "Diamond+" filters are approximated by *seeding* rather than known |

**Consequence:** "comps" are a construct you build. There is no ground truth to import. That is the whole engineering problem, and §8 is the answer to it.

### Rate limits (these drive the architecture)

| Key | Limit | Notes |
|---|---|---|
| Development | ~20 req/s, tighter burst window | **Expires every 24 h.** Fine for a pilot crawl, unusable for production. |
| Production | 500 req/10 s, 30,000 req/10 min, per region | Requires an application with a **working, verifiable site** + ToS + privacy policy |

Seeding detail: the highest-value matches are the ones you fetch once and reuse. Match IDs surface redundantly across players (every match is visible from 8 PUUIDs), so **dedupe by `match_id` before fetching** — this alone can cut request volume by a large factor.

Also: `tft/match/v1` has no queue filter, so you must request IDs then filter by `tft_set_number` and queue on the returned payload.

### The hybrid model

```
                 ┌─────────────────────────┐
                 │  Curated comps (you)    │  core units, name, notes, tier
                 └───────────┬─────────────┘
                             │ defines labels
   ┌─────────────┐    ┌──────▼──────┐    ┌──────────────┐
   │ Ladder seed │───▶│   Crawler   │───▶│  Postgres    │───▶ comp stats
   │ KR + EUW    │    │  normalize  │    │  (raw + agg) │    per patch/region/rank
   └─────────────┘    └──────┬──────┘    └──────┬───────┘
                             │                  │
                      unclassified boards ──────┴──▶ emerging-comp candidates ──▶ your review
```

Curated comps supply the *labels*; the crawler supplies the *numbers*. Boards that match no curated comp become the discovery input — literally "what the data suggests," which is the thing you asked for.

---

## 6. Pipeline architecture

Four jobs, all idempotent and resumable:

1. **Seed** (daily) — pull Challenger/GM league entries for KR and EUW → `players` (puuid, region, tier, lp). Store LP so you can weight or bucket later.
2. **Discover** (every 15 min) — for each tracked player (rotating, newest first), fetch match IDs since last cursor → `match_queue` (dedupe on `match_id`).
3. **Fetch** (continuous) — drain `match_queue`, fetch match payloads, respect rate-limit headers, exponential backoff on 429/5xx, never re-fetch a completed `match_id`.
4. **Aggregate** (every 30 min + on patch change) — assign boards to comps, write `comp_stats`, refresh materialized views.

### Design rules that will save you pain

- **Queue in Postgres, not memory.** `pg-boss` or a `match_queue` table with `status` — a crawler that loses its place on restart is a crawler you'll restart constantly.
- **Store raw payloads** (JSONB or compressed object storage) *before* normalization. When you discover a field you didn't parse, you reprocess instead of re-crawling for days.
- **Everything keyed by `patch` and `set`.** Set 19 will rename units and traits wholesale. Nothing may be hardcoded in application code; comps, units and items are **database rows**, so a new set is a data load, not a deploy.
- **Respect the rate limit as a budget**, not a ceiling. Target ~60–70 % of allowance so a 429 storm doesn't stall the queue for an hour.
- **Log coverage.** Matches ingested per patch per region, oldest unfetched match, unclassified rate. Without this you won't notice when a job silently dies.

---

## 7. Data model

Raw layer (append-only, one row per fact):

```sql
patches            (patch PK, set_number, released_at, notes_url)
units              (unit_id PK, set_number, name, cost, traits[], image_url)
traits             (trait_id PK, set_number, name, breakpoints[])
items              (item_id PK, set_number, name, kind, image_url)
augments           (augment_id PK, set_number, name, tier, image_url)
players            (puuid PK, region, tier, lp, last_seen_at, last_cursor)
matches            (match_id PK, region, patch, set_number, queue_id, game_datetime, game_version, raw JSONB)
participants       (match_id, puuid, placement, level, last_round, gold_left, PK(match_id, puuid))
participant_units  (match_id, puuid, unit_id, star_level, item_0, item_1, item_2, slot)
participant_traits (match_id, puuid, trait_id, num_units, tier_current)
participant_augments (match_id, puuid, augment_id, slot_index)
match_queue        (match_id PK, region, status, attempts, enqueued_at, fetched_at)
```

Curated layer:

```sql
comps        (comp_id PK, set_number, slug, name, tier, core_units[], flex_units[],
              difficulty, playstyle, notes_why_now, notes_how_to_play, notes_mistakes,
              published, created_at)
comp_items   (comp_id, unit_id, item_ids[], priority)
comp_augments(comp_id, augment_id, priority)
```

Derived layer (what the site actually reads):

```sql
comp_stats   (comp_id, patch, region, rank_bucket, games, avg_place, top4_rate,
              win_rate, pick_rate, top4_ci_low, computed_at)
```

- `rank_bucket` ∈ `master+`, `diamond+`, `all` — approximated by *which players you seeded*, and labeled accordingly on the site.
- `top4_ci_low` is the Wilson 95 % lower bound. Sorting by raw top-4 rate makes small samples look broken; sorting by the lower bound is honest and stops a 12-game comp from topping the tier list.
- Materialized views per page type, refreshed after aggregation. Never run aggregation queries on a page request.

---

## 8. Comp assignment & discovery

This is the core intellectual work. Do it in two stages.

### Stage 1 — Seeded assignment (Phase 2, must exist at launch)

Each curated comp declares **core units** (the ones that define it) and **flex units**.

```
score(board, comp) = |board.units ∩ comp.core_units| / |comp.core_units|
assign if score >= 0.75   AND board has the comp's defining trait active
otherwise → unclassified
```

- Assign to the **highest-scoring** comp; ties break on trait overlap, then fewer units from the duplicate set.
- 4-cost boards with 8 units: requiring ~6 of 8 core units is a sane bar. Tune it against real data in Phase 2 — you will see immediately whether 0.75 produces sensible groupings.
- **Track the unclassified rate.** Under ~20 % and the comps fit the meta. Over 35 % and your comp list is stale — which is exactly the signal worth publishing ("the data says these comps are no longer real").

### Stage 2 — Emerging-comp discovery (post-launch, `/lab`)

Over unclassified boards, with a minimum bar (e.g. ≥ 200 games, avg place ≤ 4.3):

1. Cluster by Jaccard similarity on the unit set (≥ 0.7).
2. Representative board = the modal 8-unit set in the cluster.
3. Surface as a candidate: units, traits, games, avg place, best items, best augments.

You then either promote it to a curated comp (with your own name and notes) or dismiss it. This is the loop that makes the site feel alive, and it's a genuinely publishable feature: *"what the ladder found that the tier lists missed."*

Do **not** build unsupervised clustering as the source of truth. Two different sites' comp lists disagree because *naming* is editorial. Keep the naming human.

---

## 9. Stack & infrastructure

Recommended, conventional picks:

| Layer | Choice | Cost to start |
|---|---|---|
| Web app | **Next.js (App Router) + TypeScript + Tailwind**, deployed on Vercel | €0 |
| Database | **Postgres via Supabase** (matches skill, gives a SQL editor for your `/lab` analysis, generous free tier) | €0–25/mo |
| ORM / migrations | Drizzle (SQL-first, good for materialized views) | €0 |
| Crawler | Separate Node/TS worker (not serverless — it's a long-running loop), Docker on Fly.io / Railway / a €4 Hetzner VPS | €0–6/mo |
| Assets | CDragon images, fetched and cached to your own storage/CDN once per patch | €0 |
| Analytics | Plausible or PostHog (self-hosted later) | €0–9/mo |
| Errors | Sentry free tier | €0 |
| Booking | Calendly (or Stripe Payment Link) — external, linked | €0 |

**Why Next.js rather than a static site generator:** you need server-rendered pages driven by Postgres, incremental rebuilds per patch, and a live `/lab` that runs SQL. Astro + JSON would be lovely and cheap, but it makes the crawler an *offline* job and kills ad-hoc analysis — the thing you said you want.

**Why a separate worker rather than Vercel cron:** crawling is a continuous, rate-limited, multi-hour loop with a queue. Serverless invocations are the wrong shape for it, and your DB connection limits will thank you.

Total running cost at launch: **~€0–40/month.**

---

## 10. Coaching funnel

Placement, in order of conversion value (all measured as click events):

| # | Placement | Intent level |
|---|---|---|
| 1 | Inline CTA after "how to play" on a comp page | Highest — they just tried to learn a comp |
| 2 | Band at the end of the tier list ("can't climb with a list?") | High |
| 3 | Sticky header button, subtle | Medium |
| 4 | Patch page footer ("want your games reviewed on this patch?") | Medium |
| 5 | `/coaching` page itself | Landing |

**Offer shape** — sell the outcome, not the hour:

- *VOD review* (1 game, written + voice) — lowest friction, easiest to deliver at volume
- *Live session* (1 h) — the flagship
- *Climb package* (3 sessions over a patch) — highest value, best for you

Put price on the page. "Contact for pricing" kills conversion. Use an external booking link; every CTA is a tracked outbound click so you can see which placement earns.

**Credibility block, repeated on every CTA:** your peak rank, current rank this set, server, and a one-line proof ("coached 40+ players to Master"). Without this, the CTA reads as an ad. With it, it reads as an offer from someone whose tier list you're already trusting.

---

## 11. Content operations

Eight patches per set, roughly one every two weeks, sets every ~4 months. The site lives or dies on patch-day turnaround, so make it a runbook, not inspiration.

### Patch-day runbook (target: live within 24 h, better within 6 h)

1. Pull Riot notes → `/patch/[patch]` stub with a real summary, not a copy-paste.
2. Load new assets (units/items/augments) for the patch.
3. Check `comp_stats` deltas after ~12 h of crawling → risers/fallers.
4. Update tiers where the data and your judgment agree; where they disagree, **say so in the notes** — that's the most interesting content you can publish.
5. Re-check the curated comp list: any comp below a games/placement floor gets demoted or retired.
6. Note anything from `/lab` emerging-comp candidates.
7. Ship the meta read. Post the same take to X / Reddit / Discord with a link back.

### Set-launch runbook (Dec 1)

New set = new units, traits, items, augments, and a meta with **zero data**. Sequence:

1. Asset import for Set 19 done before patch day.
2. Publish 8–12 curated comps on **your own read**, numbers marked "collecting data".
3. Crawler starts at launch; first credible numbers land within 6–12 h.
4. Comp page must look complete *without* stats. This is a design constraint from Phase 2 — stats are an enhancement, never a dependency for layout.

---

## 12. SEO & distribution

- One canonical page per comp, always latest patch; patch history via query param (avoids near-duplicate pages across 8 patches).
- Patch pages are your recurring traffic: "TFT 19.1 patch notes" and "TFT 19.1 meta" are the searches that reset every two weeks.
- Every page: proper `<title>`, OG image with the board render, `sitemap.xml`, JSON-LD (`Article`/`FAQPage` where honest).
- Comp slugs are the asset: `/comps/akali-reroll-19-1`-style is worse than `/comps/akali-reroll` + patch param. Slug stays stable across sets only if the comp survives; otherwise new slug.
- Distribution at launch: r/CompetitiveTFT (read the self-promo rules first), your Discord, X, TFT Discords, and any streamer relationships you have. One good launch post beats a month of SEO.
- Do not put "TFT" in the domain.

---

## 13. Legal & Riot compliance

Not legal advice, but these are hard requirements, not suggestions:

- **Free tier is mandatory.** Riot's developer policies require a free tier for any monetized product. Paid content must be *transformative* (adds insight/analysis). Coaching and an ad-free/supporter tier are the safe shapes.
- **Paid coaching is not explicitly listed** among Riot's approved charge types. Selling your *time* is normally fine; charging for access to API-derived data is not. Ask Riot via the Developer Portal **before** you gate any stats behind payment.
- **No win rates for Legends or Legend-based augments.** Check the current TFT policy page before adding any such table.
- **No live in-game recommendations or opponent scouting.** Rules out an overlay.
- **Required disclaimer**, visible site-wide (footer is fine — but it must be genuinely visible):

  > [Site] isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games, and all associated properties are trademarks or registered trademarks of Riot Games, Inc.

- **Do not use Riot logos or trademarks in the domain, brand, social handles, or ad copy.** Don't imply endorsement. Use Data Dragon/Community Dragon assets, which is what they're for.
- **ToS + Privacy Policy are not optional** — a production key application is reviewed against a live site that has them.

### Naming

Pick a name that is *yours*, not a Riot reference: `metaread`, `boardstate`, `eightway`, `toptwo`, `thelab`. Avoid "TFT", "Teamfight", "Riot", champion names. Register the domain in Phase 0 — the production key application needs a verifiable site.

---

## 14. Metrics

**Product health (weekly)**

| Metric | Target by end of Jan |
|---|---|
| Unique visitors | 500–2,000/wk |
| Comp page views / visitor | > 2.5 |
| Coaching CTA click rate | > 2 % of visitors |
| Booking-link clicks | ≥ 10/wk |

**Data health (daily, alerting)**

| Metric | Threshold |
|---|---|
| Matches ingested / day | > 10k |
| Unclassified board rate | < 30 % |
| Crawl queue lag | < 2 h |
| Comp pages with < 200 games | 0 |

**Your own loop:** does `/lab` change a decision you'd have made anyway? If it never does, either the data or the questions are wrong.

---

## 15. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Production key approval is slow** | No real data at launch | Ship curated-only; design pages that work without stats; rotate dev keys for a ~20k-match pilot crawl. Apply in Phase 0, day one. |
| **Set 19 asset churn breaks hardcoded logic** | Site broken on the exact day it matters | Comps/units/items are DB rows; set number on every table; rehearse the import on Set 18 first. |
| **Data volume too thin for deep pages** | Pages look amateur | Defer unit/augment/item pages to post-launch; lead with comp-level stats. |
| **Scope creep into player lookup** | Misses the Dec 1 window | Hard non-goal. RSO is a separate product decision. |
| **Patch treadmill burnout** | Site goes stale, credibility dies | Runbook + 24 h target, not same-hour. Two patches of staleness is survivable; a month is not. |
| **Comp definitions are subjective** | Numbers feel arbitrary | Publish the definition (core units) on the page. Transparency converts a weakness into credibility. |
| **Riot policy change** | Feature removal | Keep the curated layer independent of any single data source, so losing a data feature doesn't kill the site. |

---

## 16. Open questions

Worth settling before Phase 2, not blocking launch:

1. **Coaching price point and capacity** — how many sessions/week can you actually deliver? Sets the CTA aggressiveness and whether you need a waitlist.
2. **Rank buckets on display** — "Master+" only, or Master+/Diamond+ toggle? Recommendation: show Master+ by default, toggle for Diamond+.
3. **Do you want your own games excluded** from the aggregate? (They're a drop in the bucket, but purists ask.)
4. **Public `/lab`?** Post-launch it could be a real differentiator — "explore the data yourself" — but it also gives away the analysis that makes your coaching valuable. Recommendation: keep private until you know what it's worth.
5. **Language** — assuming English-only for v1.
