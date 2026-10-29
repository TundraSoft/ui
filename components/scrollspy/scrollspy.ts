import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";

/** One link of the spy; `href` is a hash to a section on the page. */
export type ScrollSpyItem = {
  label: string | Html;
  /** `"#section-id"` — the element the link follows and the spy watches. */
  href: string;
  /** Sub-sections, drawn as a nested list. */
  children?: ScrollSpyItem[];
};

export type ScrollSpyProps = {
  id: string;
  items: ScrollSpyItem[];
  /** The nav's accessible name. @default "On this page" */
  label?: string;
  /**
   * Pixels under a sticky header where a section counts as "current".
   * @default the `--scroll-padding-top` token (the sticky navbar's height)
   */
  offset?: number;
  /** Stick to the top of the viewport (under the sticky header) while its column scrolls. */
  sticky?: boolean;
  attrs?: Attrs;
};

function renderItems(items: ScrollSpyItem[]): Html {
  return html`<ul class="scrollspy__list">${
    items.map((item) =>
      html`<li class="scrollspy__item"><a class="scrollspy__link" href="${item.href}">${item.label}</a>${
        item.children?.length ? renderItems(item.children) : ""
      }</li>`
    )
  }</ul>`;
}

/**
 * "On this page" links that follow the reader: scrollspy.js marks the link
 * of the section nearest the top (`aria-current="true"`, `.is-active`) and
 * the parent of an active sub-section. Any other element can opt in with
 * `data-scrollspy` around its own `a[href^="#"]` links — the DocsLayout
 * table of contents does. Without the script it is a plain list of links.
 */
export function ScrollSpy(props: ScrollSpyProps): Html {
  return html`<nav${
    classAttrs(
      "scrollspy",
      mergeAttrs(props.attrs, { id: props.id, "aria-label": props.label ?? "On this page" }),
      props.sticky && "scrollspy--sticky",
    )
  }${
    renderAttrs({
      "data-scrollspy": "",
      "data-scrollspy-offset": props.offset === undefined ? undefined : String(props.offset),
    })
  }>${renderItems(props.items)}</nav>`;
}
