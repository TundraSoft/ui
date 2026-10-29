/**
 * The demo site (demo/): one page per component, per foundation, per
 * layout and per rAPId topic, all in one chrome whose collapsible sidebar
 * is the only navigation (see site/nav.ts for the map, site/chrome.ts for
 * the frame). Layout and error-page samples are standalone documents in
 * demo/frames/, shown in iframes. The admin example app is built by
 * build-admin-theme.ts. Writes demo/pages.json — every page, for the
 * browser suites to sweep. Build with `deno task build:demos`, then open
 * demo/index.html.
 */
import { type Html, html, render } from "@tundralibs/rapid/ui";
import { ensureDir, writeTextFile } from "@tundralibs/compat/file";
import { catalogue } from "../shared/catalogue.ts";
import { consentSampleScript, staticRoutes } from "../shared/data.ts";
import { layoutNames, layoutSamples } from "../shared/layout-samples.ts";
import { catalogueCss } from "../shared/catalogue.ts";
import { themeBuilderCss, themeBuilderJs } from "../shared/theme-builder.ts";
import { usage } from "../docs/usage.ts";
import { usageSnippets } from "../docs/snippets.ts";
import { type PageMeta, sitePage } from "./site/chrome.ts";
import { componentPage } from "./site/component-page.ts";
import {
  iconsPage,
  motionKeyframes,
  motionPage,
  readTokens,
  themeBuilderPage,
  themingPage,
  tokenCss,
  tokensPage,
  typographyPage,
  utilitiesPage,
} from "./site/foundations.ts";
import { errorFrames, errorsPage, integrationPage, layoutPage, overviewPage } from "./site/pages.ts";
import { frameJs, siteCss, siteJs } from "./site/assets.ts";
import {
  ADMIN_PAGES,
  COMPONENT_TREE,
  componentPath,
  COMPONENTS,
  FOUNDATIONS,
  LAYOUT_INFO,
  layoutPath,
  RAPID_PAGES,
} from "./site/nav.ts";

// The component pages sit one folder down; the consent sample loader is at the root.
const entries = catalogue({ ...staticRoutes, consentLoader: "../consent-sample.js" });
const snippets = await usageSnippets();
const tokens = await readTokens();

/* Every catalogued component has exactly one place in the sidebar, and nothing else does. */
const placed = COMPONENT_TREE.flatMap((g) => g.sections.flatMap((s) => s.items));
const dupes = placed.filter((n, i) => placed.indexOf(n) !== i);
const missing = entries.map((e) => e.name).filter((n) => !placed.includes(n));
const stray = placed.filter((n) => !entries.some((e) => e.name === n) || !COMPONENTS[n]);
if (dupes.length || missing.length || stray.length) {
  throw new Error(
    `site/nav.ts is out of step with the catalogue — listed twice: ${dupes.join(", ") || "none"}; ` +
      `not in the sidebar: ${missing.join(", ") || "none"}; unknown: ${stray.join(", ") || "none"}`,
  );
}

const pages: string[] = [];
async function write(meta: PageMeta, content: Html): Promise<void> {
  await writeTextFile(`demo/${meta.path}`, sitePage(meta, content));
  pages.push(meta.path);
}

await ensureDir("demo/components");
await ensureDir("demo/foundations");
await ensureDir("demo/layouts");
await ensureDir("demo/rapid");
await ensureDir("demo/frames");

/* overview */
await write(
  { path: "index.html", title: "Overview", context: "Overview" },
  overviewPage({
    components: entries.length,
    cases: entries.reduce((n, e) => n + e.cases.length, 0),
    tokens: tokens.length,
  }),
);

/* foundations */
const foundation = (file: string) => FOUNDATIONS.find((p) => p.path === `foundations/${file}.html`)!;
const fmeta = (file: string, extra: Partial<PageMeta> = {}): PageMeta => ({
  path: `foundations/${file}.html`,
  title: foundation(file).label,
  context: `Foundations · ${foundation(file).label}`,
  ...extra,
});
await write(fmeta("tokens"), tokensPage(foundation("tokens"), tokens));
await write(fmeta("typography"), await typographyPage(foundation("typography"), tokens));
await write(fmeta("icons"), iconsPage(foundation("icons")));
await write(fmeta("utilities"), await utilitiesPage(foundation("utilities")));
await write(fmeta("motion"), motionPage(foundation("motion"), tokens, await motionKeyframes()));
await write(fmeta("theming"), themingPage(foundation("theming")));
await write(
  fmeta("theme-builder", { styles: ["theme-builder.css"], scripts: ["theme-builder.js"] }),
  themeBuilderPage(foundation("theme-builder")),
);
await writeTextFile("demo/foundations/theme-builder.css", themeBuilderCss);
await writeTextFile("demo/foundations/theme-builder.js", themeBuilderJs);

/* components */
for (const group of COMPONENT_TREE) {
  for (const sec of group.sections) {
    for (const name of sec.items) {
      const entry = entries.find((e) => e.name === name)!;
      const context = group.sections.length > 1 ? `${group.label} · ${sec.label}` : group.label;
      const body = await componentPage(
        entry,
        { group: context },
        usage[`components/${name}`] ?? [],
        snippets[`components/${name}`] ?? [],
      );
      await write(
        {
          path: componentPath(name),
          title: COMPONENTS[name]!.label,
          context,
          charts: render(body).includes("data-chart"),
        },
        body,
      );
    }
  }
}

/* layouts: the chrome page, and the frame it previews */
const frame = (title: string, body: Html) =>
  render(html`
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
    <script src="frame.js"></script>
      </body>
    </html>
  `);
const samples = layoutSamples({ index: "#", page: (name) => `${name}.html` });
for (const name of layoutNames) {
  await writeTextFile(`demo/frames/${name}.html`, frame(`Layout: ${name}`, samples[name]));
  await write(
    {
      path: layoutPath(name),
      title: `${LAYOUT_INFO[name].label} layout`,
      context: `Layouts · ${LAYOUT_INFO[name].label}`,
    },
    await layoutPage(name, usage[`layouts/${name}`] ?? [], snippets[`layouts/${name}`] ?? []),
  );
}

/* rAPId */
for (const f of errorFrames()) await writeTextFile(`demo/frames/${f.id}.html`, frame(`Error: ${f.id}`, f.body));
const rapidPage = (file: string) => RAPID_PAGES.find((p) => p.path === `rapid/${file}.html`)!;
await write(
  { path: "rapid/integration.html", title: "rAPId integration", context: "rAPId · Integration" },
  integrationPage(rapidPage("integration")),
);
await write(
  { path: "rapid/errors.html", title: "Error pages", context: "rAPId · Error pages" },
  errorsPage(rapidPage("errors")),
);

/* shared assets */
await writeTextFile(
  "demo/site.css",
  `${siteCss}\n/* catalogue cases */\n${catalogueCss}\n/* token samples */\n${tokenCss(tokens)}\n`,
);
await writeTextFile("demo/site.js", siteJs);
await writeTextFile("demo/frames/frame.js", frameJs);
await writeTextFile("demo/consent-sample.js", consentSampleScript);
await writeTextFile(
  "demo/pages.json",
  JSON.stringify(
    {
      site: pages,
      frames: [...layoutNames.map((n) => `frames/${n}.html`), ...errorFrames().map((f) => `frames/${f.id}.html`)],
      admin: ADMIN_PAGES.map((p) => `admin/${p.file}.html`),
    },
    null,
    2,
  ) + "\n",
);

console.log(
  `Built demo/: ${pages.length} site pages (${entries.length} components, ${FOUNDATIONS.length} foundations, ${layoutNames.length} layouts, ${RAPID_PAGES.length} rAPId) and ${
    layoutNames.length + errorFrames().length
  } frames`,
);
