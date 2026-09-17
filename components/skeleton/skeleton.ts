import { type Html, html } from "@tundralibs/rapid/ui";
import { cx } from "../../shared/classnames.ts";

/**
 * Width steps map to `.skeleton--w-*` classes (see skeleton.css) — a
 * fixed scale rather than an arbitrary length, so no inline style is
 * ever emitted (CSP). Pick the step closest to the content's box.
 */
export type SkeletonWidth = "xs" | "sm" | "md" | "lg" | "xl" | "half" | "full";

export type SkeletonProps = {
  variant?: "text" | "title" | "block" | "avatar" | "circle";
  width?: SkeletonWidth;
};

/**
 * Pairs with data-load: render the skeleton server-side, let the lazy GET
 * swap in the real fragment. Match the real content's box or it will jump.
 */
export function Skeleton(props: SkeletonProps = {}): Html {
  return html`<span class="${
    cx("skeleton", `skeleton--${props.variant ?? "text"}`, props.width && `skeleton--w-${props.width}`)
  }" aria-hidden="true"></span>`;
}

export type SkeletonTableProps = { rows?: number; columns?: SkeletonWidth[][] };

export function SkeletonTable(props: SkeletonTableProps = {}): Html {
  const rows = props.rows ?? 4;
  const widths: SkeletonWidth[][] = props.columns ??
    [["lg", "sm"], ["md", "md"], ["xl", "xs"], ["lg", "md"]];

  return html`
    <div class="skeleton-table"
      aria-busy="true"><div class="skeleton-table__head">${Skeleton({ width: "sm" })}${Skeleton({
        width: "xs",
      })}</div>${Array.from({ length: rows }, (_, i) => {
        const w = widths[i % widths.length];
        return html`<div class="skeleton-table__row">${w.map((x) => Skeleton({ width: x }))}</div>`;
      })}</div>
  `;
}

export function SkeletonCard(): Html {
  return html`<div class="skeleton-card" aria-busy="true">${Skeleton({ variant: "block" })}${
    Skeleton({ variant: "title" })
  }${Skeleton({ width: "full" })}${Skeleton({ width: "half" })}</div>`;
}
