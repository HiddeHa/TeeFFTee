# Roadmap — to Set 19 launch (Dec 1, 2026)

Companion to [blueprint.md](blueprint.md). This is the execution plan: weeks, hours, and a checkable definition of done for each phase.

**Today:** Wed Oct 28 → **Launch:** Tue Dec 1 = **4.8 weeks, ~116 h budgeted** (you have 15–30 h/wk = 70–145 h).

```
Oct 28 ─┬─ P0 Foundations (15h) ────── unblocks Riot production key
        ├─ P1 Crawler + aggregation (30h)
        ├─ P2 Public site (32h)
        ├─ P3 Set-19 rehearsal + hardening (24h)
        ├─ P4 Launch prep (14h)
Dec  1 ─┴─ LAUNCH — Set 19 day one
```

---

## Do these three things today

1. **Register the domain and deploy a placeholder site.** Nothing else in this plan unblocks the Riot production key, and the key is the longest-lead item.
2. **Create the Riot developer account and submit the production key application** with that URL, however thin. It gets you in the review queue and tells you the criteria early. It is normal to be rejected once at this stage — re-apply in Phase 2 once the tier list exists.
3. **Prove the data.** Grab a dev key, pull one challenger ladder and five full match payloads, and confirm with your own eyes that units, items, augments, traits and `tft_set_number` are all present. Every estimate below assumes this works.

---

## Phase 0 — Foundations
**Wed Oct 28 – Sun Nov 3 · ~15 h**

| Task | h | Done when |
|---|---|---|
| Pick name, buy domain, scaffold Next.js + Tailwind + Drizzle, deploy to Vercel | 4 | `https://<domain>` loads |
| Write Terms of Service + Privacy Policy (disclose Riot API usage, analytics, no player-identifying data) | 2 | Both pages live and linked in the footer |
| Riot dev account, dev key, **submit production key application** | 1 | Application submitted (recorded submission date) |
| **API spike:** challenger ladder → match IDs → 5 match payloads → inspect fields | 3 | Raw payloads saved; field list confirmed against the blueprint's data model |
| Schema v1 (raw + curated + derived tables) as migrations | 3 | `drizzle-kit push` clean against a fresh DB |
| Asset loader: CDragon Set 18 JSON → `units`/`traits`/`items`/`augments` | 2 | Counts match the set; images resolve |
| Site-wide Riot disclaimer in footer | — | Visible on every page |

**Exit criteria:** live domain with legal pages, working dev key, schema applied, Set 18 assets loaded, production key in review.

> ⚠️ If the production key has not been approved by end of Phase 1, switch to **Plan B**: rotate dev keys for a pilot crawl. At ~3k requests/hour you can collect ~20k matches over 6–8 hours of unattended crawling — enough for comp-level stats at Master+.

---

## Phase 1 — Crawler + aggregation
**Mon Nov 4 – Sun Nov 10 · ~30 h**

| Task | h | Done when |
|---|---|---|
| Job queue in Postgres (`pg-boss` or `match_queue` table with status/attempts) | 3 | Jobs survive a worker restart |
| Ladder seeder: KR + EUW challenger/GM/master → `players` | 3 | Player count per region recorded |
| Match-ID discovery with per-player cursor + `startTime` | 4 | Re-running doesn't re-enqueue known matches |
| Match fetcher: rate-limit budget, backoff on 429/5xx, **dedupe by `match_id`** | 6 | Sustained crawl stays under the allowance with no stalls |
| Normalizer → `participants`, `participant_units`, `participant_traits`, `participant_augments` (+ raw JSON kept) | 5 | 100 % of fetched matches normalize without error |
| Deploy worker (Docker on Fly/Hetzner), logs + restart policy | 3 | Runs unattended for 24 h |
| Pilot crawl 24–48 h | 2 active | ≥ 20,000 matches normalized |
| Comp assignment v1 (seeded, §8) + `comp_stats` materialization | 6 | Stats rows for ≥ 5 comps; **unclassified rate measured** |

**Exit criteria:** a nightly crawl you don't have to babysit, a normalizer you trust, and a first honest `comp_stats` table with a known unclassified rate.

**Decision point — tune the assignment threshold.** Try 0.75 and 0.6 core-unit overlap on real data. Pick the one where per-comp game counts look plausible (top comps in the thousands, off-meta comps in the hundreds). Write the number down; it goes on the site as your methodology.

---

## Phase 2 — Public site
**Mon Nov 11 – Sun Nov 17 · ~32 h**

| Task | h | Done when |
|---|---|---|
| Layout, design system, nav, footer, mobile-first | 4 | One page looks right at 375 px and 1440 px |
| `/comps` tier list + filters (patch, region, rank) with sample sizes | 6 | Sorts by `top4_ci_low`, shows games, loads < 1 s |
| `/comps/[slug]` detail: board, items, augments, leveling curve, **your three notes sections** | 8 | Every comp renders with and without stats |
| `/patch/[patch]` notes + risers/fallers | 4 | One real patch page published (use 18.5) |
| `/coaching` + CTA components + outbound click events | 4 | Click recorded for every placement |
| SEO: metadata, `sitemap.xml`, OG images per comp, JSON-LD | 3 | Sitemap valid; OG renders correctly in a link preview |
| Write 8–12 curated comps with notes | 5 | Each comp has a name, core units, items and a real "why now" paragraph |

**Exit criteria:** a complete site running on Set 18 data at patch 18.5, that a stranger can use without you explaining it.

**Design constraint to hold:** every comp page must look finished when stats are empty and say *"collecting data for Set 19"*. This is what lets you launch on Dec 1 even if the crawler is behind.

---

## Phase 3 — Set 19 rehearsal & hardening
**Mon Nov 18 – Sun Nov 24 · ~24 h**

| Task | h | Done when |
|---|---|---|
| Set-import script: `loadSet(19)` loads units/traits/items/augments and retires old ones | 4 | **Rehearsed by importing Set 18 as a "new" set** — this is the single highest-value test in the plan |
| Empty/error states, loading states, 404s, data-stale banner | 4 | Killing the aggregation job produces a graceful banner, not a broken page |
| Perf + mobile pass (image sizing, caching, ISR) | 6 | Lighthouse ≥ 90 perf on the tier list |
| Analytics + Sentry wired | 2 | A test error appears in Sentry |
| Draft 8–12 Set 19 comps from your own testing/PBE read | 6 | Drafts in the DB, `published = false` |
| Full patch-day runbook dry run | 2 | Timed end to end; record the actual duration |

**Exit criteria:** you can load a new set in one command, and you have a timed rehearsal of patch day. If the rehearsal takes 8 hours, the plan for Dec 1 is wrong — fix it now, not then.

---

## Phase 4 — Launch prep
**Mon Nov 25 – Mon Nov 30 · ~14 h**

- Buffer for the things that always slip (there will be things).
- Pre-load Set 19 assets the moment they're on CDragon; QA the board renders with new units.
- Final legal check: disclaimer, ToS, privacy, no Riot marks in brand or domain.
- Chase the production key. If approved, do a load test of the real crawl budget before launch day.
- Draft the launch post (r/CompetitiveTFT, Discord, X). **Read the subreddit's self-promotion rules first** and lead with the analysis, not the link.
- Set a reminder for Dec 1 morning.

---

## Launch day — Tue Dec 1

| Time | Action |
|---|---|
| Morning | Confirm Set 19 assets loaded; publish the curated comps with numbers marked "collecting data" |
| +0–1 h | Crawler live against Set 19; confirm matches are normalized (check `set_number`) |
| +1 h | Post the launch announcement with your day-1 tier list |
| +6–12 h | First credible numbers land → publish "day 1 data" meta read |
| +12 h | Check Sentry, crawl lag, unclassified rate; fix anything loud |
| Evening | Reply to every comment. This is the actual marketing. |

---

## Definition of done for v1

- [ ] 8–12 published comps, each with notes you'd stand behind
- [ ] Tier list filterable by patch / region / rank, sorted honestly by confidence
- [ ] Comp stats from ≥ 20k crawled matches with visible sample sizes
- [ ] One real patch page (18.5) as proof of the format
- [ ] `/coaching` live with prices, booking link, and tracked CTAs
- [ ] ToS, privacy, disclaimer on every page
- [ ] Crawler runs unattended and self-resumes
- [ ] Set import rehearsed end to end

---

## If you fall behind: the cut list

Cut in this order. Each item is chosen because losing it costs the least credibility:

1. **Tier list filters** → ship Master+ only.
2. **`/patch` risers/fallers** → static notes page with your summary.
3. **Rank toggle** → Master+ only.
4. **OG images per comp** → one site-wide image.
5. **Patch history** (`?patch=`) → latest only.
6. **Emerging-comp discovery** (already post-launch; don't pull it forward).

**Never cut:** legal pages, the disclaimer, sample sizes on every stat, or the "collecting data" empty state.

---

## Post-launch milestones

### M5 — Stabilise (Dec 2 – Dec 14)
- Patch 19.2 through the runbook; measure your actual turnaround time.
- Fix the top three data complaints (misassigned boards, stale augments, thin comps).
- Ship the first "what the data says" post — the first proof of the private loop.
- Target: 500 unique visitors/wk, ≥ 5 booking-link clicks.

### M6 — Depth (Dec 15 – Jan)
- Promote emerging-comp discovery into `/lab` (private) → publish as a monthly "data found this" piece.
- Add **unit pages** once any unit clears ~1,500 games; extent stats only where the corpus supports it.
- Email capture ("patch alerts") — the single highest-leverage retention feature.
- Consider a public data explorer only if it demonstrably feeds coaching.

### M7 — Durable (Feb onward)
- Decide on a supporter tier (Riot requires a free tier; paid content must be transformative).
- Second region, if EUW+KR data proves the model.
- Revisit player lookup / RSO **only** as a deliberate product decision, not scope drift.
- Ask Riot in writing about paid access to stats before gating anything.

---

## Honest assessment of the window

Five weeks at ~24 h/wk is enough for this scope **because the curated layer carries the launch**. The crawler is the risk, not the website — and the plan deliberately puts the boring, failure-prone parts (queue, resume, rate limits, set import) in Phases 1 and 3, before you're under launch pressure.

The one thing that would break this plan is trying to match MetaTFT's breadth on day one. You're not shipping a bigger MetaTFT; you're shipping a sharp one with a voice, aimed at the exact moment the ladder resets.
