/**
 * The usage examples' own source, cut per example: `Function.toString()`
 * would hand back the runtime's re-emitted JavaScript (types and
 * formatting gone), so the snippets are cut from examples/docs/usage.ts
 * and examples/docs/usage/*.ts as written — every `render: () =>` arrow
 * body, found by bracket balance, strings and template literals
 * respected. Keyed like `usage` (`components/<dir>`), in the same order,
 * so `snippets[key][i]` is the source of `usage[key][i]`. Shared by the
 * reference generator (scripts/build-docs.ts) and the demo site.
 */
import { readDir, readTextFile } from "@tundralibs/compat/file";

export async function usageSnippets(): Promise<Record<string, string[]>> {
  const usageSource = (await readTextFile("examples/docs/usage.ts")) +
    (await Promise.all(
      (await Array.fromAsync(readDir("examples/docs/usage", { includeDirs: false, exts: [".ts"] })))
        .map((e) => e.name).sort()
        .map((name) => readTextFile(`examples/docs/usage/${name}`)),
    )).join("\n");
  const out: Record<string, string[]> = {};
  const keys = [...usageSource.matchAll(/^ {2}"((?:components|layouts)\/[a-z-]+)": \[/gm)].map((m) => ({
    key: m[1]!,
    at: m.index!,
  }));
  const marker = "render: () =>";
  let from = 0;
  while (true) {
    const at = usageSource.indexOf(marker, from);
    if (at < 0) break;
    const key = keys.filter((k) => k.at < at).pop()?.key ?? "";
    let i = at + marker.length;
    while (/\s/.test(usageSource[i]!)) i++;
    const begin = i;
    // Walk to the end of the expression: the first `,` or `}` at depth 0.
    const stack: string[] = []; // open brackets and quote kinds
    while (i < usageSource.length) {
      const ch = usageSource[i]!;
      const top = stack[stack.length - 1];
      if (top === '"' || top === "'") {
        if (ch === "\\") i++;
        else if (ch === top) stack.pop();
      } else if (top === "`") {
        if (ch === "\\") i++;
        else if (ch === "`") stack.pop();
        else if (ch === "$" && usageSource[i + 1] === "{") {
          stack.push("{");
          i++;
        }
      } else {
        if (ch === '"' || ch === "'" || ch === "`") stack.push(ch);
        else if (ch === "(" || ch === "[" || ch === "{") stack.push(ch);
        else if (ch === ")" || ch === "]" || ch === "}") {
          if (!stack.length) break; // the closing brace of the example object
          stack.pop();
        } else if (ch === "," && !stack.length) break;
      }
      i++;
    }
    (out[key] ??= []).push(dedentBody(usageSource.slice(begin, i).trim()));
    from = i;
  }
  return out;
}

function dedentBody(src: string): string {
  if (src.startsWith("{") && src.endsWith("}")) src = src.slice(1, -1).replace(/^\n|\n\s*$/g, "");
  const lines = src.split("\n");
  const rest = lines.slice(1).filter((l) => l.trim());
  const n = rest.length ? Math.min(...rest.map((l) => l.match(/^\s*/)![0].length)) : 0;
  return [lines[0]!.trim(), ...lines.slice(1).map((l) => l.slice(n))].join("\n");
}
