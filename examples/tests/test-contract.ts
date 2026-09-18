/**
 * The rAPId contract this library depends on, checked against the
 * runtime rAPId actually ships: `UI_RUNTIME`, `UI_HISTORY` and `UI_LIVE`
 * are the client scripts' source text, exported as strings, so every
 * attribute, event, header default and API this library reads or writes
 * can be asserted to still be there. A rename in a new rAPId then fails
 * here — naming the hook and the file that uses it — instead of as a
 * browser-suite timeout. Runs in seconds, needs no Chrome; first in
 * `deno task test` and in the daily rAPId bump workflow.
 */
import { UI_HISTORY, UI_LIVE, UI_RUNTIME } from "@tundralibs/rapid/ui";
import { exit } from "@tundralibs/compat/runtime";

type Expectation = { needle: string; usedBy: string };

const runtime: Expectation[] = [
  // The data-* vocabulary every server-driven component emits (CLAUDE.md §2).
  { needle: "dataset.action", usedBy: "every [data-action] link/button/form" },
  { needle: "dataset.target", usedBy: "data-target on sort links, forms, toasts" },
  { needle: "dataset.swap", usedBy: "data-swap=outer/append" },
  { needle: "dataset.method", usedBy: "data-method=post on RowActions items" },
  { needle: "data-load", usedBy: "lazy regions (Popover.loadFrom, skeleton regions)" },
  // Runtime config read once from <body data-*> (templates/core.ts documents them).
  { needle: "csrfCookie", usedBy: "core template / CSP docs (data-csrf-cookie)" },
  { needle: "csrfHeader", usedBy: "data-csrf-header" },
  { needle: "swapHeader", usedBy: "data-swap-header" },
  { needle: "redirectHeader", usedBy: "data-redirect-header" },
  // Events this library's scripts listen for.
  { needle: "'rapid:swapped'", usedBy: "every component script's re-init, busy.js, data-table.js" },
  { needle: "'rapid:error'", usedBy: "busy.js, dropzone.js" },
  { needle: "'rapid:progress'", usedBy: "dropzone.js upload rows" },
  // Form submission semantics.
  { needle: "new FormData(form, submitter)", usedBy: "DataTable bulk buttons (name=op)" },
  { needle: "'submit'", usedBy: "form[data-action] swaps (Form, bulk forms, dropzone)" },
  // The public JS API combobox/command/editor call.
  { needle: "window.rapid", usedBy: "combobox.js, command.js, editor.js" },
  { needle: "refresh", usedBy: "window.rapid.refresh" },
  // Swap modes DataTable/Pagination/toasts rely on.
  { needle: "'outer'", usedBy: "data-swap=outer" },
  { needle: "'append'", usedBy: "toasts appended into #toast-region" },
];

const history: Expectation[] = [
  { needle: "dataset.push", usedBy: "data-push on sort/page/day links" },
  { needle: "CSS.escape", usedBy: "regions pushed by id (DataTable/Pagination/DatePicker ids)" },
  { needle: "popstate", usedBy: "back/forward restoring a region (data-table.js re-applies selection)" },
];

const live: Expectation[] = [
  { needle: "'rapid:push'", usedBy: "live notification recipes (docs/UI-Recipes.md §7)" },
  { needle: "'rapid:live'", usedBy: "connection state indicators" },
  { needle: "livePath", usedBy: "data-live-path on <body>" },
];

const missing: string[] = [];
const check = (name: string, source: string, list: Expectation[]) => {
  for (const e of list) {
    if (!source.includes(e.needle)) missing.push(`${name}: ${JSON.stringify(e.needle)} — used by ${e.usedBy}`);
  }
};
check("UI_RUNTIME", UI_RUNTIME, runtime);
check("UI_HISTORY", UI_HISTORY, history);
check("UI_LIVE", UI_LIVE, live);

const total = runtime.length + history.length + live.length;
if (missing.length) {
  console.error(
    `rAPId contract: ${missing.length} of ${total} hooks missing from the runtime this library is built against:`,
  );
  for (const m of missing) console.error(`  - ${m}`);
  exit(1);
}
console.log(`rAPId contract: all ${total} hooks present in UI_RUNTIME / UI_HISTORY / UI_LIVE.`);
