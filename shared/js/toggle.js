/*
 * Generic show/hide: a trigger carrying `data-toggle="<selector>"` flips
 * `hidden`, `.is-open` and `aria-expanded` on the element(s) `<selector>`
 * matches. Not `data-target` — that name is rAPId's own swap-target
 * attribute (see CLAUDE.md §2); this is a different, unrelated attribute
 * so the two mechanisms never collide on the same element.
 *
 * `data-toggle-class` on the trigger switches to class-only mode (no
 * `hidden`): for things that must stay in the layout when "closed", like
 * an off-canvas sidebar that is a normal column on desktop.
 */
(() => {
  const classOnly = (trigger) => trigger.hasAttribute("data-toggle-class");

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-toggle]");
    if (!trigger) return;
    const selector = trigger.getAttribute("data-toggle");
    const target = selector && selector !== "#" && document.querySelector(selector);
    if (!target) return;

    const wasExpanded = trigger.getAttribute("aria-expanded") === "true";
    trigger.setAttribute("aria-expanded", String(!wasExpanded));
    if (classOnly(trigger)) {
      target.classList.toggle("is-open", !wasExpanded);
      return;
    }
    if (wasExpanded) hide(target);
    else {
      globalThis.uiMotion?.cancelExit(target);
      target.removeAttribute("hidden");
      target.classList.add("is-open");
    }
  });

  /** Hidden after the panel's exit animation, when its CSS has one. */
  function hide(target) {
    target.classList.remove("is-open");
    const done = () => target.setAttribute("hidden", "");
    if (globalThis.uiMotion) globalThis.uiMotion.exit(target, done);
    else done();
  }

  document.addEventListener("click", (event) => {
    const dismisser = event.target.closest?.("[data-toggle-close]");
    if (!dismisser) return;
    const selector = dismisser.getAttribute("data-toggle-close");
    const target = selector ? document.querySelector(selector) : dismisser.closest("[data-toggle-panel]");
    if (!target) return;
    close(target);
  });

  // Escape closes an open class-only panel (the mobile drawer) and
  // returns focus to whatever opened it.
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    document.querySelectorAll("[data-toggle-class][aria-expanded='true']").forEach((trigger) => {
      const target = document.querySelector(trigger.getAttribute("data-toggle") ?? "");
      if (!target) return;
      close(target);
      trigger.focus();
      event.preventDefault();
    });
  });

  function close(target) {
    let hideIt = false;
    document.querySelectorAll(`[data-toggle][aria-expanded="true"]`).forEach((trigger) => {
      const sel = trigger.getAttribute("data-toggle");
      if (sel && document.querySelector(sel) === target) {
        trigger.setAttribute("aria-expanded", "false");
        if (!classOnly(trigger)) hideIt = true;
      }
    });
    if (hideIt) hide(target);
    else target.classList.remove("is-open");
  }
})();
