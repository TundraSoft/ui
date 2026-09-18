/**
 * Re-indent rendered markup for a doc page: one element per line, nested
 * by depth; an element holding only text stays on one line, an empty
 * element too; inline SVG icons collapse to `<svg …>…</svg>`. For
 * reading only — never for serving.
 */
const VOID = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

export function prettyHtml(markup: string): string {
  const collapsed = markup
    .replace(
      /<svg\b[^>]*>[\s\S]*?<\/svg>/g,
      (m) => `<svg ${m.match(/\b(width|height)="\d+"/g)?.join(" ") ?? ""} …>…</svg>`,
    )
    .replace(/\s*\n\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+>/g, ">")
    .replace(/>\s+</g, "><")
    .trim();
  const tokens = collapsed.match(/<[^>]+>|[^<]+/g) ?? [];
  const lines: string[] = [];
  const open: number[] = []; // line index of each unclosed opening tag
  let text = "";
  const pad = () => "  ".repeat(open.length);
  const flushText = () => {
    if (text.trim()) lines.push(pad() + text.trim());
    text = "";
  };
  for (const t of tokens) {
    if (t.startsWith("</")) {
      const at = open[open.length - 1];
      if (at !== undefined && at === lines.length - 1 && !text.includes("<")) {
        lines[at] += text.trim() + t; // <b>only text</b> or <i></i>
        text = "";
        open.pop();
      } else {
        flushText(); // still inside the element: text keeps its depth
        open.pop();
        lines.push(pad() + t);
      }
    } else if (t.startsWith("<")) {
      flushText();
      const name = t.match(/^<([a-zA-Z0-9-]+)/)?.[1] ?? "";
      lines.push(pad() + t);
      if (!VOID.has(name) && !t.endsWith("/>") && !t.startsWith("<!")) open.push(lines.length - 1);
    } else {
      text += t;
    }
  }
  flushText();
  return lines.join("\n");
}
