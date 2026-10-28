/*
 * Transfer ([data-transfer]): two listboxes and the buttons between them.
 * The native <select multiple> inside is the form control: every move
 * sets the matching option's `selected` and fires `change` on it, so the
 * page sees an ordinary multi select. Click or Space marks an item,
 * double-click or Enter moves the marked items of that list (or the one
 * under the pointer), arrows walk, Home/End jump, Ctrl+A marks every
 * visible item; `[data-transfer-move]` buttons move the marked or all
 * visible items; `[data-transfer-search]` filters its own list. Items
 * keep the order they were rendered in (`data-index`). `transfer:change`
 * (detail: { values }) fires on the root after every move.
 */
(() => {
  const rootOf = (el) => el?.closest?.("[data-transfer]");
  const listOf = (el) => el?.closest?.("[data-transfer-list]");
  const items = (list) => [...list.querySelectorAll(".transfer__item")];
  const visible = (list) => items(list).filter((li) => !li.hidden);
  const movable = (li) => li.getAttribute("aria-disabled") !== "true";
  const sideOf = (list) => list.getAttribute("data-transfer-list");
  const otherList = (root, side) =>
    root.querySelector(`[data-transfer-list="${side === "source" ? "target" : "source"}"]`);
  const ul = (list) => list.querySelector(".transfer__items");

  function insertOrdered(target, li) {
    const idx = Number(li.getAttribute("data-index"));
    const after = items(target).find((o) => Number(o.getAttribute("data-index")) > idx);
    target.insertBefore(li, after ?? null);
  }

  function updateList(list) {
    const all = items(list);
    const shown = visible(list);
    const count = list.querySelector("[data-transfer-count]");
    if (count) count.textContent = shown.length === all.length ? String(all.length) : `${shown.length} / ${all.length}`;
    const empty = list.querySelector("[data-transfer-empty]");
    if (empty) {
      empty.hidden = shown.length > 0;
      empty.textContent = all.length === 0
        ? empty.getAttribute("data-empty-text") || "Nothing here"
        : empty.getAttribute("data-no-match-text") || "No matches";
    }
    // Roving tabindex: one item focusable, else the list itself.
    const box = ul(list);
    const current = shown.find((li) => li.tabIndex === 0) ?? shown[0];
    all.forEach((li) => (li.tabIndex = li === current ? 0 : -1));
    if (box) box.tabIndex = current ? -1 : 0;
  }

  function updateButtons(root) {
    const disabled = root.hasAttribute("data-transfer-disabled");
    root.querySelectorAll("[data-transfer-move]").forEach((btn) => {
      const move = btn.getAttribute("data-transfer-move");
      const side = move.endsWith("to-target") ? "source" : "target";
      const list = root.querySelector(`[data-transfer-list="${side}"]`);
      const pool = move.startsWith("all")
        ? visible(list).filter(movable)
        : visible(list).filter((li) => li.getAttribute("aria-selected") === "true" && movable(li));
      btn.disabled = disabled || pool.length === 0;
    });
  }

  function sync(root) {
    const native = root.querySelector(".transfer__native");
    const target = root.querySelector('[data-transfer-list="target"]');
    if (!native || !target) return;
    const chosen = new Set(items(target).map((li) => li.getAttribute("data-value")));
    for (const opt of native.options) opt.selected = chosen.has(opt.value);
    native.dispatchEvent(new Event("change", { bubbles: true }));
    root.dispatchEvent(new CustomEvent("transfer:change", { bubbles: true, detail: { values: [...chosen] } }));
  }

  function move(root, from, lis) {
    if (!lis.length) return;
    const to = otherList(root, sideOf(from));
    const box = ul(to);
    lis.forEach((li) => {
      li.setAttribute("aria-selected", "false");
      li.hidden = false;
      insertOrdered(box, li);
    });
    applySearch(to);
    updateList(from);
    updateList(to);
    updateButtons(root);
    sync(root);
  }

  function marked(list) {
    return visible(list).filter((li) => li.getAttribute("aria-selected") === "true" && movable(li));
  }

  function applySearch(list) {
    const q = (list.querySelector("[data-transfer-search]")?.value ?? "").trim().toLowerCase();
    items(list).forEach((li) => {
      li.hidden = q !== "" && !li.textContent.toLowerCase().includes(q);
      if (li.hidden) li.setAttribute("aria-selected", "false");
    });
    updateList(list);
  }

  function focusItem(li) {
    const list = listOf(li);
    items(list).forEach((o) => (o.tabIndex = o === li ? 0 : -1));
    li.focus();
  }

  document.addEventListener("click", (event) => {
    const btn = event.target.closest?.("[data-transfer-move]");
    if (btn) {
      const root = rootOf(btn);
      if (!root || btn.disabled) return;
      const kind = btn.getAttribute("data-transfer-move");
      const from = root.querySelector(`[data-transfer-list="${kind.endsWith("to-target") ? "source" : "target"}"]`);
      move(root, from, kind.startsWith("all") ? visible(from).filter(movable) : marked(from));
      return;
    }
    const li = event.target.closest?.(".transfer__item");
    if (!li || !rootOf(li) || rootOf(li).hasAttribute("data-transfer-disabled")) return;
    if (!movable(li)) return;
    li.setAttribute("aria-selected", li.getAttribute("aria-selected") === "true" ? "false" : "true");
    focusItem(li);
    updateButtons(rootOf(li));
  });

  document.addEventListener("dblclick", (event) => {
    const li = event.target.closest?.(".transfer__item");
    const root = rootOf(li);
    if (!li || !root || root.hasAttribute("data-transfer-disabled") || !movable(li)) return;
    move(root, listOf(li), [li]);
  });

  document.addEventListener("keydown", (event) => {
    const li = event.target.closest?.(".transfer__item");
    const box = event.target.closest?.(".transfer__items");
    const root = rootOf(li ?? box);
    if (!root || root.hasAttribute("data-transfer-disabled")) return;
    const list = listOf(li ?? box);
    const shown = visible(list);
    const at = li ? shown.indexOf(li) : -1;
    const go = (i) => {
      const next = shown[Math.max(0, Math.min(shown.length - 1, i))];
      if (next) focusItem(next);
    };
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        go(at + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        go(at < 0 ? 0 : at - 1);
        break;
      case "Home":
        event.preventDefault();
        go(0);
        break;
      case "End":
        event.preventDefault();
        go(shown.length - 1);
        break;
      case " ":
        if (!li || !movable(li)) return;
        event.preventDefault();
        li.setAttribute("aria-selected", li.getAttribute("aria-selected") === "true" ? "false" : "true");
        updateButtons(root);
        break;
      case "Enter": {
        if (!li) return;
        event.preventDefault();
        const pool = marked(list);
        const next = shown[at + 1] ?? shown[at - 1];
        move(root, list, pool.length ? pool : movable(li) ? [li] : []);
        const left = visible(list);
        const focusTo = left.includes(next) ? next : left[0];
        if (focusTo) focusItem(focusTo);
        else ul(list)?.focus();
        break;
      }
      case "a":
      case "A":
        if (!(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        shown.filter(movable).forEach((o) => o.setAttribute("aria-selected", "true"));
        updateButtons(root);
        break;
    }
  });

  document.addEventListener("input", (event) => {
    const box = event.target;
    if (!box?.matches?.("[data-transfer-search]")) return;
    const list = listOf(box);
    applySearch(list);
    updateButtons(rootOf(list));
  });

  // A native change not made by this script (another script, a reset):
  // follow the options.
  document.addEventListener("reset", (event) => {
    event.target.querySelectorAll?.("[data-transfer]").forEach((root) => queueMicrotask(() => fromNative(root)));
  });

  function fromNative(root) {
    const native = root.querySelector(".transfer__native");
    if (!native) return;
    const source = ul(root.querySelector('[data-transfer-list="source"]'));
    const target = ul(root.querySelector('[data-transfer-list="target"]'));
    for (const opt of native.options) {
      const li = root.querySelector(`.transfer__item[data-value="${CSS.escape(opt.value)}"]`);
      if (!li) continue;
      const want = opt.selected ? target : source;
      if (li.parentElement !== want) {
        li.setAttribute("aria-selected", "false");
        insertOrdered(want, li);
      }
    }
    root.querySelectorAll("[data-transfer-list]").forEach(updateList);
    updateButtons(root);
  }

  function initAll() {
    document.querySelectorAll("[data-transfer]").forEach((root) => {
      if (root.hasAttribute("data-transfer-ready")) return;
      root.setAttribute("data-transfer-ready", "");
      root.querySelectorAll("[data-transfer-list]").forEach(updateList);
      updateButtons(root);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
