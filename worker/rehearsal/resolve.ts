import type { RehearsalComp } from "./set19-comps";

export type CatalogueName = { id: string; name: string };

export type ResolvedComp = RehearsalComp & {
  coreIds: string[];
  traitId: string | null;
};

export type Resolution = {
  resolved: ResolvedComp[];
  /** One line per unresolved champion or trait, naming the comp it belongs to. */
  missing: string[];
  duplicateSlugs: string[];
};

/**
 * Turn rehearsal champion/trait names into the ids `aggregate` matches on.
 *
 * The roster is a second copy of the catalogue's names; resolving instead of
 * hardcoding ids is what makes a renamed champion or an invented comp fail on
 * the rehearsal rather than classify nothing on launch day.
 */
export function resolveComps(
  comps: RehearsalComp[],
  units: CatalogueName[],
  traits: CatalogueName[],
): Resolution {
  const unitIdByName = new Map(units.map((unit) => [unit.name, unit.id]));
  const traitIdByName = new Map(traits.map((trait) => [trait.name, trait.id]));
  const missing: string[] = [];
  const resolved: ResolvedComp[] = [];

  const slugCounts = new Map<string, number>();
  for (const comp of comps) {
    slugCounts.set(comp.slug, (slugCounts.get(comp.slug) ?? 0) + 1);
  }
  const duplicateSlugs = [...slugCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([slug]) => slug);

  for (const comp of comps) {
    const coreIds: string[] = [];
    for (const name of comp.core) {
      const id = unitIdByName.get(name);
      if (!id) {
        missing.push(`${comp.slug}: champion "${name}" is not in the set catalogue`);
        continue;
      }
      coreIds.push(id);
    }

    let traitId: string | null = null;
    if (comp.trait !== null) {
      const id = traitIdByName.get(comp.trait);
      if (!id) {
        missing.push(`${comp.slug}: trait "${comp.trait}" is not in the set catalogue`);
      } else {
        traitId = id;
      }
    }

    resolved.push({ ...comp, coreIds, traitId });
  }

  return { resolved, missing, duplicateSlugs };
}
