import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon } from "../../shared/icons.ts";
import { Textarea } from "../textarea/textarea.ts";

/**
 * `"markdown"`: a textarea with a formatting toolbar that inserts
 * Markdown syntax, plus a Preview view the *server* renders (the
 * `previewAction` route receives `text` and answers with HTML — this
 * library ships no Markdown parser, and rendering user text is the
 * server's job anyway). `"html"`: a WYSIWYG surface (`contenteditable`)
 * whose HTML is mirrored into the hidden textarea that submits.
 */
export type EditorMode = "markdown" | "html";

export type EditorProps = {
  id: string;
  name: string;
  mode?: EditorMode;
  /** Markdown source, or (html mode) trusted HTML the server already sanitised. */
  value?: string;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  /**
   * Markdown only: a route that renders `text` (posted as a form field)
   * to an HTML fragment for the Preview view — swapped in through rAPId's
   * runtime. Without it (or without the runtime) Preview shows the raw text.
   */
  previewAction?: string;
  attrs?: Attrs;
};

type Tool = { cmd: string; label: string; key?: string; glyph: Html };

const b = (t: string) => html`<b>${t}</b>`;
const i = (t: string) => html`<i>${t}</i>`;
const mono = (t: string) => html`<span class="text-mono">${t}</span>`;

const common = (mode: EditorMode): Tool[] => [
  { cmd: "bold", label: "Bold", key: "Ctrl+B", glyph: b("B") },
  { cmd: "italic", label: "Italic", key: "Ctrl+I", glyph: i("I") },
  ...(mode === "html" ? [{ cmd: "underline", label: "Underline", key: "Ctrl+U", glyph: html`<u>U</u>` }] : []),
  { cmd: "strike", label: "Strikethrough", glyph: html`<s>S</s>` },
  { cmd: "heading", label: "Heading", glyph: b("H") },
  { cmd: "quote", label: "Quote", glyph: mono("“") },
  { cmd: "code", label: "Code", glyph: mono("<>") },
  { cmd: "link", label: "Link", key: "Ctrl+K", glyph: mono("[ ]") },
  { cmd: "image", label: "Image", glyph: mono("[img]") },
  { cmd: "ul", label: "Bulleted list", glyph: Icon("list", { size: 15 }) },
  { cmd: "ol", label: "Numbered list", glyph: mono("1.") },
  { cmd: "hr", label: "Horizontal rule", glyph: mono("—") },
  { cmd: "clear", label: "Clear formatting", glyph: mono("Tx") },
];

const TOOLS: Record<EditorMode, Tool[]> = { markdown: common("markdown"), html: common("html") };

export function Editor(props: EditorProps): Html {
  const mode = props.mode ?? "markdown";
  const tools = TOOLS[mode].map((t) =>
    html`
      <button type="button" class="editor__tool" data-editor-cmd="${t.cmd}" aria-label="${t.label}" title="${t.key
        ? `${t.label} (${t.key})`
        : t.label}"
        ${props.disabled
          ? html`
            disabled
          `
          : ""}>${t.glyph}</button>
    `
  );
  const views = mode === "markdown"
    ? html`
      <span class="editor__spacer"></span><span class="editor__views" role="group"
        aria-label="View"><button type="button" class="editor__view" data-editor-view="write" aria-pressed="true">Write</button><button type="button" class="editor__view" data-editor-view="preview" aria-pressed="false">Preview</button></span>
    `
    : "";

  const source = Textarea({
    id: props.id,
    name: props.name,
    value: props.value,
    placeholder: props.placeholder,
    rows: props.rows ?? 8,
    disabled: props.disabled,
    required: props.required,
    invalid: props.invalid,
    extraClass: "editor__source",
  });

  const surface = mode === "html"
    ? html`
      <div class="input textarea editor__surface" role="textbox" aria-multiline="true" tabindex="0"
        data-editor-surface${renderAttrs({
          "aria-invalid": props.invalid ? "true" : undefined,
          "data-placeholder": props.placeholder,
        })}></div>
    `
    : "";

  return html`
    <div${classAttrs(
      "editor",
      { ...props.attrs, id: `${props.id}-editor` },
      `editor--${mode}`,
      props.invalid && "editor--invalid",
      props.disabled && "editor--disabled",
    )} data-editor data-editor-mode="${mode}"
      ${renderAttrs({
        "data-editor-preview": mode === "markdown" ? props.previewAction : undefined,
      })}><div class="editor__toolbar" role="toolbar" aria-label="Formatting">${tools}${views}</div>${source}${surface}${mode ===
          "markdown"
        ? html`<div class="editor__preview" data-editor-preview-panel hidden aria-live="polite"></div>`
        : ""}</div>
  `;
}
