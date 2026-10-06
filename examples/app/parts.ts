/**
 * A composed page (rAPId ≥ 0.9 `compose`): one GET, three parts, each a
 * resource route of its own rendered through its own template. `stats`
 * runs with the page; `activity` is deferred — the page paints its
 * placeholder (the library styles it as a skeleton) and the runtime fetches
 * it in one follow-up request; `broken` fails, and its slot is the app's
 * error template, drawn compactly inside the part.
 *
 * Module routes are decorated methods; the app mounts the module with
 * `app.modules({ modules: [{ Parts }] })`.
 */
import { GET } from "@tundralibs/rapid/decorators";
import { RapidModule } from "@tundralibs/rapid/modules";
import type { RapidComposeSlot } from "@tundralibs/rapid";
import { html, template } from "@tundralibs/rapid/ui";
import { Card } from "../../components/card/card.ts";
import { Grid, GridCol } from "../../components/grid/grid.ts";
import { PageHeader } from "../../components/page-header/page-header.ts";
import { Stat } from "../../components/stat/stat.ts";
import { Timeline } from "../../components/timeline/timeline.ts";

type Stats = { links: number; clicks: number };
type Activity = { items: { title: string; meta: string }[] };
/**
 * `parts` is absent when the handler ran none (it may reply `compose: []`,
 * rAPId ≥ 0.12.1), so the template reads `d.parts?.<name>`.
 */
type ComposedPage = { title: string; parts?: Record<string, RapidComposeSlot> };

const StatsPart = template<Stats>((d) =>
  html`<div class="stack stack--sm">${Stat({ label: "Links", value: String(d.links) })}${
    Stat({ label: "Clicks this week", value: d.clicks.toLocaleString("en-US") })
  }</div>`
);

const ActivityPart = template<Activity>((d) =>
  Timeline({ id: "parts-activity", items: d.items.map((i) => ({ ...i, status: "done" as const })) })
);

const BrokenPart = template<Record<string, never>>(() => html`<p>Never drawn.</p>`);

/** The page: where each part goes. A slot is `{ status, html }`; `html` is the part's own wrapper. */
const ComposedPageView = template<ComposedPage>((d) =>
  html`${PageHeader({ title: d.title, subtitle: "One request; each tile is its own route and template." })}${
    Grid({
      items: [
        GridCol({ span: 4, content: Card({ title: "Stats", body: d.parts?.stats?.html ?? "" }) }),
        GridCol({ span: 4, content: Card({ title: "Activity (deferred)", body: d.parts?.activity?.html ?? "" }) }),
        GridCol({ span: 4, content: Card({ title: "Broken", body: d.parts?.broken?.html ?? "" }) }),
      ],
    })
  }`
);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class Parts extends RapidModule {
  readonly name = "Parts";
  readonly namespace = "demo";
  protected readonly events = {};

  @GET("/parts/stats", { template: StatsPart })
  stats() {
    return { content: { links: 128, clicks: 48213 } };
  }

  @GET("/parts/activity", { template: ActivityPart })
  async activity() {
    // Slow on purpose: the placeholder is on screen long enough to see.
    await wait(600);
    return {
      content: {
        items: [{ title: "Link created", meta: "2 min ago" }, { title: "Domain verified", meta: "1 h ago" }],
      },
    };
  }

  @GET("/parts/broken", { template: BrokenPart })
  broken(): never {
    throw new Error("this part fails on purpose");
  }

  @GET("/composed", {
    template: { render: ComposedPageView, prefer: "html", title: "Composed page" },
    compose: {
      stats: "demo:Parts:stats",
      activity: { action: "demo:Parts:activity", defer: true },
      broken: "demo:Parts:broken",
    },
  })
  page() {
    return { content: { title: "Composed page" } };
  }
}
