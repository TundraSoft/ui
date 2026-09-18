/**
 * Move the `@tundralibs/rapid` pin to the latest JSR release, in both
 * manifests: `deno.json` (`jsr:@tundralibs/rapid@^X.Y.Z`, subpaths kept)
 * and `package.json` (`npm:@jsr/tundralibs__rapid@^X.Y.Z`). The daily
 * `rapid-bump` workflow runs it, then regenerates the lock, runs the full
 * suite and opens the PR only when everything passes — a release that
 * breaks the suite is reported, never bumped to.
 *
 * It also refreshes `minimumDependencyAge.exclude` in deno.json with every
 * package of the @tundralibs JSR scope (jsr and npm-bridge names): Deno's
 * 24-hour minimum-dependency-age policy would otherwise block a fresh
 * first-party release — rAPId's own, or any first-party package a new
 * rAPId depends on — locally and in CI alike. The window stays in force
 * for everything third-party.
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

/** Every package in the @tundralibs scope on JSR — the first-party set the age policy exempts. */
async function scopePackages(): Promise<string[]> {
  const res = await fetch("https://api.jsr.io/scopes/tundralibs/packages?limit=100");
  if (!res.ok) throw new Error(`JSR answered ${res.status} for the @tundralibs scope`);
  const body = (await res.json()) as { items?: { name: string }[] } | { name: string }[];
  const items = Array.isArray(body) ? body : body.items ?? [];
  return items.map((p) => p.name);
}

/** Rewrite deno.json's `minimumDependencyAge.exclude` to the full first-party set. */
async function syncExclusions(manifest: string): Promise<string> {
  const names = new Set([...(await scopePackages()), "rapid", "compat"]);
  const entries = [...names].sort().flatMap((n) => [`jsr:@tundralibs/${n}`, `npm:@jsr/tundralibs__${n}`]);
  const parsed = JSON.parse(manifest) as { minimumDependencyAge?: { age?: string; exclude?: string[] } };
  const policy = parsed.minimumDependencyAge ?? { age: "P1D" };
  const same = JSON.stringify(policy.exclude ?? []) === JSON.stringify(entries);
  if (same) return manifest;
  parsed.minimumDependencyAge = { age: policy.age ?? "P1D", exclude: entries };
  console.log(`minimumDependencyAge.exclude: ${entries.length} entries (${names.size} first-party packages)`);
  return JSON.stringify(parsed, null, 2) + "\n";
}

if (!newer(latest!, current!)) {
  if (!dryRun) await writeTextFile("deno.json", await syncExclusions(denoJson));
  await output({ bumped: "false", previous: current!, version: latest! });
  exit(0);
}

if (!dryRun) {
  const synced = await syncExclusions(denoJson);
  const nextDeno = synced.replace(
    /"jsr:@tundralibs\/rapid@\^?[0-9]+\.[0-9]+\.[0-9]+(\/[^"]*)?"/g,
    (_m, sub: string | undefined) => `"jsr:@tundralibs/rapid@^${latest}${sub ?? ""}"`,
  );
  await writeTextFile("deno.json", nextDeno);
  const packageJson = await readTextFile("package.json");
  const dep = /"npm:@jsr\/tundralibs__rapid@\^?[0-9]+\.[0-9]+\.[0-9]+"/;
  if (!dep.test(packageJson)) {
    console.error("package.json has no npm:@jsr/tundralibs__rapid@<version> dependency");
    exit(1);
  }
  // Idempotent: a manifest already at `latest` is left as it is.
  await writeTextFile("package.json", packageJson.replace(dep, `"npm:@jsr/tundralibs__rapid@^${latest}"`));
}
await output({ bumped: "true", previous: current!, version: latest! });
