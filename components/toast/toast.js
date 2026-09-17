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
 */
(() => {
  const timers = new WeakMap();

  function autoDismiss(el) {
    const ms = Number(el.dataset.toastAutodismiss);
    if (!ms || timers.has(el)) return;
    timers.set(el, setTimeout(() => el.remove(), ms));
  }

  function cap(region) {
    const max = Number(region.dataset.toastMax) || 4;
    const toasts = region.querySelectorAll(":scope > .toast");
    for (let i = 0; i < toasts.length - max; i++) toasts[i].remove();
  }

  function scan(root) {
    root.querySelectorAll?.(".toast[data-toast-autodismiss]").forEach(autoDismiss);
    if (root.matches?.(".toast[data-toast-autodismiss]")) autoDismiss(root);
    root.querySelectorAll?.(".toast-region").forEach(cap);
    root.closest?.(".toast-region") && cap(root.closest(".toast-region"));
  }

  scan(document);

  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === 1) scan(node);
      }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-toast-open]");
    if (!trigger) return;
    const template = document.querySelector(trigger.getAttribute("data-toast-open") ?? "");
    const target = document.querySelector(trigger.getAttribute("data-toast-region") ?? "#toast-region");
    if (!template?.content || !target) return;
    target.append(template.content.cloneNode(true));
  });
})();
