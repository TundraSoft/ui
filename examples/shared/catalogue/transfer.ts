/** Catalogue cases for components/transfer — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Transfer, type TransferOption, type TransferSize } from "../../../components/transfer/transfer.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const sizes: TransferSize[] = ["sm", "md", "lg"];

const people: TransferOption[] = [
  { value: "ada", label: "Ada Lovelace", selected: true },
  { value: "grace", label: "Grace Hopper" },
  { value: "linus", label: "Linus Torvalds" },
  { value: "margaret", label: "Margaret Hamilton", selected: true },
  { value: "alan", label: "Alan Turing" },
  { value: "barbara", label: "Barbara Liskov" },
  { value: "ken", label: "Ken Thompson", disabled: true },
  { value: "radia", label: "Radia Perlman" },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "transfer",
    cases: [
      caseOf(
        "default — searchable lists, a disabled item, two chosen on load; the native multi select posts (#cat-transfer-1)",
        Transfer({ id: "cat-transfer-1", name: "members", options: people }),
      ),
      caseOf(
        "size sm / lg, custom titles, searchable: false, required",
        html`
          <div class="stack">${sizes.filter((s) => s !== "md").map((size) =>
            Transfer({
              id: `cat-transfer-${size}`,
              name: `members-${size}`,
              size,
              options: people.slice(0, 4),
              sourceTitle: "Everyone",
              targetTitle: "On the team",
              searchable: false,
              required: size === "lg",
              requiredMessage: "Pick at least one person.",
            })
          )}</div>
        `,
      ),
      caseOf(
        "disabled",
        Transfer({ id: "cat-transfer-disabled", name: "members-off", options: people.slice(0, 3), disabled: true }),
      ),
    ],
  };
}
