/*
 * Tree view (APG "tree view" pattern). The markup renders every branch
 * open; on init the parents not marked expanded (`aria-expanded="false"`)
 * get their group hidden. A click on the chevron toggles a branch; a
 * click on a row selects it (and a link row navigates). Keyboard, with a
 * roving tabindex on the <li>s: ↓/↑ move through the visible items,
 * → opens a closed parent or moves into its first child, ← closes an
 * open parent or moves to the parent, Home/End, Enter/Space activates
 * (follows the link, else toggles), and typing a letter jumps to the
 * next item starting with it.
 */
(() => {
  const ITEM = '[role="treeitem"]';
  const groupOf = (item) => item.querySelector(":scope > .tree__group");
  const isOpen = (item) => item.getAttribute("aria-expanded") === "true";
  const treeOf = (item) => item.closest("[data-tree]");

  function setOpen(item, on) {
    const group = groupOf(item);
    if (!group) return;
    item.setAttribute("aria-expanded", on ? "true" : "false");
    group.hidden = !on;
    item.toggleAttribute("data-tree-expanded", on);
  }

  /** Every item that is on screen (no collapsed ancestor), in order. */
  const visible = (tree) =>
    Array.from(tree.querySelectorAll(ITEM)).filter((item) => {
      for (let g = item.parentElement; g && g !== tree; g = g.parentElement) {
        if (g.hidden) return false;
      }
      return true;
    });

  function focusItem(item) {
    if (!item) return;
    const tree = treeOf(item);
    tree?.querySelectorAll(ITEM).forEach((i) => i.setAttribute("tabindex", i === item ? "0" : "-1"));
    item.focus({ preventScroll: false });
  }

  function select(item) {
    const tree = treeOf(item);
    tree?.querySelectorAll(ITEM).forEach((i) => {
      const on = i === item;
      i.setAttribute("aria-selected", on ? "true" : "false");
      i.classList.toggle("tree__item--selected", on);
    });
  }

  const label = (item) => item.querySelector(":scope > .tree__row .tree__text")?.textContent.trim().toLowerCase() ?? "";

  document.addEventListener("click", (event) => {
    const toggle = event.target.closest?.("[data-tree-toggle]");
    if (toggle) {
      const item = toggle.closest(ITEM);
      event.preventDefault();
      setOpen(item, !isOpen(item));
      focusItem(item);
      return;
    }
    const row = event.target.closest?.(".tree__row");
    const item = row?.closest(ITEM);
    if (!item || !treeOf(item)) return;
    select(item);
    focusItem(item);
    // A parent without a link opens on a row click too.
    if (!row.querySelector("a.tree__link") && groupOf(item)) setOpen(item, !isOpen(item));
  });

  document.addEventListener("keydown", (event) => {
    const item = event.target.closest?.(ITEM);
    if (!item || event.target !== item) return;
    const tree = treeOf(item);
    if (!tree) return;
    const items = visible(tree);
    const i = items.indexOf(item);
    const key = event.key;
    let next;
    if (key === "ArrowDown") next = items[i + 1];
    else if (key === "ArrowUp") next = items[i - 1];
    else if (key === "Home") next = items[0];
    else if (key === "End") next = items[items.length - 1];
    else if (key === "ArrowRight") {
      if (groupOf(item) && !isOpen(item)) setOpen(item, true);
      else next = groupOf(item)?.querySelector(ITEM) ?? undefined;
    } else if (key === "ArrowLeft") {
      if (groupOf(item) && isOpen(item)) setOpen(item, false);
      else next = item.parentElement.closest(ITEM) ?? undefined;
    } else if (key === "Enter" || key === " ") {
      const link = item.querySelector(":scope > .tree__row a.tree__link");
      select(item);
      if (link) {
        if (key === " ") event.preventDefault();
        link.click();
      } else if (groupOf(item)) setOpen(item, !isOpen(item));
      event.preventDefault();
      return;
    } else if (key.length === 1 && /\S/.test(key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const ch = key.toLowerCase();
      const after = items.slice(i + 1).concat(items.slice(0, i + 1));
      next = after.find((o) => label(o).startsWith(ch));
      if (!next) return;
    } else return;
    event.preventDefault();
    focusItem(next);
  });

  function initAll() {
    document.querySelectorAll("[data-tree]").forEach((tree) => {
      if (tree.hasAttribute("data-tree-ready")) return;
      tree.setAttribute("data-tree-ready", "");
      tree.querySelectorAll(ITEM).forEach((item) => {
        if (groupOf(item)) setOpen(item, isOpen(item));
      });
      if (!tree.querySelector(`${ITEM}[tabindex="0"]`)) tree.querySelector(ITEM)?.setAttribute("tabindex", "0");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
