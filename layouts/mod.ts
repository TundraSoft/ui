/**
 * Layouts are frames: chrome and slots, never content. Each is a plain
 * function of typed `Html` slots; `asRapidLayout()` (templates/layout.ts)
 * turns any of them into the `RapidTemplate` a rAPId app hands to
 * `ui.layout`.
 */
export { StackedLayout, type StackedLayoutProps } from "./stacked/stacked.ts";
export { SidebarLayout, type SidebarLayoutProps } from "./sidebar/sidebar.ts";
export { type RailItem, RailLayout, type RailLayoutProps } from "./rail/rail.ts";
export { SplitLayout, type SplitLayoutProps } from "./split/split.ts";
export { ArticleLayout, type ArticleLayoutProps } from "./article/article.ts";
export { DocsLayout, type DocsLayoutProps } from "./docs/docs.ts";
export { AuthLayout, type AuthLayoutProps } from "./auth/auth.ts";
export { FocusLayout, type FocusLayoutProps } from "./focus/focus.ts";
