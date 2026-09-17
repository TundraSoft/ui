/*
 * Dropzone: drag-over highlight and client-side removal of a pending row
 * ([data-dropzone-remove]). The actual upload is the form's job — the
 * real <input type="file"> covers the area, so click and keyboard open
 * the picker with no script at all.
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
})();
