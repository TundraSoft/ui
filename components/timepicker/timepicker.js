/*
 * Time picker: two typeable segments (hours, minutes) and a popover of
 * slots. Everything here is an enhancement over the native
 * <input type="time"> the markup submits:
 *
 *  - on init the native input becomes a hidden input (it keeps `name`
 *    and the ISO HH:MM value; its constraints move to the hours segment
 *    as a custom validity, so a hidden control never blocks a submit)
 *  - digits fill a segment and jump on (hours "2" waits for a second
 *    digit, "3"–"9" is complete); `:` / `.` / space jump to minutes;
 *    ↑/↓ step a segment (wrapping), PageUp/PageDown move the time by the
 *    slot step, Home/End go to the segment's ends, Backspace on an empty
 *    minutes segment walks back; a pasted "9:30" / "0930" fills both
 *  - Alt+↓ (or the toggle) opens the slots with focus in the list:
 *    ↑/↓/Home/End move, typed digits jump ("9" → 09:00, "14" → 14:00),
 *    Enter/Space pick, Escape closes and returns focus, Tab closes
 *  - every change rewrites the value input and fires `change` on it
 *    (what a wrapper such as the DateTimePicker listens to)
 *  - validity: required / incomplete / min / max, messages from
 *    data-msg-<rule> on the hours segment; the minutes segment carries
 *    data-validate-skip so the one error slot has one owner, and leaving
 *    the whole control (not moving between its parts) is the "blur" the
 *    validator sees
 *
 * Min/max are read from data-timepicker-min|max on every use, so a
 * wrapper can move them (a date that is the minimum date), set its own
 * message in data-timepicker-error, and dispatch `timepicker:refresh` on
 * the root (optionally with `detail: { value }`) to apply them. Delegated from
 * document; re-initialised after every rAPId swap.
 */
(() => {
  const pad = (n) => String(n).padStart(2, "0");
  const toMin = (v) => {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(v || "");
    return m ? Number(m[1]) * 60 + Number(m[2]) : undefined;
  };
  const toTime = (t) => {
    const x = ((t % 1440) + 1440) % 1440;
    return `${pad(Math.floor(x / 60))}:${pad(x % 60)}`;
  };

  function parts(root) {
    return {
      hour: root.querySelector("[data-segment='hour']"),
      minute: root.querySelector("[data-segment='minute']"),
      carrier: root.querySelector("[data-timepicker-value]"),
      list: root.querySelector(".timepicker__list"),
      toggle: root.querySelector("[data-timepicker-toggle]"),
    };
  }

  const bounds = (root) => ({
    lo: toMin(root.getAttribute("data-timepicker-min")),
    hi: toMin(root.getAttribute("data-timepicker-max")),
  });

  /** The complete value in minutes, or undefined. */
  function current(root) {
    const { hour, minute } = parts(root);
    if (!hour?.value || !minute?.value) return undefined;
    const h = Number(hour.value), m = Number(minute.value);
    return h <= 23 && m <= 59 ? h * 60 + m : undefined;
  }

  function validity(root) {
    const { hour, minute } = parts(root);
    if (!hour) return;
    const t = current(root);
    const { lo, hi } = bounds(root);
    const say = (rule, fallback, token, value) =>
      (hour.getAttribute(`data-msg-${rule}`) || fallback).replace(token, value ?? "");
    let text = "";
    if (!hour.value && !minute.value) {
      if (root.hasAttribute("data-timepicker-required")) text = say("required", "Enter a time.");
    } else if (t === undefined) text = say("incomplete", "Enter hours and minutes.");
    else if (lo !== undefined && t < lo) text = say("min", "Pick {min} or later.", "{min}", toTime(lo));
    else if (hi !== undefined && t > hi) text = say("max", "Pick {max} or earlier.", "{max}", toTime(hi));
    // A wrapper's complaint (the DateTimePicker's "Pick a date.") comes
    // first: it names the half that is missing.
    hour.setCustomValidity(root.getAttribute("data-timepicker-error") || text);
  }

  /** Segments → value input, ARIA, list selection, validity. */
  function commit(root, notify = true) {
    const { hour, minute, carrier, list } = parts(root);
    if (!hour || !minute || !carrier) return;
    for (const seg of [hour, minute]) {
      if (seg.value === "") seg.removeAttribute("aria-valuenow");
      else seg.setAttribute("aria-valuenow", String(Number(seg.value)));
    }
    const t = current(root);
    const value = t === undefined ? "" : toTime(t);
    list?.querySelectorAll("[role='option']").forEach((o) =>
      o.setAttribute("aria-selected", String(o.getAttribute("data-value") === value))
    );
    validity(root);
    if (carrier.value !== value) {
      carrier.value = value;
      if (notify) carrier.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  function setTime(root, t) {
    const { hour, minute } = parts(root);
    const value = toTime(t);
    hour.value = value.slice(0, 2);
    minute.value = value.slice(3);
    commit(root);
  }

  /** Fill single digits out to two ("9" → "09"). */
  function padSegments(root) {
    const { hour, minute } = parts(root);
    let changed = false;
    for (const [seg, max] of [[hour, 23], [minute, 59]]) {
      if (seg && seg.value.length === 1) {
        seg.value = pad(Math.min(Number(seg.value), max));
        changed = true;
      }
    }
    if (changed) commit(root);
  }

  function focusSegment(seg) {
    if (!seg || seg.disabled) return;
    seg.focus();
    seg.select();
  }

  /* ----------------------------------------------------------- list */
  const slots = (root) => Array.from(root.querySelectorAll(".timepicker__slot")).filter((s) => !s.hidden);
  const isOpen = (root) => root.classList.contains("timepicker--open");

  function setActive(root, slot) {
    const { list } = parts(root);
    root.querySelectorAll(".timepicker__slot[data-active]").forEach((s) => s.removeAttribute("data-active"));
    if (!slot || !list) {
      list?.removeAttribute("aria-activedescendant");
      return;
    }
    slot.setAttribute("data-active", "");
    list.setAttribute("aria-activedescendant", slot.id);
    const top = slot.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + slot.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + slot.offsetHeight - list.clientHeight;
    }
  }

  function open(root) {
    const { list, toggle } = parts(root);
    if (!list || toggle?.disabled) return;
    const { lo, hi } = bounds(root);
    root.querySelectorAll(".timepicker__slot").forEach((s) => {
      const t = toMin(s.getAttribute("data-value"));
      s.hidden = (lo !== undefined && t < lo) || (hi !== undefined && t > hi);
    });
    list.hidden = false;
    root.classList.add("timepicker--open");
    toggle?.setAttribute("aria-expanded", "true");
    // The selected slot, else the first one at or after the typed time.
    const all = slots(root);
    const t = current(root);
    const at = all.find((s) => s.getAttribute("aria-selected") === "true") ??
      (t === undefined ? undefined : all.find((s) => toMin(s.getAttribute("data-value")) >= t)) ?? all[0];
    list.focus({ preventScroll: true });
    setActive(root, at);
    // Centre the starting slot, so the times either side of it show too.
    if (at) list.scrollTop = at.offsetTop - (list.clientHeight - at.offsetHeight) / 2;
  }

  function close(root, restoreFocus) {
    const { list, toggle, hour } = parts(root);
    if (!list) return;
    list.hidden = true;
    root.classList.remove("timepicker--open");
    toggle?.setAttribute("aria-expanded", "false");
    setActive(root, null);
    if (restoreFocus) focusSegment(hour);
  }

  function pick(root, slot) {
    const t = toMin(slot?.getAttribute("data-value"));
    if (t === undefined) return;
    setTime(root, t);
    close(root, true);
  }

  let typed = "";
  let typedAt = 0;
  function typeAhead(root, digit) {
    const now = Date.now();
    typed = now - typedAt > 800 ? digit : typed + digit;
    typedAt = now;
    const all = slots(root);
    const key = (s) => s.getAttribute("data-value").replace(":", "");
    const hit = all.find((s) => key(s).startsWith(typed)) ??
      all.find((s) => key(s).replace(/^0/, "").startsWith(typed));
    if (hit) setActive(root, hit);
  }

  /* --------------------------------------------------------- events */
  // Capture: the validity must be fresh before the validator's own
  // (bubbling) input listener reads it on the same keystroke.
  document.addEventListener("input", (event) => {
    const seg = event.target;
    if (!seg?.matches?.(".timepicker__segment")) return;
    const root = seg.closest("[data-timepicker]");
    const { minute } = parts(root);
    const digits = seg.value.replace(/\D/g, "").slice(0, 2);
    if (seg.value !== digits) seg.value = digits;
    const isHour = seg.getAttribute("data-segment") === "hour";
    if (digits) {
      const n = Number(digits);
      const done = digits.length === 2 || n > (isHour ? 2 : 5);
      if (done) {
        seg.value = pad(Math.min(n, isHour ? 23 : 59));
        if (isHour) {
          commit(root);
          focusSegment(minute);
          return;
        }
      }
    }
    commit(root);
  }, true);

  document.addEventListener("paste", (event) => {
    const seg = event.target;
    if (!seg?.matches?.(".timepicker__segment")) return;
    const text = event.clipboardData?.getData("text") ?? "";
    const m = /^\s*(\d{1,2})\s*[:.h]\s*(\d{2})\s*$/.exec(text) ?? /^\s*(\d{1,2})(\d{2})\s*$/.exec(text);
    if (!m) return;
    event.preventDefault();
    const root = seg.closest("[data-timepicker]");
    setTime(root, Math.min(Number(m[1]), 23) * 60 + Math.min(Number(m[2]), 59));
    focusSegment(parts(root).minute);
  });

  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const root = target?.closest?.("[data-timepicker]");
    if (!root) return;
    const { hour, minute, list } = parts(root);

    if (target === list) {
      const all = slots(root);
      const active = root.querySelector(".timepicker__slot[data-active]");
      const i = all.indexOf(active);
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const next = i < 0 ? 0 : i + (event.key === "ArrowDown" ? 1 : -1);
        setActive(root, all[Math.max(0, Math.min(all.length - 1, next))]);
      } else if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        setActive(root, event.key === "Home" ? all[0] : all[all.length - 1]);
      } else if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (active) pick(root, active);
      } else if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(root, true);
      } else if (event.key === "Tab") {
        close(root, false);
      } else if (/^\d$/.test(event.key)) {
        event.preventDefault();
        typeAhead(root, event.key);
      }
      return;
    }

    if (!target.matches(".timepicker__segment")) return;
    const isHour = target === hour;
    const max = isHour ? 23 : 59;
    if ((event.altKey && event.key === "ArrowDown") || event.key === "F4") {
      event.preventDefault();
      open(root);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const d = event.key === "ArrowUp" ? 1 : -1;
      const { lo } = bounds(root);
      const start = isHour ? Math.floor((lo ?? 0) / 60) : 0;
      const n = target.value === "" ? start : (Number(target.value) + d + max + 1) % (max + 1);
      target.value = pad(n);
      commit(root);
      target.select();
    } else if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault();
      const step = Number(list?.getAttribute("data-step")) || 15;
      const t = (Number(hour.value) || 0) * 60 + (Number(minute.value) || 0);
      setTime(root, t + (event.key === "PageUp" ? step : -step));
      target.select();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      target.value = event.key === "Home" ? "00" : pad(max);
      commit(root);
      target.select();
    } else if (isHour && (event.key === ":" || event.key === "." || event.key === " " || event.key === "ArrowRight")) {
      event.preventDefault();
      padSegments(root);
      focusSegment(minute);
    } else if (!isHour && event.key === "ArrowLeft") {
      event.preventDefault();
      focusSegment(hour);
    } else if (!isHour && event.key === "Backspace" && target.value === "") {
      event.preventDefault();
      focusSegment(hour);
    } else if (event.key === "Escape" && isOpen(root)) {
      event.preventDefault();
      event.stopPropagation();
      close(root, true);
    }
  });

  // Typing replaces the segment, whichever way focus arrived.
  document.addEventListener("focusin", (event) => {
    if (event.target?.matches?.(".timepicker__segment")) event.target.select();
  });

  // Leaving the control — not moving between its parts — pads the
  // segments, closes the list and is the blur the validator reacts to.
  document.addEventListener("focusout", (event) => {
    const root = event.target?.closest?.("[data-timepicker]");
    if (!root || root.contains(event.relatedTarget)) return;
    padSegments(root);
    if (isOpen(root)) close(root, false);
    const { hour } = parts(root);
    if (hour?.closest("form[data-validate]")) {
      hour.dataset.touched = "";
      hour.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });

  document.addEventListener("click", (event) => {
    const target = event.target;
    const root = target?.closest?.("[data-timepicker]");

    if (root) {
      if (target.closest("[data-timepicker-toggle]")) {
        if (isOpen(root)) close(root, true);
        else open(root);
        return;
      }
      const slot = target.closest(".timepicker__slot");
      if (slot) {
        pick(root, slot);
        return;
      }
      if (target.matches(".timepicker__segment")) target.select();
      else if (target.closest(".timepicker__field")) focusSegment(parts(root).hour);
    }

    document.querySelectorAll("[data-timepicker].timepicker--open").forEach((other) => {
      if (other !== root) close(other, false);
    });
  });

  // A wrapper moved min/max or the error, or sets the value
  // (`detail: { value: "HH:MM" | "" }`): re-validate, and fire `change`
  // if the value moved.
  document.addEventListener("timepicker:refresh", (event) => {
    const root = event.target?.closest?.("[data-timepicker]");
    if (!root) return;
    const value = event.detail?.value;
    if (typeof value === "string") {
      const { hour, minute } = parts(root);
      const t = toMin(value);
      hour.value = t === undefined ? "" : value.slice(0, 2);
      minute.value = t === undefined ? "" : value.slice(3);
    }
    commit(root);
  });

  function init(root) {
    const { carrier } = parts(root);
    if (!carrier || carrier.type === "hidden") return;
    const value = carrier.value;
    carrier.type = "hidden";
    carrier.value = value;
    carrier.removeAttribute("aria-invalid");
    commit(root, false);
  }
  function initAll() {
    document.querySelectorAll("[data-timepicker]").forEach(init);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
