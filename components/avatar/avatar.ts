import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type AvatarSize = "sm" | "md" | "lg";

export type AvatarProps = {
  src?: string;
  alt?: string;
  initials?: string;
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

  return html`
    <span class="${className}" ${renderAttrs(props.attrs ?? {})}>${inner}</span>
  `;
}

export function AvatarGroup(props: { avatars: Html[]; attrs?: Attrs }): Html {
  return html`
    <div class="avatar-group" ${renderAttrs(props.attrs ?? {})}>${props.avatars}</div>
  `;
}
