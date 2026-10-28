import { type Html, html, raw } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type ProseSize = "sm" | "md" | "lg";

export type ProseProps = {
  /** Rendered content — a document body, a Markdown preview, help text. */
  content: Html;
  /** @default "md" */
  size?: ProseSize;
  /** Cap the line length at `--layout-measure` (70ch). */
  measure?: boolean;
  /** Extra attributes on the wrapper; a `class` merges. */
  attrs?: Attrs;
};

/**
 * Typography for flowing content the kit did not build — the HTML a
 * Markdown renderer or a CMS hands back: headings, paragraphs, lists,
 * quotes, code, tables, images, rules. Everything under `.prose` is
 * styled by element, so the content needs no classes of its own.
 */
export function Prose(props: ProseProps): Html {
  const size = props.size ?? "md";
  return html`
    <div ${classAttrs(
      "prose",
      props.attrs,
      size !== "md" && `prose--${size}`,
      props.measure && "prose--measure",
    )}>${props
      .content}</div>
  `;
}

/**
 * Wraps an HTML string the server has ALREADY SANITISED as `Html`, so it
 * can be the `content` of `Prose`. THIS IS THE ONE PLACE A STRING BYPASSES
 * ESCAPING: pass it ONLY markup your own renderer produced from a trusted
 * source or ran through an allow-list sanitiser — NEVER user input, a
 * request body, or anything a browser sent you. If in doubt, escape it
 * normally with `html` instead.
 */
export function proseHtml(trusted: string): Html {
  return raw(trusted);
}
