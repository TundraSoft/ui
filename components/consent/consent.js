/* Consent banner (consent.ts). Asks once whether analytics may run and
 * runs them only after a yes:
 *
 * - On load (and after a rAPId swap) each `[data-consent]` looks up its
 *   choice in localStorage (`data-consent-key`, default `ui-consent`):
 *   none → the banner is shown; `granted` → its loaders run; `denied` →
 *   nothing happens. The choice lives in the browser, so every visitor is
 *   served the same cached page.
 * - Accept stores `granted`, hides the banner, tells a tracker that is
 *   already present (gtag consent update, clarity consent), and appends
 *   the loaders (`data-consent-loaders`: `{ src, async?, attrs? }[]`) as
 *   script elements in order — CSP-clean, no inline code; a page nonce on
 *   the bundle's own script is copied onto them.
 * - Reject stores `denied`, hides the banner and withdraws: gtag
 *   `analytics_storage: "denied"`, `clarity("consent", false)`, and the
 *   cookies in `data-consent-cookies` (default GA + Clarity's) expired on
 *   the host and every parent domain.
 * - `[data-consent-open]` (value: a selector, default the first banner)
 *   shows it again with focus on its first button; after a choice focus
 *   goes back to that opener. Escape closes a reopened banner, the choice
 *   standing.
 * - Every choice dispatches `consent:change` (`detail: { state, key }`),
 *   bubbling from the banner.
 *
 * Without localStorage (private mode, blocked storage) the choice holds
 * for the page only and the banner asks again on the next one. */
(() => {
  const DEFAULT_KEY = "ui-consent";
  const DEFAULT_COOKIES = ["_ga*", "_gid", "_gat*", "_clck", "_clsk"];
  const nonce = document.currentScript?.nonce || "";
  const memory = new Map();
  const loaded = new Set();
  const openers = new WeakMap();

  const parse = (text, fallback) => {
    try {
      return text ? JSON.parse(text) : fallback;
    } catch {
      return fallback;
    }
  };
  const keyOf = (root) => root.dataset.consentKey || DEFAULT_KEY;
  function read(key) {
    let value = memory.get(key) ?? null;
    try {
      value = localStorage.getItem(key) ?? value;
    } catch {
      // Storage unavailable — the in-page memory is all there is.
    }
    return value === "granted" || value === "denied" ? value : null;
  }
  function write(key, value) {
    memory.set(key, value);
    try {
      localStorage.setItem(key, value);
    } catch {
      // As above: the choice holds for this page.
    }
  }

  function load(root) {
    for (const loader of parse(root.dataset.consentLoaders, [])) {
      if (!loader?.src || loaded.has(loader.src)) continue;
      loaded.add(loader.src);
      const script = document.createElement("script");
      for (const [name, value] of Object.entries(loader.attrs ?? {})) {
        if (/^on/i.test(name) || !/^[a-z][a-z0-9-]*$/i.test(name)) continue;
        script.setAttribute(name, String(value));
      }
      if (nonce) script.nonce = nonce;
      script.async = loader.async === true;
      script.src = loader.src;
      document.head.append(script);
    }
  }

  function signal(granted) {
    const value = granted ? "granted" : "denied";
    try {
      globalThis.gtag?.("consent", "update", { analytics_storage: value });
    } catch {
      // A tracker's own error is not ours to surface.
    }
    try {
      globalThis.clarity?.("consent", granted);
    } catch {
      // As above.
    }
  }

  function expireCookies(root) {
    const patterns = parse(root.dataset.consentCookies, DEFAULT_COOKIES);
    const matches = (name) => patterns.some((p) => p.endsWith("*") ? name.startsWith(p.slice(0, -1)) : name === p);
    const parts = location.hostname.split(".");
    // Host-only first, then the host and each parent as a domain cookie
    // (a.b.example.com → .a.b.example.com, .b.example.com, .example.com);
    // the browser ignores the ones it would never have set.
    const domains = [""];
    for (let i = 0; i < parts.length - 1; i++) domains.push(`; domain=.${parts.slice(i).join(".")}`);
    const names = document.cookie.split(";").map((c) => c.split("=")[0].trim()).filter(Boolean);
    for (const name of names.filter(matches)) {
      for (const domain of domains) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain}`;
      }
    }
  }

  function show(root, opener) {
    root.hidden = false;
    if (opener) {
      openers.set(root, opener);
      root.querySelector("button")?.focus();
    }
  }

  function close(root) {
    root.hidden = true;
    const opener = openers.get(root);
    openers.delete(root);
    if (opener?.isConnected && root.contains(document.activeElement)) opener.focus();
  }

  function choose(root, state) {
    const key = keyOf(root);
    write(key, state);
    close(root);
    if (state === "granted") {
      signal(true);
      load(root);
    } else {
      signal(false);
      expireCookies(root);
    }
    root.dispatchEvent(new CustomEvent("consent:change", { bubbles: true, detail: { state, key } }));
  }

  function init(root) {
    if (root.hasAttribute("data-consent-ready")) return;
    root.setAttribute("data-consent-ready", "");
    const state = read(keyOf(root));
    if (state === "granted") load(root);
    else if (state === null) show(root);
  }

  const initAll = () => document.querySelectorAll("[data-consent]").forEach(init);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const pick = target.closest("[data-consent-accept], [data-consent-reject]");
    if (pick) {
      const root = pick.closest("[data-consent]");
      if (root) choose(root, pick.hasAttribute("data-consent-accept") ? "granted" : "denied");
      return;
    }
    const opener = target.closest("[data-consent-open]");
    if (!opener) return;
    const selector = opener.getAttribute("data-consent-open");
    let root = null;
    try {
      root = selector ? document.querySelector(selector) : null;
    } catch {
      // Not a selector — fall back to the first banner.
    }
    root = root?.matches("[data-consent]") ? root : document.querySelector("[data-consent]");
    if (!root) return;
    event.preventDefault();
    show(root, opener);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const root = event.target instanceof Element ? event.target.closest("[data-consent]") : null;
    // Only a reopened banner closes: a first-time visitor has to answer.
    if (!root || root.hidden || read(keyOf(root)) === null) return;
    event.preventDefault();
    event.stopPropagation();
    close(root);
  });
})();
