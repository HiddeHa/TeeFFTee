# Set 19 launch runbook

Companion to [roadmap.md](roadmap.md) Phase 3. This is the timed, checkable version
of "the rollover is a content task, not a deploy": what to run, what output means
go, and how to back out.

Dates used below: **PBE 17 November 2026**, **launch 2 December 2026**. Riot's own
sources disagree by a day (patch schedule says 19.1 on 1 December, the unlocks video
says 2 December); the site's copy and the stale-set guard both use **2 December**. If
Riot moves it, change `set19.launchDate` first — the guard, the launch band and this
runbook all read that value.

## Status at drafting (16 November 2026)

| Check | Result |
|---|---|
| PBE catalogue reachable | Yes, 23.1 MiB, but **sets only 1–18** — Set 19 is not on PBE yet |
| Scratch database | `teefftee-rehearsal-db`, Postgres 18 on `127.0.0.1:55432`, database `teefftee_rehearsal` |
| Migrations against scratch | Applied clean (`npx drizzle-kit migrate`) |
| Loader against scratch, PBE set 18 | 91 units, 36 traits, 772 items, 594 augments; 1489/1493 rows have images; coverage reports “no crawled set 18 matches yet — nothing to resolve” |
| Rehearsal harness | Resolves 10 drafted comps, seeds them, runs `aggregate`, checks each comp claims its own board — **10/10** with a draft Set 19 catalogue in scratch |
| Real unclassified rate | **Not measurable yet** — no Set 19 boards exist before launch |

The PBE payload has no Set 19 today, so the real asset load is the 17 November step
below. The harness was exercised end to end against a synthetic draft catalogue
(synthetic ids, deleted afterwards); it fails loudly on unknown champions, unknown
traits, missing assets and duplicate slugs.

---

## Rehearsal comps

Ten shells live in [worker/rehearsal/set19-comps.ts](../worker/rehearsal/set19-comps.ts),
five core units each, one per major trait line: Pentakill, K|DA, Heartsteel, True
Damage, Ionic Spark, Hyperpop, Arcanist, Slayer, Frontman, Trickshot.

They are **not editorial content**: no playtest, no item data, not imported by the
site, and they exist only so aggregation has labels to rehearse with. Before launch
they are replaced by ten comps written from PBE games in `src/content/comps.ts` with
real items and notes. Do not copy names or cores from the fixture into the site.

---

## 17 November — PBE asset load and first real rehearsal

Run every command with the scratch database. The rehearsal script refuses a database
whose URL does not contain `rehearsal` unless `--force` is passed.

```bash
export DATABASE_URL='postgres://tft:tft@127.0.0.1:55432/teefftee_rehearsal'
docker start teefftee-rehearsal-db    # if it was stopped

CDRAGON_URL=https://raw.communitydragon.org/pbe/cdragon/tft/en_us.json \
  npm run crawl -- load-assets --set 19

npm run rehearse:set19
```

**Go/no-go on the load report**

- `set selected ... "set":19` — the payload really carries Set 19.
- Units in the report must cover the 94 champions the Dev Drop published; the
  loader also keeps traitless summons, so a larger count is expected. Anything
  below 94 means the PBE build is partial — note it and re-run later, do not “fix”
  the count.
- Traits near 47 (27 regular + 20 unique). Prismatic is a tier, not extra rows.
- `coverage no crawled set 19 matches yet — nothing to resolve`: expected before
  launch. After the first launch-day crawl this block is the asset gate (below).
- Unresolved champions printed by `rehearse:set19` mean a draft comp names something
  the payload does not have (a rename, a summon, a typo). Fix the draft; never force
  past it. The fixture's `Akali (K|DA)` / `Akali (True Damage)` names are the likely
  first mismatches.

**What the rehearsal proves that day**

- Every drafted champion and trait exists in the loaded set.
- The comps can be stored and read by `aggregate` for set 19.
- No two shells claim each other's own board (a collision is an inflated shared pick
  rate later, so it is a comp-definition bug, not a data bug).
- The real unclassified rate is still unknown and the script says so. There are no
  Set 19 boards until the client ships.

If PBE is late, do not move the date in content to make the run pass. Re-run the
load daily until it selects 19; the launch copy already says what is unpublished.

---

## 24 November — dress rehearsal with PBE-read comps

1. Replace the ten fixture shells with the ten comps actually being considered,
   first in the fixture file, then (when they are good enough to publish) in
   `src/content/comps.ts` with `published: false`.
2. Re-run the 17 November commands. Expected: 10/10 comps resolve, no missing names,
   no collisions.
3. Rehearse the content switch on a branch: bump `site.setNumber`/`setCodename`/
   `currentPatch`, add the 19.1 patch entry, point the comps at Set 19, run
   `npm run check:content`, `npm run typecheck`, `npm run build`. The stale-set guard
   must pass **because the site is on 19**, not because the date has not arrived.
4. Time it. Record the wall-clock duration here. The roadmap's exit criterion is that
   the rehearsal is timed; if it takes hours, cut scope now.

---

## Launch day — 2 December

All times local. The crawler needs no set configuration: `tft_set_number` comes from
each match. What must land before the first Set 19 game is crawled is **assets and
comps**.

### T-0 · assets into the production database

```bash
# production DATABASE_URL
CDRAGON_URL=https://raw.communitydragon.org/latest/cdragon/tft/en_us.json \
  npm run crawl -- load-assets --set 19
```

The `latest` payload should now carry Set 19 (PBE ids can change between builds).
Check the counts and the coverage block; before any crawl it will say “no crawled
set 19 matches yet”. If `latest` still has only 18, keep the PBE URL pinned and note
the source in the deploy log.

### T+0 · switch the site content

One commit, in this order:

- [ ] `src/content/site.ts`: `setNumber: 19`, `setCodename: "Prismatic Tour"`,
      `currentPatch: "19.1"`, `currentPatchDate`.
- [ ] `src/content/patches.ts`: 19.1 entry (written from Riot's notes, not invented).
- [ ] `src/content/comps.ts`: ten Set 19 comps, `published: true` only for the ones
      that survived the dress rehearsal. Keep `coreUnits` accurate — it is the
      assignment signature.
- [ ] Set 19 page copy: no edit needed. The overview, champion pages and launch
      band all read `isSet19Live()`; from local midnight on `set19.launchDate` they
      switch to live wording and a collecting-data state with the unclassified
      count. D16 keeps `/set-19` as the canonical URL — there is no `/sets/19`
      redirect to add.
- [ ] `npm run check:content` (blocks on inconsistent Set 19 facts and on trait /
      roster drift).
- [ ] `npm run typecheck && npm run build`.
- [ ] Deploy and publish.

### T+0 · sync and aggregate

```bash
npm run crawl -- sync-comps
npm run crawl -- aggregate --set 19
```

`sync-comps` pushes the content comps into `comps`; `aggregate` then classifies
whatever boards exist. The first run may have no boards yet — that is not a failure.

### Gates after the first 500 Set 19 boards (about T+1–2 h)

| Measure | Green | Amber | Red / action |
|---|---|---|---|
| Unit ids resolved (coverage) | ≥ 99% | 95–99% | < 95%: wrong PBE ids, reload assets from `latest` |
| Comps in the report | 10 | 8–9 | < 8: publish only the ones that resolve, say so |
| Unclassified rate | ≤ 35% | 35–50% | > 50%: shells are too narrow for the real ladder — widen cores or add a comp, re-sync, re-aggregate before calling it a meta read |
| Comp stats rows | 10 | 6–9 | 0 after 500 boards: check `comps.published`, set number and `defining_trait` |

Do not publish a “day 1 meta” number before the unclassified rate is under the amber
line; the picks it shows are a share of the boards we could name, not of the lobby.

### T+2 h · site verification

- [ ] `/meta/stats` shows aggregation freshness for 19.1 and rows for the published comps.
- [ ] Comp pages render with their new boards (unit names resolve against `units`).
- [ ] `/set-19` and the champion pages no longer claim the set is unreleased.
- [ ] Launch band absent on `/`, `/meta`, `/meta/stats`.
- [ ] `/sitemap.xml` includes the Set 19 routes.
- [ ] `/api/health` reports a reachable database and a corpus.
- [ ] Crawl loop log shows `set 19` matches, and the unclassified rate is logged per
      scope with reasons.

---

## Rollback

The site and the data roll back separately; neither needs a database restore.

1. **Content**: revert the launch commit (or set `site.setNumber` back to 18), rebuild
   and redeploy. Set 19 comps can stay in the database unpublished; they classify
   nothing.
2. **Assets**: leave them loaded. `load-assets` prunes only the set it loads, so
   reloading 18 does not remove 19.
3. **Crawl**: no config change needed; matches continue to be stored with their own
   `tft_set_number`. If the crawler is producing noise, stop the container and fix
   before restarting.
4. **Never** delete raw payloads or match rows as part of a rollback; they are the
   replay source for a normaliser fix.

The stale-set guard will fail the build if the site is left on 18 after 2 December,
which is the intended pressure to either finish the switch or consciously revert
with a date change.

---

## Scratch database lifecycle

```bash
# create (once)
docker run -d --name teefftee-rehearsal-db \
  -e POSTGRES_USER=tft -e POSTGRES_PASSWORD=tft \
  -e POSTGRES_DB=teefftee_rehearsal -p 55432:5432 postgres:18

# stop / start around rehearsals
docker stop teefftee-rehearsal-db
docker start teefftee-rehearsal-db

# discard entirely (safe: scratch only)
docker rm -f teefftee-rehearsal-db
```

`DATABASE_URL` must point at `teefftee_rehearsal`; `rehearse:set19` enforces the
name. The production database is never a rehearsal target.
