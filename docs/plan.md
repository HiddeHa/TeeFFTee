# Execution plan — manager's board

Owner: the manager chat. This file is the single place that says **what is being worked on,
by whom, and what "done" means**. Two other agent chats are working in this repo: they claim
work in [§8](#8-claims--the-other-two-chats) before starting and update it when they stop.

Read alongside [roadmap.md](roadmap.md) (the schedule), [blueprint.md](blueprint.md)
(the product) and [redesign-plan.md](redesign-plan.md) (the proposed IA change to take the best of
tftacademy / tactics.tools / tftactics — **proposal, not authorised work**, see its §9). Where this file disagrees with the roadmap, this file wins — the roadmap was
written on Oct 28 and the state has moved.

---

## 1. Where the project actually is — verified 2026-11-10

| Area | State | Evidence |
|---|---|---|
| Site | All v1 routes built, typecheck green | `npm run typecheck` → exit 0 (manager, today) |
| Local database | Populated end to end | `npm run crawl -- stats` → 24 matches, 80 players, 1,584 units, 192 traits, 576 augments, 4 comps, 16 `comp_stats` rows, all set 18 / patch 18.6 |
| Crawler vs live Riot | **Never run** | `RIOT_API_KEY` is missing from `.env` |
| Stub rehearsal | Working; can emit real curated boards | `STUB_COMP_BOARDS=1` in `worker/dev/stub-riot.ts` |
| Deployed preview | Published and serving | Sites `metaread` preview, deployed 2026-11-10T14:47Z, `/comps` 200 |
| Deployed production | Never deployed | `published: false` |
| Content truth | Placeholder | `PLACEHOLDER_CONTENT = true`; name, prices, author, booking link all placeholder; 3 of 4 comps are `Example …` |
| Git | One commit, plus uncommitted work | `d330856`; 5 modified (incl. 8k-line lockfile) + 2 untracked Freebuff configs |

Two things I checked on the **live preview** that reprioritise the work:

1. **Comp pages render raw Riot ids.** `/comps/example-fast-8` shows `DA_18_Sivir`, not
   Sivir — the deployed Worker has no `units` table, and `src/lib/units.ts` deliberately has
   no content fallback. The behaviour is by design; the first impression is not. This is the
   URL a Riot reviewer sees.
2. **The tier list shows 0 games for every comp**, including the Examples that carry invented
   4,820-game figures, because those snapshots are patch 18.5 and the site is on 18.6. Honest,
   but it means the numbers layer is not demonstrated anywhere public yet — only locally,
   where the database exists.

---

## 2. Critical path

Launch is Set 19 day one, **Tue 1 Dec 2026 — 21 days out**. The chain:

```
public URL + legal pages ✅  →  Riot production-key application  →  approval
      →  24–48 h pilot crawl (≥20k matches)  →  real comp_stats  →  credible tier list
```

Everything left of the application is done. Everything right of it is blocked on the **owner**,
not on code. The site is not the risk; the key is. A production key that arrives on Nov 20 still
leaves time; one that arrives Dec 1 does not.

---

## 3. Owner-only inputs (blocking, cannot be delegated)

| # | Input | Blocks | Notes |
|---|---|---|---|
| O1 | **Riot dev key** in `.env` (`RIOT_API_KEY`) | N5 pilot crawl, any real number on the site | Expires every 24 h. Regenerable at developer.riotgames.com |
| O2 | **Production key application** | Everything after Nov 20 | Needs the public URL and the legal pages, both of which exist |
| O3 | Real identity: site name + domain, author name/handle/rank/proof, contact email, socials | N3, and the key review | `src/content/site.ts` |
| O4 | Prices + real booking link + Discord invite | `/coaching` being a real page | Same file, `offers` / `bookingUrl` |
| O5 | Patch 18.6 notes read in your own words (the draft in `patches.ts` exists — confirm or rewrite) | Credibility | Agent can draft; only you can stand behind it |
| O6 | Decision: deploy target for the real product — Freebuff Sites (preview is there now) or Vercel | N7 | Sites is already wired; Vercel needs no new work but no preview exists |

---

## 4. Technical decisions

**Decided 2026-11-10 — see [decisions.md](decisions.md)** for the record, the production sequence
(S1–S7) and the lane work orders. Where this section and that file disagree, that file wins. D1
below is superseded by the both-hosts decision: the Sites review URL gets a catalogue snapshot,
Vercel is the launch host.

**D1 — How do numbers reach the deployed site?** Workers cannot open a TCP connection to the
local Postgres the crawler writes to, so the deployed preview currently runs on the content
fallback with no unit catalogue. Two ways forward:

- **D1a — Ship a set-catalogue snapshot as content** (units/traits/items → one JSON asset, read
  by `src/lib/units.ts` when there is no `DATABASE_URL`). Small, no new vendor, keeps the
  deployed site honest, and fixes the raw-id problem that a Riot reviewer would see. Does
  not show live stats — which the "collecting data" design already covers.
- **D1b — Hosted Postgres over HTTP** for the deployed Worker (the `postgres` driver will not
  do this; it needs a fetch-based driver). Real stats on the public site, but a new service,
  keys, and a migration of the read path.

**Recommendation: D1a now, D1b after the production key** — D1a removes the visible defect in
an afternoon and keeps the launch unblocked; D1b is only worth its cost once there are real
matches to serve. Choosing D1b means a service selection pass before writing any code.

**D2 — Set 19 rehearsal shape.** `load-assets` prunes per set, so "import set 18 as a new set"
is not literal. The rehearsal is: point `CDRAGON_URL` at a PBE build if one exists, else run
`load-assets --set 18` twice and confirm idempotency plus prune reporting, and verify the
"set has crawled boards but no published comps" aggregate warning fires for a fake set 19 patch.

**D3 — Assignment threshold.** Blueprint says 0.75, the implementation and the methodology text
say 0.60. Pick one, write it down, and make `site.ts` METHODOLOGY and `worker/assign.ts` agree —
that number is published as methodology.

---

## 5. Workstreams (lanes)

A lane is a claim on files, not on topics. Anything outside your lane is someone else's.

| Lane | Files (owner writes) | Never touches | Typical agent |
|---|---|---|---|
| **DATA** | `worker/**` | `src/**` (except reading content), configs | opus/gpt-5 agent + basher to run it |
| **CONTENT** | `src/content/**` | `worker/**`, `src/app/**` | gpt-5 agent drafts; owner approves truth |
| **SURFACE** | `src/app/**`, `src/components/**`, `src/lib/**` | `src/content/**`, `worker/**` | editor-multi-prompt |
| **PLATFORM** | `package.json`, lockfile, `next.config.ts`, `freebuff.*`, `Dockerfile.worker`, `compose.crawl.yml`, `.gitignore` | product code | one agent at a time; needs the build lock |
| **VERIFY** | nothing — reports only | all product files | basher + code-reviewer |
| **RESEARCH** | nothing — reports only | all product files | researcher-web |

Rules that exist because three chats share one working tree:

1. **One build/dev/wrangler at a time.** `.next`, `.open-next` and `freebuff-sites-build` are
   single-writer. Take the build lock in §8 before `npm run build`, `next dev`, `wrangler`, or
   `sites_deploy`; release it in the same edit.
2. **No lane runs `npm install`.** Dependencies change only as a PLATFORM task with the lock held.
3. **The manager commits.** Lane agents leave changes in the tree and report them; nobody else
   stages or commits, so a half-finished lane can never become the baseline.
4. **Cross-lane needs are routed, not patched.** If DATA needs a line changed in `src/lib`, it
   goes in the report as a request.

---

## 6. How subagents are used

I stay the manager: I choose the work, write the brief, verify the result, and keep this file
current. Subagents do the lane work and never decide scope.

**Brief format** (every delegation includes all seven):

1. Goal, in one sentence, plus the reason it matters now.
2. Lane and the exact files in scope; the files they must not touch.
3. What is already true, so they do not re-derive it (e.g. "the local DB has 24 stub matches").
4. Definition of done — the observable state, not "code written".
5. The verification command they must run and paste the real exit status for.
6. What to do if blocked: stop and report, do not work around a lane boundary.
7. What to return: files changed, evidence, risks, follow-ups.

**Verification gate.** No lane report is accepted without its own check re-run by me or VERIFY:
typecheck for logic, the relevant `npm run crawl -- <stage>` for pipeline work, a fetch of the
affected route for surface work. A green check on a *previous* commit proves nothing.

**Delegation shapes I use:**

| Situation | Shape |
|---|---|
| Wide, mechanical change in one lane | one `editor-multi-prompt` agent, all prompts in one call |
| Deep single-lane problem (a normaliser bug, an aggregate query) | one `gpt-5-agent`/`opus-agent` with `filePaths` |
| "Where is X / what reads Y" | `code-searcher` in parallel, three patterns per call |
| Runnable proof (crawl a stage, build, query the DB) | `basher`, exit status included |
| External facts (Riot policy, CDragon payload, Set 19 news) | `researcher-web` |
| Pre-merge read of a diff | `code-reviewer-multi-prompt` with targeted prompts |

---

## 7. Next steps, in order

| # | Task | Lane | Done when | Blocked by |
|---|---|---|---|---|
| **N1** | D1a: catalogue snapshot so deployed comp pages show names, costs and icons | SURFACE + PLATFORM | `/comps/example-fast-8` on the preview shows Sivir, not `DA_18_Sivir`; no DB required | — |
| **N2** | Remove invented numbers from the public surface: Example comps either lose `stats` or are replaced by real guides | CONTENT | No comp on the site displays a game count nobody measured | O3 |
| **N3** | Real identity, prices, booking link; then `PLACEHOLDER_CONTENT = false` | CONTENT | Banner gone on every page; footer/legal still correct | O3, O4, O5 |
| **N4** | Set-19 rehearsal per D2 + the "no comps for this set" warning path | DATA | A rehearsed set import, timed, with the empty-set warning observed | — |
| **N5** | Production key application, then a 24–48 h pilot crawl (≥20k matches), unclassified rate measured, threshold tuned per D3 | OWNER → DATA | `comp_stats` for 5+ comps with a stated unclassified rate | O1, O2 |
| **N6** | Commit the current checkpoint (Sites configs, lockfile, stub boards) so all three chats share a baseline | MANAGER | `git status` clean except lane work in progress | approval |
| **N7** | Deploy production environment once N2+N3 land; re-verify every route on the real origin | PLATFORM | Production published and walked route by route | O6, N2, N3 |
| **N8** | `candidates` evidence pass on a real corpus; promote anything it finds into a comp | DATA → CONTENT | One comp in `src/content/comps.ts` whose units came from data | N5 |
| **N9** | Analytics + Sentry, OG images, mobile/perf pass | SURFACE + PLATFORM | P3 exit criteria in the roadmap | N3 |

N1 first because it is the only item that is both visible on the live URL and unblocked. N5 is
first in *importance*; it is last in this table only because I cannot start it.

---

## 8. Claims — the other two chats

Update this table when you start and when you stop. Keep it to one line each: what you hold, and
until when. If a row is stale, the manager clears it.

| Holder | Lane / files | Doing | Status |
|---|---|---|---|
| manager (this chat) | `docs/**`, `scripts/export-catalogue.ts` | decision record, exporter, verification, commits | active |
| _other chat (N1)_ | `src/lib/units.ts`, `src/lib/catalogue/**` | catalogue snapshot so the Sites URL resolves unit names | **done** — manager reconciled onto it, typecheck green |
| _other chat 1_ | `src/content/comps.ts` (D5), `src/lib/**`, `scripts/**`, `package.json`, `freebuff.*` | N1 catalogue snapshot + N2 invented numbers removed (D5) | **done 2026-11-10** — both deployed and verified live; uncommitted (N6) |
| _other chat 2_ | `worker/dev/stub-riot.ts` (`STUB_COMP_BOARDS`) | stub now emits curated boards | **done, verified** — uncommitted, for N6 |
| _other chat 2_ | **N4**: `worker/**` (rehearsal first, code only if it fails) | D2 set-19 rehearsal + empty-set warning | **done, verified** — no code change needed; evidence below |

N4 evidence, rehearsed against a throwaway `tft_rehearsal` database (migrations applied,
dropped afterwards) so the shared dev DB was never perturbed:

- `load-assets --set 18` run 1 **1 s**, run 2 **1 s**; both report the identical
  `91 units / 36 traits / 772 items / 594 augments`, `pruned nothing stale` — the import is
  idempotent and cheap, so a set-day rollover is a one-command job.
- A stray set-18 unit row before a third run gives `pruned units 1` and the row is gone — prune
  reporting is real, not just a line of text.
- A synthetic `set_number = 19` match plus `aggregate --set 19` emits
  `WARN [aggregate] set has crawled boards but no published comps` with `setNumber: 19`,
  `matches: 1` and the actionable "add set 19 comps to `src/content/comps.ts`" message, then exits
  0 — the set-19 cutover fails loudly instead of silently publishing empty tables.
- After cleanup the shared DB still reads 24 matches, 16 `comp_stats` rows, 91 set-18 units,
  0 probe rows. `npm run typecheck` exits 0 (this also clears the duplicate-snapshot import I
  removed from `src/lib/units.ts` while N1 was landing).
- Prune is **set-scoped**, not table-wide: `worker/assets.ts` runs
  `DELETE FROM <table> WHERE set_number = $1 AND NOT (id = ANY($2))`. Loading set 19 therefore
  leaves every set-18 row in place — the cutover is additive, and running the import before
  set-19 day cannot damage the set-18 catalogue. (I raised the opposite worry in my report
  before checking; the code says otherwise.)
- **decisions.md S6 is satisfied by this rehearsal:** the same session loaded the set, synced the
  comps and observed the empty-set warning on a set-19 patch, in that order, against a real
  database. The manager can tick S6 without re-running it.

### N5 pre-flight — what the pilot needs, measured 2026-11-10 (DATA lane)

N5 is blocked on O1/O2, but the throughput answer is not: it comes from `worker/config.ts`,
`worker/limiter.ts`, and a direct measurement of the limiter. Four things the operator should know
before pointing a real key at this crawler.

1. **`RIOT_KEY_TYPE` must be set to `production`.** `compose.crawl.yml` defaults it to
   `development`, and that default is not cosmetic — it selects the limiter's ceilings. Measured:
   the production ceilings at the 65% budget sustain **34.95 req/s** (700 `acquire()` calls in
   20.03 s, capacities 325/10 s and 19,500/600 s); the development ceilings sustain
   **0.54 req/s** (65/120 s). With a production key but the default flag, the pilot crawls ~65×
   slower and 20k matches would take 10.3 h of pure API time instead of ~10 min.
2. **The loop, not the quota, sets the pace.** One `run` cycle is at most 150 discovery calls plus
   `--limit` 1,000 fetches = 1,150 calls ≈ 33 s of API time, then `CRAWL_LOOP_INTERVAL_SECONDS`
   (300 s) of sleep. So a cycle is ~5.5 min and yields ≤1,000 new matches: 20k is ~20 cycles,
   roughly **2 h of wall clock** at production limits. The 24–48 h in N5 is ample.
3. **Supply comes from discovery breadth**, so `CRAWL_SEED_MAX_PLAYERS` (2,000) and
   `CRAWL_PLAYERS_PER_RUN` (150) are the real knobs. The pool is fully covered in ~13 cycles
   (~70 min) and re-seeded every 12 cycles; each call returns up to 100 ids, deduped against
   known matches, so the ladder keeps feeding the queue for the length of the pilot.
4. **A patch mismatch makes the pilot invisible.** `comp_stats` is keyed by patch and the tier
   list reads `site.currentPatch` — the reason the Examples show 0 games in §1. Matches crawled
   under 18.5 will not appear while the site is on 18.6, so confirm the crawled patch before
   declaring the pilot a failure, and use `CRAWL_PATCH_OVERRIDE` only as an escape hatch.

Still open on N5 and not answerable without data: the unclassified rate. The threshold itself is
settled — [decisions.md](decisions.md) D8 fixes it at 60%, `worker/config.ts` already defaults
`assignThreshold` to 0.6 with a comment requiring the two to match, and
`METHODOLOGY.assignment` publishes "at least 60%". Code and published methodology agree, so
`worker/assign.ts` needs no change; the only outstanding piece is the queued doc fix in
D8 (`docs/blueprint.md` §8, 0.75 → 0.60).

### P0 — catalogue snapshot went missing mid-reconcile; resolved 16:17 (DATA lane)

For roughly three minutes the local site was fully down: `npm run typecheck` **exited 1** and
`/`, `/comps`, `/comps/draven-fast-9`, `/patch/18.6` returned **500**, because `src/lib/catalogue/`
had been deleted while `units.ts` briefly imported a `src/content/catalogue.json` that did not
exist. It healed at **16:17** — the directory is back, `typecheck` exits 0, the four routes return
200 — so nothing needs repairing now. The timeline stays here because the same two-way move will
recur while two lanes own this feature.

Timeline from file mtimes on this machine — two lanes moving the same snapshot in opposite
directions:

- **15:56** `src/lib/catalogue/{index.ts,set-18.json}` present; `units.ts` imported `./catalogue`.
- **16:02** `src/content/catalogue.json` present; the generator wrote to `src/content/`.
- **16:05:59** `scripts/export-catalogue.ts` retargeted to `OUT_DIR = src/lib/catalogue`.
- **16:14:40** `units.ts` rewritten to `import catalogue from "@/content/catalogue.json"` → TS2307.
- **16:16:42** `units.ts` rewritten back to `./catalogue` → still TS2307, the directory is gone.

I did **not** patch `src/lib/units.ts`, `src/content/catalogue.json` or the generator: they were
being rewritten between two of my checks, and patching mid-write is how the earlier duplicate
snapshot block got into the tree. What it needed, kept as the repair recipe if it recurs:

1. Pick **one** path. decisions.md D1/D2 and the current `units.ts` prose name
   `src/content/catalogue.json`; the generator today writes `src/lib/catalogue/set-<n>.json` plus
   a registry. Either is fine, but both halves must agree.
2. Point `scripts/export-catalogue.ts` and `src/lib/units.ts` (or its registry) at that path and
   restore the registry if the lib path wins.
3. Prove it: `npm run catalogue:export -- 18` → `npm run typecheck` exit 0 → the four routes 200.

In that state **S3 must not redeploy and S4 must not submit**: `/comps/draven-fast-9` returning 500
is the page the Riot reviewer opens first.

**DB follow-through after D5 (DATA lane, read-only check).** `src/content/comps.ts` now holds only
`draven-fast-9`, but Postgres still has the three `example-*` comps `published = true` with four
`comp_stats` rows each (16 total). `syncComps` reports such rows as orphans and deliberately does
not delete them, so the local DB and any Postgres-backed host (S5) will keep serving three fake
comps with real-looking stats until someone prunes those rows. Needs a decision, not a silent
delete: the manager's, since it changes published data.

**How it resolved, and the gate it suggests.** Between 16:16:42 and 16:17:39 the holder finished
the reconcile: `src/lib/catalogue/{index.ts,set-18.json}` reappeared, `typecheck` went to exit 0
and all four routes to 200, with nothing patched from my side. The lesson is not "wait" — it is
that a snapshot *generated from Postgres* was deleted and re-pointed by hand twice in ten minutes.
So treat this as the pre-deploy gate for S3: from a clean tree, `npm run typecheck` exit 0 **and**
`/`, `/comps`, `/comps/draven-fast-9`, `/patch/18.6` all 200 before any `sites_deploy`.

**BUILD LOCK:** free (released by other chat 1 after the N1 deploy).

**N1 handover (other chat 1, 2026-11-10).** Implemented as D1a: `scripts/export-catalogue.ts`
(`npm run catalogue:export -- 18`) dumps the `units` rows to `src/lib/catalogue/set-18.json`
(91 units, 87 with icons), and `src/lib/units.ts` uses that snapshot when there is no
`DATABASE_URL`, falling back to it if Postgres throws. Verified: `npm run typecheck` exit 0;
`DATABASE_URL= npm run build` exit 0 with 0 unresolved slots; live `/comps/example-fast-8`
and `/comps/draven-fast-9` show names, cost chips and 16 icon URLs, 0 "Not in the set catalogue".

⚠️ **Collision worth knowing about:** another lane wrote a second snapshot implementation into
`src/lib/units.ts` ~2 seconds after mine (a `{ sets: { "18": [...] } }` JSON shape plus a
dead `snapshotCatalogue` block that cast the generated file to a type it does not satisfy). The
merged file failed typecheck with TS2352. It is resolved to the generator's shape (JSON keyed by
unit id + registry in `src/lib/catalogue/index.ts`). If the `sets` shape is preferred instead,
change the generator and regenerate — do not revive the dead block, it reads a key the JSON
does not have.

**N2 / D5 (other chat 1, 2026-11-10).** Deleted `example-fast-8`, `example-reroll` and
`example-flex` from `src/content/comps.ts`; `draven-fast-9` remains with `stats: null`, and the
header now records why the surface is one comp. Nothing else referenced those slugs (risers and
fallers are empty, so no broken patch links). Verified: 0 `games:` keys left, `npm run typecheck`
exit 0, `DATABASE_URL= npm run build` exit 0, sitemap 9 URLs with one comp URL, live
`/comps/example-fast-8` → 404, live tier list shows no "Example" and no 4,820/3,915 figures.

**Still open for S1:** `PLACEHOLDER_CONTENT` stays `true`. D3/D4/D6 need the owner's contact
email, the author confirmation/proof line, and the Calendly replacement — I did not invent any of
them, and `site.name` is still `metaread`, not TeeFFTee.

**S2 wiring note** *(superseded 16:23 — the file *is* wired now; see the convergence entry at the
end of §8)*: `src/content/catalogue.json` existed but nothing read it, because `src/lib/units.ts`
imported `./catalogue`.

**Snapshot paths, reconciled 2026-11-10 (DATA lane, read-only)** *(superseded 16:23 — this was
re-resolved the other way, onto the path decisions.md S2 names; see the convergence entry at the
end of §8)*. For a few minutes the tree had two snapshots — `scripts/export-catalogue.ts` writing
`src/content/catalogue.json` while `src/lib/units.ts` read `src/lib/catalogue/set-18.json`. The
manager resolved it toward `OUT_DIR = src/lib/catalogue` at the time.

If you are one of those chats: read §5 before touching anything, and prefer appending a row here
over asking in your own thread — the manager reads this file, not your transcript.

### Catalogue snapshot converged on decisions.md S2 — 16:23 (other chat 1, DATA lane)

Two lanes and the manager moved this feature in opposite directions for half an hour. This entry is
the state that is deployed now, so nobody has to reconstruct it from file mtimes again.

**One path, one generator.** `scripts/export-catalogue.ts` writes `src/content/catalogue.json` as
`{ generatedAt, source, sets: { "18": [{ id, name, cost, imageUrl }] } }` — the shape decisions.md
S2 names, and the only snapshot in the tree. `src/lib/units.ts` imports that file: the `units`
table first when `DATABASE_URL` is set, the snapshot otherwise, and the snapshot again as the catch
path if Postgres throws. `src/lib/catalogue/**` is **deleted** — no registry, no `set-18.json`.

**Why it went missing at 16:14–16:21.** The generator had been retargeted to
`src/lib/catalogue`, that output was then deleted, and `units.ts` pointed at a
`src/content/catalogue.json` that did not exist: TS2307, `build` exit 1, 500s on four routes. The
fix is `npm run catalogue:export` — it is generated data, so there was nothing to restore.

**Generator behaviour:** no args exports every set in `units`; `-- 18` exports that set and keeps
the others, so a set-19 rollover cannot silently drop set 18 from the site. An empty set is omitted
with a WARN instead of written as `[]`, because "loaded and empty" and "never loaded" are
different facts. It closes its pool in `finally()`; the version that did not hung the shell after a
successful write.

**Verified, then deployed** (`sites_deploy` receipt `96fc22ff…`, preview, 15:22Z):

- `npm run catalogue:export` → set 18, 91 units, 87 with icons, 16 KB.
- `npm run typecheck` exit 0; `DATABASE_URL= npm run build` exit 0 (the Worker path, no Postgres).
- Prerendered `/comps/draven-fast-9`: 0 "Not in the set catalogue", `Draven` resolved, cost chips
  `2c ×1 / 4c ×2 / 5c ×6`, 18 icon URLs.
- Live: `/`, `/comps`, `/comps/draven-fast-9`, `/patch/18.6`, `/sitemap.xml`, `/robots.txt` all
  200; the comp page has 0 unresolved slots and 18 icons, no `example-`, no 4,820/3,915, and the
  sitemap has 0 `localhost`.

**BUILD LOCK: free.** Uncommitted for the manager (N6): `scripts/export-catalogue.ts`,
`src/lib/units.ts`, new `src/content/catalogue.json`, deleted `src/lib/catalogue/**`.

**S1 content flag, checked on the live origin (same deploy):** `PLACEHOLDER_CONTENT` is `false`
and the content behind it is real — `TeeFFTee`, author `Hitmoney`, prices €45/€90/€240, and every
CTA a `mailto:` to the owner's own address. Live `/`, `/coaching`, `/about` return 200 with 0
occurrences of `metaread`, `Your Name`, `you@example.com`, `your-invite`, `your-handle` or a
`calendly.com/your-*` link, and no placeholder banner. That is a truthful state, not just a
flipped constant.
