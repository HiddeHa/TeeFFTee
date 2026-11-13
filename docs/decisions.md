# Decisions — locked 2026-11-10

The manager's record of calls made by the owner, what each one changes, and the work order
that follows. [plan.md](plan.md) stays the schedule; this file is the authority on *what* we
are building. Where they disagree, this file wins.

---

## 1. The calls

| # | Decision | Consequence |
|---|---|---|
| **D1** | **Both hosts.** Freebuff Sites carries the Riot production-key application; **Vercel** is the launch host. | The Sites URL needs unit names without a database → catalogue snapshot (`src/content/catalogue.json`). Vercel needs a Postgres it can reach → hosted Postgres is a new dependency. |
| **D2** | **If the production key is late, launch on dev-key pilot numbers, clearly labelled.** | The sample is small and must be presented as small: dated, region-scoped, with the game count next to every figure. Never "the meta", always "this sample". |
| **D3** | **Name: TeeFfTee.** | `site.name` plus metadata, banner, footer, legal and OG copy. **Domain still unknown** — `site.url` and the canonical/sitemap base cannot be finished without it. |
| **D4** | **Author: Hitmoney, current Master EUW, peak Challenger.** | `site.author` block, `/about`, coaching CTA proof line, FAQ server answer. |
| **D5** | **Delete the three `Example …` comps.** Ship the real guides that exist. | No invented game counts anywhere public. The tier list will be short and honest — acceptable, and better than seven comps where four are fake. |
| **D6** | **Keep the prices (€45 / €90 / €240), no booking tool.** | CTAs fall back to the contact email. `bookingUrl` must stop pointing at a fake Calendly. Conversion tracking gets weaker; note it as a known cost, do not invent a workaround. |
| **D7** | **Design stays.** Dark surfaces, amber accent, mono tabular numerals. | No redesign. Effort goes to boards, empty states, mobile and the catalogue fix. |
| **D8** | **Assignment threshold: 60% core-unit overlap.** | `worker/assign.ts` unchanged. `docs/blueprint.md` §8 is the thing that is wrong; the published methodology on `/about` already says 60%. |

Two risks I am recording rather than silently accepting:

- **"TeeFfTee" is phonetically TFT.** The blueprint's own rule is to keep Riot marks out of the
  name and domain, and Riot's review looks at exactly this. It is not a takedown risk, it is an
  approval risk. If there is a second-choice name, keep it warm.
- **Pilot numbers from a dev key are a small, expiring sample.** D2 is a credibility decision,
  not a technical one: 24 h of keys on KR+EUW yields hundreds to low thousands of matches, not
  the 20k the tier list was designed around. Label every figure with its n, and date it.

---

- **D9 (hosting + driver, 2026-11-11).** The site deploys to Freebuff Sites. There is no Vercel
  CLI installed or authenticated on this machine, so the earlier "Vercel is the launch host"
  line is aspiration until someone installs it — Sites is the target that can actually be
  deployed and verified today. Consequence: a Worker cannot hold a Postgres TCP socket, so
  `src/db/client.ts` now picks Neon's HTTP driver on Workers and keeps `postgres.js` on Node
  (crawler, drizzle-kit, local dev), with `DATABASE_DRIVER=http|tcp` to force one. The crawler
  still speaks TCP and writes to the same hosted database directly — that is what fills it.
  Postgres choice: Neon (only serverless-Postgres option in the service index worth wiring,
  free tier, `DATABASE_URL`).

## 2. Production sequence

Ordered by what unblocks the next thing, not by effort.

| Step | What | Lane | Done when |
|---|---|---|---|
| **S1** | Content truth: TeeFfTee, Hitmoney, delete examples, real contact email, no fake Calendly → `PLACEHOLDER_CONTENT = false` | CONTENT | No page shows the banner; no page shows an invented number |
| **S2** | Catalogue snapshot, so the Sites URL renders names and icons without Postgres | MANAGER (claimed) | `/comps/draven-fast-9` on the Sites preview shows Draven, not `DA_Draven18` |
| **S3** | Redeploy the Sites preview; walk every route | PLATFORM | `/`, `/comps`, one comp, `/patch/18.6`, `/coaching`, `/about`, `/terms`, `/privacy` all render |
| **S4** | **Submit the Riot production-key application** against that URL | OWNER | Application submitted, date recorded |
| **S5** | Hosted Postgres + Vercel project; crawler runs against it with dev keys; pilot crawl for 24–48 h | PLATFORM → DATA | Vercel URL serves numbers from `comp_stats`; sample labelled with n and date |
| **S6** | Set-19 rehearsal: assets load, comps sync, aggregate warns correctly on an empty set | DATA | Rehearsal timed end to end |
| **S7** | Dec 1: `load-assets --set 19`, publish Set 19 comps marked "collecting data", crawler live, announce | OWNER + DATA | Launch |

S1 and S2 are independent and can run in parallel — they touch different files. S4 cannot start
until S1 and S3 are done, and it is the longest-lead item in the project.

---

## 3. Work orders

Precise enough to execute without asking back. Lane boundaries from plan.md §5 still apply.

### CONTENT — S1
- `src/content/site.ts`: `name: "TeeFfTee"`; `tagline`, `description` unchanged in substance;
  `author` → Hitmoney, Master EUW, peak Challenger, real proof line; `contactEmail` → the real
  address (owner supplies); `bookingUrl` → remove the fake Calendly, route CTAs to the contact
  email; `socials` → drop any handle that does not exist rather than ship a dead link.
- `src/content/comps.ts`: delete `example-fast-8`, `example-reroll`, `example-flex`. Keep
  `draven-fast-9`; its `stats` stays `null`.
- `src/content/flags.ts`: `PLACEHOLDER_CONTENT = false` **only** once the above is true. Not before.
- Anything in `/coaching` or `/about` that quotes a placeholder price, rank or link.

### CONTENT — D8
- `docs/blueprint.md` §8: 0.75 → 0.60, so the blueprint stops contradicting the shipped code.

### MANAGER — S2 (in progress, claimed in plan.md §8)
- `scripts/export-catalogue.ts`: read `units` from Postgres, merge into `src/content/catalogue.json`
  keyed by set number, so a new set is a re-run and not a code change.
- `src/lib/units.ts`: when there is no `DATABASE_URL`, or Postgres does not answer, build the
  index from that snapshot instead of returning null. No invented data: a set missing from the
  snapshot still renders unresolved ids.

### PLATFORM — S3, S5
- Rebuild and redeploy the Sites preview after S1+S2; keep the build lock.
- Vercel project + a hosted Postgres the crawler can also write to. Service choice is the next
  decision to make together (region, free tier, driver compatibility), not something to pick
  silently.

### DATA — S6
- Rehearse the set import and the empty-set aggregate warning; record the duration.

---

## 4. Pilot crawl — state as of 2026-11-10 (resolved)

**Resolved on 2026-11-11 with a regenerated key; the real numbers are in §4b.** The notes
below describe the blocked state and the stub cleanup that was actually run — keep them for the
next set rollover, when the corpus again contains material that must not be aggregated.

- **Key:** present in `.env`, 42 chars, `RGAPI-` prefix, hex/dash, no whitespace — format is
  right. Riot answers **HTTP 401 "Unknown apikey"** on `euw1` and `kr` TFT ladders, on
  `lol/status/v4`, and on `summoner/v4`. Every endpoint rejecting it means the string itself is
  unknown to Riot, not a scope, queue or region problem. Regenerate at
  developer.riotgames.com and copy the key currently displayed there.
- **Nothing crawled.** `match_queue` pending 0, `matches` 24 rows, all `STUB_euw1_18_*`,
  `players` 80 (stub ladder), `comp_stats` 16 rows at `games: 24` each, derived from stub boards.
- **Do not run `aggregate` on this corpus.** It would materialise invented numbers for the real
  Draven comp — the one thing the content rules forbid.

Clean before the first real crawl:

```sql
delete from matches where match_id like 'STUB%';   -- raw layer goes first

delete from match_queue where match_id like 'STUB%';
delete from players where puuid like 'stub-%';
truncate comp_stats;
```

Then `npm run crawl -- sync-comps` (the `comps` table still holds 4 rows while src/content has
1) and only then `seed` → `discover` → `fetch --limit N` → `aggregate` → `stats`.

## 4b. Pilot results (2026-11-11)

- **Key valid.** HTTP 200 on `euw1` (300 challenger entries) and `kr` (400). Still a
  development key: it expires 24 hours after generation.
- **Two crawler bugs found by the pilot, both fixed:**
  - `matches.raw` was stored double-encoded (`jsonb_typeof = 'string'`) because
    `JSON.stringify(...)::jsonb` sends a text literal, not json. Now written with `tx.json()`,
    so `reprocess` can read it. `reprocess` also accepts the old string rows.
  - Patch could never parse: Riot reports `game_version` as `TFT Unreal Version ?.?.?.?`, which
    has no numbers in it. `patchForSet()` in `worker/normalize.ts` now falls back to the newest
    declared patch for the set in `src/content/patches.ts`, and still yields `unknown` for a set
    nobody has written a patch page for.
- **Corpus:** 553 matches / 4,361 boards, EUW only, all patch 18.6 / set 18. KR has 613 ids
  queued and none fetched. Queue: 918 pending, 4 claims left over from a killed run.
- **Aggregate:** 91.9% of boards unclassified (3,891 below the 60% threshold, 115 missing the
  defining trait). Draven Fast 9: 355 games, **8.14% pick, 4.13 avg place, 55.8% top-4,
  23.7% win**. With one comp, most of the lobby is unclassified by construction — that share is
  the honest limit of a single-comp catalogue, not a crawler fault.
- **Throughput:** ~65 matches/min on the development key's 100-requests/2-minutes ceiling, so
  20k matches is about 5 hours. A pilot of that size needs `npm run crawl -- run` left running,
  or a production key.
- **Not visible on the deployed site yet:** no Postgres in the deployment, so pages still read the
  curated snapshot and say "collecting data". These numbers are local until hosted Postgres
  exists.

## 4c. Hosted database + production (2026-11-11)

- **Neon** project `noisy-night-82146016`, org `org-broad-mode-63036334`, branch `production`,
  database `neondb`, region eu-central-1 (Frankfurt). The connection string lives only in
  `.neon-url.txt` (gitignored) and as the Sites secret `DATABASE_URL` on the production
  environment. It is never committed and never printed.
- **`neon init` replaced `.env`'s `DATABASE_URL`** (it pointed at the local pilot database) and
  moved the local corpus URL to `LOCAL_DATABASE_URL`, so nothing is lost. It also wrote the
  value **quoted**, which postgres.js rejects with `ERR_INVALID_URL` — the quotes were stripped
  from `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
- **Schema + data:** migrations 0000 and 0001 applied (16 tables), set-18 assets loaded, one comp
  synced. A fresh crawl ran straight into Neon: 2,000 players seeded, 577 ids discovered, 577
  fetched with 0 failures, then aggregated to 4,553 boards / 370 classified.
- **Read path:** `src/db/client.ts` uses Neon's HTTP driver when it detects the Workers runtime,
  `postgres.js` elsewhere. The deployed Worker therefore queries Neon over HTTPS; the crawler
  keeps TCP.
- **Production:** `https://site-1900fe11ad604367a670f605b0e64000.freebuff.page`, published.
  `/comps` renders 370 games / 4.12 avg place / 55.7% top-4 from Neon at request time.
- **Caveat to keep honest:** the corpus is EUW-only. `/comps` labels the unfiltered scope
  "EUW + KR" because it combines every crawled region; that is the scope's name, not a claim that
  two regions have data yet.
- **Credential rotation (2026-11-11):** the connection string appeared once in local tool output
  when `drizzle-kit` errored on the quoted URL. The `neondb_owner` password was rotated with
  `neon roles reset-password` (new value went straight into `.env`, `.neon-url.txt` and the Sites
  secret `DATABASE_URL`; the old URL now fails with `28P01`). Any future capture of that old string
  is inert. `.pilot/` is gitignored so crawl logs cannot carry secrets into git.
- **`/api/health`** is the deployment smoke signal. It returns **200** only when Postgres
  answers *and* `comp_stats` holds classified games; **503** when the database is unreachable
  (message + Postgres code, e.g. `ECONNREFUSED`, `28P01`) or the corpus is empty. The body reports
  the driver actually in use (`http` on Workers, `tcp` on Node), query latency, and
  match/board/classified-game counts, so a rotated secret or an unaggregated database is visible
  without opening a page. It is `no-store` and carries no connection details.


## 5. What I still need from you
1. **A domain.** `TeeFfTee` is a name, not a URL. Everything canonical — sitemap, metadata,
   OG, the application — is waiting on it. If you have not bought one, say so and I will pick a
   shortlist; the Riot application needs a live HTTPS URL.
2. **A real contact email** for the coaching CTA now that there is no booking tool.
3. **`RIOT_API_KEY` written into `.env`** — regenerate a dev key and paste it there, not into
   this chat. Nothing on the numbers path moves without it.
4. **Confirmation that Hitmoney is the public handle** and the proof line you want to stand
   behind. I have "current Master EUW, peak Challenger"; I will not invent the rest.

---

<!-- moved to §6 at the end of this file -->

## 6. Redesign decisions — approved 2026-11-13

Taken from [redesign-plan.md](redesign-plan.md) §9 and approved by the owner, who asked for
Phase R1 to start immediately.

| # | Decision | Consequence |
|---|---|---|
| **D10** | **D7 is superseded for information architecture and density; the palette and typography stay.** Dark surfaces, amber accent, mono tabular numerals are unchanged. | The comp page is rebuilt as a gameplan sheet and the tier list gains a dense view. This is not a visual rebrand: no new colours, fonts or shell. |
| **D11** | **`UnitSlot.items` stores Riot item ids, not display names.** | `comps.ts` items become `DA_*` ids. Verified against the corpus: Riot emits `DA_*` completed items and `DA_Component_*` components, and **0 item ids in `participant_units` lack a catalogue row**. Any future item must resolve or render unresolved — never a guessed name. |
| **D12** | **Unit, item and trait pages move into scope**, reversing blueprint §4's deferral. | Only if R3 lands before the Set 19 window; otherwise the reference layer ships and the stat pages follow post-launch. R1 does not depend on it. |
| **D13** | **Augments are reference-only this set.** | `participant_augments` is empty and **0 of 577 raw payloads carry an `augments` key**, so no augment stat can exist. Comp pages show ordered augment *categories* (`ECON → ITEMS → COMBAT`) instead of a per-augment score. |
| **D14** | **`playstyle` is a closed enum**: `Fast 8`, `Fast 9`, `Slow roll`, `Reroll`, `Standard`, `Emblem`, `Augment`, `Flex`. | The seven existing comps already used four of these; none needed rewriting. The tier list can now offer them as filters. |
| **D15** | **Positioning is authored per comp, never derived.** | `positioning` is a hand-placed 4×7 layout. `participant_units.slot` is array order, not a hex coordinate, so a data-derived heatmap is not possible from this payload. |

Two facts established while applying D11, worth keeping:

- **Riot's set-18 item ids are the `DA_*` ones**, not `TFT_Item_*`. Both exist in the `items`
  table (Community Dragon ships display duplicates for the same name), but only `DA_*` appears in
  crawled matches — so content uses `DA_*`, which is what will join to item stats in R3.
- **The catalogue snapshot now ships items, traits and augments** alongside units
  (`scripts/export-catalogue.ts`). Without them the deployed Worker renders item names as plain
  text and no icons, which was the largest visible gap against the reference sites.
