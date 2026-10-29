/// <reference lib="dom" />
/**
 * Shared Puppeteer setup for every browser suite: the system Chrome
 * (`CHROME_PATH`, defaulting to the macOS install; CI sets the runner's
 * `/usr/bin/google-chrome`), and an optional hermetic mode (`HERMETIC=1`)
 * that blocks every host except loopback and cdn.jsdelivr.net at the
 * DNS level, so a flaky third-party origin (fonts, placeholder images)
 * can never fail a run. The one CDN stays reachable because the CDN
 * asset path is itself under test. `pool()` + `isolatedPage()` let a suite
 * drive several pages at once (`TEST_CONCURRENCY`, default 4).
 */
import puppeteer, { type Browser, type ConsoleMessage, type HTTPRequest, type Page } from "puppeteer-core";
import { getEnv } from "@tundralibs/compat/runtime";

const env = getEnv();

export const CHROME_PATH: string = env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const HERMETIC: boolean = env.HERMETIC === "1" || env.HERMETIC === "true";

/**
 * Under Node the suites run through tsx, whose esbuild transform keeps
 * function names by wrapping every nested function in a `__name(fn, "fn")`
 * helper. Puppeteer serialises `page.evaluate` callbacks with `toString()`,
 * so those helper calls reach the browser without the helper — every
 * page gets a no-op `__name` before any script runs. Deno and Bun never
 * emit it; the shim is inert there.
 */
const NAME_SHIM = "globalThis.__name = globalThis.__name || ((fn) => fn);";

export async function launch(): Promise<Browser> {
  const args = ["--disable-gpu"];
  if (env.CI) args.push("--no-sandbox", "--disable-dev-shm-usage");
  if (HERMETIC) {
    args.push("--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost, EXCLUDE cdn.jsdelivr.net");
  }
  const browser = await puppeteer.launch({ headless: true, executablePath: CHROME_PATH, args });
  const newPage = browser.newPage.bind(browser);
  browser.newPage = async () => {
    const page = await newPage();
    await page.evaluateOnNewDocument(NAME_SHIM);
    return page;
  };
  return browser;
}

/** A console error that is only the hermetic block at work, not a page bug. */
export function isNetworkNoise(msg: ConsoleMessage): boolean {
  return HERMETIC && /net::ERR_NAME_NOT_RESOLVED|Failed to load resource/.test(msg.text());
}

/** A failed request that is only the hermetic block at work. */
export function isBlockedRequest(req: HTTPRequest): boolean {
  return HERMETIC && /ERR_NAME_NOT_RESOLVED|ERR_BLOCKED/.test(req.failure()?.errorText ?? "");
}

/** How many pages a suite drives at once (`TEST_CONCURRENCY`, default 4; 1 runs everything in order). */
export const CONCURRENCY: number = Math.max(1, Math.floor(Number(env.TEST_CONCURRENCY ?? "4")) || 1);

/**
 * Runs `fn` over `items`, at most `size` at a time; `worker` (0…size-1) says
 * which lane runs the item, so a lane can keep one tab for all its items.
 * Most of a page check is waiting (loads, settle timers, transitions), so a
 * few lanes cut a suite's wall time without changing what it checks.
 */
export async function pool<T>(
  items: readonly T[],
  fn: (item: T, index: number, worker: number) => Promise<void>,
  size: number = CONCURRENCY,
): Promise<void> {
  let next = 0;
  const lane = async (worker: number) => {
    while (next < items.length) {
      const i = next++;
      await fn(items[i]!, i, worker);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, (_, w) => lane(w)));
}

/**
 * A tab in a browser context of its own. `file://` pages share one origin,
 * so tabs in the default context share `localStorage`: a dark toggle in
 * one would leak into another's light render mid-run. Close it with
 * `closeIsolated(page)`, which drops the context too.
 */
export async function isolatedPage(browser: Browser): Promise<Page> {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.evaluateOnNewDocument(NAME_SHIM);
  return page;
}

export async function closeIsolated(page: Page): Promise<void> {
  await page.browserContext().close();
}
