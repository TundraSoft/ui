/** Catalogue cases for components/list-group — see examples/shared/catalogue.ts. */
import { Badge } from "../../../components/badge/badge.ts";
import { ListGroup, type ListGroupSize, type ListGroupVariant } from "../../../components/list-group/list-group.ts";
import { Icon } from "../../../shared/icons.ts";
import { caseOf, type CatalogueEntryInput, type CatalogueState } from "../catalogue.ts";
import type { DemoRoutes } from "../data.ts";

const variants: ListGroupVariant[] = ["default", "flush"];
const sizes: ListGroupSize[] = ["sm", "md"];

const links = (active = 1) => [
  { label: "Inbox", href: "#", icon: Icon("mail", { size: 16 }), badge: Badge({ label: "12", variant: "accent" }) },
  { label: "Starred", href: "#", icon: Icon("star", { size: 16 }), active: active === 1 },
  { label: "Sent", href: "#", icon: Icon("send", { size: 16 }), meta: "2m ago" },
  { label: "Archive", href: "#", icon: Icon("folder", { size: 16 }), disabled: true },
];

export function entry(_routes: DemoRoutes, _state: CatalogueState): CatalogueEntryInput {
  return {
    name: "list-group",
    cases: [
      ...variants.map((variant) =>
        caseOf(
          `variant ${variant} · links, active, badge, meta, disabled`,
          ListGroup({ id: `cat-lg-${variant}`, variant, items: links() }),
        )
      ),
      ...sizes.map((size) =>
        caseOf(
          `size ${size} · plain rows with text`,
          ListGroup({
            id: `cat-lg-size-${size}`,
            size,
            items: [
              { label: "Deploy to production", text: "Runs the release pipeline and notifies the channel." },
              {
                label: "Rotate API keys",
                text: "Every key older than 90 days.",
                badge: Badge({ label: "Due", variant: "warning" }),
              },
              { label: "Archive stale projects", text: "No activity for a year." },
            ],
          }),
        )
      ),
      caseOf(
        "numbered · button rows",
        ListGroup({
          id: "cat-lg-numbered",
          numbered: true,
          items: [
            { label: "Connect your repository", action: true, attrs: { "data-step": "1" } },
            { label: "Pick a plan", action: true, active: true, attrs: { "data-step": "2" } },
            { label: "Invite your team", action: true, attrs: { "data-step": "3" } },
          ],
        }),
      ),
    ],
  };
}
