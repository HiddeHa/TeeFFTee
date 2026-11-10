import { config } from "./config";
import { db } from "./db";
import type { TftMatchDto, TftParticipantDto, TftUnitDto } from "./riot-types";

/**
 * Payload → rows.
 *
 * `normalizeMatch` is pure so it can be tested and re-run; `persistMatch` does
 * the single-transaction write. The raw payload is stored alongside the parsed
 * rows, so a normalizer bug can be fixed and replayed without re-crawling (see
 * worker/reprocess.ts).
 */

export type NormalizedUnit = {
  unitId: string;
  starLevel: number;
  item0: string | null;
  item1: string | null;
  item2: string | null;
  slot: number;
};

export type NormalizedTrait = {
  traitId: string;
  numUnits: number;
  tierCurrent: number;
};

export type NormalizedAugment = {
  augmentId: string;
  slotIndex: number;
};

export type NormalizedParticipant = {
  puuid: string;
  placement: number;
  level: number | null;
  lastRound: number | null;
  goldLeft: number | null;
  units: NormalizedUnit[];
  traits: NormalizedTrait[];
  augments: NormalizedAugment[];
};

export type NormalizedMatch = {
  matchId: string;
  region: string;
  patch: string;
  setNumber: number;
  queueId: number | null;
  gameDatetime: Date | null;
  gameVersion: string | null;
  raw: unknown;
  participants: NormalizedParticipant[];
};

/**
 * Game versions look like "18.5.712.1234" or "Version 18.5.712.1234".
 * The patch is the leading major.minor pair.
 */
export function patchFromGameVersion(version: string | null | undefined): string | null {
  if (!version) return null;
  const match = /(\d+)\.(\d+)\.(\d+)/.exec(version) ?? /(\d+)\.(\d+)/.exec(version);
  if (!match || match[1] === undefined || match[2] === undefined) return null;
  return `${match[1]}.${match[2]}`;
}

function toUnit(raw: TftUnitDto, slot: number): NormalizedUnit | null {
  const unitId = raw.character_id ?? raw.unit_id ?? raw.name;
  if (!unitId) return null;

  const items = raw.itemNames ?? raw.items ?? [];
  return {
    unitId,
    starLevel: raw.tier ?? 1,
    item0: items[0] ?? null,
    item1: items[1] ?? null,
    item2: items[2] ?? null,
    slot,
  };
}

function toParticipant(raw: TftParticipantDto): NormalizedParticipant | null {
  if (!raw.puuid) return null;

  const placement = raw.placement;
  if (typeof placement !== "number" || placement < 1 || placement > 8) return null;

  const units: NormalizedUnit[] = [];
  for (const [index, unit] of (raw.units ?? []).entries()) {
    const normalized = toUnit(unit, index);
    if (normalized) units.push(normalized);
  }

  // Trait entries are unique per trait, but dedupe defensively so a payload
  // oddity cannot violate the (match, puuid, trait) primary key.
  const seenTraits = new Set<string>();
  const traits: NormalizedTrait[] = [];
  for (const trait of raw.traits ?? []) {
    if (!trait.name || seenTraits.has(trait.name)) continue;
    seenTraits.add(trait.name);
    traits.push({
      traitId: trait.name,
      numUnits: trait.num_units ?? 0,
      tierCurrent: trait.tier_current ?? 0,
    });
  }

  const augments: NormalizedAugment[] = (raw.augments ?? [])
    .filter((augmentId): augmentId is string => typeof augmentId === "string" && augmentId.length > 0)
    .map((augmentId, slotIndex) => ({ augmentId, slotIndex }));

  return {
    puuid: raw.puuid,
    placement,
    level: raw.level ?? null,
    lastRound: raw.last_round ?? null,
    goldLeft: raw.gold_left ?? null,
    units,
    traits,
    augments,
  };
}

export function normalizeMatch(
  payload: TftMatchDto,
  matchId: string,
  region: string,
): NormalizedMatch | null {
  const info = payload.info;
  if (!info || !Array.isArray(info.participants) || info.participants.length === 0) {
    return null;
  }

  const setNumber = typeof info.tft_set_number === "number" ? info.tft_set_number : 0;
  if (setNumber === 0) return null;

  const participants: NormalizedParticipant[] = [];
  for (const raw of info.participants) {
    const participant = toParticipant(raw);
    if (participant) participants.push(participant);
  }
  if (participants.length === 0) return null;

  const gameDatetime =
    typeof info.game_datetime === "number" && Number.isFinite(info.game_datetime)
      ? new Date(info.game_datetime)
      : null;

  const gameVersion = info.game_version ?? null;
  const patch =
    config.patchOverride ||
    patchFromGameVersion(gameVersion) ||
    // Never invent a patch: an unknown patch is visible in the stats pipeline
    // rather than silently being attributed to the current one.
    "unknown";

  return {
    matchId: payload.metadata?.match_id ?? matchId,
    region,
    patch,
    setNumber,
    queueId: info.queue_id ?? null,
    gameDatetime,
    gameVersion,
    raw: payload,
    participants,
  };
}

export type PersistResult = "inserted" | "duplicate";

/**
 * Write one match. `ON CONFLICT DO NOTHING` on the matches insert makes this
 * idempotent, so a re-delivered queue row is a no-op rather than a duplicate.
 */
export async function persistMatch(match: NormalizedMatch): Promise<PersistResult> {
  const sql = db();

  return sql.begin<PersistResult>(async (tx) => {
    const insertedMatches = await tx`
      INSERT INTO matches (
        match_id, region, patch, set_number, queue_id, game_datetime, game_version, raw
      )
      VALUES (
        ${match.matchId}, ${match.region}, ${match.patch}, ${match.setNumber},
        ${match.queueId}, ${match.gameDatetime}, ${match.gameVersion},
        ${JSON.stringify(match.raw)}::jsonb
      )
      ON CONFLICT (match_id) DO NOTHING
      RETURNING match_id
    `;

    if (insertedMatches.length === 0) return "duplicate";

    const participantRows = match.participants.map((participant) => ({
      match_id: match.matchId,
      puuid: participant.puuid,
      placement: participant.placement,
      level: participant.level,
      last_round: participant.lastRound,
      gold_left: participant.goldLeft,
    }));

    const unitRows = match.participants.flatMap((participant) =>
      participant.units.map((unit) => ({
        match_id: match.matchId,
        puuid: participant.puuid,
        unit_id: unit.unitId,
        star_level: unit.starLevel,
        item_0: unit.item0,
        item_1: unit.item1,
        item_2: unit.item2,
        slot: unit.slot,
      })),
    );

    const traitRows = match.participants.flatMap((participant) =>
      participant.traits.map((trait) => ({
        match_id: match.matchId,
        puuid: participant.puuid,
        trait_id: trait.traitId,
        num_units: trait.numUnits,
        tier_current: trait.tierCurrent,
      })),
    );

    const augmentRows = match.participants.flatMap((participant) =>
      participant.augments.map((augment) => ({
        match_id: match.matchId,
        puuid: participant.puuid,
        augment_id: augment.augmentId,
        slot_index: augment.slotIndex,
      })),
    );

    await tx`
      INSERT INTO participants ${tx(participantRows, "match_id", "puuid", "placement", "level", "last_round", "gold_left")}
      ON CONFLICT DO NOTHING
    `;

    if (unitRows.length > 0) {
      await tx`
        INSERT INTO participant_units ${tx(unitRows, "match_id", "puuid", "unit_id", "star_level", "item_0", "item_1", "item_2", "slot")}
        ON CONFLICT DO NOTHING
      `;
    }

    if (traitRows.length > 0) {
      await tx`
        INSERT INTO participant_traits ${tx(traitRows, "match_id", "puuid", "trait_id", "num_units", "tier_current")}
        ON CONFLICT DO NOTHING
      `;
    }

    if (augmentRows.length > 0) {
      await tx`
        INSERT INTO participant_augments ${tx(augmentRows, "match_id", "puuid", "augment_id", "slot_index")}
        ON CONFLICT DO NOTHING
      `;
    }

    return "inserted";
  });
}
