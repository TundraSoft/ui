/*
 * Lightbox: a click on `[data-lightbox="#id"]` opens that dialog at
 * `data-lightbox-index` (the click is intercepted, so the link's href is
 * the no-script path). The dialog's `data-lightbox-items` JSON holds the
 * images; prev/next, Left/Right, a horizontal swipe and the dots move
 * between them with a short fade on the image. Escape (the dialog's own
 * cancel) and a click on the backdrop close it through uiMotion.exit, and
 * focus returns to what opened it.
 */
(() => {
  const openers = new WeakMap();
  const indices = new WeakMap();

  const itemsOf = (dialog) => {
    try {
      return JSON.parse(dialog.getAttribute("data-lightbox-items") || "[]");
    } catch {
      return [];
    }
  };

  function show(dialog, index, { fade = true } = {}) {
    const items = itemsOf(dialog);
    if (!items.length) return;
    const i = ((index % items.length) + items.length) % items.length;
    indices.set(dialog, i);
    const item = items[i];
    const img = dialog.querySelector("[data-lightbox-image]");
    const caption = dialog.querySelector("[data-lightbox-caption]");
    const counter = dialog.querySelector("[data-lightbox-counter]");
    if (img) {
      img.classList.remove("is-entering");
      img.src = item.src;
      img.alt = item.alt || "";
      if (fade) {
        // Restart the fade for the new picture.
        void img.offsetWidth;
        img.classList.add("is-entering");
      }
    }
    if (caption) caption.textContent = item.caption || "";
    if (counter) counter.textContent = `${i + 1} / ${items.length}`;
    const prev = dialog.querySelector("[data-lightbox-prev]");
    const next = dialog.querySelector("[data-lightbox-next]");
    if (prev) prev.hidden = items.length < 2;
    if (next) next.hidden = items.length < 2;
  }

  function open(dialog, index, opener) {
    if (!(dialog instanceof HTMLDialogElement) || typeof dialog.showModal !== "function") return false;
    globalThis.uiMotion?.cancelExit(dialog);
    openers.set(dialog, opener ?? document.activeElement);
    show(dialog, index, { fade: false });
    if (!dialog.open) dialog.showModal();
    dialog.querySelector("[data-lightbox-close]")?.focus();
    return true;
  }

  function close(dialog) {
    if (!dialog.open) return;
    const done = () => {
      dialog.close();
      const opener = openers.get(dialog);
      openers.delete(dialog);
      if (opener?.isConnected) opener.focus();
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(dialog, done);
    else done();
  }

  const step = (dialog, delta) => show(dialog, (indices.get(dialog) ?? 0) + delta);

  let downOnBackdrop = false;
  let swipe = null;

  document.addEventListener("pointerdown", (event) => {
    const dialog = event.target.closest?.("[data-lightbox-dialog]");
    downOnBackdrop = event.target instanceof HTMLDialogElement && event.target.hasAttribute("data-lightbox-dialog");
    swipe = dialog && event.pointerType === "touch" ? { x: event.clientX, y: event.clientY, dialog } : null;
  });

  document.addEventListener("pointerup", (event) => {
    if (!swipe) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    const { dialog } = swipe;
    swipe = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const rtl = getComputedStyle(dialog).direction === "rtl";
      step(dialog, (dx < 0) !== rtl ? 1 : -1);
    }
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-lightbox]");
    if (trigger) {
      const dialog = document.querySelector(trigger.getAttribute("data-lightbox") ?? "");
      if (dialog && open(dialog, Number(trigger.getAttribute("data-lightbox-index")) || 0, trigger)) {
        event.preventDefault();
      }
      return;
    }
    const dialog = event.target.closest?.("[data-lightbox-dialog]");
    if (!dialog) return;
    if (event.target.closest("[data-lightbox-close]")) close(dialog);
    else if (event.target.closest("[data-lightbox-prev]")) step(dialog, -1);
    else if (event.target.closest("[data-lightbox-next]")) step(dialog, 1);
    else if (downOnBackdrop && event.target === dialog) close(dialog);
    downOnBackdrop = false;
  });

  document.addEventListener("keydown", (event) => {
    const dialog = event.target.closest?.("[data-lightbox-dialog]");
    if (!dialog || !dialog.open) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const rtl = getComputedStyle(dialog).direction === "rtl";
      step(dialog, (event.key === "ArrowRight") !== rtl ? 1 : -1);
    }
  });

  // Escape: the dialog's own cancel — intercepted so the exit plays.
  document.addEventListener("cancel", (event) => {
    const dialog = event.target;
    if (!(dialog instanceof HTMLDialogElement) || !dialog.hasAttribute("data-lightbox-dialog")) return;
    event.preventDefault();
    close(dialog);
  }, true);
})();
