/** Usage examples for components/ratio — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Ratio } from "../../../components/ratio/ratio.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/ratio": [
    {
      title: "An embedded video",
      note: "The iframe fills the box; the box keeps 16:9 at any width.",
      render: () =>
        Ratio({
          content: html`
            <iframe
              src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
              title="Product tour"
              loading="lazy"
              allowfullscreen
            ></iframe>
          `,
        }),
    },
    {
      title: "A square avatar crop",
      render: () =>
        Ratio({
          ratio: "1x1",
          content: html`<img src="/media/team/ada.jpg" alt="Ada Lovelace" width="400" height="400">`,
        }),
    },
  ],
};
