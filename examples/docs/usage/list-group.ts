/** Usage examples for components/list-group — merged into examples/docs/usage.ts. */
import { Badge } from "../../../components/badge/badge.ts";
import { ListGroup } from "../../../components/list-group/list-group.ts";
import { Icon } from "../../../shared/icons.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/list-group": [
    {
      title: "A folder list with counts",
      note: "Links fill their rows; the current one carries `aria-current` and the accent bar.",
      render: () =>
        ListGroup({
          id: "folders",
          items: [
            {
              label: "Inbox",
              href: "/mail/inbox",
              icon: Icon("mail", { size: 16 }),
              badge: Badge({ label: "12", variant: "accent" }),
              active: true,
            },
            { label: "Sent", href: "/mail/sent", icon: Icon("send", { size: 16 }) },
            { label: "Archive", href: "/mail/archive", icon: Icon("folder", { size: 16 }), meta: "1.2 GB" },
          ],
        }),
    },
    {
      title: "Numbered steps inside a card",
      note: "`flush` drops the frame so the card's own border does the work.",
      render: () =>
        ListGroup({
          id: "setup-steps",
          variant: "flush",
          numbered: true,
          items: [
            { label: "Connect a repository", text: "GitHub, GitLab or Bitbucket." },
            { label: "Pick a plan", text: "Free while you evaluate.", active: true },
            { label: "Invite your team", text: "Up to five seats on the free plan.", disabled: true },
          ],
        }),
    },
  ],
};
