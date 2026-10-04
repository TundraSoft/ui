/*
 * Modal: [data-modal-open="#id"] opens a native <dialog> with
 * showModal() (focus trap + ::backdrop for free), [data-modal-close]
 * closes it, and a click on the backdrop closes it — but only when the
 * pointer went DOWN on the backdrop too, so selecting text in a field
 * and releasing outside the dialog does not slam it shut.
 *
 * dialog[data-modal-autoopen] (Modal({ open })) opens on load and when a
 * swap brings it in.
 *
 * [data-confirm="<question>"] on a link, a button or a submit button asks
 * first, in the page's dialog[data-confirm-dialog] (ConfirmModal) — or
 * the browser's confirm() without one. The click is stopped in the
 * capture phase (before the rAPId runtime, busy.js or a form's own
 * script see it) and replayed on Confirm, so the same submitter and the
 * same swap go ahead. A submit in a form[data-validate] that is not
 * valid yet is let through unasked: form.js reports it first.
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

  /* ------------------------------------------------------ auto-open */
  function autoOpen() {
    document.querySelectorAll("dialog[data-modal-autoopen]").forEach((dialog) => {
      if (dialog.open || dialog.hasAttribute("data-modal-autoopened")) return;
      dialog.setAttribute("data-modal-autoopened", "");
      if (typeof dialog.showModal === "function") dialog.showModal();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoOpen);
  else autoOpen();
  document.addEventListener("rapid:swapped", autoOpen);

  /* -------------------------------------------------------- confirm */
  const passing = new WeakSet();

  function ask(trigger) {
    const question = trigger.getAttribute("data-confirm") || "";
    const dialog = document.querySelector("dialog[data-confirm-dialog]");
    if (!(dialog instanceof HTMLDialogElement) || typeof dialog.showModal !== "function") {
      return Promise.resolve(globalThis.confirm(question));
    }
    const text = dialog.querySelector("[data-confirm-text]");
    const ok = dialog.querySelector("[data-confirm-ok]");
    if (text) text.textContent = question;
    if (ok) {
      const danger = trigger.classList.contains("btn--danger") ||
        trigger.getAttribute("data-confirm-tone") === "danger";
      ok.classList.toggle("btn--danger", danger);
      ok.textContent = trigger.getAttribute("data-confirm-label") || dialog.getAttribute("data-confirm-default") ||
        "Confirm";
    }
    return new Promise((resolve) => {
      let answer = false;
      const onOk = () => {
        answer = true;
        dialog.close();
      };
      const onClose = () => {
        ok?.removeEventListener("click", onOk);
        resolve(answer);
      };
      ok?.addEventListener("click", onOk);
      dialog.addEventListener("close", onClose, { once: true });
      dialog.showModal();
      ok?.focus();
    });
  }

  // Capture: before the runtime's delegated click, busy.js and the
  // browser's own default (navigation, form submission).
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-confirm]");
    if (!trigger || trigger.closest("dialog[data-confirm-dialog]")) return;
    if (passing.has(trigger)) {
      passing.delete(trigger);
      return;
    }
    if (trigger.disabled || trigger.getAttribute("aria-disabled") === "true") return;
    const form = trigger.form ?? null;
    if (form?.matches("form[data-validate]") && trigger.type === "submit" && !form.checkValidity()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    ask(trigger).then((yes) => {
      if (!yes) return;
      passing.add(trigger);
      trigger.click();
    });
  }, true);
})();
