/** Usage examples for components/diff — merged into examples/docs/usage.ts. */
import { diffLines, DiffView } from "../../../components/diff/diff.ts";
import type { UsageExample } from "../usage.ts";

export const usage: Record<string, UsageExample[]> = {
  "components/diff": [
    {
      title: "What changed in a config file",
      note:
        "`diffLines` is a plain line LCS for short texts; feed `DiffView` a real engine's output beyond a few hundred lines.",
      render: () =>
        DiffView({
          title: "deno.json",
          lines: diffLines(
            '{\n  "version": "0.23.0",\n  "private": false\n}',
            '{\n  "version": "0.24.0",\n  "private": false,\n  "sideEffects": false\n}',
          ),
        }),
    },
    {
      title: "Old beside new",
      render: () =>
        DiffView({
          view: "split",
          maxHeight: "md",
          lines: [
            { type: "meta", text: "@@ -1,3 +1,3 @@" },
            { type: "context", text: ".btn {", oldNo: 1, newNo: 1 },
            { type: "remove", text: "  padding: 6px 12px;", oldNo: 2 },
            { type: "add", text: "  padding: var(--space-2) var(--space-3);", newNo: 2 },
            { type: "context", text: "}", oldNo: 3, newNo: 3 },
          ],
        }),
    },
  ],
};
