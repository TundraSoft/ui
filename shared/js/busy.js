/* Loading state for rAPId swaps, automatically. The moment a
 * [data-action] click or a form[data-action] submit is on its way, the
 * region it will replace is marked `aria-busy="true"` + `data-busy`;
 * skeleton.css paints a shimmer veil over it and turns pointer events
 * off, and `rapid:swapped` / `rapid:error` clear it. A `data-load` region
 * is left alone — it carries its own server-rendered skeleton until its
 * fragment lands. Content-shaped skeletons stay the server's job (only it
 * knows the shape); this is the generic "something is happening here".
 * Runs against the same delegated events the runtime uses; no `rapid.*`
 * call, no coupling beyond the two events it listens for. */
(() => {
  const TIMEOUT = 15000;
  const timers = new WeakMap();

  function targetOf(el) {
    const sel = el.getAttribute("data-target");
    if (!sel) return el;
    try {
      return document.querySelector(sel);
    } catch {
      return null;
    }
  }

  function clear(el) {
    if (!el || el.nodeType !== 1) return;
    el.removeAttribute("aria-busy");
    delete el.dataset.busy;
    const t = timers.get(el);
    if (t) clearTimeout(t);
  }

  function mark(el) {
    const region = targetOf(el);
    if (!region || region.hasAttribute("data-load")) return;
    region.setAttribute("aria-busy", "true");
    region.dataset.busy = "";
    // Never leave a veil behind if no reply ever comes.
    timers.set(region, setTimeout(() => clear(region), TIMEOUT));
  }

  // The runtime's own listener runs first and calls preventDefault on the
  // clicks it handles — so `defaultPrevented` is the normal case here, not
  // a reason to stand down.
  document.addEventListener("click", (event) => {
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const el = event.target.closest?.("[data-action]");
    if (!el || el.tagName === "FORM") return;
    // A real link inside a data-action container keeps its native
    // navigation (runtime rule) — no swap, so nothing to mark.
    const link = event.target.closest("a[href]");
    if (link && link !== el && el.contains(link)) return;
    mark(el);
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (form?.matches?.("form[data-action]")) mark(form);
  });

  document.addEventListener("rapid:swapped", (event) => clear(event.target));
  document.addEventListener("rapid:error", (event) => {
    clear(event.target);
    document.querySelectorAll("[data-busy]").forEach(clear);
  });
})();
