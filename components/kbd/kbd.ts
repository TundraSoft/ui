import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { inline } from "../../shared/inline.ts";

export type KbdSize = "sm" | "md";

export type KbdProps = {
  /** One key, or several rendered as a chord (`["⌘", "K"]`). */
  keys: string | string[];
  size?: KbdSize;
  attrs?: Attrs;
};

/** A keycap, or a chord of them — for shortcuts in menus, tooltips and docs. */
export function Kbd(props: KbdProps): Html {
  const keys = Array.isArray(props.keys) ? props.keys : [props.keys];
  const cap = (k: string) => html`<kbd class="kbd__key">${k}</kbd>`;
  if (keys.length === 1) {
    return inline(
      html`<kbd${classAttrs("kbd kbd__key", props.attrs, props.size === "sm" && "kbd--sm")}>${keys[0]}</kbd>`,
    );
  }
  return inline(
    html`<kbd${classAttrs("kbd kbd--chord", props.attrs, props.size === "sm" && "kbd--sm")}>${
      keys.map((k, i) => html`${i > 0 ? html`<span class="kbd__plus" aria-hidden="true">+</span>` : ""}${cap(k)}`)
    }</kbd>`,
  );
}
