import { type Html, html } from "@tundralibs/rapid/ui";
import { inline } from "../../shared/inline.ts";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

export type AvatarSize = "sm" | "md" | "lg";

/** Presence, shown as a dot on the avatar's corner. */
export type AvatarStatus = "online" | "away" | "busy" | "offline";

export type AvatarProps = {
  src?: string;
  alt?: string;
  /** Shown without `src`: initials, or markup (an icon for a pending invite, a removed person). */
  initials?: string | Html;
  size?: AvatarSize;
  /** A presence dot — green, amber, red or grey — with its name for screen readers. */
  status?: AvatarStatus;
  /** What a screen reader hears for the dot. @default the status, capitalised */
  statusLabel?: string;
  attrs?: Attrs;
};

const STATUS_LABEL: Record<AvatarStatus, string> = {
  online: "Online",
  away: "Away",
  busy: "Busy",
  offline: "Offline",
};

const SIZE_CLASS: Record<AvatarSize, string> = {
  sm: "avatar--sm",
  md: "",
  lg: "avatar--lg",
};

export function Avatar(props: AvatarProps): Html {
  const className = cx("avatar", SIZE_CLASS[props.size ?? "md"], props.status && "avatar--status");
  const inner = props.src ? html`<img src="${props.src}" alt="${props.alt ?? ""}">` : (props.initials ?? "");
  const status = props.status
    ? html`<span class="avatar__status avatar__status--${props.status}"><span class="sr-only">${
      props.statusLabel ?? STATUS_LABEL[props.status]
    }</span></span>`
    : "";

  return inline(html`
    <span ${classAttrs(className, props.attrs ?? {})}>${inner}${status}</span>
  `);
}

export function AvatarGroup(props: { avatars: Html[]; attrs?: Attrs }): Html {
  return inline(html`
    <div ${classAttrs("avatar-group", props.attrs ?? {})}>${props.avatars}</div>
  `);
}
