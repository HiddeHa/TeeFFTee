import {
  set19PrismaticTraits,
  set19UnlockQuests,
  set19Unlocks,
  type UnlockCard,
  type UnlockQuest,
} from "@/content/set-19";

/**
 * Set 19's unlock and Prismatic data, keyed by roster name.
 *
 * Both halves of this are the same editorial data the reference pages read, so the
 * teambuilder cannot disagree with `/set-19/unlockables` about which champion is an
 * unlock or what its quest is. Nothing here infers an unlock: Riot says 36 of the 94
 * are unlockables, and the reveal names fewer than that, so an unnamed champion is
 * simply absent — which the builder renders as no badge rather than as "not locked".
 *
 * Prismatic is the other direction: all five are named, so the set here is complete
 * and a trait missing from it really is one whose Prismatic tier is not quest-gated.
 */

const QUESTS_BY_CHAMPION = new Map(set19UnlockQuests.map((quest) => [quest.champion, quest]));
const CARDS_BY_CHAMPION = new Map(set19Unlocks.map((card) => [card.champion, card]));

/**
 * The unlocks video names the K/DA Akali without the variant suffix the roster
 * uses. That card belongs to the K/DA five-cost; the True Damage one has its own
 * quest entry, so it must not inherit this card.
 */
const CARD_CHAMPION_BY_UNIT: Record<string, string> = { "Akali (K|DA)": "Akali" };

export type UnitUnlock = { quest?: UnlockQuest; card?: UnlockCard };

/** The unlock evidence for a roster name, or null when the reveal does not name it. */
export function unlockForUnit(name: string): UnitUnlock | null {
  const quest = QUESTS_BY_CHAMPION.get(name);
  const card = CARDS_BY_CHAMPION.get(CARD_CHAMPION_BY_UNIT[name] ?? name);
  return quest || card ? { quest, card } : null;
}

/**
 * How many unlockables the reveal actually names — 19 with a published condition,
 * plus the cards that name a champion whose condition stayed unpublished. The
 * builder quotes this instead of Riot's 36, because the other 14 are unknown names.
 */
export const namedUnlockCount = new Set([
  ...set19UnlockQuests.map((quest) => quest.champion),
  ...set19Unlocks.map((card) => CARD_CHAMPION_BY_UNIT[card.champion] ?? card.champion),
]).size;

const PRISMATIC_TRAITS = new Set(set19PrismaticTraits.map((trait) => trait.name));

/** True for the five traits whose Prismatic tier a quest line unlocks. */
export function isPrismaticTrait(name: string): boolean {
  return PRISMATIC_TRAITS.has(name);
}
