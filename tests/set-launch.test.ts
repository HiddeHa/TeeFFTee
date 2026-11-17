import assert from "node:assert/strict";
import test from "node:test";

import { isSet19Live, staleSetWarning } from "../src/lib/set-launch";

/**
 * The set switch is a content edit nobody is forced to make on launch day, so
 * this file is the reminder. The site now points at Set 19, so the first test
 * asserts that real state; the rest keep the old-site warning pinned with an
 * explicit `activeSet: 18`, so the guard cannot rot.
 */

test("the real clock has not left the site on Set 18 past the launch", () => {
  assert.equal(staleSetWarning(), null);
});

test("on launch day, a site still pointing at Set 18 is stale", () => {
  const warning = staleSetWarning({ now: new Date(2026, 11, 2, 12), activeSet: 18 });

  assert.match(
    warning ?? "",
    /Set 19 launched on 2 December 2026, but the site still points at Set 18/,
  );
});

test("the launch band's clock flips at local midnight on launch day", () => {
  assert.equal(isSet19Live(new Date(2026, 11, 1, 23, 59, 59)), false);
  assert.equal(isSet19Live(new Date(2026, 11, 2)), true);
});

test("the switch is expected from local midnight of launch day", () => {
  assert.equal(
    staleSetWarning({ now: new Date(2026, 11, 1, 23, 59, 59), activeSet: 18 }),
    null,
  );
  assert.ok(staleSetWarning({ now: new Date(2026, 11, 2), activeSet: 18 }));
});

test("a site that has moved to Set 19 is not stale", () => {
  const after = new Date(2026, 11, 3, 12);

  assert.equal(staleSetWarning({ now: after, activeSet: 19 }), null);
  assert.equal(staleSetWarning({ now: after, activeSet: 20 }), null);
});

test("before launch, pointing at the previous set is correct", () => {
  assert.equal(staleSetWarning({ now: new Date(2026, 10, 16, 12) }), null);
});
