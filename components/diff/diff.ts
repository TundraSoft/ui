import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";

/** A line's part in the change: added, removed, unchanged context, or a hunk header. */
export type DiffLineType = "add" | "remove" | "context" | "meta";

export type DiffLine = {
  type: DiffLineType;
  /** The line's text, without its newline. */
  text: string;
  /** Line number in the old text (context and removed lines). */
  oldNo?: number;
  /** Line number in the new text (context and added lines). */
  newNo?: number;
};

/** One column of changes (`unified`) or old beside new (`split`). */
export type DiffViewMode = "unified" | "split";
/** How tall the view may grow before it scrolls inside itself: 12 / 20 / 32 rem. */
export type DiffViewSize = "sm" | "md" | "lg";

export type DiffViewProps = {
  id?: string;
  /** The lines, in order — from {@link diffLines} or a parsed patch. */
  lines: DiffLine[];
  /** @default "unified" */
  view?: DiffViewMode;
  /** The file's path, shown in the header. */
  title?: string;
  /** Show `+N −M` in the header. @default true */
  stats?: boolean;
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean;
  /** Cap the height; the view scrolls inside itself past it. */
  maxHeight?: DiffViewSize;
  attrs?: Attrs;
};

/**
 * A line diff of two short texts — a config file, a template, a note —
 * for the server to compute and {@link DiffView} to draw. Plain
 * longest-common-subsequence over lines, deterministic, no heuristics;
 * it is O(n·m) in memory, so keep it to texts of a few hundred lines and
 * use a real diff engine beyond that. Unchanged lines come back as
 * `context` with both numbers.
 */
export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.replace(/\n$/, "").split("\n");
  const b = after.replace(/\n$/, "").split("\n");
  const n = a.length;
  const m = b.length;
  // lcs[i][j] = length of the LCS of a[i..] and b[j..]
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      out.push({ type: "context", text: a[i], oldNo: i + 1, newNo: j + 1 });
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      out.push({ type: "add", text: b[j], newNo: j + 1 });
      j++;
    } else {
      out.push({ type: "remove", text: a[i], oldNo: i + 1 });
      i++;
    }
  }
  return out;
}

const no = (value: number | undefined) => value === undefined ? "" : String(value);

function unifiedRow(line: DiffLine): Html {
  if (line.type === "meta") {
    return html`
      <tr class="diff__line diff__line--meta">
        <td class="diff__text" colspan="3">${line.text}</td>
      </tr>
    `;
  }
  return html`
    <tr class="diff__line diff__line--${line.type}">
      <td class="diff__no">${no(line.oldNo)}</td>
      <td
        class="diff__no">${no(line.newNo)}</td>
      <td class="diff__text">${line.text}</td>
    </tr>
  `;
}

/** Pair removed and added runs side by side; context on both sides; meta spans. */
function splitRows(lines: DiffLine[]): Html[] {
  const rows: Html[] = [];
  const cell = (line: DiffLine | undefined, side: "old" | "new") =>
    line
      ? html`
        <td class="${cx("diff__no", `diff__no--${line.type}`)}">${no(side === "old" ? line.oldNo : line.newNo)}</td>
        <td class="${cx("diff__text", `diff__text--${line.type}`)}">${line.text}</td>
      `
      : html`
        <td class="diff__no diff__no--empty"></td>
        <td class="diff__text diff__text--empty"></td>
      `;
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === "meta") {
      rows.push(html`
        <tr class="diff__line diff__line--meta">
          <td class="diff__text" colspan="4">${line.text}</td>
        </tr>
      `);
      i++;
      continue;
    }
    if (line.type === "context") {
      rows.push(html`<tr class="diff__line diff__line--context">${cell(line, "old")}${cell(line, "new")}</tr>`);
      i++;
      continue;
    }
    const removed: DiffLine[] = [];
    const added: DiffLine[] = [];
    while (i < lines.length && (lines[i].type === "remove" || lines[i].type === "add")) {
      (lines[i].type === "remove" ? removed : added).push(lines[i]);
      i++;
    }
    const count = Math.max(removed.length, added.length);
    for (let k = 0; k < count; k++) {
      rows.push(
        html`<tr class="diff__line diff__line--change">${cell(removed[k], "old")}${cell(added[k], "new")}</tr>`,
      );
    }
  }
  return rows;
}

/**
 * A line diff as a table: number gutters, `+` / `−` markers drawn by CSS
 * (so a copied selection is the text alone), added and removed lines on
 * the status tones, hunk headers muted. `unified` is one column of
 * changes, `split` is old beside new with removed and added runs paired
 * row by row. Rendered by the server from {@link DiffLine}s —
 * {@link diffLines} makes them from two strings.
 */
export function DiffView(props: DiffViewProps): Html {
  const view = props.view ?? "unified";
  const adds = props.lines.filter((l) => l.type === "add").length;
  const removes = props.lines.filter((l) => l.type === "remove").length;
  const header = props.title || props.stats !== false
    ? html`
      <div class="diff__header">${props.title ? html`<span class="diff__title">${props.title}</span>` : ""}${props
          .stats !== false
        ? html`<span class="diff__stats"><span class="diff__stat diff__stat--add">+${String(adds)}</span><span
            class="diff__stat diff__stat--remove">&minus;${String(removes)}</span></span>`
        : ""}</div>
    `
    : "";
  const rows = view === "split" ? splitRows(props.lines) : props.lines.map(unifiedRow);
  return html`
    <div ${classAttrs(
      "diff",
      mergeAttrs(props.attrs, { id: props.id }),
      `diff--${view}`,
      props.wrap && "diff--wrap",
      props.maxHeight && `diff--${props.maxHeight}`,
    )}
      data-diff>${header}<div ${renderAttrs({
        class: "diff__scroll",
        tabindex: props.maxHeight ? "0" : undefined,
      })}><table class="diff__table"><tbody>${rows}</tbody></table></div></div>
  `;
}
