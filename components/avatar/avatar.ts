import { type Html, html } from "@tundralibs/rapid/ui";
import { inline } from "../../shared/inline.ts";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = {
  src?: string;
  alt?: string;
  /** Shown without `src`: initials, or markup (an icon for a pending invite, a removed person). */
  initials?: string | Html;
  size?: AvatarSize;
  attrs?: Attrs;
};

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "avatar--sm",
  md: "",
  lg: "avatar--lg",
};

export function Avatar(props: AvatarProps): Html {
  const className = cx("avatar", SIZE_CLASS[props.size ?? "md"]);
  const inner = props.src ? html`<img src="${props.src}" alt="${props.alt ?? ""}">` : (props.initials ?? "");

  return inline(html`
    <span ${classAttrs(className, props.attrs ?? {})}>${inner}</span>
  `);
}

export function AvatarGroup(props: { avatars: Html[]; attrs?: Attrs }): Html {
  return inline(html`
    <div ${classAttrs("avatar-group", props.attrs ?? {})}>${props.avatars}</div>
  `);
}
