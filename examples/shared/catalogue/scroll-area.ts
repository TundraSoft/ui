/** Catalogue cases for components/scroll-area — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Grid, GridCol } from "../../../components/grid/grid.ts";
import { ScrollArea, type ScrollAreaSize } from "../../../components/scroll-area/scroll-area.ts";
import { caseCopy, caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const sizes: ScrollAreaSize[] = ["sm", "md", "lg"];

const longList = html`
  <ul class="menu__list">${Array.from(
    { length: 30 },
    (_, i) => html`<li><a class="menu__link" href="#">Entry ${i + 1}</a></li>`,
  )}</ul>
`;

const wideTable = html`
  <table class="data-table__table">
    <thead>
      <tr>${Array.from({ length: 14 }, (_, i) => html`<th>Column ${i + 1}</th>`)}</tr>
    </thead>
    <tbody>${Array.from(
      { length: 6 },
      (_, r) => html`<tr>${Array.from({ length: 14 }, (_, c) => html`<td>Cell ${r + 1}.${c + 1}</td>`)}</tr>`,
    )}</tbody>
  </table>
`;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  // Lazily: catalogue.ts imports this file, so caseCopy is not yet defined at module load.
  const copy = html`${Array.from({ length: 12 }, () => caseCopy)}`;
  return {
    name: "scroll-area",
    cases: [
      caseOf(
        "a long list capped at sm (axis y, the default) — edge shadows show only where there is more (#cat-scroll-list)",
        ScrollArea({
          content: longList,
          axis: "y",
          maxHeight: "sm",
          attrs: { id: "cat-scroll-list", class: "cat-narrow" },
        }),
      ),
      caseOf(
        "axis x — a wide table, shadows at the start and end edges; labelled, so the keyboard can scroll it (#cat-scroll-wide)",
        ScrollArea({ content: wideTable, axis: "x", label: "Wide table", attrs: { id: "cat-scroll-wide" } }),
      ),
      caseOf(
        "axis both at sm, thin scrollbar",
        ScrollArea({ content: wideTable, axis: "both", maxHeight: "sm", thin: true, label: "Wide and tall table" }),
      ),
      caseOf(
        "maxHeight sm / md / lg; shadows: false for a plain container",
        Grid({
          items: [
            ...sizes.map((maxHeight) =>
              GridCol({ span: 3, content: ScrollArea({ content: copy, maxHeight, label: `Copy, ${maxHeight}` }) })
            ),
            GridCol({
              span: 3,
              content: ScrollArea({ content: copy, maxHeight: "sm", shadows: false, label: "Plain" }),
            }),
          ],
        }),
      ),
    ],
  };
}
