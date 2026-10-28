/** Usage examples for components/lightbox — merged into examples/docs/usage.ts. */
import { html } from "@tundralibs/rapid/ui";
import { Lightbox, LightboxLink } from "../../../components/lightbox/lightbox.ts";
import type { UsageExample } from "../usage.ts";

const photos = [
  { src: "/photos/office-1.jpg", alt: "The office, morning", caption: "Morning light" },
  { src: "/photos/office-2.jpg", alt: "The office, evening" },
];

export const usage: Record<string, UsageExample[]> = {
  "components/lightbox": [
    {
      title: "Thumbnails that open a viewer",
      note: "Each `LightboxLink` is a plain link to the full image, so a page without the script still opens it.",
      render: () =>
        html`
          ${photos.map((p, i) =>
            LightboxLink({
              controls: "office",
              index: i,
              href: p.src,
              content: html`
                <img src="${p.src.replace(".jpg", "-thumb.jpg")}" width="400" height="250" alt="${p
                  .alt}" loading="lazy">
              `,
            })
          )}${Lightbox({ id: "office", items: photos })}
        `,
    },
  ],
};
