/** Minimal shapes for the TFT payloads we read. Riot does not ship types. */

export type LadderEntryDto = {
  puuid?: string;
  summonerId?: string;
  leaguePoints?: number;
  rank?: string;
  wins?: number;
  losses?: number;
};

/** account-v1 by PUUID. The Riot ID lives only here — the TFT payloads do not carry it. */
export type RiotAccountDto = {
  puuid?: string;
  gameName?: string;
  tagLine?: string;
};

export type LadderResponse = {
  tier?: string;
  queue?: string;
  entries?: LadderEntryDto[];
};

export type TftUnitDto = {
  /** Current field name. */
  character_id?: string;
  /** Older/alternate field names — read defensively. */
  unit_id?: string;
  name?: string;
  tier?: number;
  rarity?: number;
  itemNames?: string[];
  items?: string[];
};

export type TftTraitDto = {
  name?: string;
  num_units?: number;
  tier_current?: number;
};

export type TftParticipantDto = {
  puuid?: string;
  placement?: number;
  level?: number;
  last_round?: number;
  gold_left?: number;
  augments?: string[];
  traits?: TftTraitDto[];
  units?: TftUnitDto[];
};

export type TftMatchDto = {
  metadata?: {
    match_id?: string;
    data_version?: string;
    participants?: string[];
  };
  info?: {
    game_datetime?: number;
    game_length?: number;
    game_version?: string;
    queue_id?: number;
    tft_set_number?: number;
    tft_game_type?: string;
    participants?: TftParticipantDto[];
  };
};
