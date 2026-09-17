/* Editor: markdown mode toggles syntax around/before the textarea's
 * selection and swaps a server-rendered preview in through the runtime;
 * html mode drives a contenteditable surface with execCommand (every
 * command toggles, block formats included) and mirrors its HTML into the
 * textarea that submits. Toolbar buttons reflect the selection's state.
 * Delegated on document, keyed off data-editor-*; initAll re-runs after
 * a swap. */
(() => {
  const WRAP = { bold: ["**", "**"], italic: ["_", "_"], strike: ["~~", "~~"], code: ["`", "`"] };
  const PREFIX = { heading: "## ", quote: "> ", ul: "- ", ol: "1. " };
  const BLOCK = { heading: "h2", quote: "blockquote", code: "pre" };
  const INLINE = { bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough" };
  const LIST = { ul: "insertUnorderedList", ol: "insertOrderedList" };

  const sourceOf = (root) => root.querySelector(".editor__source");
  const surfaceOf = (root) => root.querySelector("[data-editor-surface]");
  const isHtml = (root) => root.getAttribute("data-editor-mode") === "html";

  /* ------------------------------------------------------- markdown */
  function replace(ta, start, end, text, selStart, selEnd) {
    ta.value = ta.value.slice(0, start) + text + ta.value.slice(end);
    ta.setSelectionRange(start + selStart, start + selEnd);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function lineRange(ta) {
    const start = ta.value.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    const nl = ta.value.indexOf("\n", Math.max(ta.selectionEnd, start));
    const end = ta.selectionEnd > ta.selectionStart && ta.value[ta.selectionEnd - 1] === "\n"
      ? ta.selectionEnd - 1
      : nl === -1
      ? ta.value.length
      : nl;
    return [start, end];
  }

  const STRIP_LINE = /^(#{1,6} |> |- |\* |\d+\. )+/;

  function markdown(ta, cmd) {
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = ta.value.slice(start, end);

    if (WRAP[cmd]) {
      const [a, z] = WRAP[cmd];
      const multi = cmd === "code" && sel.includes("\n");
      const open = multi ? "```\n" : a;
      const close = multi ? "\n```" : z;
      // Toggle: unwrap when the selection (or its surroundings) already carries the syntax.
      if (sel.startsWith(open) && sel.endsWith(close) && sel.length >= open.length + close.length) {
        const inner = sel.slice(open.length, sel.length - close.length);
        replace(ta, start, end, inner, 0, inner.length);
        return;
      }
      if (ta.value.slice(start - open.length, start) === open && ta.value.slice(end, end + close.length) === close) {
        replace(ta, start - open.length, end + close.length, sel, 0, sel.length);
        return;
      }
      const body = sel || cmd;
      replace(ta, start, end, open + body + close, open.length, open.length + body.length);
      return;
    }
    if (cmd === "link" || cmd === "image") {
      const text = sel || (cmd === "image" ? "alt text" : "text");
      const out = `${cmd === "image" ? "!" : ""}[${text}](url)`;
      replace(ta, start, end, out, out.length - 4, out.length - 1);
      return;
    }
    if (cmd === "hr") {
      const before = start === 0 || ta.value[start - 1] === "\n" ? "" : "\n";
      const out = `${before}\n---\n\n`;
      replace(ta, start, end, out, out.length, out.length);
      return;
    }
    const [ls, le] = lineRange(ta);
    const lines = ta.value.slice(ls, le).split("\n");
    if (cmd === "clear") {
      const out = lines.map((l) => l.replace(STRIP_LINE, "")).join("\n")
        .replace(/!\[(.*?)\]\(\S+?\)/g, "$1")
        .replace(/\[(.+?)\]\(\S+?\)/g, "$1")
        .replace(/(\*\*|__|~~|`)(.+?)\1/g, "$2")
        .replace(/(^|[^\w])_(.+?)_(?=[^\w]|$)/g, "$1$2");
      replace(ta, ls, le, out, 0, out.length);
      return;
    }
    const prefix = PREFIX[cmd];
    if (!prefix) return;
    const has = (l) => cmd === "ol" ? /^\d+\. /.test(l) : l.startsWith(prefix);
    const allOn = lines.every((l) => l.trim() === "" || has(l));
    const out = lines.map((l, n) => {
      const bare = l.replace(STRIP_LINE, "");
      if (allOn) return bare; // toggle off
      if (l.trim() === "") return l;
      return (cmd === "ol" ? `${n + 1}. ` : prefix) + bare;
    }).join("\n");
    replace(ta, ls, le, out, 0, out.length);
  }

  function preview(root, on) {
    const panel = root.querySelector("[data-editor-preview-panel]");
    const ta = sourceOf(root);
    root.querySelectorAll("[data-editor-view]").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-editor-view") === (on ? "preview" : "write")));
    });
    if (!on) {
      root.removeAttribute("data-editor-view");
      if (panel) panel.hidden = true;
      ta?.focus();
      return;
    }
    root.setAttribute("data-editor-view", "preview");
    if (!panel) return;
    panel.hidden = false;
    const action = root.getAttribute("data-editor-preview");
    if (action && globalThis.rapid?.swap) {
      panel.setAttribute("aria-busy", "true");
      globalThis.rapid.swap(action, panel, {
        method: "post",
        body: new URLSearchParams({ text: ta?.value ?? "" }).toString(),
      }).finally(() => panel.removeAttribute("aria-busy"));
    } else {
      // No server preview: say so, and show the source as written.
      panel.replaceChildren();
      const note = document.createElement("p");
      note.className = "editor__preview-note";
      note.textContent = "No preview route on this page — showing the Markdown source.";
      const pre = document.createElement("pre");
      pre.className = "editor__preview-raw";
      pre.textContent = ta?.value ?? "";
      panel.append(note, pre);
    }
  }

  /* ----------------------------------------------------------- html */
  function sync(root) {
    const ta = sourceOf(root);
    const surface = surfaceOf(root);
    if (ta && surface) ta.value = surface.innerHTML;
  }

  const blockOf = () => String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");

  function execute(root, cmd) {
    const surface = surfaceOf(root);
    if (!surface || surface.getAttribute("contenteditable") !== "true") return;
    surface.focus();
    if (INLINE[cmd]) document.execCommand(INLINE[cmd]);
    else if (LIST[cmd]) document.execCommand(LIST[cmd]);
    else if (BLOCK[cmd]) {
      // Toggle: the same block format again returns to a paragraph.
      document.execCommand("formatBlock", false, blockOf() === BLOCK[cmd] ? "<p>" : `<${BLOCK[cmd]}>`);
    } else if (cmd === "link") {
      const url = globalThis.prompt?.("Link URL", "https://");
      if (url) document.execCommand("createLink", false, url);
    } else if (cmd === "image") {
      const url = globalThis.prompt?.("Image URL", "https://");
      if (url) document.execCommand("insertImage", false, url);
    } else if (cmd === "hr") {
      document.execCommand("insertHorizontalRule");
    } else if (cmd === "clear") {
      document.execCommand("removeFormat");
      document.execCommand("unlink");
      if (document.queryCommandState("insertUnorderedList")) document.execCommand("insertUnorderedList");
      if (document.queryCommandState("insertOrderedList")) document.execCommand("insertOrderedList");
      if (blockOf() !== "p" && blockOf() !== "div") document.execCommand("formatBlock", false, "<p>");
    }
    sync(root);
    reflect(root);
  }

  /** Toolbar state for the selection (html mode only — the browser knows). */
  function reflect(root) {
    if (!isHtml(root)) return;
    const block = blockOf();
    root.querySelectorAll("[data-editor-cmd]").forEach((btn) => {
      const cmd = btn.getAttribute("data-editor-cmd");
      let on = false;
      if (INLINE[cmd] || LIST[cmd]) on = document.queryCommandState(INLINE[cmd] ?? LIST[cmd]);
      else if (BLOCK[cmd]) on = block === BLOCK[cmd];
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  function init(root) {
    if (root.dataset.editorReady) return;
    root.dataset.editorReady = "true";
    const ta = sourceOf(root);
    const surface = surfaceOf(root);
    if (surface && ta) {
      // The textarea holds the server's (sanitised) HTML; the surface
      // shows it. innerHTML here is the same trust as the markup itself.
      surface.innerHTML = ta.value;
      surface.setAttribute("contenteditable", ta.disabled ? "false" : "true");
      // Paragraphs, not <div>s, for new lines.
      document.execCommand("defaultParagraphSeparator", false, "p");
    }
  }

  const initAll = () => document.querySelectorAll("[data-editor]").forEach(init);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
  document.addEventListener("rapid:swapped", initAll);

  /* --------------------------------------------------------- events */
  document.addEventListener("click", (event) => {
    const tool = event.target.closest?.("[data-editor-cmd]");
    if (tool) {
      const root = tool.closest("[data-editor]");
      const cmd = tool.getAttribute("data-editor-cmd");
      if (isHtml(root)) execute(root, cmd);
      else {
        const ta = sourceOf(root);
        if (ta && !ta.disabled) markdown(ta, cmd);
      }
      return;
    }
    const view = event.target.closest?.("[data-editor-view]");
    if (view) preview(view.closest("[data-editor]"), view.getAttribute("data-editor-view") === "preview");
  });

  document.addEventListener("input", (event) => {
    const surface = event.target.closest?.("[data-editor-surface]");
    if (surface) sync(surface.closest("[data-editor]"));
  });

  document.addEventListener("selectionchange", () => {
    const root = document.activeElement?.closest?.("[data-editor]");
    if (root) reflect(root);
  });

  document.addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const root = event.target.closest?.("[data-editor]");
    if (!root) return;
    const cmd = { b: "bold", i: "italic", u: "underline", k: "link" }[event.key.toLowerCase()];
    if (!cmd || (cmd === "underline" && !isHtml(root))) return;
    event.preventDefault();
    if (isHtml(root)) execute(root, cmd);
    else markdown(sourceOf(root), cmd);
  });
})();
