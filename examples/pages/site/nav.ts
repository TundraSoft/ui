/**
 * The demo site's map: every page, where it sits in the sidebar, and what
 * it says about itself. The sidebar is the site's only navigation, so this
 * file is the whole information architecture — groups, the sub-groups
 * inside them, and the leaves (one page each). `build-demo.ts` throws when
 * a catalogued component is missing here or listed twice, so a new
 * component cannot ship without a page.
 */
import type { MenuItem } from "../../../components/menu/menu.ts";
import { Icon, type IconName } from "../../../shared/icons.ts";
import type { LayoutName } from "../../shared/layout-samples.ts";

/** One component's page: its sidebar label, icon and one-line summary. */
export type ComponentInfo = { label: string; icon: IconName; blurb: string };

export const COMPONENTS: Record<string, ComponentInfo> = {
  // Forms
  input: {
    label: "Input",
    icon: "edit",
    blurb:
      "Every native input type, plus prefixes and suffixes, icons, counters, masks, floating labels and the composite email, tel and url fields.",
  },
  textarea: {
    label: "Textarea",
    icon: "alignLeft",
    blurb: "Multi-line text with a counter, auto-sizing and a server check.",
  },
  "number-input": {
    label: "Number input",
    icon: "plus",
    blurb: "A native number field with stepper buttons, bounds, a step and a unit.",
  },
  otp: {
    label: "One-time code",
    icon: "lock",
    blurb: "Cells that advance as you type, spread a pasted or autofilled code, and can submit when full.",
  },
  "card-fields": {
    label: "Card fields",
    icon: "creditCard",
    blurb: "Linked number, expiry, name and CVC fields that detect the brand, group digits and refuse bad dates.",
  },
  dropzone: {
    label: "Dropzone",
    icon: "upload",
    blurb: "File upload over a native input, with per-file progress, done and error rows.",
  },
  editor: {
    label: "Editor",
    icon: "heading",
    blurb: "Markdown or rich-text editing: a toolbar that toggles, a server-rendered preview, tables, uploads.",
  },
  select: {
    label: "Select",
    icon: "chevronDown",
    blurb: "A searchable listbox over a native select, which keeps submitting the value with or without script.",
  },
  combobox: {
    label: "Combobox",
    icon: "search",
    blurb: "Type-ahead single or multiple choice, filtered in the page or by the server.",
  },
  choice: {
    label: "Checkbox & radio",
    icon: "check",
    blurb: "Checkboxes, radios and groups of them, inline or stacked.",
  },
  switch: {
    label: "Switch",
    icon: "plug",
    blurb: "An on/off checkbox drawn as a switch, with a hint and state words.",
  },
  segmented: {
    label: "Segmented control",
    icon: "columns",
    blurb: "A radio group drawn as one control, with a thumb that slides to the checked option.",
  },
  slider: { label: "Slider", icon: "minus", blurb: "A native range with a painted track, ticks and a live value." },
  rating: {
    label: "Rating",
    icon: "star",
    blurb: "Stars as radios — no script needed to pick, half stars to display.",
  },
  transfer: {
    label: "Transfer list",
    icon: "arrowRight",
    blurb: "Move items between two lists; a native multiple select underneath.",
  },
  datepicker: {
    label: "Date picker",
    icon: "calendar",
    blurb: "Single dates or ranges, month and year navigation, presets — in the page or driven by the server.",
  },
  timepicker: {
    label: "Time picker",
    icon: "clock",
    blurb: "Typeable hour and minute segments with a list of slots and a time zone chip.",
  },
  datetimepicker: {
    label: "Date & time picker",
    icon: "calendar",
    blurb: "A date picker and a time picker posting one UTC value, optionally shown in the browser's zone.",
  },
  "color-picker": {
    label: "Colour picker",
    icon: "palette",
    blurb: "A native colour input, enhanced with a hue/shade panel and swatches.",
  },
  form: {
    label: "Form",
    icon: "send",
    blurb: "Server errors, client-side validation, CSRF fields, auto-submit and an unsaved-changes guard.",
  },
  "form-field": {
    label: "Field layout",
    icon: "listChecks",
    blurb: "Label, help and error text around a control; field grids and action rows.",
  },
  // Data
  "data-table": {
    label: "Data table",
    icon: "table",
    blurb: "Dense tables with sticky headers, sorting, selection with a bulk bar, row actions and grouping.",
  },
  pagination: {
    label: "Pagination",
    icon: "chevronsRight",
    blurb: "Page links that fold on a phone; works as plain links or as swaps.",
  },
  badge: { label: "Badge & chip", icon: "tag", blurb: "Status labels, dots, counts and removable chips." },
  avatar: { label: "Avatar", icon: "user", blurb: "Pictures or initials, in sizes, stacks and with a presence dot." },
  stat: {
    label: "Stat",
    icon: "coin",
    blurb: "A metric with a trend, an icon, a note and a sparkline; can link to the list behind it.",
  },
  "description-list": {
    label: "Description list",
    icon: "list",
    blurb: "Term/value pairs, stacked or inline, for detail panels.",
  },
  timeline: { label: "Timeline", icon: "listChecks", blurb: "Events in order, with status, tone and icons." },
  calendar: { label: "Calendar", icon: "calendar", blurb: "A month grid with events, for schedules and bookings." },
  empty: {
    label: "Empty state",
    icon: "folder",
    blurb: "What a region says when there is nothing to show — or when loading it failed.",
  },
  skeleton: { label: "Skeleton", icon: "image", blurb: "Placeholders shaped like the content that is on its way." },
  progress: {
    label: "Progress & spinner",
    icon: "refresh",
    blurb: "Determinate bars and spinners for work in flight.",
  },
  // Charts
  chart: {
    label: "Charts",
    icon: "trendUp",
    blurb: "All 28 chart types ApexCharts renders, styled by the library's tokens and redrawn on a theme change.",
  },
  // Structure
  card: {
    label: "Card",
    icon: "folder",
    blurb: "The basic surface: header, media, body and footer, as a link or a button.",
  },
  grid: { label: "Grid", icon: "dashboard", blurb: "Twelve columns with spans per breakpoint and a gap scale." },
  separator: { label: "Separator", icon: "minus", blurb: "A horizontal or vertical rule, with an optional label." },
  ratio: { label: "Aspect ratio", icon: "image", blurb: "A box that holds media at a fixed aspect ratio." },
  figure: { label: "Figure", icon: "image", blurb: "An image or a chart with a caption and a credit." },
  "split-pane": {
    label: "Split pane",
    icon: "columns",
    blurb: "Two panes with a draggable, keyboard-operable divider that remembers its place.",
  },
  "scroll-area": {
    label: "Scroll area",
    icon: "arrowDown",
    blurb: "A region that scrolls inside itself, with edge fades.",
  },
  "page-header": { label: "Page header", icon: "heading", blurb: "A page's title, subtitle, badge and actions." },
  toolbar: { label: "Toolbar", icon: "filter", blurb: "A row of search, filters and actions above a table or a grid." },
  tabs: { label: "Tabs", icon: "columns", blurb: "Panels behind tabs with a sliding indicator, or tabs as links." },
  collapsible: {
    label: "Collapsible & accordion",
    icon: "chevronDown",
    blurb: "Disclosure on details/summary — works without JS — alone or as an accordion; a deep link opens a row.",
  },
  wizard: { label: "Wizard", icon: "chevronsRight", blurb: "Numbered steps with done, current and pending states." },
  prose: { label: "Prose", icon: "alignLeft", blurb: "Long-form typography for content you did not mark up yourself." },
  code: {
    label: "Code block",
    icon: "code",
    blurb: "Highlighted source with line numbers, emphasis and a copy button.",
  },
  diff: { label: "Diff", icon: "columns", blurb: "Unified or side-by-side differences between two texts." },
  // Navigation
  navbar: { label: "Navbar", icon: "menu", blurb: "The top bar: brand, links, actions and a phone menu." },
  sidebar: {
    label: "Sidebar",
    icon: "columns",
    blurb: "Side navigation with nested menus that collapses to an icon rail with flyouts.",
  },
  menubar: { label: "Menubar", icon: "menu", blurb: "An application menu bar with keyboard navigation." },
  menu: { label: "Menu", icon: "list", blurb: "Nested link lists that mark the current page." },
  breadcrumb: {
    label: "Breadcrumb",
    icon: "chevronRight",
    blurb: "The trail to the current page, folding when it is narrow.",
  },
  "list-group": { label: "List group", icon: "list", blurb: "A bordered list of rows, links or actions." },
  tree: { label: "Tree", icon: "folder", blurb: "A hierarchy that expands and collapses, with keyboard support." },
  command: {
    label: "Command palette",
    icon: "search",
    blurb: "Search-to-act: a ⌘K palette, local or server-filtered.",
  },
  scrollspy: { label: "Scroll spy", icon: "eye", blurb: "Highlights the link for the section being read." },
  "back-to-top": {
    label: "Back to top",
    icon: "arrowUp",
    blurb: "A button that appears after a scroll and returns to the top.",
  },
  // Actions
  button: {
    label: "Button",
    icon: "plus",
    blurb: "Every variant and size, icons, loading, button groups and a copy button.",
  },
  toggle: { label: "Toggle", icon: "check", blurb: "Pressed/unpressed buttons, alone or in an exclusive group." },
  fab: { label: "Floating action button", icon: "plus", blurb: "The page's main action, pinned to a corner." },
  kbd: { label: "Keyboard key", icon: "terminal", blurb: "Keycaps and chords for shortcuts in menus and docs." },
  dropdown: { label: "Dropdown", icon: "chevronDown", blurb: "A button that opens a searchable menu or a panel." },
  "context-menu": {
    label: "Context menu",
    icon: "cursor",
    blurb: "A right-click, long-press or Shift+F10 menu placed at the pointer.",
  },
  popover: { label: "Popover", icon: "info", blurb: "A panel anchored to a trigger, which flips to stay on screen." },
  tooltip: { label: "Tooltip", icon: "help", blurb: "A short label on hover and focus, on any side." },
  // Feedback
  alert: {
    label: "Alert",
    icon: "warning",
    blurb: "Inline messages in five tones, with actions and per-field errors.",
  },
  toast: {
    label: "Toast",
    icon: "bell",
    blurb: "Transient messages, from the page or from the server, in six positions.",
  },
  banner: { label: "Banner", icon: "info", blurb: "A page-wide notice at the top, dismissible." },
  consent: {
    label: "Consent banner",
    icon: "shield",
    blurb: "Asks before analytics load, remembers the answer and clears cookies on refusal.",
  },
  modal: { label: "Modal", icon: "maximize", blurb: "Native dialogs, plus a confirmation step for any button." },
  sheet: { label: "Sheet", icon: "columns", blurb: "A dialog that slides in from an edge." },
  tour: { label: "Tour", icon: "play", blurb: "A guided walk through the page, one spotlighted element at a time." },
  // Marketing & media
  hero: { label: "Hero", icon: "star", blurb: "The opening section of a landing page." },
  "feature-grid": { label: "Feature grid", icon: "dashboard", blurb: "Features in a grid, with icons and links." },
  pricing: { label: "Pricing", icon: "coin", blurb: "Plans side by side, with a highlighted one." },
  testimonial: { label: "Testimonial", icon: "quote", blurb: "A quote with its author." },
  "site-footer": {
    label: "Site footer",
    icon: "home",
    blurb: "Columns of links, a newsletter form and the legal line.",
  },
  carousel: { label: "Carousel", icon: "image", blurb: "Scroll-snap slides with buttons and dots on top." },
  lightbox: { label: "Lightbox", icon: "maximize", blurb: "Images that open full screen, with next and previous." },
  reveal: {
    label: "Scroll effects",
    icon: "arrowDown",
    blurb: "Reveal on scroll, parallax, a progress bar, counters and scroll-driven steps — inert under reduced motion.",
  },
};

/** The component groups as the sidebar shows them: a group, its sub-groups, their components. */
export const COMPONENT_TREE: readonly {
  id: string;
  label: string;
  icon: IconName;
  blurb: string;
  sections: readonly { label: string; items: readonly string[] }[];
}[] = [
  {
    id: "forms",
    label: "Forms",
    icon: "edit",
    blurb: "Fields, choices, pickers and the form around them.",
    sections: [
      { label: "Fields", items: ["input", "textarea", "number-input", "otp", "card-fields", "dropzone", "editor"] },
      {
        label: "Choices",
        items: ["select", "combobox", "choice", "switch", "segmented", "slider", "rating", "transfer"],
      },
      { label: "Pickers", items: ["datepicker", "timepicker", "datetimepicker", "color-picker"] },
      { label: "Form layout", items: ["form", "form-field"] },
    ],
  },
  {
    id: "data",
    label: "Data",
    icon: "table",
    blurb: "Tables, figures and the states between them.",
    sections: [
      { label: "Tables", items: ["data-table", "pagination"] },
      { label: "Display", items: ["badge", "avatar", "stat", "description-list", "timeline", "calendar"] },
      { label: "Loading & empty", items: ["empty", "skeleton", "progress"] },
    ],
  },
  {
    id: "charts",
    label: "Charts",
    icon: "trendUp",
    blurb: "One engine, every type.",
    sections: [{ label: "Charts", items: ["chart"] }],
  },
  {
    id: "structure",
    label: "Structure",
    icon: "dashboard",
    blurb: "Surfaces, page sections and long-form content.",
    sections: [
      { label: "Containers", items: ["card", "grid", "separator", "ratio", "figure", "split-pane", "scroll-area"] },
      { label: "Page sections", items: ["page-header", "toolbar", "tabs", "collapsible", "wizard"] },
      { label: "Content", items: ["prose", "code", "diff"] },
    ],
  },
  {
    id: "navigation",
    label: "Navigation",
    icon: "list",
    blurb: "Bars, menus and ways to find your place.",
    sections: [
      { label: "Bars & menus", items: ["navbar", "sidebar", "menubar", "menu", "breadcrumb", "list-group", "tree"] },
      { label: "Wayfinding", items: ["command", "scrollspy", "back-to-top"] },
    ],
  },
  {
    id: "actions",
    label: "Actions",
    icon: "cursor",
    blurb: "Buttons and the panels they open.",
    sections: [
      { label: "Buttons", items: ["button", "toggle", "fab", "kbd"] },
      { label: "Menus & overlays", items: ["dropdown", "context-menu", "popover", "tooltip"] },
    ],
  },
  {
    id: "feedback",
    label: "Feedback",
    icon: "bell",
    blurb: "Messages, dialogs and guidance.",
    sections: [
      { label: "Messages", items: ["alert", "toast", "banner", "consent"] },
      { label: "Dialogs & guides", items: ["modal", "sheet", "tour"] },
    ],
  },
  {
    id: "marketing",
    label: "Marketing & media",
    icon: "star",
    blurb: "Landing-page sections, media and scroll effects.",
    sections: [
      { label: "Sections", items: ["hero", "feature-grid", "pricing", "testimonial", "site-footer"] },
      { label: "Media & motion", items: ["carousel", "lightbox", "reveal"] },
    ],
  },
];

/** A page that is not a component: a foundation, a layout, an integration page. */
export type SitePage = { path: string; label: string; icon: IconName; blurb: string };

export const FOUNDATIONS: readonly SitePage[] = [
  {
    path: "foundations/tokens.html",
    label: "Design tokens",
    icon: "palette",
    blurb: "Every custom property the components read — colour, space, radius, shadow, type, motion, layout.",
  },
  {
    path: "foundations/typography.html",
    label: "Typography",
    icon: "heading",
    blurb: "Headings, body text, the type scale and the text utilities.",
  },
  {
    path: "foundations/icons.html",
    label: "Icons",
    icon: "star",
    blurb: "The built-in line icons, as template calls or from the SVG sprite.",
  },
  {
    path: "foundations/utilities.html",
    label: "Grid & utilities",
    icon: "dashboard",
    blurb: "The twelve-column grid per breakpoint and the token-driven utility classes.",
  },
  {
    path: "foundations/motion.html",
    label: "Motion",
    icon: "play",
    blurb: "Durations, easings and the shared enter/exit keyframes — all switched off by reduced motion.",
  },
  {
    path: "foundations/theming.html",
    label: "Themes & dark mode",
    icon: "moon",
    blurb: "Sample themes, the light/dark switch, a site default and control density.",
  },
  {
    path: "foundations/theme-builder.html",
    label: "Theme builder",
    icon: "settings",
    blurb:
      "Move a control and every component follows. Export writes the tokens you changed as a theme file — one stylesheet loaded after the bundle.",
  },
];

export const LAYOUT_INFO: Record<LayoutName, { label: string; icon: IconName; blurb: string }> = {
  stacked: { label: "Stacked", icon: "menu", blurb: "Header, content, footer — a marketing site or a simple app." },
  sidebar: {
    label: "Sidebar",
    icon: "columns",
    blurb: "Header, side navigation and content; a drawer on phones, a collapsible rail on desktops.",
  },
  rail: {
    label: "Rail",
    icon: "grip",
    blurb: "An icon rail beside the content that turns into a bottom tab bar on phones.",
  },
  split: { label: "Split", icon: "columns", blurb: "A list pane and a detail pane; one at a time on phones." },
  article: { label: "Article", icon: "alignLeft", blurb: "A reading column at a comfortable measure, with an aside." },
  docs: { label: "Docs", icon: "file", blurb: "Navigation, content and an on-this-page table of contents." },
  auth: { label: "Auth", icon: "lock", blurb: "A centred card for sign-in, optionally beside a narrative panel." },
  focus: { label: "Focus", icon: "eye", blurb: "One column and no chrome, for a checkout or a wizard." },
};

export const RAPID_PAGES: readonly SitePage[] = [
  {
    path: "rapid/integration.html",
    label: "Integration",
    icon: "plug",
    blurb: "The data-* attributes, events and templates that connect the library to rAPId's runtime.",
  },
  {
    path: "rapid/errors.html",
    label: "Error pages",
    icon: "warning",
    blurb: "The CSP-clean replacement for rAPId's default error page, in each mode it renders.",
  },
];

export const ADMIN_PAGES: readonly { file: string; label: string; icon: IconName }[] = [
  { file: "dashboard", label: "Dashboard", icon: "dashboard" },
  { file: "projects", label: "Projects", icon: "folder" },
  { file: "team", label: "Team", icon: "users" },
  { file: "profile", label: "Profile", icon: "user" },
  { file: "invoice", label: "Invoice", icon: "invoice" },
  { file: "tables", label: "Tables", icon: "table" },
  { file: "forms", label: "Forms", icon: "edit" },
  { file: "settings", label: "Settings", icon: "settings" },
  { file: "lock-screen", label: "Lock screen", icon: "lock" },
  { file: "404", label: "Not found", icon: "warning" },
];

export const componentPath = (name: string): string => `components/${name}.html`;
export const layoutPath = (name: string): string => `layouts/${name}.html`;

/**
 * The sidebar menu for one page. `current` is the page's path from the
 * demo root, `base` the prefix that leads back to the root from it ("" or
 * "../"). The current leaf is marked, every group above it is rendered
 * open, everything else is closed.
 */
export function siteMenu(current: string, base: string): MenuItem[] {
  const icon = (name: IconName) => Icon(name, { size: 18 });
  const leaf = (path: string, label: string, name: IconName): MenuItem => ({
    label,
    href: base + path,
    icon: icon(name),
    active: path === current,
  });
  const group = (label: string, name: IconName | undefined, children: MenuItem[]): MenuItem => ({
    label,
    icon: name && icon(name),
    children,
    expanded: children.some(holds),
  });
  const holds = (item: MenuItem): boolean => Boolean(item.active || item.children?.some(holds));

  const components = COMPONENT_TREE.map((g) => {
    const leaves = (items: readonly string[]) =>
      items.map((name) => leaf(componentPath(name), COMPONENTS[name]!.label, COMPONENTS[name]!.icon));
    // A one-component group is a plain link (Charts); a one-section group is flat.
    if (g.sections.length === 1 && g.sections[0]!.items.length === 1) {
      return leaf(componentPath(g.sections[0]!.items[0]!), g.label, g.icon);
    }
    if (g.sections.length === 1) return group(g.label, g.icon, leaves(g.sections[0]!.items));
    return group(
      g.label,
      g.icon,
      g.sections.map((s) => group(s.label, undefined, leaves(s.items))),
    );
  });

  return [
    leaf("index.html", "Overview", "home"),
    group("Foundations", "palette", FOUNDATIONS.map((p) => leaf(p.path, p.label, p.icon))),
    ...components,
    group(
      "Layouts",
      "columns",
      (Object.keys(LAYOUT_INFO) as LayoutName[]).map((n) =>
        leaf(layoutPath(n), LAYOUT_INFO[n].label, LAYOUT_INFO[n].icon)
      ),
    ),
    group("rAPId", "plug", RAPID_PAGES.map((p) => leaf(p.path, p.label, p.icon))),
    group(
      "Example app",
      "users",
      ADMIN_PAGES.map((p) => ({ label: p.label, href: `${base}admin/${p.file}.html`, icon: icon(p.icon) })),
    ),
  ];
}
