/**
 * Stable anchors for the Set 19 reference pages.
 *
 * A trait, unit or unlock card is addressed by its name, so a link written today
 * keeps working when the page is reordered: `/set-19/traits#trait-pentakill`,
 * `/set-19/units#unit-akali-k-da`. The prefixes keep a trait and a card of the
 * same name apart, and the Prismatic section (which repeats five trait names)
 * gets its own prefix so no id appears twice on one page.
 */

export function unitSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function slug(name: string): string {
  return unitSlug(name);
}

export function traitAnchor(name: string): string {
  return `trait-${slug(name)}`;
}

export function prismaticAnchor(name: string): string {
  return `prismatic-${slug(name)}`;
}

export function unitAnchor(name: string): string {
  return `unit-${unitSlug(name)}`;
}

export function cardAnchor(name: string): string {
  return `card-${slug(name)}`;
}

export function traitHref(name: string): string {
  return `/set-19/traits#${traitAnchor(name)}`;
}

export function unitHref(name: string): string {
  return `/set-19/units#${unitAnchor(name)}`;
}

export function unitPageHref(name: string): string {
  return `/set-19/units/${unitSlug(name)}`;
}
