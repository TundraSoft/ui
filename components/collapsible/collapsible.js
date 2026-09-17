(() => {
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-toggle]");
    if (!trigger) return;
    const group = trigger.closest("[data-accordion-group]");
    if (!group) return;

    group.querySelectorAll('[data-toggle][aria-expanded="true"]').forEach(
      (other) => {
        if (other === trigger) return;
        const selector = other.getAttribute("data-toggle");
        const panel = selector && document.querySelector(selector);
        other.setAttribute("aria-expanded", "false");
        panel?.setAttribute("hidden", "");
        panel?.classList.remove("is-open");
      },
    );
  });
})();
