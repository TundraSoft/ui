/** Catalogue cases for components/sheet — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { FormField } from "../../../components/form-field/form-field.ts";
import { Input } from "../../../components/input/input.ts";
import { Select } from "../../../components/select/select.ts";
import { Sheet, type SheetSide, type SheetSize } from "../../../components/sheet/sheet.ts";
import { caseCopy, caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const sides: SheetSide[] = ["end", "start", "bottom"];
const sizes: SheetSize[] = ["sm", "md", "lg"];

const opener = (id: string, label: string) =>
  Button({ label, variant: "outline", attrs: { "data-sheet-open": `#${id}`, id: `${id}-open` } });

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "sheet",
    cases: [
      caseOf(
        "side end / start / bottom — a side panel on a wide screen, a bottom sheet below 768px (#cat-sheet-end)",
        html`
          ${caseRow(...sides.map((side) => opener(`cat-sheet-${side}`, `Open ${side}`)))}${sides.map((side) =>
            Sheet({
              id: `cat-sheet-${side}`,
              side,
              title: `Sheet from the ${side}`,
              body: html`
                ${caseCopy}${caseCopy}${caseCopy}
              `,
              footer: html`
                ${Button({ label: "Cancel", variant: "ghost", attrs: { "data-sheet-close": "" } })}${Button({
                  label: "Save",
                  attrs: { "data-sheet-close": "" },
                })}
              `,
            })
          )}
        `,
      ),
      caseOf(
        "size sm / md / lg",
        html`
          ${caseRow(...sizes.map((size) => opener(`cat-sheet-size-${size}`, `Open ${size}`)))}${sizes.map((size) =>
            Sheet({ id: `cat-sheet-size-${size}`, size, title: `Size ${size}`, body: caseCopy })
          )}
        `,
      ),
      caseOf(
        "a form in a sheet — long body scrolls, header and footer stay (#cat-sheet-form)",
        html`
          ${opener("cat-sheet-form", "Edit member")}${Sheet({
            id: "cat-sheet-form",
            title: "Edit member",
            body: html`
              <form id="cat-sheet-form-form" class="stack">${FormField({
                id: "cat-sheet-name",
                label: "Name",
                control: Input({ id: "cat-sheet-name", value: "Ada" }),
              })}${FormField({
                id: "cat-sheet-role",
                label: "Role",
                control: Select({
                  id: "cat-sheet-role",
                  name: "role",
                  options: [{ value: "admin", label: "Admin" }, { value: "member", label: "Member" }],
                }),
              })}${Array.from({ length: 8 }, () => caseCopy)}</form>
            `,
            footer: html`
              ${Button({ label: "Cancel", variant: "ghost", attrs: { "data-sheet-close": "" } })}${Button({
                label: "Save changes",
                attrs: { form: "cat-sheet-form-form", type: "button" },
              })}
            `,
          })}
        `,
      ),
      caseOf(
        "label only, not closable from the header (closable: false) — the footer's button closes it",
        html`
          ${opener("cat-sheet-bare", "Open bare sheet")}${Sheet({
            id: "cat-sheet-bare",
            label: "Filters",
            closable: false,
            body: caseCopy,
            footer: Button({ label: "Done", attrs: { "data-sheet-close": "" } }),
          })}
        `,
      ),
      caseOf(
        "open — shown as soon as it is on the page (swapped in) (#cat-sheet-auto)",
        html`
          ${Button({
            label: "Swap it in",
            variant: "outline",
            attrs: { "data-cat-swap-in": "#cat-sheet-auto-template", id: "cat-sheet-auto-trigger" },
          })}<template id="cat-sheet-auto-template">${Sheet({
            id: "cat-sheet-auto",
            title: "Opened by the server",
            open: true,
            body: html`
              <p>Rendered with <code>open: true</code>, the way a form that failed inside a sheet comes back.</p>
            `,
            footer: Button({ label: "Close", variant: "ghost", attrs: { "data-sheet-close": "" } }),
          })}</template>
        `,
      ),
    ],
  };
}
