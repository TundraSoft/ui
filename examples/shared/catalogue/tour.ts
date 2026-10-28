/** Catalogue cases for components/tour — see examples/shared/catalogue.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Button } from "../../../components/button/button.ts";
import { Card } from "../../../components/card/card.ts";
import { Input } from "../../../components/input/input.ts";
import { Tour, type TourPlacement, type TourStart } from "../../../components/tour/tour.ts";
import { caseCopy, caseOf, caseRow, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const placements: TourPlacement[] = ["bottom", "end", "top", "start"];
// "load" starts on page load, once per browser with `storageKey`; the
// catalogue keeps its tour "manual" so the page is not covered on open.
const startModes: TourStart[] = ["load", "manual"];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "tour",
    cases: [
      caseOf(
        `four steps over the elements below (placement ${placements.join(" / ")}), one without a target; startOn: ${
          startModes.join(" | ")
        } (#cat-tour-1)`,
        html`
          <div class="stack">
            ${caseRow(
              Button({ label: "Start the tour", attrs: { "data-tour-start": "#cat-tour-1", id: "cat-tour-start" } }),
              Button({ label: "New project", variant: "outline", attrs: { id: "cat-tour-t1" } }),
            )}
            ${Input({ id: "cat-tour-t2", name: "q", type: "search", placeholder: "Search projects" })}
            ${Card({ id: "cat-tour-t3", title: "Recent activity", body: caseCopy })}
          </div>
          ${Tour({
            id: "cat-tour-1",
            startOn: startModes[1],
            label: "Getting started",
            steps: [
              {
                target: "#cat-tour-t1",
                placement: placements[0],
                title: "Create a project",
                body: "Everything starts here. A project holds its pages, members and settings.",
              },
              {
                target: "#cat-tour-t2",
                placement: placements[1],
                title: "Find anything",
                body: html`Type a name, or press <kbd>⌘K</kbd> anywhere for the command palette.`,
              },
              {
                target: "#cat-tour-t3",
                placement: placements[2],
                title: "Keep up",
                body: "Recent activity across your projects lands in this card.",
              },
              {
                title: "That is it",
                body: "You can replay this tour from the help menu at any time.",
              },
            ],
          })}
        `,
      ),
    ],
  };
}
