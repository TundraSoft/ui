/*
 * Sheet: [data-sheet-open="#id"] opens a native <dialog class="sheet">
 * with showModal() (focus trap + ::backdrop for free), [data-sheet-close]
 * closes it, and a click on the backdrop closes it — only when the pointer
 * went DOWN on the backdrop too, so dragging a selection out of a field
 * does not slam it shut. Escape is the dialog's own `cancel`: it is
 * intercepted so the panel slides out first (uiMotion.exit adds
 * .is-closing, sheet.css plays the slide; close() runs after). Focus goes
 * back to the opener.
 *
 * dialog[data-sheet-autoopen] (Sheet({ open })) opens on load and when a
 * swap brings it in, once per element.
 */
(() => {
  const openers = new WeakMap();
  let downOnBackdrop = false;

  const isSheet = (el) => el instanceof HTMLDialogElement && el.hasAttribute("data-sheet");

  function open(dialog, opener) {
    if (!(dialog instanceof HTMLDialogElement) || typeof dialog.showModal !== "function") return;
    globalThis.uiMotion?.cancelExit(dialog);
    if (opener) openers.set(dialog, opener);
    if (!dialog.open) dialog.showModal();
  }

  function close(dialog) {
    if (!dialog?.open) return;
    const done = () => {
      dialog.close();
      const opener = openers.get(dialog);
      openers.delete(dialog);
      if (opener?.isConnected) opener.focus();
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(dialog, done);
    else done();
  }

  document.addEventListener("pointerdown", (event) => {
    downOnBackdrop = isSheet(event.target) && event.target.open;
  });

  document.addEventListener("click", (event) => {
    const opener = event.target.closest?.("[data-sheet-open]");
    if (opener) {
      const dialog = document.querySelector(opener.getAttribute("data-sheet-open") ?? "");
      if (isSheet(dialog)) open(dialog, opener);
      return;
    }
    const closer = event.target.closest?.("[data-sheet-close]");
    if (closer) {
      const dialog = closer.closest("dialog[data-sheet]");
      if (dialog) close(dialog);
      return;
    }
    if (downOnBackdrop && isSheet(event.target) && event.target.open) close(event.target);
    downOnBackdrop = false;
  });

  // Escape: the browser would close() at once; slide out instead.
  document.addEventListener("cancel", (event) => {
    if (!isSheet(event.target)) return;
    event.preventDefault();
    close(event.target);
  }, true);

  function autoOpen() {
    document.querySelectorAll("dialog[data-sheet][data-sheet-autoopen]").forEach((dialog) => {
      if (dialog.open || dialog.hasAttribute("data-sheet-autoopened")) return;
      dialog.setAttribute("data-sheet-autoopened", "");
      open(dialog);
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoOpen);
  else autoOpen();
  document.addEventListener("rapid:swapped", autoOpen);
})();
