/*
 * Combobox: keyboard navigation over a server-rendered listbox, open on
 * focus (a read-only Select: on click, toggling), pick on click/Enter,
 * dismiss on Escape, outside click or focus leaving the control. Without
 * this script it is a text input plus a visible listbox — still usable.
 *
 * Filtering: with `data-combobox-action` on the input AND rAPId's runtime
 * present, each (debounced) keystroke does
 * `window.rapid.swap(action?q=<text>, #<id>-list)` and the server's
 * ComboboxList fragment replaces the list. Otherwise the rendered options
 * are filtered client-side — non-matches and empty groups hidden, count
 * updated. (rAPId's own runtime only reacts to click/submit, so this is
 * the one place a component script triggers a swap programmatically.)
 *
 * Select-only controls (the Select's `<button role="combobox">`, or a
 * read-only input) open on click or Arrow, never on focus, and toggle
 * like a native select; Space picks the highlighted option while open.
 *
 * Value: single-select writes the picked option's `data-value` into the
 * hidden `[data-combobox-value]` input and its label into the visible
 * one; typing clears the hidden value until a new pick. Multi-select adds
 * a token (label + hidden input named after `data-combobox-name`);
 * [data-combobox-remove] drops it again.
 */
(() => {
  const ACTIVE = "data-active";
  const X_ICON =
    '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  const inputOf = (root) => root.querySelector("[role='combobox']");
  /** A control that picks but is not typed into (Select's button, a read-only input). */
  const selectOnly = (el) => el.tagName !== "INPUT" || el.readOnly;
  /** Show a label in the control: an input's value, or a button's text slot. */
  function showLabel(el, label) {
    if (el.tagName === "INPUT") {
      el.value = label;
      return;
    }
    const slot = el.querySelector("[data-select-text]") ?? el;
    slot.textContent = label;
    slot.classList.remove("select__text--placeholder");
  }
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
    const list = opts[i].closest(".combobox__list");
    if (!list) return;
    const top = opts[i].offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    const bottom = top + opts[i].offsetHeight;
    if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }

  const isOpen = (root) => root.classList.contains("combobox--open");

  function open(root, on) {
    const list = root.querySelector(".combobox__list");
    const input = inputOf(root);
    if (list) list.hidden = !on;
    if (input) input.setAttribute("aria-expanded", on ? "true" : "false");
    root.classList.toggle("combobox--open", !!on);
    if (!on) clearActive(root);
  }

  /* Client-side filter — only when the server is not doing it. */
  function filterLocal(root) {
    const input = inputOf(root);
    const list = root.querySelector(".combobox__list");
    if (!input || !list) return;
    const q = input.value.trim().toLowerCase();

    let visible = 0;
    root.querySelectorAll('[role="option"]').forEach((o) => {
      const label = o.querySelector(".combobox__option-label")?.textContent ?? o.textContent;
      const hit = !q || label.toLowerCase().includes(q);
      o.hidden = !hit;
      if (hit) visible++;
    });
    clearActive(root);

    root.querySelectorAll(".combobox__group").forEach((group) => {
      let el = group.nextElementSibling;
      let any = false;
      while (el && !el.classList.contains("combobox__group") && !el.classList.contains("combobox__hints")) {
        if (el.matches('[role="option"]') && !el.hidden) {
          any = true;
          break;
        }
        el = el.nextElementSibling;
      }
      group.hidden = !any;
    });

    const count = root.querySelector(".combobox__count");
    if (count) count.textContent = visible === 1 ? "1 match" : `${visible} matches`;

    let empty = list.querySelector(".combobox__empty");
    if (!empty) {
      empty = document.createElement("div");
      empty.className = "combobox__empty";
      empty.textContent = "No matches.";
      list.insertBefore(empty, list.querySelector(".combobox__hints"));
    }
    empty.hidden = visible > 0;
  }

  const timers = new WeakMap();
  function filter(root) {
    const input = inputOf(root);
    const action = input?.getAttribute("data-combobox-action");
    const target = input?.getAttribute("data-combobox-target");
    if (action && target && globalThis.rapid?.swap) {
      clearTimeout(timers.get(root));
      timers.set(
        root,
        setTimeout(() => {
          const url = `${action}${action.includes("?") ? "&" : "?"}q=${encodeURIComponent(input.value.trim())}`;
          globalThis.rapid.swap(url, target).then(() => clearActive(root));
        }, 150),
      );
      return;
    }
    filterLocal(root);
  }

  function pickSingle(root, opt) {
    const input = inputOf(root);
    const hidden = root.querySelector("[data-combobox-value]");
    const label = (opt.querySelector(".combobox__option-label")?.textContent ?? opt.textContent).trim();
    if (input) showLabel(input, label);
    if (hidden) hidden.value = opt.getAttribute("data-value") ?? label;
    root.querySelectorAll('[role="option"]').forEach((o) => o.setAttribute("aria-selected", String(o === opt)));
    open(root, false);
    // Wrappers (the Select) mirror the pick into their own control.
    root.dispatchEvent(
      new CustomEvent("combobox:pick", { bubbles: true, detail: { value: hidden?.value ?? label, label } }),
    );
  }

  function addToken(root, opt) {
    const field = root.querySelector(".combobox__field");
    const input = inputOf(root);
    const value = opt.getAttribute("data-value") ?? "";
    const label = (opt.querySelector(".combobox__option-label")?.textContent ?? opt.textContent).trim();
    const name = root.getAttribute("data-combobox-name") ?? "";
    if (!field || !input) return;
    if (Array.from(field.querySelectorAll(".combobox__token input")).some((h) => h.value === value)) return;

    const token = document.createElement("span");
    token.className = "combobox__token";
    token.append(label);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "combobox__token-remove";
    remove.setAttribute("aria-label", `Remove ${label}`);
    remove.setAttribute("data-combobox-remove", value);
    remove.innerHTML = X_ICON; // constant markup, no data
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = name;
    hidden.value = value;
    token.append(remove, hidden);
    field.insertBefore(token, input);

    opt.setAttribute("aria-selected", "true");
    input.value = "";
    filter(root);
    input.focus();
  }

  function removeToken(root, value) {
    root.querySelectorAll(".combobox__token").forEach((t) => {
      if (t.querySelector("input")?.value === value) t.remove();
    });
    root.querySelectorAll(`[role="option"][data-value="${CSS.escape(value)}"]`)
      .forEach((o) => o.setAttribute("aria-selected", "false"));
  }

  document.addEventListener("keydown", (event) => {
    const root = event.target.closest?.("[data-combobox]");
    if (!root) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open(root, true);
      setActive(root, activeIndex(root) + (event.key === "ArrowDown" ? 1 : -1));
    } else if (event.key === " " && selectOnly(event.target)) {
      // Space on a select-only control: pick the highlighted option while
      // open; otherwise the button's own click toggles the list.
      const i = activeIndex(root);
      const opts = options(root);
      if (isOpen(root) && i >= 0 && opts[i]) {
        event.preventDefault();
        opts[i].click();
        inputOf(root)?.focus();
      }
    } else if (event.key === "Enter") {
      const i = activeIndex(root);
      const opts = options(root);
      if (i >= 0 && opts[i]) {
        // Only swallow Enter when it picks something; otherwise a form
        // around the combobox still submits normally.
        event.preventDefault();
        opts[i].click();
        if (selectOnly(event.target)) inputOf(root)?.focus();
      }
    } else if (event.key === "Escape") {
      // Only claim Escape while the list is open — otherwise it must
      // reach the <dialog>/popover this combobox may be sitting in.
      if (!isOpen(root)) return;
      event.preventDefault();
      event.stopPropagation();
      open(root, false);
    } else if (
      event.key === "Backspace" && root.classList.contains("combobox--multi") &&
      event.target.matches("input[role='combobox']") && !event.target.value
    ) {
      const last = root.querySelector(".combobox__field .combobox__token:last-of-type input");
      if (last) removeToken(root, last.value);
    }
  });

  document.addEventListener("input", (event) => {
    const root = event.target.closest?.("[data-combobox]");
    if (!root || !event.target.matches("input[role='combobox']")) return;
    const hidden = root.querySelector("[data-combobox-value]");
    if (hidden) hidden.value = ""; // typing un-picks; a pick sets it again
    filter(root);
    open(root, true);
  });

  // Focus opens a typeable list; a read-only one (Select) stays shut until
  // clicked or arrowed, like a native select — so a dialog that focuses it
  // on open does not unfold it, and the first click is not a close.
  document.addEventListener("focusin", (event) => {
    const root = event.target.closest?.("[data-combobox]");
    if (root && event.target.matches("[role='combobox']") && !selectOnly(event.target)) open(root, true);
  });

  // Focus leaving the control for another focusable element (Tab, a click
  // on another field) closes the list. A click on something that takes no
  // focus moves focus to nothing, or to a focusable ancestor (a <dialog>) —
  // that is the outside-click handler's job, and leaving it there is what
  // keeps a press on an option from closing the list before the click lands.
  document.addEventListener("focusout", (event) => {
    const root = event.target?.closest?.("[data-combobox]");
    const to = event.relatedTarget;
    if (!root || !to || root.contains(to) || to.contains(root)) return;
    if (isOpen(root)) open(root, false);
  });

  document.addEventListener("click", (event) => {
    // A click on a combobox's <label> is followed by the browser's own click
    // on the input — let that one act, or the sweep below would close the
    // list and the input click reopen it.
    const label = event.target.closest?.("label");
    if (label && !event.target.closest("[data-combobox]") && label.control?.closest("[data-combobox]")) return;

    // Any click closes every other open list.
    document.querySelectorAll("[data-combobox].combobox--open").forEach((root) => {
      if (event.target.closest?.("[data-combobox]") !== root) open(root, false);
    });

    // A click on the input: a read-only one (Select) toggles like a native
    // select; a typeable one opens (focusin does not fire again when the
    // input already had focus, e.g. after Escape closed the list).
    const input = event.target.closest?.("[data-combobox] [role='combobox']");
    if (input && !input.disabled) {
      const root = input.closest("[data-combobox]");
      open(root, selectOnly(input) ? !isOpen(root) : true);
      return;
    }

    // A click on the field itself (the caret, the padding) — not on the
    // input or a token button — focuses the input and toggles the list.
    const field = event.target.closest?.("[data-combobox] .combobox__field");
    if (field && !event.target.closest("input, button, [role='combobox']")) {
      const root = field.closest("[data-combobox]");
      const input = inputOf(root);
      if (input && !input.disabled) {
        if (isOpen(root)) open(root, false);
        else {
          input.focus();
          open(root, true);
        }
      }
      return;
    }

    const opt = event.target.closest?.("[data-combobox] [role='option']");
    if (opt) {
      if (opt.getAttribute("aria-disabled") === "true") return;
      const root = opt.closest("[data-combobox]");
      if (root.classList.contains("combobox--multi")) addToken(root, opt);
      else pickSingle(root, opt);
      return;
    }

    const remove = event.target.closest?.("[data-combobox-remove]");
    if (remove) {
      const root = remove.closest("[data-combobox]");
      if (root) removeToken(root, remove.getAttribute("data-combobox-remove") ?? "");
    }
  });
})();
