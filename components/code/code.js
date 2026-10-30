/*
 * Code block: a small, best-effort tokenizer for the languages a docs or
 * admin page quotes most — json, bash, css, html, js/ts, python, php and
 * java — so a plain page gets colour without a highlighter library. It
 * runs only on `code[data-highlight="<lang>"]` whose lines carry no token
 * markup yet (a server highlighter's output is left alone), line by line,
 * carrying an open block comment or string to the next line. Regex-based: it
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
    python:
      /\b(?:False|None|True|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/y,
    php:
      /\b(?:abstract|and|array|as|break|callable|case|catch|class|clone|const|continue|declare|default|do|echo|else|elseif|empty|extends|false|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|new|null|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|true|try|unset|use|var|while|xor|yield)\b/iy,
    java:
      /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|extends|false|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|native|new|null|package|private|protected|public|record|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|transient|true|try|var|void|volatile|while|yield)\b/y,
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
    python: [
      ["com", /#.*/y],
      [
        "str",
        /(?<!\w)[rRbBfFuU]{0,2}(?:""".*?"""|'''.*?'''|"(?!"")(?:[^"\\]|\\.)*"|'(?!'')(?:[^'\\]|\\.)*')/y,
      ],
      ["fn", /@[A-Za-z_][\w.]*/y],
      ["num", /\b0[xXbBoO][\da-fA-F_]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?j?\b/y],
      ["kw", KW.python],
      ["var", /\b(?:self|cls)\b/y],
      ["type", /\b[A-Z][A-Za-z0-9_]*\b/y],
      ["fn", /\b[a-zA-Z_]\w*(?=\s*\()/y],
      ["punct", /[{}()[\];,.:]/y],
      ["op", /[=+\-*/%<>!&|^~]+/y],
    ],
    php: [
      ["tag", /<\?(?:php|=)|\?>/y],
      ["com", /\/\/.*|#(?!\[).*|\/\*.*?\*\//y],
      ["str", /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
      ["var", /\$[A-Za-z_]\w*/y],
      ["num", /\b0[xXbBoO][\da-fA-F_]+\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?\b/y],
      ["kw", KW.php],
      ["type", /\b[A-Z][A-Za-z0-9_]*\b/y],
      ["fn", /\b[a-zA-Z_]\w*(?=\s*\()/y],
      ["punct", /[{}()[\];,]/y],
      ["op", /->|=>|::|[=+\-*/%<>!&|?:^~.]+/y],
    ],
    java: [
      ["com", /\/\/.*|\/\*.*?\*\//y],
      ["str", /"(?!"")(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/y],
      ["attr", /@[A-Za-z_][\w.]*/y],
      ["num", /\b0[xXbB][\da-fA-F_]+[lL]?\b|\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[lLfFdD]?\b/y],
      ["kw", KW.java],
      ["type", /\b[A-Z][A-Za-z0-9_]*\b/y],
      ["fn", /\b[a-zA-Z_]\w*(?=\s*\()/y],
      ["punct", /[{}()[\];,.]/y],
      ["op", /->|::|[=+\-*/%<>!&|?:^~]+/y],
    ],
  };
  const ALIAS = {
    sh: "bash",
    shell: "bash",
    javascript: "js",
    ts: "js",
    typescript: "js",
    xml: "html",
    py: "python",
    python3: "python",
  };

  // What can stay open across lines: [opener, closer, token class]. Colours
  // each line until the closer, in the class of what it is.
  const COMMENT = ["/*", "*/", "com"];
  const BLOCKS = {
    css: [COMMENT],
    js: [COMMENT],
    php: [COMMENT],
    java: [COMMENT, ['"""', '"""', "str"]],
    html: [["<!--", "-->", "com"]],
    python: [['"""', '"""', "str"], ["'''", "'''", "str"]],
  };

  function colour(lang, line, state) {
    const rules = RULES[lang];
    let out = "";
    let i = 0;
    if (state.block) {
      const [, close, cls] = state.block;
      const end = line.indexOf(close);
      if (end < 0) return { html: tok(cls, line), state };
      out += tok(cls, line.slice(0, end + close.length));
      i = end + close.length;
      state.block = null;
    }
    let plain = "";
    const flushPlain = () => {
      if (plain) out += esc(plain);
      plain = "";
    };
    while (i < line.length) {
      // Checked here, not after the line: an opener inside a string or a
      // line comment has already been consumed and never reaches this.
      const at = i;
      const block = BLOCKS[lang]?.find(([o, c]) => line.startsWith(o, at) && line.indexOf(c, at + o.length) < 0);
      if (block) {
        flushPlain();
        out += tok(block[2], line.slice(i));
        state.block = block;
        break;
      }
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
    return { html: out, state };
  }

  function highlight(code) {
    const lang = ALIAS[code.getAttribute("data-highlight")] ?? code.getAttribute("data-highlight");
    if (!RULES[lang] || code.hasAttribute("data-highlighted")) return;
    const lines = code.querySelectorAll(".code__line");
    if (!lines.length || code.querySelector(".code__line > span")) return;
    let state = { block: null };
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
