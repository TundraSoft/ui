/*
 * Date-time picker: a DatePicker and a TimePicker posting one ISO UTC
 * instant. The parts still post as <name>-date / <name>-time (all a
 * no-JS page can send); this script enables the whole-value input and
 * keeps it current:
 *
 *  - any `change` of the date or the time rewrites [data-datetime-value]
 *    (`2026-10-01T09:00:00Z`, or empty while a half is missing) and fires
 *    `change` on it
 *  - on the first / last allowed day the time picker's min / max become
 *    the bound's time (data-timepicker-min|max + `timepicker:refresh`)
 *  - a time without a date, or `required` and no date, is reported
 *    through the time picker's validity (data-timepicker-error) — the one
 *    error slot the validator knows about
 *  - [data-datetime-preset] buttons set both halves at once
 *  - [data-datetime-clear] (`clearable`) empties both, and shows only
 *    while either half holds something
 *  - with data-datetimepicker-local the halves are the viewer's wall
 *    time: the server-rendered UTC value and bounds are converted on
 *    init, the zone chip names the browser's zone, and the posted value
 *    is converted back to UTC
 */
(() => {
  const pad = (n) => String(n).padStart(2, "0");

  function parts(root) {
    const time = root.querySelector("[data-timepicker]");
    return {
      date: root.querySelector("[data-datepicker]"),
      dateInput: root.querySelector("[data-datepicker-start]"),
      time,
      timeValue: time?.querySelector("[data-timepicker-value]"),
      hour: time?.querySelector("[data-segment='hour']"),
      whole: root.querySelector("[data-datetime-value]"),
    };
  }

  const isLocal = (root) => root.hasAttribute("data-datetimepicker-local");

  /** An ISO instant as { date, time } in the picker's zone. */
  function split(root, iso) {
    const d = new Date(iso || "");
    if (!iso || Number.isNaN(d.getTime())) return undefined;
    return isLocal(root)
      ? {
        date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
        time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      }
      : {
        date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`,
        time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`,
      };
  }

  /** Date + time in the picker's zone → the UTC instant, or "". */
  function join(root, date, time) {
    if (!date || !time) return "";
    const d = new Date(`${date}T${time}:00${isLocal(root) ? "" : "Z"}`);
    return Number.isNaN(d.getTime()) ? "" : `${d.toISOString().slice(0, 16)}:00Z`;
  }

  const setAttr = (el, name, value) => value ? el.setAttribute(name, value) : el.removeAttribute(name);

  function sync(root) {
    const p = parts(root);
    if (!p.time || !p.whole) return;
    const date = p.dateInput?.value || "";
    const time = p.timeValue?.value || "";

    const lo = split(root, root.getAttribute("data-datetimepicker-min"));
    const hi = split(root, root.getAttribute("data-datetimepicker-max"));
    setAttr(p.time, "data-timepicker-min", lo && date === lo.date ? lo.time : "");
    setAttr(p.time, "data-timepicker-max", hi && date === hi.date ? hi.time : "");

    const required = root.hasAttribute("data-datetimepicker-required");
    let error = "";
    if (!date && (time || required)) error = root.getAttribute("data-msg-date") || "Pick a date.";
    else if (date && !time && !required) error = p.hour?.getAttribute("data-msg-required") || "Enter a time.";
    setAttr(p.time, "data-timepicker-error", error);
    p.time.dispatchEvent(new CustomEvent("timepicker:refresh", { bubbles: true }));

    const clear = root.querySelector("[data-datetime-clear]");
    if (clear) clear.hidden = !date && !time;

    const whole = join(root, date, time);
    if (p.whole.value !== whole) {
      p.whole.value = whole;
      p.whole.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  /** Put an instant into both halves. */
  function set(root, iso) {
    const p = parts(root);
    const s = split(root, iso);
    if (!s) return;
    p.date?.dispatchEvent(new CustomEvent("datepicker:refresh", { bubbles: true, detail: { value: s.date } }));
    p.time?.dispatchEvent(new CustomEvent("timepicker:refresh", { bubbles: true, detail: { value: s.time } }));
    sync(root);
  }

  document.addEventListener("change", (event) => {
    if (!event.target?.matches?.("[data-datepicker-start], [data-timepicker-value]")) return;
    const root = event.target.closest("[data-datetimepicker]");
    if (root) sync(root);
  });

  document.addEventListener("click", (event) => {
    const clear = event.target?.closest?.("[data-datetime-clear]");
    const from = clear?.closest("[data-datetimepicker]");
    if (from && !clear.disabled) {
      const p = parts(from);
      p.date?.dispatchEvent(new CustomEvent("datepicker:refresh", { bubbles: true, detail: { value: "" } }));
      p.time?.dispatchEvent(new CustomEvent("timepicker:refresh", { bubbles: true, detail: { value: "" } }));
      sync(from);
      from.querySelector(".datepicker__trigger")?.focus();
      return;
    }
    const preset = event.target?.closest?.("[data-datetime-preset]");
    const root = preset?.closest("[data-datetimepicker]");
    if (!root || preset.disabled) return;
    set(root, preset.getAttribute("data-datetime-preset"));
  });

  function init(root) {
    if (root.hasAttribute("data-datetimepicker-ready")) return;
    root.setAttribute("data-datetimepicker-ready", "");
    const p = parts(root);
    if (!p.whole) return;
    p.whole.disabled = Boolean(p.timeValue?.disabled);

    if (isLocal(root)) {
      // Bounds and value were rendered in UTC; move them to this browser.
      const lo = split(root, root.getAttribute("data-datetimepicker-min"));
      const hi = split(root, root.getAttribute("data-datetimepicker-max"));
      if (p.date) {
        setAttr(p.date, "data-datepicker-min", lo?.date ?? "");
        setAttr(p.date, "data-datepicker-max", hi?.date ?? "");
      }
      const zone = root.querySelector(".timepicker__zone");
      if (zone && root.getAttribute("data-datetimepicker-zone") === "auto") {
        const at = p.whole.value ? new Date(p.whole.value) : new Date();
        const name = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" }).formatToParts(at)
          .find((x) => x.type === "timeZoneName")?.value;
        if (name) zone.textContent = name;
      }
      if (p.whole.value) set(root, p.whole.value);
      else p.date?.dispatchEvent(new CustomEvent("datepicker:refresh", { bubbles: true }));
    }
    sync(root);
  }

  // After the whole bundle has run: the date and time pickers' own
  // listeners (registered by later files) must exist before init talks
  // to them.
  const initAll = () => queueMicrotask(() => document.querySelectorAll("[data-datetimepicker]").forEach(init));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
