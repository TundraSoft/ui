/*
 * Stat sparkline tooltips: each hit column (data-tip, rendered by
 * stat.ts) shows its label in a small tip above the point as soon as the
 * pointer is over it — a native <title> needs a second of stillness and
 * never shows on a touch screen, so it stays as the fallback and is
 * removed once this runs. The tip is positioned through the CSSOM.
 */
(() => {
  let tip = null;

  function tipEl() {
    if (tip?.isConnected) return tip;
    tip = document.createElement("div");
    tip.className = "stat__spark-tip";
    tip.setAttribute("role", "status");
    tip.hidden = true;
    document.body.append(tip);
    return tip;
  }

  function show(hit) {
    const el = tipEl();
    el.textContent = hit.getAttribute("data-tip") ?? "";
    el.hidden = false;
    const r = hit.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const gutter = 8;
    let left = r.left + r.width / 2 - t.width / 2;
    left = Math.max(gutter, Math.min(left, document.documentElement.clientWidth - gutter - t.width));
    let top = r.top - t.height - 6;
    if (top < gutter) top = r.bottom + 6;
    el.style.left = `${Math.round(left + scrollX)}px`;
    el.style.top = `${Math.round(top + scrollY)}px`;
  }

  function hide() {
    if (tip) tip.hidden = true;
  }

  // An enhanced page has no use for the native title (it would show a
  // second tooltip a beat later).
  function initAll() {
    document.querySelectorAll(".stat__spark-hit > title").forEach((t) => t.remove());
  }

  document.addEventListener("mouseover", (event) => {
    const hit = event.target.closest?.(".stat__spark-hit");
    if (hit) show(hit);
    else if (tip && !tip.hidden) hide();
  });
  document.addEventListener("mouseleave", hide, true);
  addEventListener("scroll", hide, { capture: true, passive: true });
  // Touch: a tap on a column shows its tip, a tap anywhere else hides it.
  document.addEventListener("touchstart", (event) => {
    const hit = event.target.closest?.(".stat__spark-hit");
    if (hit) show(hit);
    else hide();
  }, { passive: true });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
