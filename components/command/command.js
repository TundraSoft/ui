/*
 * Command palette: arrow-key navigation, Enter to run, Escape clears the
 * query then closes, Cmd/Ctrl+K or any [data-command-open] opens the
 * (non-inline) palette, overlay click closes it. Focus returns to
 * whatever opened it, and Tab is kept inside the floating sheet.
 *
 * Filtering: with `data-command-action` on the input and rAPId's runtime
 * present, each (debounced) keystroke swaps the server's CommandList
 * fragment into the list. Otherwise the rendered items are filtered
 * client-side — non-matches and empty groups hidden, count updated, the
 * first hit made active.
 */
(() => {
  const ACTIVE = "data-active";
  const openers = new WeakMap();

  const inputOf = (root) => root.querySelector(".command__input");
  const options = (root) => Array.from(root.querySelectorAll('[role="option"]')).filter((o) => !o.hidden);

  function activeIndex(root) {
    return options(root).findIndex((o) => o.hasAttribute(ACTIVE));
  }

  function clearActive(root) {
    root.querySelectorAll(`[${ACTIVE}]`).forEach((o) => o.removeAttribute(ACTIVE));
    inputOf(root)?.removeAttribute("aria-activedescendant");
  }

  function setActive(root, index) {
    const opts = options(root);
    if (!opts.length) return;
    const i = (index + opts.length) % opts.length;
    clearActive(root);
    opts[i].setAttribute(ACTIVE, "");
    const input = inputOf(root);
    if (input && opts[i].id) input.setAttribute("aria-activedescendant", opts[i].id);
    const list = opts[i].closest(".command__list");
    if (!list) return;
    const top = opts[i].offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    const bottom = top + opts[i].offsetHeight;
    if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }

  function filterLocal(root) {
    const input = inputOf(root);
    const list = root.querySelector(".command__list");
    if (!input || !list) return;
    const q = input.value.trim().toLowerCase();

    let visible = 0;
    root.querySelectorAll('[role="option"]').forEach((o) => {
      const label = o.querySelector(".command__item-label")?.textContent ?? o.textContent;
      const hit = !q || label.toLowerCase().includes(q);
      o.hidden = !hit;
      if (hit) visible++;
    });
    clearActive(root);

    root.querySelectorAll(".command__group").forEach((group) => {
      let el = group.nextElementSibling;
      let any = false;
      while (el && !el.classList.contains("command__group")) {
        if (el.matches('[role="option"]') && !el.hidden) {
          any = true;
          break;
        }
        el = el.nextElementSibling;
      }
      group.hidden = !any;
    });

    const count = root.querySelector(".command__count");
    if (count) count.textContent = visible === 1 ? "1 result" : `${visible} results`;

    let empty = list.querySelector(".command__empty");
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "command__empty";
      empty.textContent = "Nothing matches that.";
      list.append(empty);
    }
    empty.hidden = visible > 0;
    if (visible) setActive(root, 0);
  }

  const timers = new WeakMap();
  function filter(root) {
    const input = inputOf(root);
    const action = input?.getAttribute("data-command-action");
    const target = input?.getAttribute("data-command-target");
    if (action && target && globalThis.rapid?.swap) {
      clearTimeout(timers.get(root));
      timers.set(
        root,
        setTimeout(() => {
          const url = `${action}${action.includes("?") ? "&" : "?"}q=${encodeURIComponent(input.value.trim())}`;
          globalThis.rapid.swap(url, target).then(() => {
            clearActive(root);
            if (options(root).length) setActive(root, 0);
          });
        }, 150),
      );
      return;
    }
    filterLocal(root);
  }

  const isFloating = (root) => !root.classList.contains("command--inline");

  function close(root) {
    if (!isFloating(root)) return;
    root.hidden = true;
    const opener = openers.get(root);
    openers.delete(root);
    if (opener?.isConnected) opener.focus();
  }

  /* Escape / the esc affordance: clear a query first, then close. */
  function dismiss(root) {
    const input = inputOf(root);
    if (input && input.value) {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      close(root);
    }
  }

  function open(palette, opener) {
    openers.set(palette, opener ?? document.activeElement);
    palette.hidden = false;
    inputOf(palette)?.focus();
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
      const palette = document.querySelector("[data-command]:not(.command--inline)");
      if (!palette) return;
      event.preventDefault();
      open(palette);
      return;
    }

    const root = event.target.closest?.("[data-command]");
    if (!root) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActive(root, activeIndex(root) + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === "Enter") {
      const i = activeIndex(root);
      const opts = options(root);
      if (i >= 0 && opts[i]) {
        event.preventDefault();
        opts[i].click();
      }
    } else if (event.key === "Escape") {
      if (!isFloating(root) && !inputOf(root)?.value) return; // nothing to do; let it bubble
      event.preventDefault();
      event.stopPropagation();
      dismiss(root);
    } else if (event.key === "Tab" && isFloating(root)) {
      // Keep focus inside the sheet (it is aria-modal).
      const focusables = Array.from(
        root.querySelectorAll("input, button, a[href], [tabindex]:not([tabindex='-1'])"),
      ).filter((el) => !el.hidden && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });

  document.addEventListener("input", (event) => {
    const root = event.target.closest?.("[data-command]");
    if (root && event.target.matches(".command__input")) filter(root);
  });

  document.addEventListener("click", (event) => {
    /* [data-command-open="#id"] (or bare: the page's floating palette) */
    const opener = event.target.closest?.("[data-command-open]");
    if (opener) {
      const sel = opener.getAttribute("data-command-open");
      const palette = sel
        ? document.querySelector(sel)
        : document.querySelector("[data-command]:not(.command--inline)");
      if (palette) {
        event.preventDefault();
        open(palette, opener);
      }
      return;
    }

    const btn = event.target.closest?.("[data-command-dismiss]");
    if (btn) {
      const root = btn.closest("[data-command]");
      if (root) dismiss(root);
      return;
    }

    /* Running an item closes a floating palette. */
    const item = event.target.closest?.("[data-command] [role='option']");
    if (item) {
      const root = item.closest("[data-command]");
      if (root && isFloating(root)) close(root);
      return;
    }

    /* Overlay click (outside the sheet) closes a floating palette. */
    const overlay = event.target.closest?.("[data-command]:not(.command--inline)");
    if (overlay && !event.target.closest(".command__sheet")) close(overlay);
  });
})();
