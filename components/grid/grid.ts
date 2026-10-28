import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs } from "../../shared/attrs.ts";

export type GridColSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

/**
 * The grid's breakpoints, mobile first: `xs` is every width, `sm` from
 * 576px, `md` from 768px, `lg` from 992px, `xl` from 1400px — the same
 * bands the layouts and the `.hide-*` / `.d-*-*` utilities use.
 */
export type GridBreakpoint = "xs" | "sm" | "md" | "lg" | "xl";

/**
 * A span per breakpoint, mobile first: a width applies from its
 * breakpoint upward until a larger one sets another. `{ sm: 6, lg: 3 }`
 * is full width on a phone, half from 576px and a quarter from 992px.
 */
export type GridColSpans = Partial<Record<GridBreakpoint, GridColSpan>>;

/** Columns below 768px, where every `col-N` otherwise collapses to one. */
export type GridPhoneColumns = "1" | "2";

/** The gutter between cells: `--space-2`, `--space-4` (default) or `--space-6`. */
export type GridGap = "sm" | "md" | "lg";

export type GridProps = {
  items: Html[];
  /**
   * Below 768px the grid is one column (every item full width) unless
   * this says `"2"`: then items sit two-up — stat tiles, small cards —
   * instead of stacking one tall tile per row. @default "1"
   */
  phoneColumns?: GridPhoneColumns;
  /** The gutter between cells. @default "md" */
  gap?: GridGap;
  attrs?: Attrs;
};

export function Grid(props: GridProps): Html {
  return html`
    <div ${classAttrs(
      "grid",
      props.attrs,
      props.phoneColumns === "2" && "grid--phone-2",
      props.gap && props.gap !== "md" && `grid--gap-${props.gap}`,
    )}>${props.items}</div>
  `;
}

export type GridColProps = {
  /**
   * How many of the 12 columns the cell spans. A number applies from
   * 768px (`col-N`; below that every cell is full width, or two-up with
   * `phoneColumns`). An object sets a span per breakpoint, mobile first
   * (`col-xs-N` … `col-xl-N`): `{ xs: 6, md: 4, xl: 3 }`.
   */
  span?: GridColSpan | GridColSpans;
  content: Html;
  attrs?: Attrs;
};

const breakpoints: GridBreakpoint[] = ["xs", "sm", "md", "lg", "xl"];

/** The `col-*` classes for a span, as `GridCol` renders them. */
export function gridColClasses(span: GridColProps["span"]): string | undefined {
  if (span === undefined) return undefined;
  if (typeof span === "number") return `col-${span}`;
  const classes = breakpoints.flatMap((bp) => span[bp] ? [`col-${bp}-${span[bp]}`] : []);
  return classes.length ? classes.join(" ") : undefined;
}

/** Wraps `content` with `col-*` span classes for direct placement inside a Grid. */
export function GridCol(props: GridColProps): Html {
  return html`
    <div ${classAttrs(gridColClasses(props.span), props.attrs)}>${props.content}</div>
  `;
}
