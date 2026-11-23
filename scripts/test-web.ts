/**
 * Comprehensive Verification Suite for the SDEV Website Building Toolkit:
 *   - HTML5 semantic tags, Emmet shorthands, callback/list/open-close nesting, safe inline HTML
 *   - CSS3 rules, nested selectors (&:hover, @media), camelCase/px units, CSS variables, themes
 *   - JavaScript & sdev-to-JS client transpiler (client_fn, onclick, on, on_scroll, on_intersect, web_state)
 *   - High-level components (navbar, hero_section, stat_band, bento_grid, feature_card, code_card,
 *     tabs_component, accordion, modal_dialog, data_table, form_field, footer_section, router)
 *   - Motion & 3D engines (scroll_driver, scroll_reveal, count_up, pointer_spotlight,
 *     hero_demo_widget, compiler_scene_3d, sdev_playground, canvas_2d)
 *   - Non-interference with core/parity builtins (title, del, time, map, close)
 *   - Full sdev website (`lang/web/sdev-website.sdev`) in both TS and Python runtimes
 *
 * Run via:
 *   npm run test:web
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { execute } from '../src/lang';
import { lintSdevSource } from '../src/lang/tools/linter';

let passed = 0;
let failed = 0;

function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${name}${detail ? '\n    ' + detail : ''}`);
  }
}

console.log('=== 1. HTML5 Elements, Nesting & Safe Inline Builders ===');
{
  const src = `
page("HTML Test", { lang: "en", dir: "ltr", bodyClass: "app-body" })
  header({ id: "top", class: ["site-header", "sticky"] }, () -> ::
    nav({ aria: { label: "Main" } }, () -> ::
      a("Home", "/", { class: "active" })
      a("Docs", "/docs")
    ;;)
  ;;)
  main(() -> ::
    tag("section.hero#intro", () -> ::
      h1("Write in " + el("span.text-primary", "plain words") + raw("<br>Run anywhere."))
      p("Escape test: 1 < 2 & 3 > 1")
      ul({ class: "items" }, ["First", "Second", el("li.custom", "Third")])
    ;;)
    open_form({ id: "contact-form", data: { track_submit: yep, max_retries: 3 } })
      form_field("Email", "email", "email", { placeholder: "ada@sdev.codes", required: yep })
      select({ name: "role" }, ["Developer", "Student", { value: "res", label: "Researcher", selected: yep }])
      button("Send", { type: "submit", class: { btn: yep, primary: yep, disabled: nope } })
    end_form()
    footer(() -> ::
      small("© 2026 sdev")
    ;;)
  ;;)
endpage()
`;
  const res = execute(src);
  const html = res.webHtml ?? '';
  check('HTML test program executes cleanly', res.success, res.error);
  check('Produces full <!DOCTYPE html> document', html.startsWith('<!DOCTYPE html>'));
  check('Renders <header> with array classes', html.includes('<header id="top" class="site-header sticky">'));
  check('Renders aria-* attributes from aria tome', html.includes('aria-label="Main"'));
  check('Renders shorthand a(text, href, attrs)', html.includes('<a class="active" href="/">Home</a>'));
  check('Renders Emmet tag("section.hero#intro")', html.includes('<section id="intro" class="hero">'));
  check('Renders inline el() and raw() without double-escaping', html.includes('<h1>Write in <span class="text-primary">plain words</span><br>Run anywhere.</h1>'));
  check('Escapes plain text (< and &)', html.includes('<p>Escape test: 1 &lt; 2 &amp; 3 &gt; 1</p>'));
  check('Renders <ul> list items and custom <li>', html.includes('<ul class="items"><li>First</li><li>Second</li><li class="custom">Third</li></ul>'));
  check('Renders data-* attributes from data tome', html.includes('data-track-submit data-max-retries="3"'));
  check('Renders <select> options from strings and tomes', html.includes('<option value="res" selected>Researcher</option>'));
  check('Renders conditional class tome on <button>', html.includes('class="btn primary"') && !html.includes('disabled'));
  check('Renders <footer> and <small>', html.includes('<footer><small>© 2026 sdev</small></footer>'));
}

console.log('\n=== 2. CSS3 Rules, Nested Selectors, Media Queries, Variables & Themes ===');
{
  const src = `
page("CSS Test")
  theme("sdev-dark", { custom_accent: "#22d3ee" })
  style(".card", {
    backgroundColor: "#111520",
    padding: 24,
    borderRadius: 12,
    opacity: 0.95,
    zIndex: 5,
    "--depth": 0,
    "&:hover": {
      borderColor: css_var("custom_accent", "#38bdf8"),
      transform: "translateY(-2px)"
    },
    "@media (max-width: 640px)": {
      padding: 12
    }
  })
  media("mobile", () -> ::
    style(".grid-2", { gridTemplateColumns: "1fr" })
  ;;)
  keyframes("fade-in", {
    from: { opacity: 0, transform: "translateY(8px)" },
    to: { opacity: 1, transform: "none" }
  })
  div("Styled Card", {
    class: "card",
    style: { marginTop: 16, lineHeight: 1.6, "--local": 1 }
  })
endpage()
`;
  const res = execute(src);
  const html = res.webHtml ?? '';
  check('CSS test program executes cleanly', res.success, res.error);
  check('Converts camelCase CSS props and adds px to dimensional numbers', html.includes('background-color: #111520;') && html.includes('padding: 24px;') && html.includes('border-radius: 12px;'));
  check('Preserves unitless numbers for opacity, z-index, and --vars', html.includes('opacity: 0.95;') && html.includes('z-index: 5;') && html.includes('--depth: 0;'));
  check('Expands nested &:hover selector and css_var()', html.includes('.card:hover {\n  border-color: var(--custom-accent, #38bdf8);'));
  check('Expands nested @media inside style()', html.includes('@media (max-width: 640px) {\n.card {\n  padding: 12px;\n}\n}'));
  check('Expands media("mobile", () -> :: ... ;;)', html.includes('@media (max-width: 767px) {\n.grid-2 {\n  grid-template-columns: 1fr;\n}\n}'));
  check('Emits @keyframes with converted properties', html.includes('@keyframes fade-in {\n  from { opacity: 0; transform: translateY(8px) }\n  to { opacity: 1; transform: none }\n}'));
  check('Renders inline style tome on element', html.includes('style="margin-top: 16px; line-height: 1.6; --local: 1"'));
}

console.log('\n=== 3. JavaScript & sdev-to-JS Client Transpiler ===');
{
  const src = `
page("JS Transpiler Test")
  web_state({ count: 0, label: "Ready" })

  div("0", { id: "counter", bind: "count" })
  button("Increment", {
    id: "inc-btn",
    onclick: () -> ::
      forge nextVal be state_get("count") + 1
      state_set("count", nextVal)
      dom_toggle_class("#counter", "pulsing")
    ;;
  })

  client_fn("computeScore", (base, bonus) -> ::
    forge total be base * 2 + bonus
    ponder total >= 10 ::
      dom_text("#status", "High: " + str(total))
    ;; otherwise ::
      dom_text("#status", "Low: " + str(total))
    ;;
    yield total
  ;;)

  on("keydown", "window", (event) -> ::
    ponder event.key equals "Escape" ::
      state_set("count", 0)
    ;;
  ;;)

  forge jsCode be sdev_to_js((x) -> x * 3 + 1)
  speak(jsCode)
endpage()
`;
  const res = execute(src);
  const html = res.webHtml ?? '';
  check('JS transpiler test executes cleanly', res.success, res.error);
  check('Initializes reactive $sdev.initState', html.includes('window.$sdev.initState({"count":0,"label":"Ready"})'));
  check('Binds data-bind-text attribute', html.includes('data-bind-text="count"'));
  check('Transpiles inline onclick lambda to JS handler', html.includes('window.__sdev_h1 = function(event, el)') && (html.includes('$sdev.stateSet("count", nextVal)') || html.includes('$sdev.set("count", nextVal)')));
  check('Transpiles client_fn with ponder/otherwise and yield to JS function', html.includes('function computeScore(base, bonus)') && html.includes('if ((total >= 10))') && html.includes('return total;'));
  check('Transpiles window event listener', html.includes('window.addEventListener("keydown"'));
  check('sdev_to_js() returns transpiled JS string', (res.output[0] ?? '').includes('return ((x * 3) + 1)'));
}

console.log('\n=== 4. High-Level Components, Icons, Markdown & Routing ===');
{
  const src = `
page("Components Test")
  open_route("/")
    markdown("## Welcome\\nThis is **bold** and \`code\`.")
    tabs_component("demo-tabs", [
      { id: "t1", label: "Overview", content: "Tab 1 content" },
      { id: "t2", label: "Details", content: () -> :: p("Nested tab 2") ;; }
    ])
    accordion([
      { title: "What is sdev?", content: "A self-hosted language.", open: yep }
    ])
    data_table(["Language", "Target"], [["sdev", "WASM + x86-64"]])
    modal_dialog("info-modal", "About sdev", "Self-hosted compiler.")
  end_route()
  open_route("/docs")
    h2("Documentation Route")
  end_route()
endpage()
`;
  const res = execute(src);
  const html = res.webHtml ?? '';
  check('Components test executes cleanly', res.success, res.error);
  check('Renders Markdown heading, bold, and code', html.includes('<h2>Welcome</h2>') && html.includes('<strong>bold</strong>') && html.includes('<code>code</code>'));
  check('Renders tabs_component triggers and panels', html.includes('data-tab-target="t1"') && html.includes('<p>Nested tab 2</p>'));
  check('Renders accordion items', html.includes('data-accordion-trigger') && html.includes('What is sdev?'));
  check('Renders data_table', html.includes('<table class="data-table"><thead><tr><th>Language</th><th>Target</th></tr></thead>'));
  check('Renders modal_dialog', html.includes('id="info-modal" class="modal-backdrop"'));
  check('Renders SPA routes with data-route-view', html.includes('data-route-view="/"') && html.includes('data-route-view="/docs"'));
}

console.log('\n=== 5. Non-Interference With Core / Parity Builtins ===');
{
  const nonWeb = `
forge t be title("hello sdev world")
forge d be { "a": 1, "b": 2 }
del(d, "a")
forge tm be time()
forge mapped be map(x -> x * 10, [1, 2, 3])
speak(t)
speak(keys(d))
speak(tm["year"] >= 2025)
speak(mapped)
`;
  const res = execute(nonWeb);
  check('Core/parity builtins work untouched outside page()', res.success, res.error);
  check('title("hello sdev world") returns "Hello Sdev World"', res.output[0] === 'Hello Sdev World', res.output[0]);
  check('del(d, "a") deletes key from tome', res.output[1] === '["b"]' || res.output[1] === '[b]', res.output[1]);
  check('time() returns time tome', res.output[2] === 'yep', res.output[2]);
  check('map(fn, list) maps function over list', res.output[3] === '[10, 20, 30]', res.output[3]);
  check('webState is null when no web builtins ran', res.webState === null);
}

console.log('\n=== 6. Full SDEV Website Built in sdev (TS + Python Parity + Linter) ===');
{
  const websiteSrc = readFileSync('lang/web/sdev-website.sdev', 'utf8');
  const lintDiags = lintSdevSource(websiteSrc).filter((d) => d.severity === 'error');
  check('lang/web/sdev-website.sdev passes static linter with 0 errors', lintDiags.length === 0, JSON.stringify(lintDiags));

  const tsRes = execute(websiteSrc);
  const html = tsRes.webHtml ?? '';
  check('lang/web/sdev-website.sdev executes in TS runtime', tsRes.success && tsRes.output[0] === '✓ Built the complete sdev website in sdev!', tsRes.error);
  check('Generated sdev website HTML contains Sticky Navbar & Reading Progress', html.includes('class="site-nav"') && html.includes('class="reading-progress"'));
  check('Generated sdev website HTML contains Split Hero & Hero Demo', html.includes('Write in ') && html.includes('plain words.') && html.includes('Run it anywhere.') && html.includes('id="sdev-hero-demo"'));
  check('Generated sdev website HTML contains 4-column Stats Band with data-count', html.includes('data-count="26"') && html.includes('data-count="87"'));
  check('Generated sdev website HTML contains 3D Compiler Scene & Sticky Stack', html.includes('id="sdev-compiler-world"') && html.includes('class="how-stack"'));
  check('Generated sdev website HTML contains Live Interactive Playground', html.includes('id="sdev-pg-editor"') && html.includes('runSdevPlayground'));
  check('Generated sdev website HTML contains Bento Grid & Transpiled Keyword Switcher', html.includes('function selectKeywordLang(idx)') && html.includes('създай'));
  check('Generated sdev website HTML contains Passive Scroll Driver & Reveal Observer', html.includes('__sdevScrollDriverActive') && html.includes('IntersectionObserver'));

  // Verify Python interpreter dual-runtime parity on lang/web/sdev-website.sdev
  let pyRan = false;
  for (const bin of ['python', 'python3']) {
    try {
      const py = spawnSync(bin, ['public/sdev-interpreter.py', 'lang/web/sdev-website.sdev'], {
        encoding: 'utf8',
        timeout: 10000,
      });
      if (py.status === 0 && (py.stdout || '').includes('Built the complete sdev website in sdev')) {
        pyRan = true;
        break;
      }
    } catch {
      // try next python binary
    }
  }
  check('lang/web/sdev-website.sdev executes in Python interpreter (dual-runtime parity)', pyRan);
}

console.log(`\n========================================`);
console.log(`Passed: ${passed} | Failed: ${failed}`);
console.log(`========================================`);
process.exit(failed > 0 ? 1 : 0);
