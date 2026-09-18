/*
 * Dropzone: drag-over highlight and client-side removal of a pending row
 * ([data-dropzone-remove]). The actual upload is the form's job — the
 * real <input type="file"> covers the area, so click and keyboard open
 * the picker with no script at all.
 *
 * Upload progress: when a form[data-action] holding a dropzone with
 * picked files submits, one pending row per file is rendered client-side
 * (the same markup the server renders for `DropzoneFile`, with an
 * indeterminate <progress>), and rAPId's `rapid:progress` events
 * (`{ url, loaded, total }`, emitted on the swap target while a
 * multipart body streams out) fill the bars. `total` is 0 when the
 * browser cannot compute it — the bar stays indeterminate. Bytes reach
 * 100% before the server has answered, so the rows stay pending until
 * `rapid:swapped` replaces them with the server's own rows, or
 * `rapid:error` marks them failed. Without the runtime the submit is a
 * plain navigation and none of this runs.
 */
(() => {
  for (const type of ["dragenter", "dragover"]) {
    document.addEventListener(type, (event) => {
      const area = event.target.closest?.(".dropzone__area");
      if (!area) return;
      event.preventDefault();
      area.classList.add("dropzone__area--over");
    });
  }

  for (const type of ["dragleave", "drop"]) {
    document.addEventListener(type, (event) => {
      event.target.closest?.(".dropzone__area")?.classList.remove("dropzone__area--over");
    });
  }

  document.addEventListener("click", (event) => {
    const remove = event.target.closest?.("[data-dropzone-remove]");
    if (remove) remove.closest(".dropzone__file")?.remove();
  });

  /* ------------------------------------------------ upload progress */

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  /** A pending row: same classes as the server-rendered DropzoneFile. */
  function pendingRow(file) {
    const row = document.createElement("div");
    row.className = "dropzone__file dropzone__file--pending";
    const icon = document.createElement("span");
    icon.className = "dropzone__file-icon";
    icon.textContent = (file.name.split(".").pop() || "").slice(0, 4).toLowerCase();
    const body = document.createElement("span");
    body.className = "dropzone__file-body";
    const line = document.createElement("span");
    line.className = "dropzone__file-row";
    const name = document.createElement("span");
    name.className = "dropzone__file-name";
    name.textContent = file.name;
    const size = document.createElement("span");
    size.className = "dropzone__file-size";
    size.textContent = formatSize(file.size);
    line.append(name, size);
    const bar = document.createElement("progress");
    bar.className = "dropzone__bar";
    bar.max = 100;
    bar.setAttribute("aria-label", `Uploading ${file.name}`);
    body.append(line, bar);
    row.append(icon, body);
    return row;
  }

  /** url → { dropzone, rows } for uploads in flight, keyed by the form's action. */
  const uploads = new Map();

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form?.matches?.("form[data-action]")) return;
    const zone = form.querySelector("[data-dropzone]");
    const input = zone?.querySelector("input[type=file]");
    if (!zone || !input?.files?.length) return;
    let list = zone.querySelector(".dropzone__files");
    if (!list) {
      list = document.createElement("div");
      list.className = "dropzone__files";
      zone.append(list);
    }
    const rows = [...input.files].map((file) => {
      const row = pendingRow(file);
      list.append(row);
      return row;
    });
    uploads.set(form.getAttribute("data-action"), { zone, rows });
  });

  document.addEventListener("rapid:progress", (event) => {
    const entry = uploads.get(event.detail?.url);
    if (!entry) return;
    const { loaded, total } = event.detail;
    for (const row of entry.rows) {
      const bar = row.querySelector("progress");
      if (!bar) continue;
      if (total > 0) bar.value = Math.min(100, Math.round((loaded / total) * 100));
      else bar.removeAttribute("value");
    }
  });

  const settle = (event, failed) => {
    const url = event.detail?.url;
    const entry = url ? uploads.get(url) : undefined;
    if (!entry) return;
    uploads.delete(url);
    if (!failed) return; // the server's reply replaced the rows
    for (const row of entry.rows) {
      if (!row.isConnected) continue;
      row.classList.remove("dropzone__file--pending");
      row.classList.add("dropzone__file--error");
      row.querySelector("progress")?.remove();
      const message = document.createElement("span");
      message.className = "dropzone__file-error";
      message.textContent = "Upload failed";
      row.querySelector(".dropzone__file-body")?.append(message);
    }
  };
  document.addEventListener("rapid:swapped", (event) => settle(event, false));
  document.addEventListener("rapid:error", (event) => settle(event, true));
})();
