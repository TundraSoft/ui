import { type Html, html, raw, render } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { CopyButton } from "../button/button.ts";

/** How tall the block may grow before it scrolls inside itself: 12 / 20 / 32 rem. */
export type CodeBlockSize = "sm" | "md" | "lg";

export type CodeBlockProps = {
  id?: string;
  /**
   * The source, escaped like any text. Give this *or* `highlighted`. With
   * a `language` that code.js knows (`json`, `bash`, `css`, `html`, `js`,
   * `ts`) the block is coloured on the page by a small best-effort
   * tokenizer; any other language renders plain.
   */
  code?: string;
  /**
   * Markup a server-side highlighter produced — Prism, highlight.js or
   * Shiki with class themes — wrapped with {@link codeHtml}. The kit
   * colours both libraries' class names (`.token.keyword`,
   * `.hljs-keyword`) and its own `.tok-*` set from the theme's tokens.
   * TRUSTED: only ever markup the server made from code it holds.
   */
  highlighted?: Html;
  /** Shown as a chip in the header and set as `language-<x>` on `<code>`. */
  language?: string;
  /** A file name or caption in the header. */
  title?: string;
  /** Number the lines (CSS counters; never part of the copied text). */
  lineNumbers?: boolean;
  /** 1-based lines to emphasise — a changed line, the one a doc talks about. */
  highlightLines?: number[];
  /** Wrap long lines instead of scrolling sideways. */
  wrap?: boolean;
  /** Cap the height; the block scrolls inside itself past it. */
  maxHeight?: CodeBlockSize;
  /** A copy button in the header, copying the raw source. @default true */
  copy?: boolean;
  /** Accessible name of the copy button. @default "Copy code" */
  copyLabel?: string;
  attrs?: Attrs;
};

/**
 * Highlighted markup a server-side highlighter produced, as `Html` for
 * {@link CodeBlockProps.highlighted}. ONLY EVER PASS MARKUP THE SERVER
 * GENERATED FROM CODE IT HOLDS — never user input, never a request body:
 * this is `raw()`, nothing is escaped.
 */
export function codeHtml(trusted: string): Html {
  return raw(trusted);
}

const TAG = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*>/g;

/**
 * Wrap each line of highlighted markup in its own span, closing and
 * reopening any tag that straddles a newline so a multi-line comment
 * still colours after the split and every line stays a complete element.
 */
function splitMarkup(markup: string): string[] {
  const lines: string[] = [];
  const open: { name: string; source: string }[] = []; // the open tags, outermost first
  let line = "";
  let last = 0;
  const text = (chunk: string) => {
    const parts = chunk.split("\n");
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        // Close every open tag at the line's end, reopen them on the next.
        line += open.map((t) => `</${t.name}>`).reverse().join("");
        lines.push(line);
        line = open.map((t) => t.source).join("");
      }
      line += parts[i];
    }
  };
  for (const m of markup.matchAll(TAG)) {
    text(markup.slice(last, m.index));
    const tag = m[0];
    if (tag.startsWith("</")) open.pop();
    else if (!tag.endsWith("/>")) open.push({ name: m[1], source: tag });
    line += tag;
    last = m.index! + tag.length;
  }
  text(markup.slice(last));
  lines.push(line);
  return lines;
}

/**
 * A block of code: optional file name, language chip and copy button in
 * the header, numbered and highlightable lines, wrapping or a height cap.
 * Colour comes from a server highlighter's markup (`highlighted`), from
 * code.js's small tokenizer for the common languages, or not at all —
 * the block never depends on a script to be readable. Each line is its
 * own `.code__line`, so numbers and highlights are CSS and never reach
 * the clipboard.
 */
export function CodeBlock(props: CodeBlockProps): Html {
  const hl = new Set(props.highlightLines ?? []);
  const lineClass = (i: number) => cx("code__line", hl.has(i + 1) && "code__line--hl");
  let lines: Html[];
  let plain = props.code ?? "";
  if (props.highlighted !== undefined) {
    const markup = render(props.highlighted).replace(/\n$/, "");
    lines = splitMarkup(markup).map((l, i) => html`<span class="${lineClass(i)}">${raw(l)}</span>`);
    plain = markup.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&amp;/g, "&");
  } else {
    lines = plain.replace(/\n$/, "").split("\n").map((l, i) => html`<span class="${lineClass(i)}">${l}</span>`);
  }
  const known = ["json", "bash", "sh", "shell", "css", "html", "xml", "js", "javascript", "ts", "typescript"];
  const lang = props.language?.toLowerCase();
  const tokenize = props.highlighted === undefined && lang !== undefined && known.includes(lang);
  const copy = props.copy !== false;
  const header = props.title || props.language || copy
    ? html`
      <figcaption class="code__header">${props.title
        ? html`<span class="code__title">${props.title}</span>`
        : ""}${props.language ? html`<span class="code__lang">${props.language}</span>` : ""}${copy
        ? html`<span class="code__copy">${
          CopyButton({
            value: plain,
            label: false,
            ariaLabel: props.copyLabel ?? "Copy code",
            doneLabel: "Copied",
          })
        }</span>`
        : ""}</figcaption>
    `
    : "";
  return html`
    <figure ${classAttrs(
      "code",
      mergeAttrs(props.attrs, { id: props.id }),
      props.lineNumbers && "code--numbered",
      props.wrap && "code--wrap",
      props.maxHeight && `code--${props.maxHeight}`,
    )} data-code>${header}<pre ${renderAttrs({
      class: "code__pre",
      // A capped block scrolls vertically and an unwrapped one sideways:
      // either way the keyboard needs a way in.
      tabindex: props.maxHeight || !props.wrap ? "0" : undefined,
    })}><code ${renderAttrs({
      class: cx("code__body", props.language && `language-${props.language}`),
      "data-highlight": tokenize ? lang : undefined,
    })}>${lines}</code></pre></figure>
  `;
}
