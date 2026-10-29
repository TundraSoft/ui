/*
 * Exit animations, one way for the whole kit. Showing a panel needs no
 * script support: clearing `hidden` starts its `*-in` keyframes (see
 * styles/motion.css). Hiding one goes through `uiMotion.exit(el, done)`:
 * the element gets `.is-closing`, its stylesheet's `.is-closing` rule
 * plays the `*-out` animation, and `done` (which sets `hidden`, removes
 * the node, calls `dialog.close()`…) runs once that animation ends. When
 * nothing animates — no `.is-closing` rule, reduced motion with every
 * duration zeroed by reset.css, a detached node — `done` runs at once, so
 * a script never waits on an animation that is not coming.
 *
 * A second `exit()` on an element already leaving is ignored (the first
 * `done` still runs); `uiMotion.cancelExit(el)` takes an element out of
 * a pending exit (it was reopened mid-animation).
 *
 * Shared scripts load before every component script (scripts/build-js.ts
 * sorts shared/js first), so `uiMotion` is there for all of them.
 */
(() => {
  const pending = new WeakMap();

  const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** Longest animation or transition the element will play, in ms. */
  function longest(el) {
    const cs = getComputedStyle(el);
    const ms = (list) =>
      list.split(",").map((s) => {
        const t = s.trim();
        return t.endsWith("ms") ? parseFloat(t) : parseFloat(t) * 1000;
      });
    const a = cs.animationName !== "none"
      ? Math.max(...ms(cs.animationDuration).map((d, i) => d + (ms(cs.animationDelay)[i] ?? 0)))
      : 0;
    const t = cs.transitionProperty !== "none" && cs.transitionProperty !== "all"
      ? Math.max(...ms(cs.transitionDuration).map((d, i) => d + (ms(cs.transitionDelay)[i] ?? 0)))
      : 0;
    return Math.max(a, t) || 0;
  }

  function exit(el, done, { className = "is-closing" } = {}) {
    if (!el) {
      done?.();
      return;
    }
    if (pending.has(el)) return;
    if (!el.isConnected || reduced()) {
      done?.();
      return;
    }
    el.classList.add(className);
    const total = longest(el);
    if (total < 20) {
      el.classList.remove(className);
      done?.();
      return;
    }
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      pending.delete(el);
      el.removeEventListener("animationend", onEnd);
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      el.classList.remove(className);
      done?.();
    };
    const onEnd = (event) => {
      if (event.target === el) finish();
    };
    el.addEventListener("animationend", onEnd);
    el.addEventListener("transitionend", onEnd);
    // Never stranded: a cancelled animation (display: none from elsewhere,
    // a tab in the background) ends no event.
    const timer = setTimeout(finish, total + 50);
    pending.set(el, {
      finish,
      cancel: () => {
        if (settled) return;
        settled = true;
        pending.delete(el);
        el.removeEventListener("animationend", onEnd);
        el.removeEventListener("transitionend", onEnd);
        clearTimeout(timer);
        el.classList.remove(className);
      },
    });
  }

  const cancelExit = (el) => pending.get(el)?.cancel();
  const isExiting = (el) => pending.has(el);

  globalThis.uiMotion = { exit, cancelExit, isExiting, reduced };
})();
