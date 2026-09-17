import { type Html, html } from "@tundralibs/rapid/ui";
import { renderAttrs } from "../../shared/attrs.ts";
import { cx } from "../../shared/classnames.ts";
import { Icon } from "../../shared/icons.ts";

export type DropzoneFile = {
  name: string;
  /** Short type tag shown in the row chip, e.g. "pdf". */
  kind?: string;
  size?: string;
  /** 0–100. Omit for a finished upload. */
  progress?: number;
  error?: string;
  /**
   * POST endpoint that removes the upload and answers with the re-rendered
   * `Dropzone` (it is swapped `outer` into `#<id>`). Rendered as a real
   * form, never a GET link — removal is a state change.
   */
  removeHref?: string;
};

export type DropzoneProps = {
  id: string;
  name: string;
  accept?: string;
  multiple?: boolean;
  label?: Html | string;
  hint?: string;
  /**
   * Server-rendered upload records. A file input is never echoed back
   * into re-rendered markup (keptValues() strips it), so this list must
   * come from your own store, not the submitted form values.
   */
  files?: DropzoneFile[];
};

function fileRow(file: DropzoneFile, rootId: string): Html {
  const done = !file.error && file.progress === undefined;
  const removeLabel = `Remove ${file.name}`;
  const remove = file.removeHref
    ? html`
      <form method="post" action="${file.removeHref}" data-action="${file.removeHref}" data-target="#${rootId}"
        data-swap="outer"><button type="submit" class="dropzone__remove" aria-label="${removeLabel}">${Icon("x", {
          size: 15,
        })}</button></form>
    `
    : html`<button type="button" class="dropzone__remove" aria-label="${removeLabel}" data-dropzone-remove>${
      Icon("x", { size: 15 })
    }</button>`;

  return html`
    <div
      class="${cx(
        "dropzone__file",
        file.error && "dropzone__file--error",
        done && "dropzone__file--done",
      )}"><span class="dropzone__file-icon">${file.error
        ? Icon("x", { size: 15 })
        : done
        ? Icon("check", { size: 15 })
        : (file.kind ??
          "")}</span><span class="dropzone__file-body"><span class="dropzone__file-row"><span class="dropzone__file-name">${file
        .name}</span>${file.size ? html`<span class="dropzone__file-size">${file.size}</span>` : ""}</span>${file.error
        ? html`<span class="dropzone__file-error">${file.error}</span>`
        : ""}${file.progress !== undefined
        ? html`<progress class="dropzone__bar" value="${file.progress}" max="100" aria-label="Upload progress"></progress>`
        : ""}</span>${remove}</div>
  `;
}

export function Dropzone(props: DropzoneProps): Html {
  const inputId = `${props.id}-input`;
  const labelId = `${props.id}-label`;
  return html`
    <div class="dropzone" id="${props.id}"
      data-dropzone><div class="dropzone__area"><input class="dropzone__input" id="${inputId}" type="file" name="${props
        .name}" aria-labelledby="${labelId}"${renderAttrs({
          accept: props.accept,
          multiple: props.multiple ? "" : undefined,
          "aria-describedby": props.hint ? `${props.id}-hint` : undefined,
        })}><span class="dropzone__icon">${Icon("upload", {
          size: 19,
        })}</span><span class="dropzone__label" id="${labelId}">${props.label ??
        html`Drop files, or <span class="dropzone__browse">browse</span>`}</span>${props.hint
        ? html`<span class="dropzone__hint" id="${props.id}-hint">${props.hint}</span>`
        : ""}</div>${props.files?.length
        ? html`<div class="dropzone__files">${props.files.map((f) => fileRow(f, props.id))}</div>`
        : ""}</div>
  `;
}
