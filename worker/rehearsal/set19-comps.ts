/**
 * Ten Set 19 comps for the rollover rehearsal — NOT editorial content.
 *
 * These are trait shells drafted from the Dev Drop roster (one per trait line,
 * five core units each) so `aggregate` has something to classify on launch
 * morning. Nothing here has been playtested, none of it is published by the
 * site, and this file is imported only by worker/rehearsal/set19.ts — the real
 * comps belong in src/content/comps.ts, written from PBE games and edited there.
 *
 * Units are champion *names* on purpose: the rehearsal resolves them against
 * `units` after the PBE catalogue is loaded, so a name the payload does not
 * contain fails loudly instead of silently matching nothing.
 */

export type RehearsalComp = {
  slug: string;
  name: string;
  /** Five champion names, as the roster lists them. */
  core: string[];
  /** Trait display name; resolved to its Riot id after the catalogue load. */
  trait: string | null;
  why: string;
};

export const set19RehearsalComps: RehearsalComp[] = [
  {
    slug: "rehearsal-pentakill",
    name: "Rehearsal — Pentakill",
    core: ["Karthus", "Viego", "Mordekaiser", "Yorick", "Kayle"],
    trait: "Pentakill",
    why: "Full trait line; the trait has 3/5/7 breakpoints and its Prismatic tier is a quest.",
  },
  {
    slug: "rehearsal-kda",
    name: "Rehearsal — K|DA",
    core: ["Ahri", "Akali (K|DA)", "Kai'Sa", "Evelynn", "Neeko"],
    trait: "K|DA",
    why: "Five K|DA members; also checks the roster's variant-suffixed Akali resolves.",
  },
  {
    slug: "rehearsal-heartsteel",
    name: "Rehearsal — Heartsteel",
    core: ["Kayn", "Sett", "Ezreal", "K'Sante", "Aphelios"],
    trait: "Heartsteel",
    why: "Heartsteel flexes at every cost; Aphelios is also an unlock, so the shell spans both.",
  },
  {
    slug: "rehearsal-true-damage",
    name: "Rehearsal — True Damage",
    core: ["Qiyana", "Senna", "Ekko", "Yasuo", "Akali (True Damage)"],
    trait: "True Damage",
    why: "The A-Side/B-Side trait; exercises the second Akali variant.",
  },
  {
    slug: "rehearsal-ionic-spark",
    name: "Rehearsal — Ionic Spark",
    core: ["Jinx", "Gwen", "Aurora", "Tibbers", "Annie"],
    trait: "Ionic Spark",
    why: "Wide trait (ten champions), so a five-unit core is a realistic slice rather than the whole list.",
  },
  {
    slug: "rehearsal-hyperpop",
    name: "Rehearsal — Hyperpop",
    core: ["Teemo", "Ziggs", "Lulu", "Tristana", "Kobuko"],
    trait: "Hyperpop",
    why: "Teemo is card-only and Kobuko has a published quest, so this shell touches both unlock shapes.",
  },
  {
    slug: "rehearsal-arcanist",
    name: "Rehearsal — Arcanist",
    core: ["Ziggs", "Annie", "Swain", "Mel", "Vladimir"],
    trait: "Arcanist",
    why: "A seven-champion caster line; tests a core that overlaps other shells (Ziggs, Annie).",
  },
  {
    slug: "rehearsal-slayer",
    name: "Rehearsal — Slayer",
    core: ["Viego", "Yasuo", "Yone", "Smeech", "Briar"],
    trait: "Slayer",
    why: "Overlaps Pentakill and True Damage on Viego/Yasuo/Yone — the shape most likely to collide with another shell.",
  },
  {
    slug: "rehearsal-frontman",
    name: "Rehearsal — Frontman",
    core: ["Swain", "Thresh", "Galio", "Illaoi", "Shyvana"],
    trait: "Frontman",
    why: "Ten-champion trait; overlaps Arcanist on Swain, which is the point of a collision check.",
  },
  {
    slug: "rehearsal-trickshot",
    name: "Rehearsal — Trickshot",
    core: ["Kai'Sa", "Vayne", "Twisted Fate", "Draven", "Samira"],
    trait: "Trickshot",
    why: "Six-champion line with a 4-cost carry; overlaps K|DA on Kai'Sa.",
  },
];
