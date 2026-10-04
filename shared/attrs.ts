import { type Html, html, raw } from "@tundralibs/rapid/ui";
import { cx } from "./classnames.ts";

/**
 * Root-element attributes for a component: values are escaped normally
 * through `html`; `undefined` entries are dropped (so optional props can
 * flow straight in without callers filtering them out first).
 */
export type Attrs = Record<string, string | undefined>;

/**
 * A caller's `attrs` with the component's own attributes on top — except
 * that an own value of `undefined` ("not set by this prop") never erases
 * what the caller passed. A plain `{ ...attrs, own: maybe }` spread drops
 * the caller's `own` whenever the prop is absent; use this instead.
 */
export function mergeAttrs(base: Attrs | undefined, own: Attrs): Attrs {
  const out: Attrs = { ...base };
  for (const [name, value] of Object.entries(own)) if (value !== undefined) out[name] = value;
  return out;
}

/** Attribute *names* are the one thing that must go through `raw()`, so
 * they are validated instead of escaped — a name is never user data. */
const NAME = /^[a-zA-Z_:][-a-zA-Z0-9_:.]*$/;

export function renderAttrs(attrs: Attrs): Html {
  const parts = Object.entries(attrs)
    .filter((entry): entry is [string, string] => entry[1] !== undefined)
    .map(([name, value]) => {
      if (!NAME.test(name)) throw new Error(`Invalid attribute name: ${JSON.stringify(name)}`);
      return html`${raw(` ${name}="`)}${value}${raw('"')}`;
    });
  return html`${parts}`;
}

/**
 * Merge a caller's `attrs.class` into a component's own class list and
 * render the rest. A second `class` attribute is silently discarded by
 * the HTML parser, so every component that accepts `attrs` renders its
 * root with this instead of `class="…"${renderAttrs(attrs)}`.
 */
export function classAttrs(
  className: string | false | undefined,
  attrs: Attrs | undefined,
  ...extra: (string | false | undefined)[]
): Html {
  const { class: fromAttrs, ...rest } = attrs ?? {};
  const merged = cx(className, ...extra, fromAttrs);
  return renderAttrs({ class: merged || undefined, ...rest });
}
