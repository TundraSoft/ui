/*
 * Modal: [data-modal-open="#id"] opens a native <dialog> with
 * showModal() (focus trap + ::backdrop for free), [data-modal-close]
 * closes it, and a click on the backdrop closes it — but only when the
 * pointer went DOWN on the backdrop too, so selecting text in a field
 * and releasing outside the dialog does not slam it shut.
 */
(() => {
  let downOnBackdrop = false;

  document.addEventListener("pointerdown", (event) => {
    downOnBackdrop = event.target instanceof HTMLDialogElement && event.target.open;
  });

  document.addEventListener("click", (event) => {
    const opener = event.target.closest?.("[data-modal-open]");
    if (opener) {
      const dialog = document.querySelector(opener.getAttribute("data-modal-open") ?? "");
      if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
      return;
    }

    const closer = event.target.closest?.("[data-modal-close]");
    if (closer) {
      closer.closest("dialog")?.close();
      return;
    }

    if (downOnBackdrop && event.target instanceof HTMLDialogElement && event.target.open) {
      event.target.close();
    }
    downOnBackdrop = false;
  });
})();
