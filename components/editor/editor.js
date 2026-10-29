/*
 * Editor — markdown (textarea + syntax toolbar + server-rendered Preview)
 * and html (contenteditable surface mirrored into the textarea).
 *
 * Markup hooks: `[data-editor]` root (`data-editor-mode`, `data-editor-preview`
 * = preview route, `data-editor-upload` = image upload route,
 * `data-editor-max`), `[data-editor-cmd]` tools, `[data-editor-level]`
 * block-style select, `[data-editor-view]` Write/Preview, `[data-editor-fullscreen]`,
 * `[data-editor-popover]` (the link / image / code-block form with
 * `[data-editor-field=url|text|lang]`), `[data-editor-table-tools]`
 * (`[data-editor-table=row-add|col-add|row-del|col-del]`),
 * `[data-editor-count]` and `[data-editor-message]` in the status bar.
 *
 * Markdown keeps its own undo history (setting `value` kills the native
 * one); html uses the browser's. Pasting into the html surface inserts
 * plain text; Ctrl/Cmd+Shift+V keeps formatting through a whitelist. A
 * dropped or pasted image file is POSTed as multipart `file` to the upload
 * route (CSRF header from `<body data-*>`), which answers with the URL.
 *
 * Events: `editor:upload` (`detail: { file, url }`) on the root after a
 * stored image was inserted.
 */
(() => {
  const SEL = "[data-editor]";
  const isHtml = (root) => root.getAttribute("data-editor-mode") === "html";
  const sourceOf = (root) => root.querySelector("textarea.editor__source");
  const surfaceOf = (root) => root.querySelector("[data-editor-surface]");
  const rootOf = (el) => el?.closest?.(SEL);
  const motion = () => globalThis.uiMotion;
  const editable = (root) => {
    const ta = sourceOf(root);
    return !!ta && !ta.disabled;
  };

  /* -------------------------------------------------------- markdown */
  const WRAP = { bold: "**", italic: "_", strike: "~~", code: "`" };
  const PREFIX = { heading: "## ", quote: "> ", ul: "- ", ol: "1. ", task: "- [ ] " };
  const STRIP_LINE = /^(\s*)(#{1,6} |> |[-*+] \[[ xX]\] |[-*+] |\d+\. )+/;
  const LIST_LINE = /^(\s*)([-*+]|\d+\.)( \[[ xX]\])? (.*)$/;

  function replace(ta, start, end, text, selStart, selEnd) {
    const before = ta.value.slice(0, start);
    const after = ta.value.slice(end);
    ta.value = before + text + after;
    ta.setSelectionRange(start + selStart, start + selEnd);
    ta.focus();
    ta.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function lineRange(ta) {
    const v = ta.value;
    const ls = v.lastIndexOf("\n", ta.selectionStart - 1) + 1;
    let le = v.indexOf("\n", ta.selectionEnd);
    if (le === -1) le = v.length;
    return [ls, le];
  }

  function wrapWith(ta, m) {
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const v = ta.value;
    const inner = v.slice(s, e);
    if (v.slice(s - m.length, s) === m && v.slice(e, e + m.length) === m) {
      replace(ta, s - m.length, e + m.length, inner, 0, inner.length);
    } else if (inner.startsWith(m) && inner.endsWith(m) && inner.length >= 2 * m.length) {
      const bare = inner.slice(m.length, -m.length);
      replace(ta, s, e, bare, 0, bare.length);
    } else {
      replace(ta, s, e, m + inner + m, m.length, m.length + inner.length);
    }
  }

  function prefixLines(ta, cmd, prefix) {
    const [ls, le] = lineRange(ta);
    const lines = ta.value.slice(ls, le).split("\n");
    const has = lines.every((l) => l === "" || (cmd === "ol" ? /^\d+\. /.test(l) : l.startsWith(prefix)));
    const out = lines.map((l, n) => {
      if (l === "" && lines.length > 1) return l;
      const bare = l.replace(STRIP_LINE, "$1");
      if (has) return bare;
      return (cmd === "ol" ? `${n + 1}. ` : prefix) + bare;
    }).join("\n");
    replace(ta, ls, le, out, 0, out.length);
  }

  function setLevel(ta, level) {
    const [ls, le] = lineRange(ta);
    const lines = ta.value.slice(ls, le).split("\n");
    const prefix = level === "p" ? "" : "#".repeat(Number(level.slice(1))) + " ";
    const out = lines.map((l) => prefix + l.replace(/^#{1,6} /, "")).join("\n");
    replace(ta, ls, le, out, 0, out.length);
  }

  function insertBlock(ta, text, selStart, selEnd) {
    const v = ta.value;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    const pre = s > 0 && v[s - 1] !== "\n" ? "\n\n" : s > 0 && v.slice(0, s).endsWith("\n\n") ? "" : s > 0 ? "\n" : "";
    const post = e < v.length && v[e] !== "\n" ? "\n\n" : "";
    replace(ta, s, e, pre + text + post, pre.length + selStart, pre.length + selEnd);
  }

  /** Run a change as one undo step; the typing after it starts a new one. */
  function step(root, ta, fn) {
    record(root, ta, true);
    fn();
    history(root).at = 0;
  }

  function markdown(root, ta, cmd) {
    step(root, ta, () => command(ta, cmd));
  }

  function command(ta, cmd) {
    if (WRAP[cmd]) {
      wrapWith(ta, WRAP[cmd]);
    } else if (PREFIX[cmd]) {
      prefixLines(ta, cmd, PREFIX[cmd]);
    } else if (cmd === "hr") {
      insertBlock(ta, "---", 3, 3);
    } else if (cmd === "table") {
      const t = "| Column | Column |\n| --- | --- |\n| Cell | Cell |";
      insertBlock(ta, t, 2, 8);
    } else if (cmd === "clear") {
      const [ls, le] = lineRange(ta);
      const out = ta.value.slice(ls, le).split("\n")
        .map((l) => l.replace(STRIP_LINE, "$1").replace(/(\*\*|__|~~|`|\*|_)(.+?)\1/g, "$2"))
        .join("\n");
      replace(ta, ls, le, out, 0, out.length);
    }
  }

  /* --------------------------------------------------------- history */
  const history = (root) => root._edHistory || (root._edHistory = { undo: [], redo: [], at: 0 });
  const snap = (ta) => ({ v: ta.value, s: ta.selectionStart, e: ta.selectionEnd });

  /** Remember the textarea's state before a change; typing bursts coalesce. */
  function record(root, ta, force) {
    const h = history(root);
    const now = Date.now();
    const top = h.undo[h.undo.length - 1];
    if (top && top.v === ta.value) {
      h.at = now;
      return;
    }
    if (!force && h.undo.length && now - h.at < 700) {
      h.at = now;
      return;
    }
    h.undo.push(snap(ta));
    if (h.undo.length > 200) h.undo.shift();
    h.redo.length = 0;
    h.at = now;
  }

  function travel(root, ta, back) {
    const h = history(root);
    const from = back ? h.undo : h.redo;
    const to = back ? h.redo : h.undo;
    let s = from.pop();
    while (s && s.v === ta.value) s = from.pop();
    if (!s) return;
    to.push(snap(ta));
    replace(ta, 0, ta.value.length, s.v, s.s, s.e);
    h.at = 0;
  }

  /* -------------------------------------------------------- keyboard */
  /** Enter continues a list item, Tab indents one (or hops table cells). */
  function markdownKey(root, ta, ev) {
    const v = ta.value;
    const s = ta.selectionStart;
    if (ev.key === "Enter" && !ev.shiftKey && s === ta.selectionEnd) {
      const ls = v.lastIndexOf("\n", s - 1) + 1;
      const line = v.slice(ls, s);
      const m = LIST_LINE.exec(line);
      if (!m) return;
      ev.preventDefault();
      step(root, ta, () => {
        if (!m[4].trim()) {
          replace(ta, ls, s, m[1], m[1].length, m[1].length);
          return;
        }
        const marker = /^\d+\.$/.test(m[2]) ? `${Number(m[2]) + 1}.` : m[2];
        const next = `\n${m[1]}${marker}${m[3] ? " [ ]" : ""} `;
        replace(ta, s, s, next, next.length, next.length);
      });
      return;
    }
    if (ev.key !== "Tab") return;
    const [ls, le] = lineRange(ta);
    const line = v.slice(ls, le);
    if (line.includes("|") && s === ta.selectionEnd) {
      // Hop between table cells (a pipe that ends a line is not a cell).
      const pipes = [];
      for (let i = 0; i < v.length; i++) if (v[i] === "|" && v[i + 1] !== "\n" && i + 1 < v.length) pipes.push(i);
      const next = ev.shiftKey ? pipes.filter((p) => p < s - 1).slice(-2)[0] : pipes.find((p) => p >= s);
      if (next === undefined) return;
      ev.preventDefault();
      const at = next + (v[next + 1] === " " ? 2 : 1);
      ta.setSelectionRange(at, at);
      return;
    }
    const lines = line.split("\n");
    if (!lines.some((l) => LIST_LINE.test(l))) return;
    ev.preventDefault();
    step(root, ta, () => {
      const out = lines.map((l) => ev.shiftKey ? l.replace(/^ {1,2}/, "") : "  " + l).join("\n");
      replace(ta, ls, le, out, 0, out.length);
    });
  }

  /* --------------------------------------------------------- preview */
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

  /* ------------------------------------------------------------ html */
  /**
   * Chrome's execCommand writes inline styles (text-align on justify, font
   * styles around pasted HTML) whatever `styleWithCSS` says. The mirrored
   * HTML must stay showable under a strict CSP, so alignment becomes the
   * `align` attribute and every other inline style goes.
   */
  function clean(surface) {
    surface.querySelectorAll("[style]").forEach((el) => {
      const a = el.style.textAlign;
      if (/^(left|center|right|justify)$/.test(a)) el.setAttribute("align", a);
      el.removeAttribute("style");
    });
    surface.querySelectorAll("span, font").forEach((s) => {
      if (!s.attributes.length || s.tagName === "FONT") s.replaceWith(...s.childNodes);
    });
  }

  function sync(root) {
    const ta = sourceOf(root);
    const surface = surfaceOf(root);
    if (ta && surface) {
      clean(surface);
      // Task-list checkboxes carry contenteditable="false" while editing; the submitted HTML does not need it.
      const copy = surface.cloneNode(true);
      copy.querySelectorAll("[contenteditable]").forEach((el) => el.removeAttribute("contenteditable"));
      ta.value = copy.innerHTML;
      ta.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }

  const blockOf = () => String(document.queryCommandValue("formatBlock") || "").toLowerCase().replace(/[<>]/g, "");
  const INLINE = { bold: "bold", italic: "italic", underline: "underline", strike: "strikeThrough" };
  const LIST = { ul: "insertUnorderedList", ol: "insertOrderedList" };
  const BLOCK = { heading: "h2", quote: "blockquote", code: "pre" };
  const LAYOUT = {
    alignLeft: "justifyLeft",
    alignCenter: "justifyCenter",
    alignRight: "justifyRight",
    indent: "indent",
    outdent: "outdent",
  };

  function selectionNode() {
    const sel = document.getSelection();
    const n = sel && sel.rangeCount ? sel.getRangeAt(0).commonAncestorContainer : null;
    return n && n.nodeType === 3 ? n.parentElement : n;
  }

  function within(root, selector) {
    const n = selectionNode();
    const el = n?.closest?.(selector);
    return el && surfaceOf(root)?.contains(el) ? el : null;
  }

  function insertHtml(html) {
    document.execCommand("insertHTML", false, html);
  }

  const ALLOWED = {
    p: ["align"],
    div: ["align"],
    br: [],
    strong: [],
    b: [],
    em: [],
    i: [],
    u: [],
    s: [],
    strike: [],
    a: ["href"],
    ul: ["class"],
    ol: [],
    li: ["align"],
    h1: ["align"],
    h2: ["align"],
    h3: ["align"],
    blockquote: [],
    pre: [],
    code: ["class"],
    table: [],
    thead: [],
    tbody: [],
    tr: [],
    th: ["colspan", "rowspan", "align"],
    td: ["colspan", "rowspan", "align"],
    img: ["src", "alt"],
    hr: [],
    input: ["type", "checked"],
  };
  const DROP = new Set(["script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "math"]);
  const safeUrl = (u) => /^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(u.trim()) && !/^\s*javascript:/i.test(u);

  /** Keep only the markup the toolbar itself could have produced. */
  function sanitise(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 8) {
          child.remove();
          continue;
        }
        if (child.nodeType !== 1) continue;
        const tag = child.tagName.toLowerCase();
        if (DROP.has(tag)) {
          child.remove();
          continue;
        }
        if (!(tag in ALLOWED) || (tag === "input" && child.getAttribute("type") !== "checkbox")) {
          walk(child);
          child.replaceWith(...child.childNodes);
          continue;
        }
        for (const a of [...child.attributes]) {
          const keep = ALLOWED[tag].includes(a.name) &&
            (!/^(href|src)$/.test(a.name) || safeUrl(a.value)) &&
            (a.name !== "type" || a.value === "checkbox") &&
            (a.name !== "align" || /^(left|center|right|justify)$/i.test(a.value)) &&
            (a.name !== "class" || /^(task-list|language-[\w-]+)$/.test(a.value));
          if (!keep) child.removeAttribute(a.name);
        }
        if (tag === "input") markBox(child);
        walk(child);
        // A link whose target was refused, or an image without a source, is not worth keeping.
        if ((tag === "a" && !child.hasAttribute("href")) || (tag === "img" && !child.hasAttribute("src"))) {
          child.replaceWith(...child.childNodes);
        }
      }
    };
    walk(doc.body);
    return doc.body.innerHTML;
  }

  /* --- tables */
  function tableHtml(rows, cols) {
    const cell = (t) => `<${t}><br></${t}>`;
    const row = (t) => `<tr>${Array.from({ length: cols }, () => cell(t)).join("")}</tr>`;
    const body = Array.from({ length: rows - 1 }, () => row("td")).join("");
    return `<table><thead>${row("th")}</thead><tbody>${body}</tbody></table><p><br></p>`;
  }

  function tableOp(root, op) {
    const cell = within(root, "td, th");
    if (!cell) return;
    const row = cell.parentElement;
    const table = cell.closest("table");
    const index = [...row.children].indexOf(cell);
    if (op === "row-add") {
      const copy = document.createElement("tr");
      for (let i = 0; i < row.children.length; i++) {
        const td = document.createElement("td");
        td.innerHTML = "<br>";
        copy.append(td);
      }
      if (row.parentElement.tagName === "THEAD") {
        const tbody = table.tBodies[0] ?? table.appendChild(document.createElement("tbody"));
        tbody.insertBefore(copy, tbody.firstChild);
      } else row.after(copy);
    } else if (op === "col-add") {
      for (const r of table.rows) {
        const c = document.createElement(r.parentElement.tagName === "THEAD" ? "th" : "td");
        c.innerHTML = "<br>";
        r.insertBefore(c, r.children[index + 1] ?? null);
      }
    } else if (op === "row-del") {
      if (table.rows.length <= 1) table.remove();
      else row.remove();
    } else if (op === "col-del") {
      if (row.children.length <= 1) table.remove();
      else for (const r of table.rows) r.children[index]?.remove();
    }
    sync(root);
    reflect(root);
  }

  /* --- task lists */
  /** A task-list checkbox: clickable inside the editable surface, and named for assistive tech. */
  function markBox(box) {
    box.setAttribute("contenteditable", "false");
    if (!box.hasAttribute("aria-label")) box.setAttribute("aria-label", "Done");
  }

  function taskList(root) {
    const list = within(root, "ul");
    if (list && list.classList.contains("task-list")) {
      list.classList.remove("task-list");
      list.querySelectorAll('input[type="checkbox"]').forEach((i) => i.remove());
      return;
    }
    if (!list) {
      document.execCommand("insertUnorderedList");
    }
    const ul = within(root, "ul");
    if (!ul) return;
    ul.classList.add("task-list");
    for (const li of ul.children) {
      if (li.querySelector(':scope > input[type="checkbox"]')) continue;
      const box = document.createElement("input");
      box.type = "checkbox";
      markBox(box);
      li.prepend(box);
    }
  }

  function codeBlock(root, lang) {
    const pre = within(root, "pre");
    if (pre) {
      document.execCommand("formatBlock", false, "<p>");
      return;
    }
    const sel = document.getSelection();
    const text = sel ? sel.toString() : "";
    const cls = lang && lang !== "plain" ? ` class="language-${lang}"` : "";
    const esc = text.replace(/&/g, "&amp;").replace(/</g, "&lt;");
    insertHtml(`<pre><code${cls}>${esc || "<br>"}</code></pre><p><br></p>`);
  }

  function execute(root, cmd, arg) {
    const surface = surfaceOf(root);
    if (!surface || surface.getAttribute("contenteditable") !== "true") return;
    surface.focus();
    if (INLINE[cmd]) document.execCommand(INLINE[cmd]);
    else if (LIST[cmd]) document.execCommand(LIST[cmd]);
    else if (LAYOUT[cmd]) document.execCommand(LAYOUT[cmd]);
    else if (BLOCK[cmd]) {
      // Toggle: the same block format again returns to a paragraph.
      document.execCommand("formatBlock", false, blockOf() === BLOCK[cmd] ? "<p>" : `<${BLOCK[cmd]}>`);
    } else if (cmd === "level") {
      document.execCommand("formatBlock", false, `<${arg}>`);
    } else if (cmd === "undo" || cmd === "redo") {
      document.execCommand(cmd);
    } else if (cmd === "task") {
      taskList(root);
    } else if (cmd === "table") {
      insertHtml(tableHtml(3, 2));
    } else if (cmd === "hr") {
      document.execCommand("insertHorizontalRule");
    } else if (cmd === "clear") {
      document.execCommand("removeFormat");
      document.execCommand("unlink");
      if (document.queryCommandState("insertUnorderedList")) document.execCommand("insertUnorderedList");
      if (document.queryCommandState("insertOrderedList")) document.execCommand("insertOrderedList");
      if (blockOf() !== "p" && blockOf() !== "div") document.execCommand("formatBlock", false, "<p>");
      const n = selectionNode();
      const scope = n && surface.contains(n) ? n : surface;
      for (const el of [scope, ...scope.querySelectorAll("[style], [align]")]) {
        el.removeAttribute?.("style");
        el.removeAttribute?.("align");
      }
    }
    sync(root);
    reflect(root);
  }

  /** Toolbar state for the selection. */
  function reflect(root) {
    const press = (cmd, on) => {
      root.querySelectorAll(`[data-editor-cmd="${cmd}"]`).forEach((b) => b.setAttribute("aria-pressed", String(!!on)));
    };
    const level = root.querySelector("[data-editor-level]");
    if (isHtml(root)) {
      const inside = !!within(root, "*");
      const block = inside ? blockOf() : "";
      const state = (c) => inside && document.queryCommandState(c);
      press("bold", state("bold"));
      press("italic", state("italic"));
      press("underline", state("underline"));
      press("strike", state("strikeThrough"));
      press("ul", state("insertUnorderedList") && !within(root, "ul.task-list"));
      press("ol", state("insertOrderedList"));
      press("task", !!within(root, "ul.task-list"));
      press("alignLeft", state("justifyLeft"));
      press("alignCenter", state("justifyCenter"));
      press("alignRight", state("justifyRight"));
      press("heading", block === "h2");
      press("quote", block === "blockquote");
      press("code", block === "pre");
      if (level) level.value = /^h[1-3]$/.test(block) ? block : "p";
      const tools = root.querySelector("[data-editor-table-tools]");
      if (tools) tools.hidden = !within(root, "td, th");
      return;
    }
    const ta = sourceOf(root);
    if (!ta) return;
    const line = ta.value.slice(ta.value.lastIndexOf("\n", ta.selectionStart - 1) + 1).split("\n")[0];
    const h = /^(#{1,6}) /.exec(line);
    press("heading", !!h);
    press("quote", line.startsWith("> "));
    press("task", /^[-*+] \[[ xX]\] /.test(line));
    press("ul", /^[-*+] (?!\[)/.test(line));
    press("ol", /^\d+\. /.test(line));
    if (level) level.value = h && h[1].length <= 3 ? `h${h[1].length}` : "p";
  }

  /* --------------------------------------------------- popover form */
  const LABELS = {
    link: { url: "URL", text: "Text", ok: "Insert link" },
    image: { url: "Image URL", text: "Alt text", ok: "Insert image" },
    codeblock: { lang: "Language", ok: "Insert code block" },
  };

  function openDialog(root, cmd, trigger) {
    const pop = root.querySelector("[data-editor-popover]");
    if (!pop) return;
    motion()?.cancelExit?.(pop);
    const html = isHtml(root);
    const ta = sourceOf(root);
    const labels = LABELS[cmd];
    const fields = {};
    pop.querySelectorAll("[data-editor-field]").forEach((f) => fields[f.getAttribute("data-editor-field")] = f);
    pop.querySelectorAll("[data-editor-field-wrap]").forEach((w) => {
      const k = w.getAttribute("data-editor-field-wrap");
      w.hidden = !(k in labels);
      const l = w.querySelector("[data-editor-dialog-label]");
      if (l && labels[k]) l.textContent = labels[k];
    });
    const ok = pop.querySelector("[data-editor-dialog-ok]");
    if (ok) ok.textContent = labels.ok;

    const state = { cmd, trigger, range: null, anchor: null };
    if (html) {
      const sel = document.getSelection();
      state.range = sel && sel.rangeCount && within(root, "*") ? sel.getRangeAt(0).cloneRange() : null;
      state.anchor = cmd === "link" ? within(root, "a") : null;
      fields.url.value = state.anchor ? state.anchor.getAttribute("href") || "" : "";
      fields.text.value = state.anchor ? state.anchor.textContent : state.range ? state.range.toString() : "";
    } else if (ta) {
      state.sel = [ta.selectionStart, ta.selectionEnd];
      const picked = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      fields.url.value = /^https?:\/\//.test(picked) ? picked : "";
      fields.text.value = fields.url.value ? "" : picked;
    }
    if (fields.lang) fields.lang.value = "plain";
    root._edDialog = state;

    // Under the toolbar, starting at the tool that opened it (CSSOM, no inline style attribute).
    const toolbar = root.querySelector(".editor__toolbar");
    const rb = root.getBoundingClientRect();
    const tb = trigger?.getBoundingClientRect() ?? rb;
    pop.hidden = false;
    const x = Math.max(8, Math.min(tb.left - rb.left, root.clientWidth - pop.offsetWidth - 8));
    pop.style.setProperty("--editor-popover-x", `${Math.round(x)}px`);
    pop.style.setProperty("--editor-popover-top", `${(toolbar?.offsetHeight ?? 36) + 4}px`);
    (cmd === "codeblock" ? fields.lang : fields.url)?.focus();
  }

  function closeDialog(root, refocus) {
    const pop = root.querySelector("[data-editor-popover]");
    const state = root._edDialog;
    root._edDialog = null;
    if (!pop || pop.hidden) return;
    const done = () => {
      pop.hidden = true;
    };
    const m = motion();
    if (m?.exit) m.exit(pop, done);
    else done();
    if (refocus) (state?.trigger ?? sourceOf(root))?.focus();
  }

  function submitDialog(root) {
    const state = root._edDialog;
    const pop = root.querySelector("[data-editor-popover]");
    if (!state || !pop) return;
    const val = (k) => pop.querySelector(`[data-editor-field="${k}"]`)?.value.trim() ?? "";
    const url = val("url");
    const text = val("text");
    const lang = val("lang");
    const { cmd } = state;
    if (cmd !== "codeblock" && !url) {
      pop.querySelector('[data-editor-field="url"]')?.focus();
      return;
    }
    root._edDialog = null;
    const m = motion();
    const done = () => {
      pop.hidden = true;
    };
    if (m?.exit) m.exit(pop, done);
    else done();

    if (isHtml(root)) {
      const surface = surfaceOf(root);
      surface?.focus();
      const sel = document.getSelection();
      if (state.range && sel) {
        sel.removeAllRanges();
        sel.addRange(state.range);
      }
      if (cmd === "link") {
        if (state.anchor) {
          state.anchor.setAttribute("href", url);
          if (text) state.anchor.textContent = text;
        } else if (sel && !sel.isCollapsed && !text) {
          document.execCommand("createLink", false, url);
        } else {
          const a = document.createElement("a");
          a.href = url;
          a.textContent = text || url;
          insertHtml(a.outerHTML);
        }
      } else if (cmd === "image") {
        const img = document.createElement("img");
        img.src = url;
        img.alt = text;
        insertHtml(img.outerHTML);
      } else if (cmd === "codeblock") {
        codeBlock(root, lang);
      }
      sync(root);
      reflect(root);
      return;
    }

    const ta = sourceOf(root);
    if (!ta) return;
    const [s, e] = state.sel ?? [ta.selectionStart, ta.selectionEnd];
    step(root, ta, () => {
      if (cmd === "codeblock") {
        const body = ta.value.slice(s, e);
        ta.setSelectionRange(s, e);
        const fence = `\`\`\`${lang === "plain" ? "" : lang}\n${body}\n\`\`\``;
        const at = fence.indexOf("\n") + 1;
        insertBlock(ta, fence, at, at + body.length);
        return;
      }
      const label = text || (cmd === "image" ? "" : url);
      const md = `${cmd === "image" ? "!" : ""}[${label}](${url})`;
      replace(ta, s, e, md, md.length, md.length);
    });
  }

  /* ---------------------------------------------------------- upload */
  const cookie = (name) => document.cookie.split("; ").map((c) => c.split("=")).find(([k]) => k === name)?.[1] ?? "";

  function message(root, text) {
    const slot = root.querySelector("[data-editor-message]");
    if (slot) slot.textContent = text || "";
  }

  function upload(root, file) {
    const action = root.getAttribute("data-editor-upload");
    if (!action || !file || !file.type.startsWith("image/")) return false;
    const html = isHtml(root);
    const ta = sourceOf(root);
    const name = file.name || "image";
    message(root, "");
    let marker;
    if (html) {
      const surface = surfaceOf(root);
      surface?.focus();
      marker = document.createElement("img");
      marker.alt = `Uploading ${name}…`;
      marker.setAttribute("data-editor-uploading", "");
      insertHtml(marker.outerHTML);
      marker = surface?.querySelector("img[data-editor-uploading]");
      sync(root);
    } else if (ta) {
      marker = `![Uploading ${name}…]()`;
      step(root, ta, () => replace(ta, ta.selectionStart, ta.selectionEnd, marker, marker.length, marker.length));
    }
    const cfg = document.body?.dataset ?? {};
    // The swap header asks a rAPId route for the bare reply, not a whole document.
    const headers = { [cfg.swapHeader || "rapid-swap"]: "1" };
    const token = cookie(cfg.csrfCookie || "csrf");
    if (token) headers[cfg.csrfHeader || "x-csrf-token"] = decodeURIComponent(token);
    const body = new FormData();
    body.append("file", file, name);
    const settle = (url) => {
      if (html) {
        if (!marker?.isConnected) return;
        if (url) {
          marker.src = url;
          marker.alt = name;
          marker.removeAttribute("data-editor-uploading");
        } else marker.remove();
        sync(root);
      } else if (ta) {
        const at = ta.value.indexOf(marker);
        if (at === -1) return;
        const s = ta.selectionStart;
        const e = ta.selectionEnd;
        const out = url ? `![${name}](${url})` : "";
        ta.value = ta.value.slice(0, at) + out + ta.value.slice(at + marker.length);
        const shift = out.length - marker.length;
        ta.setSelectionRange(s > at ? Math.max(at, s + shift) : s, e > at ? Math.max(at, e + shift) : e);
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (url) root.dispatchEvent(new CustomEvent("editor:upload", { bubbles: true, detail: { file, url } }));
    };
    fetch(action, { method: "POST", body, headers, credentials: "same-origin" })
      .then((r) => r.ok ? r.text() : Promise.reject(new Error(`Upload failed (${r.status})`)))
      .then((text) => {
        const url = text.trim().split("\n")[0];
        if (!url || !safeUrl(url)) throw new Error("Upload failed: no URL returned");
        settle(url);
      })
      .catch((err) => {
        settle("");
        message(root, err?.message || "Upload failed");
      });
    return true;
  }

  function uploadFiles(root, files) {
    if (!root.getAttribute("data-editor-upload") || !editable(root)) return false;
    const images = [...(files || [])].filter((f) => f.type.startsWith("image/"));
    if (!images.length) return false;
    images.forEach((f) => upload(root, f));
    return true;
  }

  /* ------------------------------------------------------- status bar */
  function count(root) {
    const slot = root.querySelector("[data-editor-count]");
    if (!slot) return;
    const text = isHtml(root) ? surfaceOf(root)?.textContent ?? "" : sourceOf(root)?.value ?? "";
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const max = Number(root.getAttribute("data-editor-max") || 0);
    slot.textContent = max
      ? `${words} ${words === 1 ? "word" : "words"} · ${chars} / ${max} characters`
      : `${words} ${words === 1 ? "word" : "words"} · ${chars} ${chars === 1 ? "character" : "characters"}`;
    slot.classList.toggle("editor__count--over", !!max && chars > max);
  }

  /* ------------------------------------------------------ fullscreen */
  function fullscreen(root, on) {
    const btn = root.querySelector("[data-editor-fullscreen]");
    const next = on ?? !root.classList.contains("editor--fullscreen");
    root.classList.toggle("editor--fullscreen", next);
    btn?.setAttribute("aria-pressed", String(next));
    btn?.setAttribute("aria-label", next ? "Leave full screen" : "Full screen");
    if (!next) btn?.focus();
    else (isHtml(root) ? surfaceOf(root) : sourceOf(root))?.focus();
  }

  /* ------------------------------------------------------------- init */
  function init(root) {
    if (root.hasAttribute("data-editor-ready")) return;
    root.setAttribute("data-editor-ready", "");
    const ta = sourceOf(root);
    const surface = surfaceOf(root);
    if (isHtml(root) && surface && ta) {
      surface.innerHTML = ta.value;
      surface.querySelectorAll('input[type="checkbox"]').forEach(markBox);
      surface.setAttribute("contenteditable", ta.disabled ? "false" : "true");
      if (ta.disabled) surface.setAttribute("aria-disabled", "true");
      try {
        document.execCommand("defaultParagraphSeparator", false, "p");
        // Tags and `align` attributes, not inline styles — a strict CSP page can show the result.
        document.execCommand("styleWithCSS", false, false);
      } catch { /* not every engine takes these */ }
    }
    count(root);
    reflect(root);
  }

  function initAll() {
    document.querySelectorAll(SEL).forEach(init);
  }

  /* ----------------------------------------------------------- events */
  document.addEventListener("click", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    const tableBtn = target.closest("[data-editor-table]");
    if (tableBtn) {
      ev.preventDefault();
      const root = rootOf(tableBtn);
      if (root) tableOp(root, tableBtn.getAttribute("data-editor-table"));
      return;
    }

    const cancel = target.closest("[data-editor-dialog-cancel]");
    if (cancel) {
      ev.preventDefault();
      const root = rootOf(cancel);
      if (root) closeDialog(root, true);
      return;
    }

    const fs = target.closest("[data-editor-fullscreen]");
    if (fs) {
      ev.preventDefault();
      const root = rootOf(fs);
      if (root) fullscreen(root);
      return;
    }

    const tool = target.closest("[data-editor-cmd]");
    if (tool) {
      ev.preventDefault();
      const root = rootOf(tool);
      if (!root || !editable(root) || tool.disabled) return;
      const cmd = tool.getAttribute("data-editor-cmd");
      if (root._edDialog) closeDialog(root, false);
      if (cmd === "link" || cmd === "image" || cmd === "codeblock") {
        openDialog(root, cmd, tool);
        return;
      }
      if (isHtml(root)) execute(root, cmd);
      else {
        const ta = sourceOf(root);
        if (!ta) return;
        if (cmd === "undo" || cmd === "redo") travel(root, ta, cmd === "undo");
        else markdown(root, ta, cmd);
        reflect(root);
      }
      return;
    }

    const view = target.closest("[data-editor-view]");
    if (view) {
      ev.preventDefault();
      const root = rootOf(view);
      if (root) {
        if (root._edDialog) closeDialog(root, false);
        preview(root, view.getAttribute("data-editor-view") === "preview");
      }
      return;
    }

    // A task-list checkbox toggles its `checked` attribute so the mirrored HTML carries it.
    const box = target.closest('[data-editor-surface] input[type="checkbox"]');
    if (box) {
      const root = rootOf(box);
      if (!root || !editable(root)) return;
      if (box.hasAttribute("checked")) box.removeAttribute("checked");
      else box.setAttribute("checked", "");
      box.checked = box.hasAttribute("checked");
      sync(root);
      return;
    }

    // Outside click closes an open popover form.
    document.querySelectorAll(SEL).forEach((root) => {
      if (root._edDialog && !root.querySelector("[data-editor-popover]")?.contains(target)) closeDialog(root, false);
    });
  });

  document.addEventListener("click", (ev) => {
    const ok = ev.target instanceof Element ? ev.target.closest("[data-editor-dialog-ok]") : null;
    if (!ok) return;
    ev.preventDefault();
    const root = rootOf(ok);
    if (root) submitDialog(root);
  });

  document.addEventListener("change", (ev) => {
    const sel = ev.target;
    if (!(sel instanceof Element) || !sel.matches("[data-editor-level]")) return;
    const root = rootOf(sel);
    if (!root || !editable(root)) return;
    if (isHtml(root)) execute(root, "level", sel.value);
    else {
      const ta = sourceOf(root);
      if (!ta) return;
      step(root, ta, () => setLevel(ta, sel.value));
      reflect(root);
    }
  });

  document.addEventListener("beforeinput", (ev) => {
    const ta = ev.target;
    if (!(ta instanceof HTMLTextAreaElement) || !ta.matches(".editor__source")) return;
    const root = rootOf(ta);
    if (root && !isHtml(root)) record(root, ta, false);
  });

  document.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!(el instanceof Element)) return;
    const root = rootOf(el);
    if (!root) return;
    if (el.matches("[data-editor-surface]")) sync(root);
    if (el.matches("[data-editor-surface], .editor__source")) count(root);
  });

  document.addEventListener("selectionchange", () => {
    const active = document.activeElement;
    const root = rootOf(active);
    if (root && (active?.matches("[data-editor-surface], .editor__source"))) reflect(root);
  });

  document.addEventListener("keydown", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const root = rootOf(target);
    if (!root) return;

    if (ev.key === "Escape") {
      if (root._edDialog) {
        ev.preventDefault();
        ev.stopPropagation();
        closeDialog(root, true);
      } else if (root.classList.contains("editor--fullscreen")) {
        ev.preventDefault();
        ev.stopPropagation();
        fullscreen(root, false);
      }
      return;
    }
    if (ev.key === "Enter" && root._edDialog && target.closest("[data-editor-dialog]")) {
      // The dialog is not a <form> (it sits inside the page's), so Enter is handled here.
      ev.preventDefault();
      ev.stopPropagation();
      submitDialog(root);
      return;
    }
    if (!editable(root)) return;

    const inSurface = target.matches("[data-editor-surface]");
    const inSource = target.matches(".editor__source");
    if (!inSurface && !inSource) return;
    const mod = ev.ctrlKey || ev.metaKey;
    if (mod && ev.shiftKey && ev.key.toLowerCase() === "v") {
      root._edRichPaste = true;
      return;
    }
    if (mod && !ev.altKey) {
      const k = ev.key.toLowerCase();
      let cmd = k === "b" ? "bold" : k === "i" ? "italic" : k === "k" ? "link" : "";
      if (k === "u" && inSurface) cmd = "underline";
      if (!isHtml(root)) {
        if (k === "z") cmd = ev.shiftKey ? "redo" : "undo";
        if (k === "y") cmd = "redo";
      }
      if (cmd) {
        ev.preventDefault();
        if (cmd === "link") {
          openDialog(root, "link", root.querySelector('[data-editor-cmd="link"]'));
        } else if (inSurface) execute(root, cmd);
        else {
          const ta = sourceOf(root);
          if (!ta) return;
          if (cmd === "undo" || cmd === "redo") travel(root, ta, cmd === "undo");
          else markdown(root, ta, cmd);
          reflect(root);
        }
        return;
      }
    }
    if (inSource && !mod) markdownKey(root, target, ev);
  });

  document.addEventListener("paste", (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;
    const root = rootOf(target);
    if (!root) return;
    const data = ev.clipboardData;
    if (!data) return;
    if (data.files?.length && uploadFiles(root, data.files)) {
      ev.preventDefault();
      return;
    }
    if (!target.matches("[data-editor-surface]")) return;
    const rich = root._edRichPaste;
    root._edRichPaste = false;
    ev.preventDefault();
    const html = data.getData("text/html");
    if (rich && html) {
      insertHtml(sanitise(html));
    } else {
      document.execCommand("insertText", false, data.getData("text/plain"));
    }
    sync(root);
    count(root);
  });

  document.addEventListener("dragover", (ev) => {
    const root = rootOf(ev.target);
    if (root && root.getAttribute("data-editor-upload") && ev.dataTransfer?.types?.includes("Files")) {
      ev.preventDefault();
    }
  });

  document.addEventListener("drop", (ev) => {
    const root = rootOf(ev.target);
    if (!root) return;
    const files = ev.dataTransfer?.files;
    if (files?.length && uploadFiles(root, files)) ev.preventDefault();
  });

  document.addEventListener("focusin", (ev) => {
    const root = rootOf(ev.target);
    if (root && root._edDialog && !root.querySelector("[data-editor-popover]")?.contains(ev.target)) {
      closeDialog(root, false);
    }
  });

  document.addEventListener("rapid:swapped", initAll);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll);
  else initAll();
})();
