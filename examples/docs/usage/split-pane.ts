/** Usage examples for components/split-pane — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { SplitPane } from "../../../components/split-pane/split-pane.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/split-pane": [
    {
      title: "Editor beside its preview",
      note: "The position is remembered under `storageKey`; below 768px the panes stack.",
      render: () =>
        SplitPane({
          id: "editor-split",
          storageKey: "editor-split",
          start: html`<textarea class="textarea" aria-label="Source"></textarea>`,
          end: html`<div id="preview" data-load data-action="/preview"></div>`,
        }),
    },
    {
      title: "A narrow list and a detail pane",
      render: () =>
        SplitPane({
          id: "mail-split",
          initial: 30,
          min: 20,
          max: 50,
          label: "Resize the message list",
          start: html`
            <ul class="menu__list">
              <li><a class="menu__link" href="/mail/1">Welcome</a></li>
            </ul>
          `,
          end: html`
            <article>
              <h2>Welcome</h2>
            </article>
          `,
        }),
    },
  ],
};
