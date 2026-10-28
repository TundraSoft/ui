/*
 * Toasts. Three things live here:
 *
 * 1. Auto-dismiss: a `.toast[data-toast-autodismiss="<ms>"]` removes
 *    itself after that many ms — whether it was in the page at load or
 *    appended anywhere later (a rAPId swap into any region, or 2.).
 *
 * 2. Client-side trigger: `[data-toast-open="#template-id"]` clones that
 *    <template>'s content into the region (`data-toast-region`, default
 *    `#toast-region`). For rAPId apps the server usually pushes toasts via
 *    `data-target="#toast-region" data-swap="append"`; this is the
 *    no-server path (plain HTML sites, optimistic UI).
 *
 * 3. Stack cap: a region keeps at most `data-toast-max` (default 4)
 *    toasts; the oldest are dropped so a burst never buries the page.
 *
 * 4. Top layer: where the Popover API exists the region is shown as a
 *    manual popover, so it paints above an open <dialog> (the top layer
 *    beats any z-index). It is re-raised whenever a toast lands, since a
 *    dialog opened later would otherwise sit above it. The toast is
 *    visible there but not clickable: a modal dialog makes everything
 *    outside it inert, popovers included, by design. Without the API the
 *    region stays a fixed element under `--z-toast`.
 */
(() => {
  const timers = new WeakMap();

  /** Leave with the exit animation (toast.css `.is-closing`), then go. */
  const leave = (el) => {
    if (globalThis.uiMotion) globalThis.uiMotion.exit(el, () => el.remove());
    else el.remove();
  };

  function autoDismiss(el) {
    const ms = Number(el.dataset.toastAutodismiss);
    if (!ms || timers.has(el)) return;
    timers.set(el, setTimeout(() => leave(el), ms));
  }

  function cap(region) {
    const max = Number(region.dataset.toastMax) || 4;
    const toasts = Array.from(region.querySelectorAll(":scope > .toast")).filter((t) =>
      !globalThis.uiMotion?.isExiting(t)
    );
    for (let i = 0; i < toasts.length - max; i++) leave(toasts[i]);
  }

  const popovers = typeof HTMLElement !== "undefined" && "togglePopover" in HTMLElement.prototype;

  /** Put (or put back) the region on top of the top layer. */
  function raise(region) {
    if (!popovers || !region.isConnected) return;
    try {
      if (!region.hasAttribute("popover")) region.setAttribute("popover", "manual");
      if (region.matches(":popover-open")) {
        // Already up: only a dialog opened since could be above it, and
        // re-showing replays every toast's entrance, so leave it otherwise.
        if (!document.querySelector("dialog[open]")) return;
        region.hidePopover();
      }
      region.showPopover();
    } catch {
      region.removeAttribute("popover");
    }
  }

  function scan(root) {
    root.querySelectorAll?.(".toast[data-toast-autodismiss]").forEach(autoDismiss);
    if (root.matches?.(".toast[data-toast-autodismiss]")) autoDismiss(root);
    root.querySelectorAll?.(".toast-region").forEach((region) => {
      cap(region);
      raise(region);
    });
    const region = root.closest?.(".toast-region");
    if (region && region !== root) {
      cap(region);
      if (root.matches?.(".toast")) raise(region);
    }
  }

  scan(document);

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
      // A dialog that just opened sits above the regions: put them back on top.
      if (mutation.type === "attributes" && mutation.target.matches?.("dialog[open]")) {
        document.querySelectorAll(".toast-region").forEach((region) => {
          if (region.querySelector(".toast")) raise(region);
        });
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["open"] });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-toast-open]");
    if (!trigger) return;
    const template = document.querySelector(trigger.getAttribute("data-toast-open") ?? "");
    const target = document.querySelector(trigger.getAttribute("data-toast-region") ?? "#toast-region");
    if (!template?.content || !target) return;
    target.append(template.content.cloneNode(true));
  });
})();
