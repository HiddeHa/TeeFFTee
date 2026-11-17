# TeeFFTee

A TFT meta/stats site with a coaching funnel: high-elo comp stats, a curated meta
layer, and the analysis seam that will hold the crawler.

- **Source:** [github.com/HiddeHa/TeeFFTee](https://github.com/HiddeHa/TeeFFTee) (public)
- **Live:** [production](https://site-1900fe11ad604367a670f605b0e64000.freebuff.page) · [preview](https://site-0d9595db583b49bc89a7346f70ea7437.freebuff.page)

## Planning documents

| Document | What's in it |
|---|---|
| [docs/blueprint.md](docs/blueprint.md) | Product definition, positioning, scope, data strategy, pipeline architecture, data model, comp-assignment algorithm, stack, coaching funnel, Riot compliance, metrics, risks |
| [docs/roadmap.md](docs/roadmap.md) | Week-by-week plan to the Set 19 launch on Dec 1, launch runbook, cut list, post-launch milestones |
| [docs/plan.md](docs/plan.md) | Manager's board: verified state, critical path, owner inputs, workstream lanes, subagent protocol, next steps in order |
| [docs/decisions.md](docs/decisions.md) | Locked decisions (D1–D15), the production sequence, and what each call changes |
| [docs/redesign-plan.md](docs/redesign-plan.md) | Competitive teardown of tftacademy / tactics.tools / tftactics.gg, the target IA, and phases R1–R4 |
| [docs/guide-standard.md](docs/guide-standard.md) | What a comp guide must answer, the six-answer template, and the measured-versus-judgement rule |

## Getting started

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build (typechecks as part of it)
npm run typecheck
```

No environment variables are required to run the site. Copy `.env.example` to
`.env` to set the public URL, booking link, a database or a Riot API key: both
`next` and the crawler read that file (see [worker/load-env.ts](worker/load-env.ts)),
and real environment variables take precedence over it.

## Tests

The end-to-end suite is Playwright: it drives the real pages in Chromium, in a
desktop project and a mobile one.

```bash
npx playwright install chromium   # once, per machine
npm run test:e2e                  # builds, then serves the app on :3100
npm run test:e2e:ui               # same suite, with the time-travel UI
```

`playwright.config.ts` builds the app and serves the production output on port
3100 with `DATABASE_URL` blanked, so every assertion reads the committed
catalogue snapshot and the curated content files. Nothing depends on live
Postgres or on when the crawler last ran, and the server is not `next dev` — that
allows one server per directory, so a stray dev server (or the one you are
running) would stop the suite from booting. `npm run typecheck` covers the specs
too.

The builder specs wait for React to take over before clicking (the page renders
fully server-side, so a click in that window does nothing), and the base URL is
`localhost` rather than `127.0.0.1` because Next's dev server rejects the HMR
socket from an origin it does not recognise — and the page never hydrates
without it.

## What exists

| Route | State |
|---|---|
| `/` | Home: current patch, top comps, meta read teaser, coaching band |
| `/meta` | Meta tier list by consensus letter, every source's letter printed beside it (`/comps` redirects here) |
| `/meta/stats` | Every measured column per comp in one table: consensus, board cost, crawl sample, Wilson floor |
| `/meta/[slug]` | Comp detail: board, stats, leveling, augments, matchups, your notes, inline CTA |
| `/ainalyses` | Pattern mining over the crawled boards: units, the unit pairs and three-unit cores played together, items, popular and best-finishing item × unit pairings, traits — read from a snapshot `crawl -- patterns` materialises |
| `/lab` | Comp discovery: recurring unit sets on the current patch with board counts, placement against the baseline, common items and traits, plus the share of boards the published comps could not classify |
| `/leaderboards` | Tracked Master+ ladder by region, searchable by Riot ID or PUUID |
| `/players/[puuid]` | One tracked account: Riot ID, ladder snapshot, its crawled placements |
| `/teambuilder` | Hex-board planner over the set's champions and items; the board lives in the URL |
| `/tier-lists` | Personal tier lists for units, items and augments, saved in the browser only |
| `/guides`, `/guides/[slug]` | Long-form guides, each labelled measured versus judgement |
| `/set-19` | The next set, overview: Riot-confirmed facts, coverage, dates and what is still unpublished; Units, Traits and Unlockables are sub-pages behind its tab bar |
| `/set-19/units` | Set 19 roster: all 94 champions by shop cost, the two Akalis and the four 7-cost unlocks |
| `/set-19/units/[champion]` | One Set 19 champion: cost, traits, any published unlock condition, and where each fact came from |
| `/set-19/traits` | Set 19 traits: the 27 regular, 20 unique and 5 Prismatic traits with breakpoints and champions |
| `/set-19/unlockables` | Set 19 unlocks: the three categories, the five cards Riot showed, and every published quest condition |
| `/login` | Sign in with Freebuff: who you are, or the option to sign in; `/auth/freebuff/*` serves the flow |
| `/patch/[patch]` | Patch summary, change list, movers, meta read |
| `/coaching` | Offers and prices, process, FAQ, booking CTAs |
| `/about` | Author credibility block and full methodology |
| `/terms`, `/privacy` | Starter legal pages (Riot's production key review checks for these) |
| `/sitemap.xml`, `/robots.txt` | Generated from content |

## Content and the placeholder flag

The shipped content is real: ten Set 18 comps with their guides, the 18.6 patch
entry, prices, the author block and the contact address (docs/decisions.md D3–D6).
So [src/content/flags.ts](src/content/flags.ts) has `PLACEHOLDER_CONTENT = false` and
no banner renders.

The flag exists for the other direction. If any of the below becomes invented
again, turn it back on rather than leaving copy that reads as finished:

1. [src/content/site.ts](src/content/site.ts) — name, domain, author rank/proof, prices, booking link, socials, contact email.
2. [src/content/comps.ts](src/content/comps.ts) — keep `coreUnits` and `definingTrait` accurate: together they are the assignment signature, and a board only counts toward a comp when that trait is active on it.
3. [src/content/patches.ts](src/content/patches.ts) — write each entry from Riot's notes in your own words.
4. [src/app/terms/page.tsx](src/app/terms/page.tsx) and [src/app/privacy/page.tsx](src/app/privacy/page.tsx) — re-check if the business or the data handling changes.
5. [src/content/flags.ts](src/content/flags.ts) — `PLACEHOLDER_CONTENT = true` the moment any of the above stops being true.

## Database

The schema for raw match data, curated comps and derived stats lives in
[src/db/schema.ts](src/db/schema.ts); the migration is already generated in
[drizzle/](drizzle/).

```bash
npm run db:generate   # after editing the schema
npm run db:migrate    # apply to DATABASE_URL
npm run db:studio     # browse
```

### Where the numbers come from

Editorial content stays in `src/content` — typed, reviewed in git, editable without
a database. Numbers come from Postgres. The target is the same either way, so no
page component knows the difference.

| State | What renders |
|---|---|
| No `DATABASE_URL` | The curated snapshot in `src/content/comps.ts` |
| Postgres unreachable | That same fallback, plus one warning in the server log |
| Postgres answers, comp has rows | Those numbers |
| Postgres answers, comp has no rows | **“Collecting data”** |

The last row is deliberate. An empty database is a measurement — nothing has been
crawled for that comp yet — and falling back to the content file there would pass
placeholder figures off as real ones. Outages fall back; emptiness does not.

`comp_stats` stores **counts** (games, place sum, top-4 count, win count, boards),
not rates, because counts combine across regions exactly and pick rate needs its
denominator. Averages, rates and the Wilson bound are derived in one place,
[src/lib/stats-source.ts](src/lib/stats-source.ts). Comp pages revalidate every
five minutes, so a fresh aggregation appears without a redeploy.

The seam is [src/lib/data.ts](src/lib/data.ts) — every page reads through it.

### Unit names, costs and icons

Those come from the set catalogue, not from editorial content. A comp's board in
[src/content/comps.ts](src/content/comps.ts) lists only **which** unit (`id`, the
Riot apiName), its target star and its items; name, cost and icon are looked up in
`units` — the table `npm run crawl -- load-assets` fills from Community Dragon —
and attached as `visibleBoard` by [src/lib/data.ts](src/lib/data.ts).

There is no content fallback for unit identity, deliberately. A slot the catalogue
cannot resolve renders its raw id with “Not in the set catalogue” rather than a
made-up champion: a placeholder id or a renamed unit becomes visible instead of
plausible. That is also what a board looks like against a set whose assets have
never been loaded — it says so, slot by slot, instead of guessing.

The three example comps are real Set 18 boards: every id resolves against `units`,
every item is an item the set actually ships, and each board activates at least
three trait breakpoints (counted by hand against `traits.breakpoints`). They are
still examples — the names say so, and the notes and numbers are illustration —
but the champions, costs and icons on them come from the catalogue.

## Crawler (`worker/`)

Four stages, runnable individually or as a loop. All queue state lives in
Postgres, so a crashed run resumes where it stopped instead of starting over.

| Command | Does |
|---|---|
| `npm run crawl -- seed` | Load the challenger/grandmaster ladders into `players` |
| `npm run crawl -- names` | Resolve Riot IDs for tracked players (one account-v1 request each) |
| `npm run crawl -- discover` | Turn tracked players into queued match ids |
| `npm run crawl -- fetch` | Fetch queued matches, normalise, write all five tables |
| `npm run crawl -- reprocess` | Rebuild rows from stored raw payloads after a normaliser fix |
| `npm run crawl -- load-assets` | Load a set's units, traits, items and augments from Community Dragon |
| `npm run crawl -- sync-comps` | Push curated comps from `src/content` into the `comps` table |
| `npm run crawl -- aggregate` | Assign boards to comps and materialise `comp_stats` |
| `npm run crawl -- patterns` | Materialise the AInalyses study for every crawled set (also runs on the aggregate timer) |
| `npm run crawl -- bootstrap` | Seed `comp_stats` for any patch/region with games but no rows yet (also runs each loop cycle) |
| `npm run crawl -- candidates` | Rank recurring unit sets in the crawled data (evidence for new comps) |
| `npm run crawl -- once` | seed → discover → fetch, one pass |
| `npm run crawl -- run` | Continuous loop: discover + fetch, re-seed periodically, aggregate on a timer |
| `npm run crawl -- stats` | Queue health and table counts |

Needs `DATABASE_URL` and `RIOT_API_KEY`, both read from `.env` when the file
exists. Key knobs are in [worker/config.ts](worker/config.ts); `.env.example`
documents them. The very first live run is
`npm run crawl -- once && npm run crawl -- aggregate`.

### Compression: boards → comps → stats

`aggregate` scores every crawled board against the published comps. A board
counts for a comp when **at least 60% of the comp's core units are present**
(`CRAWL_ASSIGN_THRESHOLD`) **and** its `definingTrait`, when set, is active. Ties
go to the comp with more core units, so a specific definition beats a loose one.

Boards that match nothing are counted and reported, not hidden. That number is
the point: a high unclassified rate means the curated comps have stopped
describing what the ladder is actually playing — which is exactly the signal the
`/lab` discovery loop is meant to act on.

Stats are written per `(patch, region, rank bucket)` as a **replace**, so a
re-run can never leave a comp's stale numbers behind. Comps are ordered by the
Wilson 95% lower bound of their top-4 rate, so a 40-game comp cannot outrank a
5,000-game one. Rank buckets describe provenance, not each player's rank: Riot
does not expose rank-at-time-of-match, so a match counts toward `master+` when
at least one participant is a tracked Master+ player.

The same pass writes `comp_augment_stats`: one row per comp and augment taken by a
board that comp classified, in the same scope and the same transaction as
`comp_stats`. Counts only — the comp page derives the average finish, the share of
the comp's boards and the delta against the comp's own average on read, and does
not quote anything under 10 boards. Augments are offered on a stage roll rather
than chosen from the pool, so the page labels the list as correlation: it says what
boards that took the augment finished, not that taking it would improve a place.

```bash
npm run crawl -- sync-comps   # after editing src/content/comps.ts
npm run crawl -- aggregate    # optionally: --patch 18.5 --region EUW
```

### Finding comps in the data

Curated comps are written by hand, but *which units go together* should not be a
guess. `candidates` mines the crawled boards for unit sets that recur, and ranks
them by how they actually placed:

```bash
npm run crawl -- candidates                              # best placement first
npm run crawl -- candidates --bucket master+ --min-games 100
npm run crawl -- candidates --set 19 --json > candidates.json
```

| Flag | Meaning |
|---|---|
| `--min-games` | boards a shape needs before it is reported (default 20) |
| `--core` | largest set to mine, 2–5 (default 4) |
| `--bucket` | `all` (default) or `master+` |
| `--patch` / `--region` / `--set` | narrow the scope |
| `--json` | the same evidence as JSON, for scripting |

A shape is reported only when a *larger* shape does not already explain it:
`{A,B,C}` with 5,000 boards is dropped when `{A,B,C,D}` covers ≥90% of them. A
60% overlap keeps both, because those really are two different boards. Each
candidate prints its board count, average placement next to the scope baseline,
top-4 and win rate, the star level and two most common items per unit, and the
traits active on at least half of those boards — which is most of what the
`coreUnits`, item and `definingTrait` fields of a comp need.

It is read-only: it never writes a comp, and it says nothing about whether a
shape is *good* to recommend. That remains the editorial call. On 160,000 boards
(about 20,000 matches) mining takes roughly 40 seconds and 160 MB.

### Materialising the AInalyses study

`/ainalyses` mines six patterns out of the stored boards: units, unit pairs, three-unit
cores, items, item × unit (popular and best-finishing) and traits. The mining is a
self-join over `participant_units` — twice for a pair, three times for a trio — so it runs
here, once per aggregation cycle, instead of on every page request:

```bash
npm run crawl -- patterns              # every set with crawled boards
npm run crawl -- patterns --set 18     # one set
```

It writes two derived tables:

| Table | Holds |
|---|---|
| `board_studies` | one row per set: boards, matches, the placement baseline, the thresholds, `computed_at` |
| `board_patterns` | one row per pattern: ids and counts (`sample`, `place_sum`, `top4_count`, `win_count`) plus the denominator an overlap needs |

Counts and ids only. Averages, rates, the overlaps and every name and icon are derived on
read ([src/lib/analysis.ts](src/lib/analysis.ts)) against the set catalogue, so a renamed
unit converges instead of keeping a stale name in a derived table. A set's rows are
replaced in one transaction; the page reads one study row and its patterns, and says
“never mined” rather than showing zeroes when the job has not run yet.

### Loading a set's units, traits, items and augments

The crawl stores Riot's ids verbatim (`DA_18_Maokai`, `DA_18_Elderwood`,
`TFT_Item_InfinityEdge`). `load-assets` turns those ids into names, costs, trait
breakpoints and icons, pulled from
[Community Dragon](https://raw.communitydragon.org/latest/cdragon/tft/en_us.json)
— the same data the client ships, and the only public source with trait
breakpoints and augment rarity:

```bash
npm run crawl -- load-assets                      # newest set in the payload
npm run crawl -- load-assets --set 18             # an explicit set
npm run crawl -- load-assets --set 18 --mutator TFTSet18_PAIRS
CDRAGON_URL=https://raw.communitydragon.org/15.21/cdragon/tft/en_us.json \
  npm run crawl -- load-assets --set 18           # pin a patch to reproduce
```

| Flag | Meaning |
|---|---|
| `--set` | set to load (default: the newest set the payload contains) |
| `--mutator` | a mode variant instead of the base set, e.g. `TFTSet18_PVEMODE` |
| `--source` | catalogue URL (also `CDRAGON_URL`) |

It writes `units`, `traits`, `items` and `augments` and then reports what it did,
including how much of the **crawled** data it can now name:

```
units     91  (17 traitless summons kept)
traits    36
items     772  (special 588, component 83, completed 78, emblem 23)
augments  595  (Gold 279, Silver 162, Prismatic 154)
images    1490/1494 rows have a URL  (4 missing in payload)
pruned    nothing stale

coverage  set 18 · 24 boards crawled
  units      0/10   ids resolved (0%)
          unresolved: TFT18_STUB_01, TFT18_STUB_02, …
```

That coverage block is the point of the job: a catalogue nobody's ids match is a
silent failure, and it is the first thing to look at after a set launch.

Behaviour worth knowing:

- **Idempotent.** Rows upsert on their primary key, so re-running after a patch
  is safe. Rows the payload no longer lists are deleted — that is the `pruned`
  line — so a renamed unit converges instead of lingering.
- **One set at a time.** Tables hold every set you have loaded; only the loaded
  set's rows are pruned. Item ids are global, so a shared item keeps the
  `set_number` of the load that touched it last.
- **A variant replaces the set.** `--mutator` loads a mode's version of the same
  set number, so loading `PVEMODE` prunes the base set's augments. Reload the
  base set afterwards.
- **A new set is a data load.** On launch day, `load-assets --set 19` is the
  whole change. If 19 is only in the PBE build, point `CDRAGON_URL` at it; a set
  the payload does not contain is refused with the list of sets it does.
- **Augment tier is inferred, and says so.** The payload has no rarity field. The
tier is read from the icon name (`_i` / `-ii` / `_iii`) and, where the icon is a
  shared placeholder, from the augment's rarity tag — whose meaning is *learned*
  from the augments whose icon states the tier, not hardcoded. On set 18 the two
  agree for 168 of 170 augments that carry both, which is what makes the tag
  safe to use on the rest; the 16 icon/tag conflicts favour the tag, because Riot
  reuses one icon across different rarities (`constructacompanion_iii.tex` is both
  a Gold and a Silver augment).

Inside the crawler container, where `DATABASE_URL` is already set:

```bash
docker compose -f compose.crawl.yml exec crawler npx tsx worker/cli.ts load-assets --set 18
```

The loader is not part of the `run` loop — run it when a set launches or after a
trait/item rework, and the crawl will resolve against it from then on.

### Rehearsing without an API key

Dev keys expire every 24 hours, so there is a local stub of the three endpoints
the crawler uses:

```bash
npm run crawl:stub        # stub Riot API on 127.0.0.1:4010

RIOT_API_BASE_URL=http://127.0.0.1:4010 RIOT_API_KEY=stub \
  DATABASE_URL=... npm run crawl -- once

npm run crawl -- stats
```

The stub returns the same twelve match ids for every player on purpose, so a run
proves the queue dedupes. `STUB_429_EVERY=3` makes every third request answer
429 to exercise the retry path.

### Running it continuously

`npm run crawl -- run` is the production loop: seed → discover → fetch, then
re-aggregate on a timer so the site's numbers follow the data without a redeploy.
It ships as a container with its own Postgres:

```bash
RIOT_API_KEY=RGAPI-... docker compose -f compose.crawl.yml up -d --build
docker compose -f compose.crawl.yml logs -f crawler
docker compose -f compose.crawl.yml stop     # SIGTERM, exits 0 in about a second
```

| Behaviour | What actually happens |
|---|---|
| Cycle | re-seed every 12th cycle, discover, fetch, then aggregate once `CRAWL_AGGREGATE_MINUTES` has elapsed |
| Freshness | pages revalidate every 5 minutes, so a new aggregation is visible within 5 minutes without a redeploy |
| Stop | SIGTERM sets a flag checked between players and between matches; the run loop exits 0 and never interrupts a write |
| Hung shutdown | a 20 s watchdog exits anyway, logging the stage it was in — a stuck socket must not become a SIGKILL |
| Hard kill | SIGKILL is safe: writes are per-match transactions and stale claims are reclaimed after `CRAWL_CLAIM_TIMEOUT_MINUTES` |
| Expired key | a 401 fails that cycle but not the loop; it retries next cycle and logs the reason. Dev keys expire every 24 h — regenerate and `docker compose restart crawler` |
| Set rollover | the set comes from `tft_set_number` in each match, so no code or config change is needed on the 19th |

Nothing can be classified for a new set until it has comps. Aggregation says so
explicitly rather than reporting 0% pick rate:

```
WARN [aggregate] set has crawled boards but no published comps — all of them are unclassified
  {"setNumber":19,"patch":"19.1","matches":24,
   "action":"add set 19 comps to src/content/comps.ts, then run `npm run crawl -- sync-comps` and aggregate again"}
```

So the rollover is a content task on the day, not a deploy: add the new set's
comps, run `sync-comps`, and the next aggregation pass fills `comp_stats`.

### Safety properties (each one verified against Postgres)

- **Dedupe by `match_id`** before fetching — every match is visible from eight
  PUUIDs, so this is the difference between 12 fetches and 960.
- **`FOR UPDATE SKIP LOCKED` claims**, so parallel fetchers never take the same
  row, and stale claims are reclaimed after a crash.
- **Rate limiting at 65% of the published quota** with a global pause on 429.
- **Raw payloads stored**, so a normaliser change is a replay (`reprocess`), not
  a re-crawl.
- **`ON CONFLICT DO NOTHING`** throughout: re-delivering a queue row is a no-op.

## Deploying

Hosted on **Freebuff Sites** — one project, two environments, Cloudflare Workers
the OpenNext adapter packaged from `next build`:

| Environment | URL |
|---|---|
| Production | https://site-1900fe11ad604367a670f605b0e64000.freebuff.page |
| Preview | https://site-0d9595db583b49bc89a7346f70ea7437.freebuff.page |

A deploy is two steps: prepare (installs the adapter, builds, and writes
`freebuff-sites-build/manifest.json`), then deploy that manifest to the target
environment. Publishing the production environment is deliberate and never a
side effect of deploying code.

```bash
DATABASE_URL= npm run build   # the build the deploy ships; CI runs this too
```

Two things to know before publishing. **The deploy builds the working tree, not
`HEAD`** — commit first, or unreviewed edits ride along. And an environment stays
visible after its code is replaced: `.github/workflows/ci.yml` is the gate that
must be green (typecheck, build, and the Playwright suite on Node 22), not a
green deploy.

A public HTTPS URL is a precondition for a Riot production key: the application
is reviewed against a live site with working terms and privacy pages, which the
Freebuff URLs above provide.

## Status

Built and verified: every route in the table above, the schema and legal pages, the
crawl pipeline (seed → discover → fetch → normalise), comp assignment with Wilson
bounds, the tier list and comp pages reading `comp_stats` with a content fallback,
the materialised AInalyses study (`crawl -- patterns`), the tracked leaderboard and
player profiles, and the continuous containerised loop.

Deployed: production and preview both serve the current build from Freebuff Sites
(above).

Not yet done: there is no Riot **production** key yet (development keys expire every
24 h), so the crawl only advances while one is supplied; Set 19 has no crawled
boards until it launches, and every stats page stays on Set 18 until then. Sign in
with Freebuff is wired but nothing is gated behind an account yet.

## License

The original source code and written content in this repository are licensed under
the [MIT License](LICENSE).

Riot Games game data, trademarks, champion artwork, and assets derived from Riot
or Community Dragon are not covered by that license and remain subject to their
owners' terms.
