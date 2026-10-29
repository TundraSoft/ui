/** Usage examples for components/sheet — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { FormField } from "../../../components/form-field/form-field.ts";
import { Input } from "../../../components/input/input.ts";
import { Sheet } from "../../../components/sheet/sheet.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/sheet": [
    {
      title: "Edit a record beside the list",
      note:
        'Any element with `data-sheet-open="#<id>"` opens it; `data-sheet-close` closes. Below 768px it is a bottom sheet.',
      render: () =>
        html`
          ${Button({ label: "Edit", variant: "outline", attrs: { "data-sheet-open": "#edit-member" } })}${Sheet({
            id: "edit-member",
            title: "Edit member",
            body: html`
              <form id="edit-member-form" method="post" action="/members/42" data-action="/members/42" data-target="#members">
                ${FormField({
                  id: "name",
                  label: "Name",
                  control: Input({ id: "name", name: "name", value: "Ada Lovelace" }),
                })}
              </form>
            `,
            footer: html`
              ${Button({ label: "Cancel", variant: "ghost", attrs: { "data-sheet-close": "" } })}${Button({
                label: "Save",
                type: "submit",
                attrs: { form: "edit-member-form" },
              })}
            `,
          })}
        `,
    },
    {
      title: "A form that failed comes back open",
      note: "Re-render the sheet with `open: true` from the handler and the errors are in front of the person.",
      render: () =>
        Sheet({
          id: "invite",
          title: "Invite a teammate",
          open: true,
          size: "sm",
          body: FormField({
            id: "email",
            label: "Email",
            error: "That address is already a member.",
            control: Input({ id: "email", name: "email", type: "email", value: "grace@acme.com", invalid: true }),
          }),
          footer: Button({ label: "Send invite", type: "submit" }),
        }),
    },
  ],
};
