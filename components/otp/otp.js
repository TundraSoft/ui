/*
 * One-time code cells. Everything here is an enhancement over the single
 * .otp__value input that the markup submits:
 *
 *  - typing a character fills the cell and advances; Backspace on an
 *    empty cell walks back and clears; Arrow keys move; Delete clears
 *  - a paste, an SMS autofill or a password-manager fill that lands more
 *    than one character in a cell is spread across the cells from there
 *  - the carrier input is kept in sync (it is what the form submits) and
 *    taken out of the tab order; on load the cells mirror a prefilled
 *    carrier value (a re-render after a failed attempt)
 *  - when every cell is filled: `otp:complete` bubbles from the root
 *    (detail: { value }), and with [data-otp-submit] the surrounding
 *    form is submitted via requestSubmit() so rAPId's submit handler
 *    sees it like any other submit.
 *
 * Delegated from document; re-syncs after every rAPId swap.
 */
(() => {
  const cellsOf = (root) => Array.from(root.querySelectorAll(".otp__cell"));
  const carrierOf = (root) => root.querySelector(".otp__value");

  function allowed(root, text) {
    const numeric = root.getAttribute("data-otp-mode") !== "alphanumeric";
    return (text || "").replace(numeric ? /[^0-9]/g : /[^0-9a-zA-Z]/g, "");
  }

  function sync(root, { fromCarrier = false } = {}) {
    const cells = cellsOf(root);
    const carrier = carrierOf(root);
    if (!cells.length || !carrier) return;

    if (fromCarrier) {
      const chars = allowed(root, carrier.value).slice(0, cells.length);
      cells.forEach((c, i) => c.value = chars[i] ?? "");
    }
    const value = cells.map((c) => c.value).join("");
    carrier.value = value;
    carrier.setAttribute("tabindex", "-1");
    carrier.setAttribute("aria-hidden", "true");
    cells.forEach((c) => c.toggleAttribute("data-filled", c.value !== ""));
    // The first empty cell is the one Tab lands on.
    const firstEmpty = cells.findIndex((c) => !c.value);
    cells.forEach((c, i) => c.setAttribute("tabindex", i === (firstEmpty < 0 ? 0 : firstEmpty) ? "0" : "-1"));

    if (value.length === cells.length && !root.hasAttribute("data-otp-completed")) {
      root.setAttribute("data-otp-completed", "");
      root.dispatchEvent(new CustomEvent("otp:complete", { bubbles: true, detail: { value } }));
      if (root.hasAttribute("data-otp-submit")) root.closest("form")?.requestSubmit();
    } else if (value.length < cells.length) {
      root.removeAttribute("data-otp-completed");
    }
  }

  /* Write `text` starting at cell `from`, advance focus past the last written cell. */
  function fill(root, from, text) {
    const cells = cellsOf(root);
    const chars = allowed(root, text);
    if (!chars) {
      cells[from].value = "";
      sync(root);
      return;
    }
    let i = from;
    for (const ch of chars) {
      if (i >= cells.length) break;
      cells[i].value = ch;
      i++;
    }
    sync(root);
    cells[Math.min(i, cells.length - 1)].focus();
  }

  document.addEventListener("input", (event) => {
    const cell = event.target.closest?.(".otp__cell");
    if (!cell) return;
    const root = cell.closest("[data-otp]");
    const cells = cellsOf(root);
    fill(root, cells.indexOf(cell), cell.value);
  });

  document.addEventListener("paste", (event) => {
    const cell = event.target.closest?.(".otp__cell");
    if (!cell) return;
    event.preventDefault();
    const root = cell.closest("[data-otp]");
    fill(root, cellsOf(root).indexOf(cell), event.clipboardData?.getData("text") ?? "");
  });

  document.addEventListener("keydown", (event) => {
    const cell = event.target.closest?.(".otp__cell");
    if (!cell) return;
    const root = cell.closest("[data-otp]");
    const cells = cellsOf(root);
    const i = cells.indexOf(cell);

    if (event.key === "Backspace") {
      event.preventDefault();
      if (cell.value) {
        cell.value = "";
      } else if (i > 0) {
        cells[i - 1].value = "";
        cells[i - 1].focus();
      }
      sync(root);
    } else if (event.key === "Delete") {
      event.preventDefault();
      cell.value = "";
      sync(root);
    } else if (event.key === "ArrowLeft" && i > 0) {
      event.preventDefault();
      cells[i - 1].focus();
    } else if (event.key === "ArrowRight" && i < cells.length - 1) {
      event.preventDefault();
      cells[i + 1].focus();
    }
  });

  document.addEventListener("focusin", (event) => {
    const cell = event.target.closest?.(".otp__cell");
    if (cell) cell.select();
  });

  function initAll() {
    document.querySelectorAll("[data-otp]").forEach((root) => sync(root, { fromCarrier: true }));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }
  document.addEventListener("rapid:swapped", initAll);
})();
