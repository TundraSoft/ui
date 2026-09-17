/*
 * View switch: a radio (typically inside a Segmented) carrying
 * `data-view-target="<selector>"` writes its value to `data-view` on the
 * target when checked. CSS keyed off `[data-view="list"]` etc. does the
 * rest — no layout logic here, so a theme decides what each view means.
 */
(() => {
  document.addEventListener("change", (event) => {
    const control = event.target.closest?.("[data-view-target]");
    if (!control || (control.type === "radio" && !control.checked)) return;
    const target = document.querySelector(control.getAttribute("data-view-target") ?? "");
    if (target) target.setAttribute("data-view", control.value);
  });
})();
