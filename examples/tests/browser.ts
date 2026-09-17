/// <reference lib="dom" />
/**
 * Shared Puppeteer setup for every browser suite: the system Chrome
 * (`CHROME_PATH`, defaulting to the macOS install; CI sets the runner's
 * `/usr/bin/google-chrome`), and an optional hermetic mode (`HERMETIC=1`)
 * that blocks every host except loopback and cdn.jsdelivr.net at the
 * DNS level, so a flaky third-party origin (fonts, placeholder images)
 * can never fail a run. The one CDN stays reachable because the CDN
 * asset path is itself under test.
 */
import puppeteer, { type Browser, type ConsoleMessage, type HTTPRequest } from "puppeteer-core";
import { getEnv } from "@tundralibs/compat/runtime";

const env = getEnv();

export const CHROME_PATH: string = env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const HERMETIC: boolean = env.HERMETIC === "1" || env.HERMETIC === "true";

export function launch(): Promise<Browser> {
  const args = ["--disable-gpu"];
  if (env.CI) args.push("--no-sandbox", "--disable-dev-shm-usage");
  if (HERMETIC) {
    args.push("--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost, EXCLUDE cdn.jsdelivr.net");
  }
  return puppeteer.launch({ headless: true, executablePath: CHROME_PATH, args });
}

/** A console error that is only the hermetic block at work, not a page bug. */
export function isNetworkNoise(msg: ConsoleMessage): boolean {
  return HERMETIC && /net::ERR_NAME_NOT_RESOLVED|Failed to load resource/.test(msg.text());
}

/** A failed request that is only the hermetic block at work. */
export function isBlockedRequest(req: HTTPRequest): boolean {
  return HERMETIC && /ERR_NAME_NOT_RESOLVED|ERR_BLOCKED/.test(req.failure()?.errorText ?? "");
}
