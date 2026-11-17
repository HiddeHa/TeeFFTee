import { expect, test } from "@playwright/test";

/**
 * The pages that do not need a database.
 *
 * Editorial content (comps, patches, site copy) lives in `src/content`, and the
 * catalogue snapshot covers units, items and traits, so every page below renders
 * the same thing on a laptop, in CI and on the deployed Worker. Numbers are
 * deliberately not asserted: they move whenever the crawler runs.
 */

test("the home page leads into the meta", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("High-elo TFT stats");
  await expect(page.getByRole("link", { name: "See the meta" })).toHaveAttribute(
    "href",
    "/meta",
  );
});

test("the Set 19 launch band is on the home and meta pages until it launches", async ({ page }) => {
  // The band is server-rendered from the same date as the stale-set guard, so it
  // must be present before 2 December and gone from local midnight that day. Both
  // branches are asserted rather than skipped, so this test cannot rot after launch.
  const launched = Date.now() >= new Date(2026, 11, 2).getTime();

  for (const path of ["/", "/meta", "/meta/stats"]) {
    await page.goto(path);
    const band = page.getByRole("complementary", { name: "Set 19 launch" });

    if (launched) {
      await expect(band).toHaveCount(0);
    } else {
      await expect(band.getByText(/launches 2 December 2026/)).toBeVisible();
      await expect(band.getByRole("link", { name: "What's confirmed →" })).toHaveAttribute(
        "href",
        "/set-19",
      );
    }
  }
});

test("the header moves between the main pages", async ({ page }) => {
  await page.goto("/");

  await page
    .getByRole("navigation")
    .first()
    .getByRole("link", { name: "Teambuilder" })
    .click();

  await expect(page).toHaveURL(/\/teambuilder$/);
  await expect(page.getByRole("heading", { level: 1, name: "Teambuilder" })).toBeVisible();
});

test("the meta page stays open with an honest empty Set 19 state", async ({ page }) => {
  await page.goto("/meta");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Meta");
  await expect(page.getByText(/No Set 19 comps are published yet/).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "reference pages" })).toHaveAttribute(
    "href",
    "/set-19",
  );
  // Set 18 comps are archived in content, not rendered under a Set 19 header.
  expect(await page.locator('a[href="/meta/riftbeast-brambleback"]').count()).toBe(0);

  // No database means no measured sample, so there is no date to claim: the
  // "data as of" chip is a fact about data, not a label on the page shell.
  await expect(page.locator(".chip").filter({ hasText: "Data as of" })).toHaveCount(0);
});

test("a Set 18 comp URL is not served as a Set 19 comp", async ({ page }) => {
  const response = await page.goto("/meta/riftbeast-brambleback");
  expect(response?.status()).toBe(404);
});

test("the stats page surfaces data health, or says the crawler is not attached", async ({ page }) => {
  await page.goto("/meta/stats");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stats");
  await expect(page.getByRole("heading", { name: "Data health" })).toBeVisible();
  // This suite runs without DATABASE_URL on purpose: the block must admit that
  // instead of printing a zero match count as if it were measured.
  await expect(page.getByText(/No crawler database is attached here/)).toBeVisible();
  await expect(page.getByText(/No Set 19 comps are published yet, so this table is empty/)).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(0);
});

test("the lab page states that it needs the crawl corpus", async ({ page }) => {
  await page.goto("/lab");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lab");
  // This suite runs without DATABASE_URL on purpose, so the honest page is the
  // unavailable state, not an empty candidate list with a plausible header.
  await expect(page.getByText(/No crawl data is attached here/)).toBeVisible();
  await expect(page.getByText(/Nothing is estimated in the meantime/)).toBeVisible();
});

test("the patch read and the tier list maker load", async ({ page }) => {
  await page.goto("/patch/19.1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto("/tier-lists");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tier list maker");
});

test("health answers with its documented shape", async ({ request }) => {
  const response = await request.get("/api/health");
  expect([200, 503]).toContain(response.status());

  const body = await response.json();
  expect(["ok", "empty", "down"]).toContain(body.status);
  expect(typeof body.checkedAt).toBe("string");
  expect(body.database).toMatchObject({
    configured: expect.any(Boolean),
    reachable: expect.any(Boolean),
    driver: expect.stringMatching(/^(http|tcp)$/),
  });

  // This suite runs the server without a database on purpose, so the honest
  // answer is 503 "down" with no corpus — not a 200 claiming data.
  if (!body.database.configured) {
    expect(body.status).toBe("down");
    expect(response.status()).toBe(503);
    expect(body.corpus).toBeNull();
  }

  expect(response.headers()["cache-control"]).toBe("no-store");
});

test("an unknown comp is a 404", async ({ page }) => {
  const response = await page.goto("/meta/this-comp-does-not-exist");
  expect(response?.status()).toBe(404);
});

/**
 * The three tests below guard behaviour that has no data dependency, so they run
 * in the same no-database server as everything else. Each covers a regression the
 * suite used to miss: the leaderboard search dropping a `#`, the Set 19 page
 * asserting a status instead of deriving one, and a table of internal links that
 * reloaded the document.
 */

test("the leaderboard search carries a full Riot ID through the URL", async ({ page }) => {
  await page.goto("/leaderboards");

  const search = page.getByRole("search");
  await search.getByRole("searchbox", { name: "Search players" }).fill("MKOI Safo20#BAD");
  await search.getByRole("button", { name: "Search" }).click();

  // A raw `#` would truncate the query as a fragment, so the form has to encode
  // it and the server has to read the same value back. Parse rather than match
  // the encoding: a form GET writes a space as `+`, while a link writes `%20`.
  await expect
    .poll(async () => new URL(page.url()).searchParams.get("q"))
    .toBe("MKOI Safo20#BAD");
  await expect(page.getByRole("searchbox", { name: "Search players" })).toHaveValue(
    "MKOI Safo20#BAD",
  );

  // The region links keep a live search rather than dropping it on a switch.
  const korea = await page.getByRole("link", { name: "Korea" }).getAttribute("href");
  expect(new URL(korea ?? "/", page.url()).searchParams.get("q")).toBe("MKOI Safo20#BAD");
});

test("the Set 19 page derives its status instead of asserting one", async ({ page }) => {
  await page.goto("/set-19");

  // One chip either counts down or records the launch, and the label's tense and
  // the accent styling have to agree — a bright "Live" chip on a future date is
  // the exact bug this replaces.
  const launch = page.locator(".chip").filter({ hasText: /^(Launches|Live since) / });
  await expect(launch).toHaveCount(1);
  await expect(launch).toHaveText(/^(Launches|Live since) \d{1,2} [A-Z][a-z]+ \d{4}$/);

  const label = (await launch.textContent())?.trim() ?? "";
  if (label.startsWith("Live since")) {
    await expect(launch).toHaveAttribute("data-active", "true");
  } else {
    await expect(launch).not.toHaveAttribute("data-active", "true");
  }

  // The old wording is gone: no chip claims a bare "Live <date>".
  await expect(page.locator(".chip").filter({ hasText: /^Live \d/ })).toHaveCount(0);
});

test("the Set 19 sub tabs switch between units, traits and unlockables", async ({ page }) => {
  await page.goto("/set-19");

  const tabs = page.getByRole("navigation", { name: "Set 19 sections" });

  await tabs.getByRole("link", { name: "Units" }).click();
  await expect(page).toHaveURL(/\/set-19\/units$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("The roster, by cost");
  await expect(
    page.getByText("Baron Nashor, Rakan, Smeech and Sona. All four are unlocks."),
  ).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Units" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await tabs.getByRole("link", { name: "Traits" }).click();
  await expect(page).toHaveURL(/\/set-19\/traits$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The 47 traits, with breakpoints",
  );
  await expect(page.getByRole("heading", { level: 2, name: "The 20 unique traits" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "Arcanist", exact: true })).toBeVisible();

  await tabs.getByRole("link", { name: "Unlockables" }).click();
  await expect(page).toHaveURL(/\/set-19\/unlockables$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Unlocks: 36 champions, three categories",
  );
  await expect(page.getByRole("cell", { name: "Mordekaiser" })).toBeVisible();
  await expect(page.getByText("Capstone", { exact: true })).toBeVisible();
});

test("a Set 19 champion link opens its page, and an unknown champion is a hard 404", async ({ page }) => {
  await page.goto("/set-19/units");

  // Navigate by clicking the roster, not by typing the URL: the link is part of
  // what this covers. Ahri is a 4-cost with Choreographer and K|DA.
  await page.getByRole("link", { name: "Ahri", exact: true }).click();
  await expect(page).toHaveURL(/\/set-19\/units\/ahri$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ahri");

  // Cost sits in the page header; the trait chips are links into the trait list,
  // so assert both the name and that the link really points at a trait anchor.
  await expect(page.locator("header").getByText("4-cost", { exact: true })).toBeVisible();
  for (const trait of ["K|DA", "Choreographer"]) {
    await expect(page.getByRole("link", { name: trait, exact: true })).toHaveAttribute(
      "href",
      /^\/set-19\/traits#trait-[a-z0-9-]+$/,
    );
  }

  // The route is generated per champion. A status-only check would pass a soft
  // 404 (200 with a not-found shell) or a redirect, so assert both: the response
  // is 404 and the unknown slug is still the URL.
  const missing = await page.goto("/set-19/units/this-champion-does-not-exist");
  expect(missing?.status()).toBe(404);
  expect(new URL(page.url()).pathname).toBe("/set-19/units/this-champion-does-not-exist");
});

test("a card-only Set 19 champion shows the card and says the condition is unpublished", async ({ page }) => {
  await page.goto("/set-19/units/teemo");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Teemo");
  const unlock = page.getByRole("heading", { name: "Unlock" }).locator("..");
  await expect(unlock.getByText("Riot's 13 November unlocks video showed this card.")).toBeVisible();
  await expect(unlock.getByText("Collect Hyperpop Hype")).toBeVisible();
  await expect(unlock.getByText("card shown; condition not published")).toBeVisible();

  // Exactly one branch renders: Teemo has a card but no published quest, so the
  // quest wording must not appear as well.
  await expect(page.getByText(/published condition/)).toHaveCount(0);
  await expect(page.getByText(/has not published an unlock condition/)).toHaveCount(0);
});

test("a Set 19 champion with a published unlock shows the quest and its source", async ({ page }) => {
  await page.goto("/set-19/units/baron-nashor");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Baron Nashor");
  const unlock = page.getByRole("heading", { name: "Unlock" }).locator("..");
  await expect(unlock.getByText(/Collect all members of Baron's ensemble/)).toBeVisible();
  await expect(unlock.getByText("published condition · bought at its normal cost once unlocked")).toBeVisible();
  await expect(unlock.getByText("Dev Drop", { exact: true })).toBeVisible();

  // The quest branch wins over Baron's card, and the no-condition copy is gone.
  await expect(page.getByText(/unlocks video showed this card/)).toHaveCount(0);
  await expect(page.getByText(/has not published an unlock condition/)).toHaveCount(0);
});

test("Set 19 pages follow the launch clock instead of claiming the set is unreleased", async ({ page }) => {
  // Same local-midnight boundary as isSet19Live. Both branches are asserted so the
  // test stays valid after 2 December rather than needing a rewrite.
  const launched = Date.now() >= new Date(2026, 11, 2).getTime();

  await page.goto("/set-19");
  if (launched) {
    await expect(page.getByText("Live since 2 December 2026")).toBeVisible();
    await expect(page.getByText(/Collecting Set 19 data|no crawler database is attached here/)).toBeVisible();
  } else {
    await expect(page.getByText("Launches 2 December 2026")).toBeVisible();
    await expect(page.getByText(/comps and stats stay empty until the set is live/)).toBeVisible();
  }

  await page.goto("/set-19/units/ahri");
  if (launched) {
    await expect(page.getByText(/Set 19 is live|Collecting Set 19 data/)).toBeVisible();
  } else {
    await expect(page.getByText(/opens the set on 2 December 2026/)).toBeVisible();
  }
});

test("every Set 19 cross-link fragment resolves on its target page", async ({ page }) => {
  // Anchors are what people paste into Discord: a trait rename that leaves a
  // link pointing at #trait-old-name still renders, and the reader lands at the
  // top of the page with no indication anything is wrong. Collect the links from
  // the pages that carry them, then verify each fragment against its target.
  const sources = [
    "/set-19",
    "/set-19/units",
    "/set-19/traits",
    "/set-19/unlockables",
    "/set-19/units/ahri",
  ];

  const targets = new Map<string, Set<string>>();
  let total = 0;

  for (const path of sources) {
    await page.goto(path);
    const links = await page.evaluate(() =>
      [...document.querySelectorAll("a[href*='#']")]
        .map((anchor) => anchor.getAttribute("href"))
        .filter(
          (href): href is string =>
            typeof href === "string" && href.startsWith("/set-19/") && href.includes("#"),
        ),
    );

    for (const href of links) {
      const [target, fragment] = href.split("#");
      if (!target || !fragment) continue;
      total += 1;
      if (!targets.has(target)) targets.set(target, new Set());
      targets.get(target)?.add(fragment);
    }
  }

  // A selector change that collects nothing must not pass this test.
  expect(total).toBeGreaterThan(300);
  expect(targets.size).toBeGreaterThanOrEqual(2);

  for (const [target, fragments] of targets) {
    await page.goto(target);
    const missing = await page.evaluate(
      (wanted) => wanted.filter((fragment) => document.getElementById(fragment) === null),
      [...fragments],
    );
    expect(missing, `${target} has no element for: ${missing.join(", ")}`).toEqual([]);
  }
});

test("the comp stats table waits for Set 19 comps instead of showing Set 18 rows", async ({ page }) => {
  await page.goto("/meta/stats");

  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByText(/No Set 19 comps are published yet/).first()).toBeVisible();
  // The view switch still works; only the rows are absent.
  await page.getByRole("navigation", { name: "View" }).getByRole("link", { name: "Board" }).click();
  await expect(page).toHaveURL(/\/meta$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Meta");
});
