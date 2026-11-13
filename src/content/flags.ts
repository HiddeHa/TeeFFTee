/**
 * Content flags.
 *
 * Off since 2026-11-10: the comps, prices, author block and contact address are real
 * (docs/decisions.md D3–D6) and the 18.5 template patch entry is gone, so no page
 * carries labelled-invented content. While this is true the site shows a banner on
 * every page, so a placeholder build can never be mistaken for a finished one — which
 * matters before submitting it to Riot as part of a production key application.
 *
 * Turn it back on the moment any of that stops being true.
 */
export const PLACEHOLDER_CONTENT = false;
