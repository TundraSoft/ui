/**
 * Move the `@tundralibs/rapid` pin to the latest JSR release, in both
 * manifests: `deno.json` (`jsr:@tundralibs/rapid@^X.Y.Z`, subpaths kept)
 * and `package.json` (`npm:@jsr/tundralibs__rapid@^X.Y.Z`). The daily
 * `rapid-bump` workflow runs it, then regenerates the lock, runs the full
 * suite and opens the PR only when everything passes — a release that
 * breaks the suite is reported, never bumped to.
 *
 * Prints `bumped`, `previous` and `version` lines, and appends the same
 * as outputs to `$GITHUB_OUTPUT` when set. `--dry-run` only reports.
 * Runtime-agnostic via @tundralibs/compat (no Deno.*, process.* here).
 */
import { readTextFile, writeTextFile } from "@tundralibs/compat/file";
import { exit, getEnv } from "@tundralibs/compat/runtime";

const PACKAGE = "@tundralibs/rapid";
const g = globalThis as unknown as { Deno?: { args: string[] }; process?: { argv: string[] } };
const args = g.Deno?.args ?? g.process?.argv.slice(2) ?? [];
const dryRun = args.includes("--dry-run");

const parse = (v: string): number[] => v.split(".").map((n) => Number.parseInt(n, 10) || 0);
const newer = (a: string, b: string): boolean => {
  const [x, y] = [parse(a), parse(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) > (y[i] ?? 0);
  return false;
};

const res = await fetch(`https://jsr.io/${PACKAGE}/meta.json`);
if (!res.ok) {
  console.error(`JSR answered ${res.status} for ${PACKAGE}`);
  exit(1);
}
const meta = (await res.json()) as { latest?: string };
const latest = meta.latest;
if (!latest) {
  console.error(`JSR meta for ${PACKAGE} carries no latest version`);
  exit(1);
}

const denoJson = await readTextFile("deno.json");
const current = denoJson.match(/"jsr:@tundralibs\/rapid@\^?([0-9]+\.[0-9]+\.[0-9]+)/)?.[1];
if (!current) {
  console.error("deno.json has no jsr:@tundralibs/rapid@<version> import");
  exit(1);
}

async function output(lines: Record<string, string>) {
  for (const [k, v] of Object.entries(lines)) console.log(`${k}=${v}`);
  const file = getEnv().GITHUB_OUTPUT;
  if (!file) return;
  const existing = await readTextFile(file).catch(() => "");
  await writeTextFile(file, existing + Object.entries(lines).map(([k, v]) => `${k}=${v}\n`).join(""));
}

if (!newer(latest!, current!)) {
  await output({ bumped: "false", previous: current!, version: latest! });
  exit(0);
}

if (!dryRun) {
  const nextDeno = denoJson.replace(
    /"jsr:@tundralibs\/rapid@\^?[0-9]+\.[0-9]+\.[0-9]+(\/[^"]*)?"/g,
    (_m, sub: string | undefined) => `"jsr:@tundralibs/rapid@^${latest}${sub ?? ""}"`,
  );
  await writeTextFile("deno.json", nextDeno);
  const packageJson = await readTextFile("package.json");
  const nextPackage = packageJson.replace(
    /"npm:@jsr\/tundralibs__rapid@\^?[0-9]+\.[0-9]+\.[0-9]+"/,
    `"npm:@jsr/tundralibs__rapid@^${latest}"`,
  );
  if (nextPackage === packageJson) {
    console.error("package.json has no npm:@jsr/tundralibs__rapid@<version> dependency");
    exit(1);
  }
  await writeTextFile("package.json", nextPackage);
}
await output({ bumped: "true", previous: current!, version: latest! });
