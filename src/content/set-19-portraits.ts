/**
 * Set 19 unit portraits.
 *
 * Community Dragon has no Set 19 asset tree yet (checked 17 November 2026: the
 * PBE payload still stops at Set 18, and there is no `tft19_` folder under
 * `assets/characters/` or `assets/ux/tft/championsplashes/`), so a catalogue load
 * for this set resolves nothing and every unit would render as an empty tile.
 *
 * This is the artwork that does exist: the square unit portraits shipped with the
 * 19.0 PBE build, addressed by the same `DA_19_<Champion>` ids the client uses.
 * The copy lives on tactics.tools' asset host (`/img/s99/face/`, its slot for the
 * set that is not live yet). It is a portrait of the champion and nothing more —
 * no cost, trait or unlock is read from it — and it is a fallback, not a source:
 * the moment `load-assets --set 19` fills real catalogue rows, those win and this
 * file is not consulted.
 *
 * Fetched through `/api/image` like the Community Dragon tree, so a slow or
 * failing request is retried and cached instead of leaving a blank tile.
 */

const PORTRAIT_ROOT = "https://ap.tft.tools/img/s99/face/";

/** Roster name -> asset name, lowercased. Two Akalis, two portraits. */
const PORTRAIT_SLUGS: Record<string, string> = {
  "Ahri": "da_19_ahri",
  "Akali (K|DA)": "da_19_akali_kda",
  "Akali (True Damage)": "da_19_akali_truedamage",
  "Alistar": "da_19_alistar",
  "Alune": "da_19_alune",
  "Amumu": "da_19_amumu",
  "Annie": "da_19_annie",
  "Aphelios": "da_19_aphelios",
  "Ashe": "da_19_ashe",
  "Aurora": "da_19_aurora",
  "Bard": "da_19_bard",
  "Baron Nashor": "da_19_baronnashor",
  "Braum": "da_19_braum",
  "Briar": "da_19_briar",
  "Camille": "da_19_camille",
  "Dr. Mundo": "da_19_drmundo",
  "Draven": "da_19_draven",
  "Ekko": "da_19_ekko",
  "Elise": "da_19_elise",
  "Evelynn": "da_19_evelynn",
  "Ezreal": "da_19_ezreal",
  "Galio": "da_19_galio",
  "Garen": "da_19_garen",
  "Gnar": "da_19_gnar",
  "Gragas": "da_19_gragas",
  "Graves": "da_19_graves",
  "Gwen": "da_19_gwen",
  "Illaoi": "da_19_illaoi",
  "Janna": "da_19_janna",
  "Jax": "da_19_jax",
  "Jhin": "da_19_jhin",
  "Jinx": "da_19_jinx",
  "K'Sante": "da_19_ksante",
  "Kai'Sa": "da_19_kaisa",
  "Karthus": "da_19_karthus",
  "Katarina": "da_19_katarina",
  "Kayle": "da_19_kayle",
  "Kayn": "da_19_kayn",
  "Kennen": "da_19_kennen",
  "Kobuko": "da_19_kobuko",
  "Lee Sin": "da_19_leesin",
  "Leona": "da_19_leona",
  "Lillia": "da_19_lillia",
  "Locke": "da_19_locke",
  "Lucian": "da_19_lucian",
  "Lulu": "da_19_lulu",
  "Lux": "da_19_lux",
  "Malzahar": "da_19_malzahar",
  "Mel": "da_19_mel",
  "Miss Fortune": "da_19_missfortune",
  "Mordekaiser": "da_19_mordekaiser",
  "Nasus": "da_19_nasus",
  "Neeko": "da_19_neeko",
  "Nidalee": "da_19_nidalee",
  "Nunu & Willump": "da_19_nunu",
  "Olaf": "da_19_olaf",
  "Pyke": "da_19_pyke",
  "Qiyana": "da_19_qiyana",
  "Rakan": "da_19_rakan",
  "Rell": "da_19_rell",
  "Renata Glasc": "da_19_renataglasc",
  "Renekton": "da_19_renekton",
  "Samira": "da_19_samira",
  "Senna": "da_19_senna",
  "Seraphine": "da_19_seraphine",
  "Sett": "da_19_sett",
  "Shyvana": "da_19_shyvana",
  "Smeech": "da_19_smeech",
  "Sona": "da_19_sona",
  "Swain": "da_19_swain",
  "Syndra": "da_19_syndra",
  "Taliyah": "da_19_taliyah",
  "Taric": "da_19_taric",
  "Teemo": "da_19_teemo",
  "Thresh": "da_19_thresh",
  "Tibbers": "da_19_tibbers",
  "Tristana": "da_19_tristana",
  "Twisted Fate": "da_19_twistedfate",
  "Varus": "da_19_varus",
  "Vayne": "da_19_vayne",
  "Vi": "da_19_vi",
  "Viego": "da_19_viego",
  "Vladimir": "da_19_vladimir",
  "Wukong": "da_19_wukong",
  "Xayah": "da_19_xayah",
  "Yasuo": "da_19_yasuo",
  "Yone": "da_19_yone",
  "Yorick": "da_19_yorick",
  "Yunara": "da_19_yunara",
  "Yuumi": "da_19_yuumi",
  "Zac": "da_19_zac",
  "Zeri": "da_19_zeri",
  "Ziggs": "da_19_ziggs",
  "Zoe": "da_19_zoe",
};

/** How many of the roster's units this file can picture. */
export const set19PortraitCount = Object.keys(PORTRAIT_SLUGS).length;

/** Portrait URL for a roster name, or null when there is no art for it. */
export function portraitFor(unitName: string): string | null {
  const slug = PORTRAIT_SLUGS[unitName];
  return slug ? `${PORTRAIT_ROOT}${slug}.png?w=116` : null;
}
