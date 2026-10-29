/*
 * Code block: a small, best-effort tokenizer for the languages a docs or
 * admin page quotes most — json, bash, css, html and js/ts — so a plain
 * page gets colour without a highlighter library. It runs only on
 * `code[data-highlight="<lang>"]` whose lines carry no token markup yet
 * (a server highlighter's output is left alone), line by line, carrying
 * a block-comment state from one line to the next. Regex-based: it
 * colours keywords, strings, numbers, comments, tags, attributes and
 * punctuation and makes no attempt at a real grammar. Text is escaped
 * before it is written back.
 */
(() => {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const tok = (cls, s) => `<span class="tok-${cls}">${esc(s)}</span>`;

  const KW = {
    js:
      /\b(?:const|let|var|function|return|if|else|for|while|do|class|extends|import|export|from|default|new|this|super|true|false|null|undefined|await|async|switch|case|break|continue|throw|try|catch|finally|typeof|instanceof|of|in|void|delete|yield|static|get|set|interface|type|enum|implements|readonly|as|satisfies|declare|namespace|abstract|private|public|protected|override|keyof|infer|never|unknown|any|string|number|boolean|symbol|bigint|object)\b/y,
    bash:
      /\b(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|exit|export|local|readonly|source|alias|set|unset|shift|echo|printf|cd|ls|cp|mv|rm|mkdir|cat|grep|sed|awk|curl|wget|git|npm|npx|deno|bun|node|docker|sudo|chmod|chown|tar|ssh|make)\b/y,
    css: /@[a-zA-Z-]+|!important\b/y,
    json: /\b(?:true|false|null)\b/y,
  };

  // Each language: ordered [class, sticky regex] rules tried at every
  // position; the first match wins; otherwise one character of plain text.
  const RULES = {
    json: [
      ["attr", /"(?:[^"\\]|\\.)*"(?=\s*:)/y],
      ["str", /"(?:[^"\\]|\\.)*"/y],
      ["num", /-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/y],
      ["kw", KW.json],
      ["punct", /[{}[\],:]/y],
    ],
    bash: [
      ["com", /#.*/y],
      ["str", /"(?:[^"\\]|\\.)*"|'[^']*'/y],
      ["var", /\$(?:\{[^}]*\}|[A-Za-z_][A-Za-z0-9_]*|[0-9@#?*$!-])/y],
      ["attr", /(?<![\w-])--?[A-Za-z][\w-]*/y],
      ["kw", KW.bash],
      ["num", /\b\d+\b/y],
      ["op", /&&|\|\||[|&;><]+/y],
    ],
    css: [
      ["com", /\/\*[\s\S]*?\*\//y],
      ["str", /"(?:[^"\\]|\\.)*"|'[^']*'/y],
      ["kw", KW.css],
      ["attr", /(?<=^\s*|[;{]\s*)--?[a-zA-Z][\w-]*(?=\s*:)/y],
      ["fn", /[a-zA-Z-]+(?=\()/y],
      ["num", /-?(?:\d+\.?\d*|\.\d+)(?:%|[a-zA-Z]+)?/y],
      ["str", /#[0-9a-fA-F]{3,8}\b/y],
      ["tag", /(?:^|(?<=[,{}]\s*))[^{};:]+?(?=\s*\{)/y],
      ["punct", /[{}();,:]/y],
    ],
    html: [
      ["com", /<!--[\s\S]*?-->/y],
      ["com", /<!DOCTYPE[^>]*>/iy],
      ["tag", /<\/?[a-zA-Z][\w:-]*/y],
      ["punct", /\/?>/y],
      ["str", /"[^"]*"|'[^']*'/y],
      ["attr", /(?<=<[^>]*\s)[a-zA-Z_:][\w:.-]*(?=\s*=|[\s/>])/y],
      ["op", /=/y],
    ],
    js: [
      ["com", /\/\/.*|\/\*[\s\S]*?\*\//y],
      ["str", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`/y],
      ["num", /\b0[xXbBoO][\da-fA-F_]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?n?\b/y],
      ["kw", KW.js],
      ["type", /\b[A-Z][A-Za-z0-9_]*\b/y],
      ["fn", /\b[a-zA-Z_$][\w$]*(?=\s*\()/y],
      ["punct", /[{}()[\];,.]/y],
      ["op", /=>|[=+\-*/%<>!&|?:^~]+/y],
    ],
  };
  const ALIAS = { sh: "bash", shell: "bash", javascript: "js", ts: "js", typescript: "js", xml: "html" };

  // A block comment open at the end of one line colours the next until it closes.
  const OPENERS = { css: ["/*", "*/"], js: ["/*", "*/"], html: ["<!--", "-->"] };

  function colour(lang, line, state) {
    const rules = RULES[lang];
    let out = "";
    let i = 0;
    const [open, close] = OPENERS[lang] ?? [];
    if (state.inComment) {
      const end = line.indexOf(close);
      if (end < 0) return { html: tok("com", line), state };
      out += tok("com", line.slice(0, end + close.length));
      i = end + close.length;
      state.inComment = false;
    }
    let plain = "";
    const flushPlain = () => {
      if (plain) out += esc(plain);
      plain = "";
    };
    while (i < line.length) {
      let hit = null;
      for (const [cls, re] of rules) {
        re.lastIndex = i;
        const m = re.exec(line);
        if (m && m[0].length) {
          hit = [cls, m[0]];
          break;
        }
      }
      if (!hit) {
        plain += line[i++];
        continue;
      }
      flushPlain();
      out += tok(hit[0], hit[1]);
      i += hit[1].length;
    }
    flushPlain();
    // An opener on this line with no closer after it: the comment continues.
    if (open) {
      const at = line.lastIndexOf(open);
      if (at >= 0 && line.indexOf(close, at + open.length) < 0 && !line.slice(0, at).includes("//")) {
        state.inComment = true;
      }
    }
    return { html: out, state };
  }

  function highlight(code) {
    const lang = ALIAS[code.getAttribute("data-highlight")] ?? code.getAttribute("data-highlight");
    if (!RULES[lang] || code.hasAttribute("data-highlighted")) return;
    const lines = code.querySelectorAll(".code__line");
    if (!lines.length || code.querySelector(".code__line > span")) return;
    let state = { inComment: false };
    lines.forEach((line) => {
      const r = colour(lang, line.textContent, state);
      state = r.state;
      line.innerHTML = r.html;
    });
    code.setAttribute("data-highlighted", "");
  }

  const initAll = (root = document) => root.querySelectorAll?.("code[data-highlight]").forEach(highlight);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => initAll());
  else initAll();
  document.addEventListener(
    "rapid:swapped",
    (event) => initAll(event.target instanceof Element ? event.target : document),
  );
})();
