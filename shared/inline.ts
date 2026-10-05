import { type Html, raw, render } from "@tundralibs/rapid/ui";

/**
 * An inline component's markup without the whitespace a multi-line
 * template literal leaves around it. Avatars, buttons, icons and badges
 * sit in running text and in rows of their own kind, where a leading or
 * trailing newline renders as a visible gap — and `deno fmt` reflows long
 * templates onto new lines, so the template alone cannot be trusted to
 * stay tight. Only already-rendered `Html` goes through `raw()` here.
 */
export function inline(markup: Html): Html {
  return raw(render(markup).trim());
}
