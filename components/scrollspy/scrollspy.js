/*
 * Scroll spy: every `[data-scrollspy]` element's `a[href^="#"]` links are
 * matched to the sections they point at, and the link of the section
 * nearest the top of the viewport (under `data-scrollspy-offset` px, by
 * default the --scroll-padding-top token) is marked `aria-current="true"`
 * + `.is-active`; the link of a parent section whose child is current gets
 * `.is-active-parent`. Recomputed on scroll (rAF-throttled), resize, load
 * and after a rapid swap. A click on a link marks it at once and holds
 * that until the person scrolls (wheel, touch, keyboard), so the page's
 * own smooth scroll (reset.css, `html:focus-within`) never flickers
 * through the sections on the way, and a short page that cannot bring
 * the section to the top keeps the clicked link marked. Nothing here
 * scrolls: hash navigation stays the browser's.
 */
(() => {
  const roots = () => document.querySelectorAll("[data-scrollspy]");
  const holds = new WeakMap();
  const held = new Set();

  function offsetOf(root) {
    const own = Number(root.getAttribute("data-scrollspy-offset"));
    if (own > 0) return own;
    // reset.css sets html's scroll-padding-top from the token, and the
    // computed value is a resolved px length — the token itself reads back
    // as its declared text, which a calc() or var() would not parse from.
    const style = getComputedStyle(document.documentElement);
    const padding = parseFloat(style.scrollPaddingTop);
    if (padding > 0) return padding;
    const token = style.getPropertyValue("--scroll-padding-top").trim();
    return token.endsWith("rem") ? parseFloat(token) * 16 : parseFloat(token) || 0;
  }

  function pairs(root) {
    const out = [];
    root.querySelectorAll('a[href^="#"]').forEach((link) => {
      const id = link.getAttribute("href").slice(1);
      if (!id) return;
      let target = null;
      try {
        target = document.getElementById(decodeURIComponent(id));
      } catch {
        target = document.getElementById(id);
      }
      if (target) out.push({ link, target });
    });
    return out;
  }

  function mark(root, current) {
    root.querySelectorAll('a[href^="#"]').forEach((link) => {
      const on = link === current;
      link.classList.toggle("is-active", on);
      if (on) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
      link.classList.remove("is-active-parent");
    });
    if (!current) return;
    // A nested list's parent link: the previous link up the tree.
    let list = current.closest("ul, ol");
    while (list) {
      const parentItem = list.parentElement?.closest("li");
      const parentLink = parentItem?.querySelector(':scope > a[href^="#"]');
      if (parentLink) parentLink.classList.add("is-active-parent");
      list = parentItem?.closest("ul, ol") ?? null;
    }
  }

  function update(root) {
    if (holds.has(root)) return;
    const list = pairs(root);
    if (!list.length) return;
    const line = offsetOf(root) + 16;
    let current = null;
    for (const p of list) {
      if (p.target.getBoundingClientRect().top <= line) current = p.link;
    }
    // Scrolled to the very end of a page that scrolls: the last section can
    // never reach the line, yet it is the one being read.
    const doc = document.documentElement;
    const atEnd = doc.scrollHeight > innerHeight + 2 && innerHeight + scrollY >= doc.scrollHeight - 2;
    if (atEnd) current = list[list.length - 1].link;
    mark(root, current ?? list[0].link);
  }

  const updateAll = () => roots().forEach(update);

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      updateAll();
    });
  };

  document.addEventListener("click", (event) => {
    const link = event.target.closest?.('[data-scrollspy] a[href^="#"]');
    if (!link) return;
    const root = link.closest("[data-scrollspy]");
    held.add(root);
    holds.set(root, true);
    mark(root, link);
  });

  // A hold lasts until the person scrolls themselves (not the page's own
  // smooth scroll to the clicked section).
  const release = () => {
    for (const root of held) holds.delete(root);
    held.clear();
    schedule();
  };
  addEventListener("wheel", release, { passive: true });
  addEventListener("touchmove", release, { passive: true });
  addEventListener("keydown", (event) => {
    if (/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(event.key)) release();
  });

  addEventListener("scroll", schedule, { passive: true });
  addEventListener("resize", schedule, { passive: true });
  addEventListener("load", updateAll);
  addEventListener("hashchange", updateAll);
  document.addEventListener("rapid:swapped", updateAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", updateAll);
  else updateAll();
})();
