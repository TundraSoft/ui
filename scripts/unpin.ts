/**
 * Rewrites deno.json's `@tundralibs/rapid` and `@tundralibs/compat` imports
 * from their pinned versions to `@latest`-resolving specifiers. Used by
 * the weekly health workflow's rAPId canary job — never run this locally
 * against a checkout you mean to keep (it is a deliberate, throwaway
 * drift). Runtime-agnostic via @tundralibs/compat.
 */
import { readTextFile, writeTextFile } from "@tundralibs/compat/file";

const raw = await readTextFile("deno.json");
const manifest = JSON.parse(raw) as { imports: Record<string, string> };
const changed: string[] = [];

for (const [key, value] of Object.entries(manifest.imports)) {
  const m = value.match(/^jsr:(@tundralibs\/(?:rapid|compat))@[^/]+(\/.*)?$/);
  if (!m) continue;
  manifest.imports[key] = `jsr:${m[1]}${m[2] ?? ""}`;
  changed.push(`${key}: ${value} → ${manifest.imports[key]}`);
}

await writeTextFile("deno.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(changed.length ? changed.join("\n") : "nothing to unpin");
