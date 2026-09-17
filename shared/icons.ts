import { type Html, html, raw } from "@tundralibs/rapid/ui";

/**
 * A small, consistent line-icon set — 24x24, stroke-based, so `color`
 * (e.g. from an icon chip's `--stat-color`) controls it everywhere.
 * Every path here is built from plain primitives (circle/rect/line/
 * polyline/straight-line paths) rather than hand-authored bezier
 * curves, specifically so nothing risks rendering as a malformed blob.
 */
const ICONS = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a8 8 0 0 1 16 0v1"/>',
  users:
    '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9" r="2.6"/><path d="M2.5 20c0-3.3 2.9-5 6.5-5s6.5 1.7 6.5 5"/><path d="M15 15.2c2.7.4 4 2 4 4.8"/>',
  invoice:
    '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z"/><line x1="9" y1="7" x2="15" y2="7"/><line x1="9" y1="11" x2="15" y2="11"/>',
  table:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5l4 4L7 21l-4 1 1-4z"/>',
  settings:
    '<line x1="4" y1="6" x2="20" y2="6"/><circle cx="9" cy="6" r="2"/><line x1="4" y1="12" x2="20" y2="12"/><circle cx="15" cy="12" r="2"/><line x1="4" y1="18" x2="20" y2="18"/><circle cx="7" cy="18" r="2"/>',
  folder: '<path d="M3 6a1 1 0 0 1 1-1h5l2 2h9a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z"/>',
  chevronRight: '<polyline points="9 6 15 12 9 18"/>',
  chevronLeft: '<polyline points="15 6 9 12 15 18"/>',
  chevronsLeft: '<polyline points="13 6 7 12 13 18"/><polyline points="19 6 13 12 19 18"/>',
  chevronsRight: '<polyline points="11 6 17 12 11 18"/><polyline points="5 6 11 12 5 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  moon: '<path d="M21 12.5A9 9 0 1 1 11.5 3a7 7 0 0 0 9.5 9.5z"/>',
  kebab: '<circle cx="12" cy="5" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="12" cy="19" r="1.4"/>',
  coin:
    '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M9 10.5c0-1.1 1.3-1.5 3-1.5s3 .5 3 1.5-1.3 1.5-3 1.5-3 .4-3 1.5 1.3 1.5 3 1.5 3-.4 3-1.5"/>',
  trendUp: '<polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/>',
  trendDown: '<polyline points="3 7 9 13 13 9 21 18"/><polyline points="15 18 21 18 21 12"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  plug: '<path d="M9 3v4M15 3v4M7 7h10l-1 6a5 5 0 0 1-10 0z"/><path d="M12 17v4"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  chevronUp: '<polyline points="18 15 12 9 6 15"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="3" x2="8" y2="6"/><line x1="16" y1="3" x2="16" y2="6"/>',
  upload:
    '<path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><polyline points="8 9 12 5 16 9"/><line x1="12" y1="5" x2="12" y2="15"/>',
  filter:
    '<line x1="4" y1="7" x2="20" y2="7"/><line x1="7" y1="12" x2="17" y2="12"/><line x1="10" y1="17" x2="14" y2="17"/>',
  list:
    '<line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/>',
  info:
    '<circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="7.8" x2="12" y2="7.9"/>',
  warning:
    '<circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16.4" x2="12" y2="16.5"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="2"/><polyline points="8 9 11 12 8 15"/>',
} as const;

export type IconName = keyof typeof ICONS;

/** Every icon name, for galleries and sprites. */
export const iconNames: readonly IconName[] = Object.keys(ICONS) as IconName[];

const SYMBOL_ATTRS =
  'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

/**
 * The whole set as one hidden `<svg>` of `<symbol id="icon-<name>">`s, for
 * inlining once per page; any element can then draw an icon with
 * `<svg width="16" height="16"><use href="#icon-search"></use></svg>` — no
 * template, no script. This is the plain-HTML answer to `Icon()`.
 */
export function IconSprite(): Html {
  return raw(spriteSvg(true));
}

/**
 * The same sprite as a standalone SVG document — what `dist/icons.svg`
 * is. Reference it same-origin (`<use href="/ui/icons.svg#icon-search">`);
 * browsers refuse cross-origin `use`, so from the CDN inline `IconSprite()`
 * instead.
 */
export function spriteSvg(inline = false): string {
  const symbols = iconNames.map((name) => `<symbol id="icon-${name}" ${SYMBOL_ATTRS}>${ICONS[name]}</symbol>`).join("");
  return inline
    ? `<svg xmlns="http://www.w3.org/2000/svg" hidden aria-hidden="true">${symbols}</svg>`
    : `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg">${symbols}</svg>\n`;
}

export function Icon(
  name: IconName,
  opts: { size?: number; className?: string } = {},
): Html {
  // Only the constant path data is raw(); size and class are escaped.
  const size = Number(opts.size ?? 20);
  return html`
    <svg${opts.className
      ? html`
        class="${opts.className}"
      `
      : ""} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${raw(ICONS[name])}</svg>
  `;
}
