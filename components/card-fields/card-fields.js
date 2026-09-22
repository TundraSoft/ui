/*
 * Card fields: the number is kept to digits and grouped as typed (4-4-4-4,
 * or 4-6-5 once an Amex prefix shows), the brand read from the prefix is
 * written to `data-brand` on the root and shown in the number's addon, and
 * it drives the CVC's length (4 for Amex, else 3). Expiry gets its slash
 * inserted and is refused when the month is out of range or the date is
 * in the past; with `data-luhn` on the root a complete number that fails
 * the checksum is refused too. Both are custom validities, so form.js
 * shows them like any rule. Input is handled in the capture phase so the
 * validity is fresh when the validator reads it for the same keystroke.
 */
(() => {
  const BRANDS = [
    ["amex", /^3[47]/, "Amex"],
    ["visa", /^4/, "Visa"],
    ["mastercard", /^(5[1-5]|2[2-7])/, "Mastercard"],
    ["discover", /^6(011|5)/, "Discover"],
    ["diners", /^3(0[0-5]|[68])/, "Diners"],
    ["jcb", /^35/, "JCB"],
  ];

  const digits = (v) => v.replace(/\D/g, "");

  function group(d, brand) {
    if (brand === "amex") return [d.slice(0, 4), d.slice(4, 10), d.slice(10, 15)].filter(Boolean).join(" ");
    return d.match(/.{1,4}/g)?.join(" ") ?? "";
  }

  function luhn(d) {
    let sum = 0;
    let double = false;
    for (let i = d.length - 1; i >= 0; i--) {
      let n = Number(d[i]);
      if (double) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      double = !double;
    }
    return sum % 10 === 0;
  }

  function updateNumber(input) {
    const root = input.closest("[data-card-fields]");
    const d = digits(input.value).slice(0, 19);
    const brand = BRANDS.find(([, re]) => re.test(d));
    const formatted = group(d, brand?.[0]);
    if (input.value !== formatted) {
      const atEnd = input.selectionEnd === input.value.length;
      input.value = formatted;
      if (!atEnd) input.setSelectionRange(formatted.length, formatted.length);
    }
    if (root) {
      root.dataset.brand = brand?.[0] ?? "";
      const label = root.querySelector("[data-card-brand]");
      if (label) label.textContent = d.length >= 2 ? (brand?.[2] ?? "") : "";
      const cvc = root.querySelector("[data-card-cvc]");
      if (cvc) {
        const len = brand?.[0] === "amex" ? 4 : 3;
        cvc.setAttribute("maxlength", String(len));
        cvc.setAttribute("pattern", `[0-9]{${len}}`);
      }
      const complete = d.length >= 13;
      const bad = root.hasAttribute("data-luhn") && complete && !luhn(d);
      input.setCustomValidity(bad ? input.getAttribute("data-msg-luhn") || "Check the card number" : "");
    }
  }

  function updateExpiry(input) {
    let d = digits(input.value).slice(0, 4);
    if (d.length === 1 && Number(d) > 1) d = `0${d}`;
    const formatted = d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
    if (input.value !== formatted && !(input.value === `${d}/` && d.length === 2)) input.value = formatted;
    let message = "";
    if (d.length === 4) {
      const month = Number(d.slice(0, 2));
      const year = 2000 + Number(d.slice(2));
      const now = new Date();
      const past = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
      if (month < 1 || month > 12) message = input.getAttribute("data-msg-pattern") || "Enter MM/YY";
      else if (past) message = input.getAttribute("data-msg-expired") || "This card has expired";
    }
    input.setCustomValidity(message);
  }

  document.addEventListener("input", (event) => {
    const t = event.target;
    if (t?.matches?.("[data-card-number]")) updateNumber(t);
    else if (t?.matches?.("[data-card-expiry]")) updateExpiry(t);
    else if (t?.matches?.("[data-card-cvc]")) {
      t.value = digits(t.value).slice(0, Number(t.getAttribute("maxlength")) || 4);
    }
  }, true);

  function initAll() {
    document.querySelectorAll("[data-card-number]").forEach((i) => i.value && updateNumber(i));
    document.querySelectorAll("[data-card-expiry]").forEach((i) => i.value && updateExpiry(i));
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);
})();
