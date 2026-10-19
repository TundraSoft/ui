import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { frameHeader } from "../header.ts";

export type RailItem = {
  href: string;
  /** Accessible name — the rail shows only the icon. */
  label: string;
  icon: Html;
  active?: boolean;
};

export type RailLayoutProps = {
  /** One or two characters, or a mark. Hidden on the mobile tab bar. */
  brand?: Html | string;
  items: RailItem[];
  /** Pinned to the rail's end (settings, avatar). Hidden on mobile. */
  end?: Html;
  header?: Html;
  /**
   * A full-width second row under the header: an announcement or ticker
   * strip, a secondary nav. Content wider than the screen scrolls inside
   * the strip instead of widening the page.
   */
  subheader?: Html;
  content: Html;
  width?: "fluid" | "boxed";
  contentId?: string;
  attrs?: Attrs;
};

/** Icon rail + content; the rail becomes a bottom tab bar on phones. */
export function RailLayout(props: RailLayoutProps): Html {
  return html`<div${classAttrs("layout layout--rail", props.attrs, props.width === "boxed" && "layout--boxed")}>${
    frameHeader(props.header, props.subheader)
  }<div class="layout__body"><nav class="layout__rail" aria-label="Main">${
    props.brand && html`<span class="layout__rail-brand">${props.brand}</span>`
  }${
    props.items.map((item) =>
      html`
        <a class="layout__rail-link" href="${item.href}" aria-label="${item.label}" title="${item.label}" ${renderAttrs(
          { "aria-current": item.active ? "page" : undefined },
        )}>${item.icon}</a>
      `
    )
  }${props.end && html`<span class="layout__rail-end">${props.end}</span>`}</nav><main class="layout__content" id="${
    props.contentId ?? "main-content"
  }">${props.content}</main></div></div>`;
}
