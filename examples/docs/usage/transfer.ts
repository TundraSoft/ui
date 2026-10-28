/** Usage examples for components/transfer — merged into examples/docs/usage.ts. */
import { Transfer } from "../../../components/transfer/transfer.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/transfer": [
    {
      title: "Pick the members of a team",
      note:
        "The native `<select multiple name>` is what posts — one `members` value per chosen item — so a handler reads it like any multi select. transfer.js keeps it in step and fires `change` on it.",
      render: () =>
        Transfer({
          id: "team-members",
          name: "members",
          sourceTitle: "Everyone",
          targetTitle: "On the team",
          options: [
            { value: "ada", label: "Ada Lovelace", selected: true },
            { value: "grace", label: "Grace Hopper" },
            { value: "margaret", label: "Margaret Hamilton" },
            { value: "ken", label: "Ken Thompson", disabled: true },
          ],
        }),
    },
    {
      title: "Short lists: no search box, at least one required",
      note: "`required` is reported on the chosen list by `Form({ validate })` and by the browser in a plain form.",
      render: () =>
        Transfer({
          id: "regions",
          name: "regions",
          size: "sm",
          searchable: false,
          required: true,
          requiredMessage: "Pick at least one region.",
          options: [
            { value: "eu", label: "Europe" },
            { value: "us", label: "North America" },
            { value: "apac", label: "Asia-Pacific" },
          ],
        }),
    },
  ],
};
