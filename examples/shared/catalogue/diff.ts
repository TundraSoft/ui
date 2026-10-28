/** Catalogue cases for components/diff — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { type DiffLine, diffLines, DiffView } from "../../../components/diff/diff.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const BEFORE = `{
  "name": "@tundralibs/ui",
  "version": "0.23.0",
  "exports": {
    ".": "./mod.ts",
    "./card": "./components/card/card.ts"
  },
  "private": false
}
`;

const AFTER = `{
  "name": "@tundralibs/ui",
  "version": "0.24.0",
  "exports": {
    ".": "./mod.ts",
    "./card": "./components/card/card.ts",
    "./code": "./components/code/code.ts",
    "./diff": "./components/diff/diff.ts"
  },
  "private": false,
  "sideEffects": false
}
`;

/* Lines as a parsed patch hands them over — with hunk headers. */
const PATCH: DiffLine[] = [
  { type: "meta", text: "@@ -1,6 +1,6 @@" },
  { type: "context", text: ".btn {", oldNo: 1, newNo: 1 },
  { type: "remove", text: "  padding: 6px 12px;", oldNo: 2 },
  { type: "remove", text: "  border-radius: 4px;", oldNo: 3 },
  { type: "add", text: "  padding: var(--space-2) var(--space-3);", newNo: 2 },
  { type: "add", text: "  border-radius: var(--radius-md);", newNo: 3 },
  { type: "context", text: "  font: inherit;", oldNo: 4, newNo: 4 },
  { type: "context", text: "}", oldNo: 5, newNo: 5 },
  { type: "meta", text: "@@ -40,3 +40,4 @@" },
  { type: "context", text: ".btn--danger {", oldNo: 40, newNo: 40 },
  { type: "add", text: "  --btn-bg: var(--color-danger);", newNo: 41 },
  { type: "context", text: "}", oldNo: 41, newNo: 42 },
];

const LONG_BEFORE = Array.from({ length: 40 }, (_, i) => `line ${i + 1}`).join("\n");
const LONG_AFTER = Array.from({ length: 40 }, (_, i) => (i % 7 === 3 ? `line ${i + 1} changed` : `line ${i + 1}`))
  .join("\n");

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  const lines = diffLines(BEFORE, AFTER);
  return {
    name: "diff",
    cases: [
      caseOf(
        "unified — diffLines(before, after), title and stats (#cat-diff-unified)",
        DiffView({ id: "cat-diff-unified", title: "deno.json", lines, view: "unified" }),
      ),
      caseOf(
        "split — the same change, old beside new (#cat-diff-split)",
        DiffView({ id: "cat-diff-split", title: "deno.json", lines, view: "split" }),
      ),
      caseOf(
        "a parsed patch with hunk headers (meta lines) · stats: false · wrap: true",
        html`
          <div class="stack">${DiffView({ lines: PATCH, title: "button.css", stats: false })}${DiffView({
            lines: [
              {
                type: "remove",
                text: "A very long line " + "that should wrap ".repeat(12) + "rather than scroll.",
                oldNo: 1,
              },
              {
                type: "add",
                text: "A very long line " + "that now wraps ".repeat(12) + "rather than scroll.",
                newNo: 1,
              },
            ],
            wrap: true,
          })}</div>
        `,
      ),
      caseOf(
        "maxHeight sm / md / lg — the view scrolls inside itself (#cat-diff-sm)",
        html`
          <div class="stack">${DiffView({
            id: "cat-diff-sm",
            title: "sm",
            lines: diffLines(LONG_BEFORE, LONG_AFTER),
            maxHeight: "sm",
          })}${DiffView({ title: "md", lines: diffLines(LONG_BEFORE, LONG_AFTER), maxHeight: "md" })}${DiffView({
            title: "lg",
            lines: diffLines(LONG_BEFORE, LONG_AFTER),
            maxHeight: "lg",
            view: "split",
          })}</div>
        `,
      ),
    ],
  };
}
