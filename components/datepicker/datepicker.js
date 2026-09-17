/*
 * Date picker.
 *
 * Always: toggle the panel from its trigger, close on Escape (scoped to
 * this picker) or outside click, focus back to the trigger on close.
 *
 * Server mode (`data-datepicker-server`): month nav, day picks and
 * presets are GET links carrying data-action/data-target — rAPId swaps
 * the re-rendered DatePicker in; nothing here computes dates.
 *
 * Client mode (no build*Href): the calendar runs here — month nav
 * re-renders the day grid, a pick writes the hidden input(s) and the
 * trigger label, and in range mode the first pick is the start and the
 * second the end. Same classes and ARIA as the server-rendered panel.
 */
(() => {
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const fmt = (v) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v ?? "");
    return m ? `${Number(m[3])} ${SHORT[Number(m[2]) - 1]} ${m[1]}` : "";
  };
  const todayIso = () => {
    const t = new Date();
    return iso(t.getFullYear(), t.getMonth(), t.getDate());
  };

  function setOpen(dp, on, restoreFocus) {
    const panel = dp.querySelector(".datepicker__panel");
    const trigger = dp.querySelector("[data-datepicker-trigger]");
    if (panel) panel.hidden = !on;
    dp.classList.toggle("datepicker--open", !!on);
    if (trigger) {
      trigger.setAttribute("aria-expanded", on ? "true" : "false");
      if (!on && restoreFocus) trigger.focus();
    }
  }

  /* ------------------------------------------------------ client mode */
  function state(dp) {
    return {
      range: dp.hasAttribute("data-datepicker-range"),
      min: dp.getAttribute("data-datepicker-min") || "",
      max: dp.getAttribute("data-datepicker-max") || "",
      today: dp.getAttribute("data-datepicker-today") || todayIso(),
      start: dp.querySelector("[data-datepicker-start]")?.value || "",
      end: dp.querySelector("[data-datepicker-end]")?.value || "",
    };
  }

  function renderDays(dp, year, month) {
    const s = state(dp);
    const days = dp.querySelector(".datepicker__days");
    const heading = dp.querySelector(".datepicker__month");
    if (!days) return;
    days.replaceChildren();
    if (heading) heading.textContent = `${MONTHS[month]} ${year}`;
    dp.setAttribute("data-datepicker-view", `${year}-${month}`);

    const len = new Date(year, month + 1, 0).getDate();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7;
    const prevLen = new Date(year, month, 0).getDate();
    const cells = Math.ceil((lead + len) / 7) * 7;

    for (let i = 0; i < cells; i++) {
      const offset = i - lead + 1;
      let y = year, m = month, d = offset;
      if (offset < 1) {
        m = month - 1;
        d = prevLen + offset;
        if (m < 0) {
          m = 11;
          y--;
        }
      } else if (offset > len) {
        m = month + 1;
        d = offset - len;
        if (m > 11) {
          m = 0;
          y++;
        }
      }
      const key = iso(y, m, d);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "datepicker__day";
      if (offset < 1 || offset > len) btn.classList.add("datepicker__day--outside");
      if (key === s.today) {
        btn.classList.add("datepicker__day--today");
        btn.setAttribute("aria-current", "date");
      }
      if (s.start && s.end && key > s.start && key < s.end) btn.classList.add("datepicker__day--in-range");
      if (key === s.start) btn.classList.add("datepicker__day--start");
      if (key === s.end) btn.classList.add("datepicker__day--end");
      if (key === s.start || key === s.end) btn.setAttribute("aria-pressed", "true");
      if ((s.min && key < s.min) || (s.max && key > s.max)) btn.disabled = true;
      btn.setAttribute("data-day", key);
      btn.setAttribute("aria-label", `${d} ${MONTHS[m]} ${y}`);
      btn.textContent = String(d);
      days.append(btn);
    }
  }

  function currentView(dp) {
    const v = dp.getAttribute("data-datepicker-view");
    if (v) {
      const [y, m] = v.split("-").map(Number);
      return [y, m];
    }
    const s = state(dp);
    const anchor = s.start || s.today;
    return [Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1];
  }

  function pick(dp, key) {
    const s = state(dp);
    const startInput = dp.querySelector("[data-datepicker-start]");
    const endInput = dp.querySelector("[data-datepicker-end]");
    const label = dp.querySelector("[data-datepicker-label]");
    let start = key, end = "";
    if (s.range) {
      if (s.start && !s.end && key >= s.start) {
        start = s.start;
        end = key;
      }
    }
    if (startInput) startInput.value = start;
    if (endInput) endInput.value = end;
    if (label) {
      label.textContent = s.range ? `${fmt(start) || "Start date"} – ${fmt(end) || "End date"}` : fmt(start);
    }
    startInput?.dispatchEvent(new Event("change", { bubbles: true }));
    const [y, m] = currentView(dp);
    renderDays(dp, y, m);
    if (!s.range || end) setOpen(dp, false, true);
  }

  /* ----------------------------------------------------------- events */
  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-datepicker-trigger]");
    if (trigger) {
      const dp = trigger.closest("[data-datepicker]");
      const panel = dp?.querySelector(".datepicker__panel");
      if (panel) setOpen(dp, panel.hidden);
      return;
    }

    const dp = event.target.closest?.("[data-datepicker]");
    if (dp && !dp.hasAttribute("data-datepicker-server")) {
      const day = event.target.closest("button[data-day]");
      if (day && !day.disabled) {
        pick(dp, day.getAttribute("data-day"));
        return;
      }
      const nav = event.target.closest("button[data-month]");
      if (nav) {
        const [y, m] = nav.getAttribute("data-month").split("-").map(Number);
        renderDays(dp, y, m);
        // Every nav button's target moves with the view.
        const targets = {
          "prev-year": [y - 1, m],
          prev: m === 0 ? [y - 1, 11] : [y, m - 1],
          next: m === 11 ? [y + 1, 0] : [y, m + 1],
          "next-year": [y + 1, m],
        };
        dp.querySelectorAll("button[data-month][data-nav]").forEach((btn) => {
          const t = targets[btn.getAttribute("data-nav")];
          if (t) btn.setAttribute("data-month", `${t[0]}-${t[1]}`);
        });
        return;
      }
    }

    // Outside click closes floating panels only — an inline picker is
    // page content (a docs or settings page that always shows the
    // calendar); its trigger still toggles it.
    document.querySelectorAll("[data-datepicker]:not(.datepicker--inline) .datepicker__panel:not([hidden])").forEach(
      (panel) => {
        const owner = panel.closest("[data-datepicker]");
        if (owner !== dp) setOpen(owner, false);
      },
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || event.defaultPrevented) return;
    const dp = event.target.closest?.("[data-datepicker]");
    const panel = dp?.querySelector(".datepicker__panel");
    if (!panel || panel.hidden || dp.classList.contains("datepicker--inline")) return;
    event.preventDefault();
    setOpen(dp, false, true);
  });
})();
