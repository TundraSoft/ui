/** Catalogue cases for components/split-pane — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { SplitPane, type SplitPaneOrientation } from "../../../components/split-pane/split-pane.ts";
import { caseCopy, caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const orientations: SplitPaneOrientation[] = ["horizontal", "vertical"];

const pane = (title: string, lines = 2) =>
  html`
    <h4>${title}</h4>${Array.from({ length: lines }, () => caseCopy)}
  `;

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "split-pane",
    cases: [
      caseOf(
        "editor and preview — drag the divider, ← → (Shift: 10%), Home / End, double-click resets; stacks below 768px (#cat-split-1)",
        SplitPane({
          id: "cat-split-1",
          padded: true,
          start: html`
            <h4>Editor</h4>
            <textarea class="textarea" rows="8" aria-label="Source"># Title — some *markdown* to edit.</textarea>
          `,
          end: pane("Preview", 3),
        }),
      ),
      caseOf(
        "list and detail — initial 30, min 20, max 50, position remembered (storageKey) (#cat-split-2)",
        SplitPane({
          id: "cat-split-2",
          initial: 30,
          min: 20,
          max: 50,
          storageKey: "cat-split-2",
          label: "Resize the list",
          padded: true,
          start: html`
            <ul class="menu__list">
              <li><a class="menu__link menu__link--active" href="#">Inbox</a></li>
              <li><a
                  class="menu__link" href="#">Starred</a></li>
              <li><a class="menu__link" href="#">Sent</a></li>
              <li><a
                  class="menu__link" href="#">Archive</a></li>
            </ul>
          `,
          end: pane("Message", 4),
        }),
      ),
      caseOf(
        "orientation horizontal / vertical; keep keeps the split on a phone",
        html`
          ${orientations.map((orientation) =>
            SplitPane({
              id: `cat-split-${orientation}`,
              orientation,
              keep: true,
              padded: true,
              start: pane("Start"),
              end: pane("End"),
              attrs: { class: "mt-2" },
            })
          )}
        `,
      ),
    ],
  };
}
