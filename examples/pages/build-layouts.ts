/**
 * One page per layout (examples/shared/layout-samples.ts, shared with the
 * rAPId example app), so every frame can be seen and driven at every
 * viewport band. No theme, no inline styles — the layouts must stand on
 * the base alone.
 */
import { type Html, html, render } from "@tundralibs/rapid/ui";
import { ensureDir, writeTextFile } from "@tundralibs/compat/file";
import { layoutIndex, layoutSamples } from "../shared/layout-samples.ts";

const page = (title: string, body: Html) =>
  html`
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <link rel="stylesheet" href="../../dist/ui.css">
      </head>
      <body>
    ${body}
    <script src="../../dist/ui.js"></script>
      </body>
    </html>
  `;

const pages = layoutSamples();

await ensureDir("demo/layouts");
for (const [name, body] of Object.entries(pages)) {
  await writeTextFile(`demo/layouts/${name}.html`, render(page(`Layout: ${name}`, body)));
}
await writeTextFile("demo/layouts/index.html", render(page("Layouts", layoutIndex())));
console.log(`Built demo/layouts/{index,${Object.keys(pages).join(",")}}.html`);
