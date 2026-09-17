/// <reference lib="dom" />
/**
 * Page-load performance audit for the demo pages: bundle sizes, request
 * count/bytes, navigation timing (DCL / load), long tasks, CSS coverage
 * (how much of dist/ui.css a page actually uses), and layout-shift score.
 * Pages are served over HTTP from ./ so timings resemble a real deploy
 * (file:// skips the network layer entirely).
 */
import { readFile, realPath, stat } from "@tundralibs/compat/file";
import { launch } from "./browser.ts";
import { WebServer } from "@tundralibs/compat/webserver";

const root = await realPath(".");
const port = 8765;
// Static file server over compat's WebServer — same code on every runtime.
const server = new WebServer("perf-audit", {
  mode: "TCP",
  port,
  hostname: "127.0.0.1",
  handler: async (req: Request) => {
    const path = decodeURIComponent(new URL(req.url).pathname);
    try {
      const file = await readFile(`${root}${path}`);
      const type = path.endsWith(".css") ? "text/css" : path.endsWith(".js") ? "text/javascript" : "text/html";
      return new Response(file.slice(), { headers: { "content-type": `${type}; charset=utf-8` } });
    } catch {
      return new Response("not found", { status: 404 });
    }
  },
});
await server.start();

const pages = [
  "demo/admin/dashboard.html",
  "demo/admin/tables.html",
  "demo/admin/forms.html",
  "demo/data.html",
  "demo/charts.html",
];

const size = async (p: string) => (await stat(p)).size;
console.log(
  `dist/ui.css ${(await size("dist/ui.css") / 1024).toFixed(1)} KB, dist/ui.js ${
    (await size("dist/ui.js") / 1024).toFixed(1)
  } KB (uncompressed)`,
);
const gz = async (p: string) => {
  const data = await readFile(p);
  const stream = new Blob([data.slice()]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(stream).arrayBuffer()).byteLength;
};
console.log(
  `gzip: ui.css ${(await gz("dist/ui.css") / 1024).toFixed(1)} KB, ui.js ${
    (await gz("dist/ui.js") / 1024).toFixed(1)
  } KB\n`,
);

const browser = await launch();

for (const path of pages) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const requests: { url: string; type: string; bytes: number; external: boolean }[] = [];
  page.on("response", async (res) => {
    const url = res.url();
    let bytes = 0;
    try {
      bytes = (await res.buffer()).length;
    } catch { /* cross-origin or failed */ }
    requests.push({
      url,
      type: res.request().resourceType(),
      bytes,
      external: !url.startsWith(`http://127.0.0.1:${port}`),
    });
  });
  await page.coverage.startCSSCoverage();
  await page.coverage.startJSCoverage();
  const t0 = performance.now();
  await page.goto(`http://127.0.0.1:${port}/${path}`, { waitUntil: "load", timeout: 30000 });
  const wall = performance.now() - t0;
  const css = await page.coverage.stopCSSCoverage();
  const js = await page.coverage.stopJSCoverage();

  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const paints = Object.fromEntries(
      performance.getEntriesByType("paint").map((p) => [p.name, Math.round(p.startTime)]),
    );
    return {
      dcl: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      fcp: paints["first-contentful-paint"] ?? null,
      domNodes: document.querySelectorAll("*").length,
      styleTags: document.querySelectorAll("style").length,
      animations: document.getAnimations().length,
    };
  });

  const cov = (entries: { url: string; text: string; ranges: { start: number; end: number }[] }[], match: string) => {
    const e = entries.find((x) => x.url.includes(match));
    if (!e) return null;
    const used = e.ranges.reduce((s, r) => s + r.end - r.start, 0);
    return `${Math.round(100 * used / e.text.length)}% of ${(e.text.length / 1024).toFixed(0)} KB`;
  };

  const local = requests.filter((r) => !r.external);
  const external = requests.filter((r) => r.external);
  console.log(`== ${path}`);
  console.log(
    `   wall ${
      wall.toFixed(0)
    }ms · FCP ${timing.fcp}ms · DCL ${timing.dcl}ms · load ${timing.load}ms · ${timing.domNodes} DOM nodes · ${timing.animations} running animations`,
  );
  console.log(
    `   local requests ${local.length} (${
      (local.reduce((s, r) => s + r.bytes, 0) / 1024).toFixed(0)
    } KB), external ${external.length}: ${
      external.map((r) => `${new URL(r.url).host} ${(r.bytes / 1024).toFixed(0)}KB`).join(", ") || "none"
    }`,
  );
  console.log(`   CSS used: ${cov(css, "ui.css")} · JS used: ${cov(js, "ui.js")}`);
  await page.close();
}

await browser.close();
await server.stop();
