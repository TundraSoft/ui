/*
 * [data-copy="<text>"] (or [data-copy-target="#el"]: that element's value
 * or text) copies to the clipboard on click. The button then carries
 * `data-copied` for two seconds — CSS swaps its [data-copy-label] for
 * its [data-copy-done] — and the shared toast region (aria-live)
 * announces it when the button names `data-copy-announce`. Without the
 * Clipboard API (an insecure origin) nothing is marked.
 */
(() => {
  const timers = new WeakMap();

  document.addEventListener("click", (event) => {
    const button = event.target.closest?.("[data-copy], [data-copy-target]");
    if (!button) return;
    let text = button.getAttribute("data-copy");
    if (text === null) {
      let source = null;
      try {
        source = document.querySelector(button.getAttribute("data-copy-target") || "");
      } catch {
        source = null;
      }
      text = source ? ("value" in source ? source.value : source.textContent) : "";
    }
    if (!navigator.clipboard?.writeText) return;
    navigator.clipboard.writeText(text ?? "").then(() => {
      button.setAttribute("data-copied", "");
      clearTimeout(timers.get(button));
      timers.set(button, setTimeout(() => button.removeAttribute("data-copied"), 2000));
      const note = button.getAttribute("data-copy-announce");
      const region = note && document.querySelector("#toast-region, .toast-region");
      if (region) {
        const live = document.createElement("span");
        live.className = "sr-only";
        live.textContent = note;
        region.append(live);
        setTimeout(() => live.remove(), 2000);
      }
    }).catch(() => {});
  });
})();
