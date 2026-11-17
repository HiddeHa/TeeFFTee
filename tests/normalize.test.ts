import assert from "node:assert/strict";
import test from "node:test";

import matchFixture from "./fixtures/tft-match-set18.json";
import type { TftMatchDto } from "../worker/riot-types";
import { normalizeMatch, patchForSet, patchFromGameVersion } from "../worker/normalize";

/**
 * Patch attribution: a match that lands in the wrong patch window splits the
 * stats into two samples that each look plausible, and nothing errors. Riot sends
 * `TFT Unreal Version ?.?.?.?` (no numbers at all), so the version parser fails on
 * real payloads by design and the set's declared patches are the fallback.
 *
 * The fixture is a payload in Riot's documented shape — the fields
 * `worker/riot-types.ts` reads, with the unparseable version Riot actually sends.
 * Swap it for a byte-for-byte capture when one is available.
 */

const payload = matchFixture as unknown as TftMatchDto;

test("a version with numbers yields its major.minor pair", () => {
  assert.equal(patchFromGameVersion("18.5.712.1234"), "18.5");
  assert.equal(patchFromGameVersion("Version 18.5.712.1234"), "18.5");
  assert.equal(patchFromGameVersion("19.10.1"), "19.10");
  // Two segments are enough.
  assert.equal(patchFromGameVersion("18.6"), "18.6");
});

test("an unreadable version is null, never a guess", () => {
  assert.equal(patchFromGameVersion("TFT Unreal Version ?.?.?.?"), null);
  assert.equal(patchFromGameVersion(""), null);
  assert.equal(patchFromGameVersion(null), null);
  assert.equal(patchFromGameVersion(undefined), null);
});

test("patchForSet falls back to the newest declared patch of that set", () => {
  // src/content/patches.ts declares 18.6 for set 18 and 19.1 for set 19.
  assert.equal(patchForSet(18), "18.6");
  assert.equal(patchForSet(19), "19.1");
  // A set with no written patch is null, so the match stays visibly unknown
  // rather than being attributed to the current patch.
  assert.equal(patchForSet(999), null);
});

test("a real-shaped payload gets its patch from the set, since the version has no numbers", () => {
  const match = normalizeMatch(payload, "ignored-id", "EUW");
  assert.ok(match);

  assert.equal(match.matchId, "EUW1_7123456789");
  assert.equal(match.gameVersion, "TFT Unreal Version ?.?.?.?");
  assert.equal(match.setNumber, 18);
  assert.equal(match.patch, "18.6");
  assert.equal(match.region, "EUW");
  assert.equal(match.queueId, 1100);
  assert.equal(match.gameDatetime?.toISOString(), new Date(1_763_300_000_000).toISOString());
});

test("a parseable version wins over the set's declared patch", () => {
  const match = normalizeMatch(
    { ...payload, info: { ...payload.info, game_version: "18.5.712.1234" } },
    "ignored-id",
    "KR",
  );

  assert.ok(match);
  assert.equal(match.patch, "18.5", "the version's own patch, not the set fallback");
  assert.equal(match.region, "KR");
});

test("a set with no declared patch stays 'unknown'", () => {
  const match = normalizeMatch(
    { ...payload, info: { ...payload.info, tft_set_number: 20 } },
    "ignored-id",
    "EUW",
  );

  assert.ok(match);
  assert.equal(match.patch, "unknown");
  assert.equal(match.setNumber, 20);
});

test("the payload's participants become rows with units, traits and augments", () => {
  const match = normalizeMatch(payload, "ignored-id", "EUW");
  assert.ok(match);
  assert.equal(match.participants.length, 8);

  const first = match.participants[0];
  assert.ok(first);
  assert.deepEqual(
    [first.puuid, first.placement, first.level, first.lastRound, first.goldLeft],
    ["puuid-1", 1, 9, 38, 12],
  );

  // character_id → unitId, tier → starLevel, itemNames → item0..2, array index → slot.
  assert.deepEqual(
    first.units.map((unit) => [unit.unitId, unit.starLevel, unit.slot]),
    [
      ["TFT18_Ahri", 2, 0],
      ["TFT18_Lux", 3, 1],
      ["TFT18_Malphite", 2, 2],
    ],
  );
  assert.deepEqual(
    [first.units[0]?.item0, first.units[0]?.item1, first.units[0]?.item2],
    ["TFT_Item_BlueBuff", "TFT_Item_JeweledGauntlet", "TFT_Item_RabadonsDeathcap"],
  );
  // A unit with no items is empty slots, not a missing unit.
  assert.deepEqual(
    [first.units[1]?.item0, first.units[1]?.item1, first.units[1]?.item2],
    [null, null, null],
  );

  assert.deepEqual(
    first.traits.map((trait) => [trait.traitId, trait.numUnits, trait.tierCurrent]),
    [
      ["TFT18_Arcanist", 4, 2],
      ["TFT18_Elderwood", 3, 1],
    ],
  );
  assert.deepEqual(
    first.augments.map((augment) => [augment.augmentId, augment.slotIndex]),
    [
      ["TFT18_Augment_A", 0],
      ["TFT18_Augment_B", 1],
      ["TFT18_Augment_C", 2],
    ],
  );
});

test("an unparsable payload is null rather than a row with no patch", () => {
  assert.equal(normalizeMatch({}, "id", "EUW"), null);
  assert.equal(
    normalizeMatch({ ...payload, info: { ...payload.info, participants: [] } }, "id", "EUW"),
    null,
  );
  assert.equal(
    normalizeMatch({ ...payload, info: { ...payload.info, tft_set_number: 0 } }, "id", "EUW"),
    null,
  );
});

test("a participant outside placements 1–8 is dropped, not repaired", () => {
  const participants = payload.info?.participants ?? [];
  const match = normalizeMatch(
    {
      ...payload,
      info: {
        ...payload.info,
        participants: [...participants, { ...participants[0], puuid: "puuid-9", placement: 9 }],
      },
    },
    "ignored-id",
    "EUW",
  );

  assert.ok(match);
  assert.equal(match.participants.length, 8);
  assert.equal(match.participants.some((participant) => participant.puuid === "puuid-9"), false);
});
