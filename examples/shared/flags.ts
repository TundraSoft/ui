/**
 * A few flags for the demos — the recipe the docs describe, not a
 * product: the library ships no flag artwork, so an app brings its own
 * set and wraps it in `raw()` (constant markup, never user data). These
 * five are hand-drawn from rectangles and a circle; a real app would use
 * a licensed set and the same one-line helper.
 */
import { type Html, raw } from "@tundralibs/rapid/ui";

const SVG = (body: string): Html =>
  raw(
    `<svg viewBox="0 0 24 16" width="20" height="14" aria-hidden="true"><rect width="24" height="16" rx="2" fill="#fff"/>${body}</svg>`,
  );

/** Flags by ISO 3166-1 alpha-2 code, lowercase. */
export const flags: Record<string, Html> = {
  fr: SVG('<rect width="8" height="16" fill="#002654"/><rect x="16" width="8" height="16" fill="#ce1126"/>'),
  de: SVG(
    '<rect width="24" height="5.33" fill="#000"/><rect y="5.33" width="24" height="5.33" fill="#dd0000"/><rect y="10.66" width="24" height="5.34" fill="#ffce00"/>',
  ),
  it: SVG('<rect width="8" height="16" fill="#008c45"/><rect x="16" width="8" height="16" fill="#cd212a"/>'),
  jp: SVG('<circle cx="12" cy="8" r="4.4" fill="#bc002d"/>'),
  se: SVG(
    '<rect width="24" height="16" fill="#006aa7"/><rect x="7" width="3" height="16" fill="#fecc00"/><rect y="6.5" width="24" height="3" fill="#fecc00"/>',
  ),
};

/** The same five as `CountryCode`s, for `Input({ type: "tel", countries })`. */
export const sampleCountries = [
  { code: "+33", label: "FR", flag: flags.fr },
  { code: "+49", label: "DE", flag: flags.de },
  { code: "+39", label: "IT", flag: flags.it },
  { code: "+81", label: "JP", flag: flags.jp },
  { code: "+46", label: "SE", flag: flags.se },
];
