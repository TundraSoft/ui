/*
 * Tour ([data-tour]): [data-tour-start="#id"] starts it (or
 * data-tour-start-on="load", once per browser when data-tour-key names a
 * localStorage key). One step shows at a time: its target is scrolled
 * into view, the spotlight is sized to it (CSSOM), the card is placed
 * beside it with shared/js/float.js (flipped when there is no room) and
 * follows scroll and resize. Tab is trapped in the card; → / Next and
 * ← / Back move; Done, Skip and Escape end it and focus goes back to
 * the starter. Fires `tour:step` ({ index, total, target }) and
 * `tour:done` ({ completed }) on the root.
 */
(() => {
  const SPOT_PAD = 6;
  const running = new Map(); // root → { index, starter, stop }

  const reduced = () =>
    globalThis.uiMotion?.reduced?.() ??
      (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const steps = (root) => [...root.querySelectorAll("[data-tour-step]")];
  const card = (root) => root.querySelector(".tour__card");
  const spot = (root) => root.querySelector(".tour__spot");
  const targetOf = (step) => {
    const sel = step.getAttribute("data-target");
    if (!sel) return null;
    try {
      return document.querySelector(sel);
    } catch {
      return null;
    }
  };

  function stored(root) {
    const key = root.getAttribute("data-tour-key");
    if (!key) return false;
    try {
      return localStorage.getItem(key) === "done";
    } catch {
      return false;
    }
  }

  function remember(root) {
    const key = root.getAttribute("data-tour-key");
    if (!key) return;
    try {
      localStorage.setItem(key, "done");
    } catch {
      /* no storage: the tour simply runs again next time */
    }
  }

  function sideFor(placement, panel) {
    const rtl = getComputedStyle(panel).direction === "rtl";
    if (placement === "start") return rtl ? "right" : "left";
    if (placement === "end") return rtl ? "left" : "right";
    return placement === "top" ? "top" : "bottom";
  }

  function place(root) {
    const run = running.get(root);
    if (!run) return;
    const step = steps(root)[run.index];
    const target = step ? targetOf(step) : null;
    const c = card(root);
    const s = spot(root);
    if (!c || !s) return;
    if (!target) {
      globalThis.uiFloat?.clear(c);
      s.style.width = "0px";
      s.style.height = "0px";
      s.style.left = "50%";
      s.style.top = "50%";
      return;
    }
    const r = target.getBoundingClientRect();
    s.style.left = `${Math.round(r.left - SPOT_PAD)}px`;
    s.style.top = `${Math.round(r.top - SPOT_PAD)}px`;
    s.style.width = `${Math.round(r.width + 2 * SPOT_PAD)}px`;
    s.style.height = `${Math.round(r.height + 2 * SPOT_PAD)}px`;
    if (globalThis.uiFloat) {
      const offset = SPOT_PAD + 10;
      const side = sideFor(step.getAttribute("data-placement"), c);
      globalThis.uiFloat.place(target, c, { side, offset });
      // Beside a wide target (a full-width field) there is room on neither
      // side: float.js flips but cannot shift sideways, so fall through
      // to below / above.
      if (side === "left" || side === "right") {
        const b = c.getBoundingClientRect();
        const vw = document.documentElement.clientWidth;
        if (b.left < 0 || b.right > vw) globalThis.uiFloat.place(target, c, { side: "bottom", offset });
      }
    }
  }

  function show(root, index) {
    const run = running.get(root);
    const all = steps(root);
    if (!run || !all.length) return;
    // Skip a step whose target is not on this page.
    let i = index;
    const dir = index >= run.index ? 1 : -1;
    while (i >= 0 && i < all.length && all[i].getAttribute("data-target") && !targetOf(all[i])) i += dir;
    if (i < 0 || i >= all.length) {
      if (dir > 0) end(root, true);
      return;
    }
    run.index = i;
    all.forEach((step, n) => (step.hidden = n !== i));
    const progress = root.querySelector("[data-tour-progress]");
    if (progress) {
      const t = progress.getAttribute("data-template") || "{n} of {total}";
      progress.textContent = t.replace("{n}", String(i + 1)).replace("{total}", String(all.length));
    }
    const back = root.querySelector("[data-tour-back]");
    if (back) back.disabled = i === 0;
    const next = root.querySelector("[data-tour-next]");
    if (next) {
      next.textContent = i === all.length - 1
        ? next.getAttribute("data-done-label") || "Done"
        : next.getAttribute("data-next-label") || "Next";
    }
    const c = card(root);
    c?.setAttribute("aria-labelledby", `${all[i].id}-title`);
    const target = targetOf(all[i]);
    if (target) {
      target.scrollIntoView({ block: "center", inline: "nearest", behavior: reduced() ? "instant" : "smooth" });
    }
    place(root);
    c?.focus({ preventScroll: true });
    root.dispatchEvent(
      new CustomEvent("tour:step", { bubbles: true, detail: { index: i, total: all.length, target } }),
    );
  }

  function start(root, starter) {
    if (running.has(root) || !steps(root).length) return;
    globalThis.uiMotion?.cancelExit(root);
    const run = { index: 0, starter };
    running.set(root, run);
    root.hidden = false;
    const update = () => place(root);
    addEventListener("scroll", update, { capture: true, passive: true });
    addEventListener("resize", update, { passive: true });
    run.stop = () => {
      removeEventListener("scroll", update, { capture: true });
      removeEventListener("resize", update);
    };
    show(root, 0);
  }

  function end(root, completed) {
    const run = running.get(root);
    if (!run) return;
    run.stop?.();
    running.delete(root);
    remember(root);
    const done = () => {
      root.hidden = true;
      steps(root).forEach((step) => (step.hidden = true));
      const c = card(root);
      if (c) globalThis.uiFloat?.clear(c);
      if (run.starter?.isConnected) run.starter.focus();
    };
    if (globalThis.uiMotion) globalThis.uiMotion.exit(root, done);
    else done();
    root.dispatchEvent(new CustomEvent("tour:done", { bubbles: true, detail: { completed } }));
  }

  document.addEventListener("click", (event) => {
    const starter = event.target.closest?.("[data-tour-start]");
    if (starter) {
      const root = document.querySelector(starter.getAttribute("data-tour-start") ?? "");
      if (root?.hasAttribute("data-tour")) {
        event.preventDefault();
        start(root, starter);
      }
      return;
    }
    const root = event.target.closest?.("[data-tour]");
    if (!root || !running.has(root)) return;
    if (event.target.closest("[data-tour-next]")) {
      const run = running.get(root);
      if (run.index >= steps(root).length - 1) end(root, true);
      else show(root, run.index + 1);
    } else if (event.target.closest("[data-tour-back]")) {
      show(root, running.get(root).index - 1);
    } else if (event.target.closest("[data-tour-skip]")) {
      end(root, false);
    }
  });

  document.addEventListener("keydown", (event) => {
    const root = event.target.closest?.("[data-tour]");
    if (!root || !running.has(root)) return;
    const run = running.get(root);
    const typing = event.target.matches?.("input, textarea, select, [contenteditable]");
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      end(root, false);
    } else if (event.key === "ArrowRight" && !typing) {
      event.preventDefault();
      if (run.index >= steps(root).length - 1) end(root, true);
      else show(root, run.index + 1);
    } else if (event.key === "ArrowLeft" && !typing) {
      event.preventDefault();
      if (run.index > 0) show(root, run.index - 1);
    } else if (event.key === "Tab") {
      const c = card(root);
      const focusable = [
        ...c.querySelectorAll(
          "button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ]
        .filter((el) => el.offsetParent !== null);
      if (!focusable.length) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === c)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  // Focus that escapes the card (a click on the scrim) comes back to it.
  document.addEventListener("focusin", (event) => {
    running.forEach((_, root) => {
      const c = card(root);
      if (c && !c.contains(event.target)) c.focus({ preventScroll: true });
    });
  });

  function autoStart() {
    document.querySelectorAll('[data-tour][data-tour-start-on="load"]').forEach((root) => {
      if (root.hasAttribute("data-tour-started") || stored(root)) return;
      root.setAttribute("data-tour-started", "");
      start(root, null);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoStart);
  else autoStart();
  document.addEventListener("rapid:swapped", autoStart);
})();
