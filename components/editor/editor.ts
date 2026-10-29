import { type Html, html } from "@tundralibs/rapid/ui";
import { type Attrs, classAttrs, mergeAttrs, renderAttrs } from "../../shared/attrs.ts";
import { Icon, type IconName } from "../../shared/icons.ts";
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

/**
 * Which toolbar groups render. `full` is everything the mode supports;
 * `basic` is text, headings, lists, quote, code and link (a comment box);
 * `minimal` is bold, italic and link (a caption). The status bar and the
 * Preview view follow their own props.
 */
export type EditorToolbar = "full" | "basic" | "minimal";

export type EditorProps = {
  id: string;
  name: string;
  mode?: EditorMode;
  /** Markdown source, or (html mode) trusted HTML the server already sanitised. */
  value?: string;
  placeholder?: string;
  /**
   * Accessible name of the editing surface in html mode (a `<label for>`
   * reaches the textarea, not the surface). @default the placeholder, else "Editor"
   */
  label?: string;
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
  /**
   * A route that stores an image dropped or pasted into the editor: it
   * receives the file as multipart `file` (with the CSRF header read
   * from `<body data-*>`) and answers with the stored image's URL as plain
   * text. The editor shows an "Uploading…" placeholder meanwhile and then
   * inserts `![name](url)` (markdown) or an `<img>` (html). Plain `fetch`,
   * so it works without the runtime; without this prop a dropped file is
   * ignored.
   */
  uploadAction?: string;
  /** Which toolbar groups render. @default "full" */
  toolbar?: EditorToolbar;
  /** The footer with the live word and character count. @default true */
  statusBar?: boolean;
  /**
   * Longest text accepted: the status bar counts down to it and the
   * textarea carries `maxlength` (markdown mode — in html mode the limit
   * applies to the visible text and is reported in the status bar only).
   */
  maxLength?: number;
  attrs?: Attrs;
};

type Group = "history" | "block" | "inline" | "lists" | "insert" | "layout" | "misc";
type Tool = {
  cmd: string;
  label: string;
  key?: string;
  icon: IconName;
  /** A text glyph instead of the icon (the icon set has no numbered list). */
  glyph?: string;
  group: Group;
  /** Modes that render it (both when omitted). */
  mode?: EditorMode;
  /** Presets that render it (`full` always does). */
  presets: EditorToolbar[];
};

const ALL: EditorToolbar[] = ["basic", "minimal"];
const BASIC: EditorToolbar[] = ["basic"];
const NONE: EditorToolbar[] = [];

const TOOLS: Tool[] = [
  { cmd: "undo", label: "Undo", key: "Ctrl+Z", icon: "undo", group: "history", presets: NONE },
  { cmd: "redo", label: "Redo", key: "Ctrl+Shift+Z", icon: "redo", group: "history", presets: NONE },
  { cmd: "heading", label: "Heading", icon: "heading", group: "block", presets: BASIC },
  { cmd: "quote", label: "Quote", icon: "quote", group: "block", presets: BASIC },
  { cmd: "code", label: "Code", icon: "code", group: "block", presets: BASIC },
  { cmd: "codeblock", label: "Code block", icon: "terminal", group: "block", presets: NONE },
  { cmd: "bold", label: "Bold", key: "Ctrl+B", icon: "bold", group: "inline", presets: ALL },
  { cmd: "italic", label: "Italic", key: "Ctrl+I", icon: "italic", group: "inline", presets: ALL },
  {
    cmd: "underline",
    label: "Underline",
    key: "Ctrl+U",
    icon: "underline",
    group: "inline",
    mode: "html",
    presets: BASIC,
  },
  { cmd: "strike", label: "Strikethrough", icon: "strike", group: "inline", presets: BASIC },
  { cmd: "ul", label: "Bulleted list", icon: "list", group: "lists", presets: BASIC },
  { cmd: "ol", label: "Numbered list", icon: "list", glyph: "1.", group: "lists", presets: BASIC },
  { cmd: "task", label: "Task list", icon: "listChecks", group: "lists", presets: NONE },
  { cmd: "link", label: "Link", key: "Ctrl+K", icon: "link", group: "insert", presets: ALL },
  { cmd: "image", label: "Image", icon: "image", group: "insert", presets: NONE },
  { cmd: "table", label: "Table", icon: "table", group: "insert", presets: NONE },
  { cmd: "hr", label: "Horizontal rule", icon: "minus", group: "insert", presets: NONE },
  { cmd: "alignLeft", label: "Align left", icon: "alignLeft", group: "layout", mode: "html", presets: NONE },
  { cmd: "alignCenter", label: "Align centre", icon: "alignCenter", group: "layout", mode: "html", presets: NONE },
  { cmd: "alignRight", label: "Align right", icon: "alignRight", group: "layout", mode: "html", presets: NONE },
  { cmd: "indent", label: "Indent", icon: "indent", group: "layout", mode: "html", presets: NONE },
  { cmd: "outdent", label: "Outdent", icon: "outdent", group: "layout", mode: "html", presets: NONE },
  { cmd: "clear", label: "Clear formatting", icon: "x", group: "misc", presets: BASIC },
];

const LEVELS: { value: string; label: string }[] = [
  { value: "p", label: "Paragraph" },
  { value: "h1", label: "Heading 1" },
  { value: "h2", label: "Heading 2" },
  { value: "h3", label: "Heading 3" },
];

const LANGUAGES = ["plain", "js", "ts", "html", "css", "json", "bash", "sql", "python"];

/** One toolbar button; `disabled` follows the editor. */
function tool(t: Tool, disabled: boolean | undefined): Html {
  return html`
    <button type="button" class="editor__tool" data-editor-cmd="${t.cmd}" aria-label="${t.label}" title="${t.key
      ? `${t.label} (${t.key})`
      : t.label}"
      ${renderAttrs({ disabled: disabled ? "" : undefined })}>${t.glyph
        ? html`<span class="editor__glyph" aria-hidden="true">${t.glyph}</span>`
        : Icon(t.icon, { size: 15 })}</button>
  `;
}

export function Editor(props: EditorProps): Html {
  const mode = props.mode ?? "markdown";
  const preset = props.toolbar ?? "full";
  const shown = TOOLS.filter((t) => (!t.mode || t.mode === mode) && (preset === "full" || t.presets.includes(preset)));
  const groups: Group[] = ["history", "block", "inline", "lists", "insert", "layout", "misc"];
  const toolbar: Html[] = [];
  for (const g of groups) {
    const tools = shown.filter((t) => t.group === g);
    if (!tools.length) continue;
    if (toolbar.length) toolbar.push(html`<span class="editor__sep" aria-hidden="true"></span>`);
    if (g === "block" && preset === "full") {
      toolbar.push(html`
        <select class="editor__select" data-editor-level aria-label="Block style" ${renderAttrs({
          disabled: props.disabled ? "" : undefined,
        })}>${LEVELS.map((l) => html`<option value="${l.value}">${l.label}</option>`)}</select>
      `);
    }
    toolbar.push(...tools.map((t) => tool(t, props.disabled)));
  }
  const views = mode === "markdown"
    ? html`
      <span class="editor__views" role="group"
        aria-label="View"><button type="button" class="editor__view" data-editor-view="write" aria-pressed="true">Write</button><button type="button" class="editor__view" data-editor-view="preview" aria-pressed="false">Preview</button></span>
    `
    : "";
  const fullscreen = preset === "full"
    ? html`
      <button type="button" class="editor__tool" data-editor-fullscreen aria-pressed="false" aria-label="Full screen"
        title="Full screen (Esc leaves)"
        ${renderAttrs(
          { disabled: props.disabled ? "" : undefined },
        )}><span class="editor__icon-on">${Icon("maximize", { size: 15 })}</span><span class="editor__icon-off">${Icon(
          "minimize",
          { size: 15 },
        )}</span></button>
    `
    : "";

  const source = Textarea({
    id: props.id,
    name: props.name,
    value: props.value,
    placeholder: props.placeholder,
    rows: props.rows ?? 8,
    disabled: props.disabled,
    // `label` names the markdown textarea the way it names the html surface.
    attrs: props.label ? { "aria-label": props.label } : undefined,
    required: props.required,
    invalid: props.invalid,
    maxLength: mode === "markdown" ? props.maxLength : undefined,
    extraClass: "editor__source",
  });

  const surface = mode === "html"
    ? html`
      <div class="input textarea editor__surface" role="textbox" aria-multiline="true" tabindex="0"
        data-editor-surface${renderAttrs({
          "aria-label": props.label ?? props.placeholder ?? "Editor",
          "aria-invalid": props.invalid ? "true" : undefined,
          "data-placeholder": props.placeholder,
        })}></div>
    `
    : "";

  // One popover form per editor: the link, image and code-block dialogs
  // reuse it (editor.js relabels the fields per command). No prompt(). Not
  // a <form>: the editor sits inside the page's form, and the parser drops
  // a nested one — Enter in a field is handled by the script instead.
  const dialog = html`
    <div class="editor__popover" data-editor-popover hidden>
      <div class="editor__dialog" data-editor-dialog role="group" aria-label="Insert">
        <label class="editor__dialog-field" data-editor-field-wrap="url"><span class="editor__dialog-label"
            data-editor-dialog-label="url">URL</span><input class="input input--sm" type="text" data-editor-field="url"
            placeholder="https://" autocomplete="off"></label>
        <label class="editor__dialog-field" data-editor-field-wrap="text"><span class="editor__dialog-label"
            data-editor-dialog-label="text">Text</span><input class="input input--sm" type="text" data-editor-field="text"
            autocomplete="off"></label>
        <label class="editor__dialog-field" data-editor-field-wrap="lang" hidden><span
            class="editor__dialog-label">Language</span><select class="input input--sm" data-editor-field="lang">${LANGUAGES
              .map((l) => html`<option value="${l}">${l}</option>`)}</select></label>
        <div class="editor__dialog-actions">
          <button type="button" class="btn btn--ghost btn--sm" data-editor-dialog-cancel>Cancel</button>
          <button type="button" class="btn btn--sm" data-editor-dialog-ok>Insert</button>
        </div>
      </div>
    </div>
  `;

  const tableTools = mode === "html"
    ? html`
      <div class="editor__table-tools" data-editor-table-tools role="group" aria-label="Table" hidden>
        <button type="button" class="editor__tool editor__tool--text" data-editor-table="row-add">+ Row</button>
        <button type="button" class="editor__tool editor__tool--text" data-editor-table="col-add">+ Column</button>
        <button type="button" class="editor__tool editor__tool--text" data-editor-table="row-del">− Row</button>
        <button type="button" class="editor__tool editor__tool--text" data-editor-table="col-del">− Column</button>
      </div>
    `
    : "";

  const status = props.statusBar === false ? "" : html`
    <div class="editor__status">
      <span class="editor__count" data-editor-count aria-live="off">0 words · 0 characters</span>
      <span class="editor__message" data-editor-message role="status" aria-live="polite"></span>
    </div>
  `;

  return html`
    <div${classAttrs(
      "editor",
      mergeAttrs(props.attrs, { id: `${props.id}-editor` }),
      `editor--${mode}`,
      props.invalid && "editor--invalid",
      props.disabled && "editor--disabled",
    )} data-editor data-editor-mode="${mode}"
      ${renderAttrs({
        "data-editor-preview": mode === "markdown" ? props.previewAction : undefined,
        "data-editor-upload": props.uploadAction,
        "data-editor-max": props.maxLength === undefined ? undefined : String(props.maxLength),
      })}><div class="editor__toolbar" role="toolbar" aria-label="Formatting">${toolbar}<span
          class="editor__spacer"></span>${views}${fullscreen}</div>${tableTools}${dialog}${source}${surface}${mode ===
              "markdown"
            ? html`<div class="editor__preview" data-editor-preview-panel hidden aria-live="polite"></div>`
            : ""}${status}</div>
  `;
}
