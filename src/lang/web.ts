// ============================================================================
// SDEV Web Toolkit — Full-Stack HTML5, CSS3, JavaScript, Reactive DOM,
// Components, Motion & 3D Scene Builder
// ----------------------------------------------------------------------------
// Produces a complete, self-contained HTML document (HTML + CSS + JS) consumed
// by WebPreviewPanel.tsx, the homepage Playground, the CLI (`sdev build-web`),
// and the Python interpreter.
// ============================================================================

import { SdevFunction, stringify } from './builtins';
import { isFunction, isGenerator } from './runtime-values';
import type * as AST from './ast';
import type { Environment } from './environment';
import { createSdevModuleRunner, type SdevModuleRunner } from './sdev-module';

import SDEV_TEXT_SRC from '../../lang/stdlib/v2/text.sdev?raw';
import SDEV_ICONS_SRC from '../../lang/web/icons.sdev?raw';
import SDEV_THEMES_SRC from '../../lang/web/themes.sdev?raw';
import SDEV_TRANSPILER_SRC from '../../lang/web/transpiler.sdev?raw';
import SDEV_CSS_SRC from '../../lang/web/css.sdev?raw';
import SDEV_HTML_SRC from '../../lang/web/html.sdev?raw';
import SDEV_COMPONENTS_SRC from '../../lang/web/components.sdev?raw';

let webRunner: SdevModuleRunner | null = null;
function getWebRunner(): SdevModuleRunner {
  if (!webRunner) {
    webRunner = createSdevModuleRunner(
      SDEV_TEXT_SRC,
      SDEV_ICONS_SRC,
      SDEV_THEMES_SRC,
      SDEV_TRANSPILER_SRC,
      SDEV_CSS_SRC,
      SDEV_HTML_SRC,
      SDEV_COMPONENTS_SRC,
    );
  }
  return webRunner;
}

function callSdevWeb(fnName: string, args: unknown[] = []): string {
  return getWebRunner().callStr(fnName, ...args);
}

function callSdevWebWithDoc(
  fnName: string,
  args: unknown[] = []
): { ret: string; html: string; js: string; css: string } {
  const runner = getWebRunner();
  const doc = runner.getVar('_web_doc') as string[];
  if (Array.isArray(doc)) {
    doc[7] = '';
    doc[8] = '';
    doc[9] = '';
  }
  const res = runner.call(fnName, ...args);
  const ret = typeof res === 'string' ? res.replace(/[\x01\x02]/g, '') : String(res ?? '');
  const css = Array.isArray(doc) ? String(doc[7] ?? '') : '';
  const html = Array.isArray(doc) ? String(doc[8] ?? '').replace(/[\x01\x02]/g, '') : '';
  const js = Array.isArray(doc) ? String(doc[9] ?? '') : '';
  return { ret, html, js, css };
}

function renderIconSvg(name: string, extraAttrs = '', cls = 'sdev-icon'): string {
  const svg = callSdevWeb('web_icon_svg', [name, cls || 'sdev-icon']);
  return extraAttrs ? svg.replace('<svg ', `<svg${extraAttrs.startsWith(' ') ? extraAttrs : ' ' + extraAttrs} `) : svg;
}

function astToSdevSource(node: AST.ASTNode | undefined): string {
  if (!node) return '';
  switch (node.type) {
    case 'NumberLiteral':
    case 'BooleanLiteral':
      return String(node.value);
    case 'StringLiteral':
      return JSON.stringify(node.value);
    case 'NullLiteral':
      return 'void';
    case 'Identifier':
      return node.name;
    case 'BinaryExpr':
      return `(${astToSdevSource(node.left)} ${node.operator} ${astToSdevSource(node.right)})`;
    case 'UnaryExpr':
      return `${node.operator} ${astToSdevSource(node.operand)}`;
    case 'CallExpr':
      return `${astToSdevSource(node.callee)}(${node.args.map(astToSdevSource).join(', ')})`;
    case 'MemberExpr':
      return `${astToSdevSource(node.object)}.${node.property}`;
    case 'IndexExpr':
      return `${astToSdevSource(node.object)}[${astToSdevSource(node.index)}]`;
    case 'LetStatement':
      return `forge ${node.name} be ${astToSdevSource(node.value)}`;
    case 'AssignStatement':
      return `${node.name} be ${astToSdevSource(node.value)}`;
    case 'ReturnStatement':
      return node.value ? `yield ${astToSdevSource(node.value)}` : 'yield';
    case 'BreakStatement':
      return 'yeet';
    case 'ContinueStatement':
      return 'skip';
    case 'ExpressionStatement':
      return astToSdevSource(node.expression);
    case 'BlockStatement':
      return node.statements.map(astToSdevSource).join('\n');
    case 'IfStatement': {
      const thenSrc = astToSdevSource(node.thenBranch);
      const elseSrc = node.elseBranch ? `\n;; otherwise ::\n${astToSdevSource(node.elseBranch)}` : '';
      return `ponder ${astToSdevSource(node.condition)} ::\n${thenSrc}${elseSrc}\n;;`;
    }
    case 'WhileStatement':
      return `cycle ${astToSdevSource(node.condition)} ::\n${astToSdevSource(node.body)}\n;;`;
    case 'ForEachStatement':
      return `iterate ${node.variable} through ${astToSdevSource(node.iterable)} ::\n${astToSdevSource(node.body)}\n;;`;
    default:
      return '';
  }
}

function sdevSourceToJs(src: string): string {
  return callSdevWeb('sdev_to_js', [src]);
}

function sdevFuncToJs(fnVal: unknown, overrideName?: string): { name: string; params: string[]; body: string; fullFn: string } | null {
  if (!fnVal || typeof fnVal !== 'object') return null;
  const raw = fnVal as {
    name?: string;
    params?: string[];
    ast?: AST.FuncDeclaration | AST.LambdaExpr;
    meta?: {
      name?: string;
      paramSpecs?: AST.Param[];
      ast?: AST.FuncDeclaration | AST.LambdaExpr;
    };
  };
  const ast = raw.meta?.ast ?? raw.ast;
  if (!ast) return null;
  const name =
    overrideName ||
    raw.meta?.name ||
    raw.name ||
    (ast.type === 'FuncDeclaration' ? ast.name : 'anonymous') ||
    'anonymous';
  const params =
    raw.params ??
    raw.meta?.paramSpecs?.map((p) => p.name) ??
    ast.params ??
    [];
  const rawBody = ast.body;
  const sdevBody =
    ast.type === 'LambdaExpr' && rawBody.type !== 'BlockStatement'
      ? `yield ${astToSdevSource(rawBody)}`
      : astToSdevSource(rawBody);
  const body = callSdevWeb('sdev_to_js', [sdevBody]);
  const fullFn = `function ${overrideName || name}(${params.join(', ')}) {\n${body}\n}`;
  return { name: overrideName || name, params, body, fullFn };
}

export interface WebState {
  /** Document title shown in the preview header / browser tab. */
  title: string;
  /** Document `<html lang="...">`. */
  lang?: string;
  /** Document `<html dir="...">`. */
  dir?: string;
  /** Extra attributes on `<html>`. */
  htmlAttrs?: Record<string, unknown>;
  /** Extra attributes on `<body>`. */
  bodyAttrs?: Record<string, unknown>;
  /** Optional `<head>` extras (raw HTML). */
  head: string[];
  /** Element stack — each entry is a buffer for that container's children. */
  stack: string[][];
  /** Accumulated `<style>` rules. */
  css: string[];
  /** Accumulated `<script>` source. */
  js: string[];
  /** Accumulated `<script type="module">` blocks. */
  moduleJs?: string[];
  /** Selected theme preset ('sdev-dark' | 'sdev-light' | 'glass' | 'cyberpunk' | 'minimal' | 'plain'). */
  theme?: string;
  /** Whether to inject the full SDEV component & utility stylesheet. */
  includeUtilities?: boolean;
  /** True once any web builtin has run (so the IDE knows to flip to the web panel). */
  produced: boolean;
}

export type WebEmitCallback = (state: WebState) => void;

/* ─────────────────────────── Safe HTML Markers ─────────────────────────── */

const SAFE_START = '\uE000';
const SAFE_END = '\uE001';

export function markSafeHtml(html: string): string {
  const clean = html.replace(/[\uE000\uE001\x01\x02]/g, '');
  return `${SAFE_START}${clean}${SAFE_END}`;
}

export function stripSafeMarkers(s: string): string {
  return s.replace(/[\uE000\uE001\x01\x02]/g, '');
}

function asStr(v: unknown, fb = ''): string {
  if (v === null || v === undefined) return fb;
  return typeof v === 'string' ? v : stringify(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v) && !isFunction(v);
}

export function escapeHtml(s: string): string {
  return callSdevWeb('web_escape_html', [s]);
}

function renderSafeText(rawStr: string): string {
  if (!rawStr) return '';
  const s = rawStr.replace(/\x01/g, SAFE_START).replace(/\x02/g, SAFE_END);
  if (!s.includes(SAFE_START)) return escapeHtml(s);
  let out = '';
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf(SAFE_START, i);
    if (start === -1) {
      out += escapeHtml(s.slice(i));
      break;
    }
    if (start > i) {
      out += escapeHtml(s.slice(i, start));
    }
    const end = s.indexOf(SAFE_END, start + 1);
    if (end === -1) {
      out += s.slice(start + 1);
      break;
    }
    out += s.slice(start + 1, end);
    i = end + 1;
  }
  return out;
}

function escapeAttr(s: string): string {
  return callSdevWeb('web_escape_attr', [stripSafeMarkers(s)]);
}

/* ─────────────────────────── CSS Formatting (via lang/web/css.sdev) ─────────────────────────── */

export function cssPropName(k: string): string {
  return callSdevWeb('web_kebab_case', [k]);
}

export function cssPropValue(prop: string, v: unknown): string {
  if (typeof v === 'number') {
    return callSdevWeb('web_format_css_val', [prop, String(v)]);
  }
  return callSdevWeb('web_format_css_val', [prop, stripSafeMarkers(asStr(v))]);
}

export function cssRuleFromDict(selector: string, dict: Record<string, unknown>): string {
  const flatProps: Record<string, string> = {};
  const nestedRules: string[] = [];

  for (const [k, v] of Object.entries(dict)) {
    if (v === null || v === undefined || v === false) continue;
    if (isPlainObject(v)) {
      if (k.startsWith('@media') || k.startsWith('@supports') || k.startsWith('@container')) {
        nestedRules.push(`${k} {\n${cssRuleFromDict(selector, v)}\n}`);
      } else if (k.includes('&')) {
        const resolved = k.replace(/&/g, selector);
        nestedRules.push(cssRuleFromDict(resolved, v));
      } else {
        nestedRules.push(cssRuleFromDict(`${selector} ${k}`, v));
      }
    } else {
      flatProps[k] = stripSafeMarkers(asStr(v));
    }
  }

  const out: string[] = [];
  if (Object.keys(flatProps).length > 0) {
    out.push(callSdevWeb('web_style_block', [selector, flatProps]));
  }
  if (nestedRules.length > 0) {
    out.push(...nestedRules);
  }
  return out.join('\n\n');
}

function resolveMediaQuery(q: string): string {
  return callSdevWeb('web_media_query', [q]);
}

/* ─────────────────────────── HTML Tags & Emmet ─────────────────────────── */

export const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

export const ELEMENT_TAGS = [
  // structure
  'div', 'span', 'section', 'article', 'aside', 'header', 'footer', 'main', 'nav',
  'figure', 'figcaption', 'address', 'hgroup', 'search', 'template', 'slot', 'noscript',
  // headings & text
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'blockquote', 'pre', 'code',
  'em', 'strong', 'small', 'mark', 'cite', 'q', 'abbr', 'dfn', 'sub', 'sup',
  'b', 'i', 'u', 's', 'del', 'ins', 'kbd', 'samp', 'var', 'time',
  'ruby', 'rt', 'rp', 'bdi', 'bdo', 'wbr', 'data',
  // links & media
  'a', 'img', 'picture', 'source', 'video', 'audio', 'track', 'iframe', 'embed', 'object', 'param',
  'canvas', 'svg', 'map', 'area', 'math',
  // lists
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // tables
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  // forms
  'form', 'input', 'textarea', 'button', 'select', 'option', 'optgroup',
  'label', 'fieldset', 'legend', 'datalist', 'output', 'progress', 'meter',
  // interactive
  'details', 'summary', 'dialog', 'menu',
  // misc
  'hr', 'br',
];

function parseTagSpec(spec: string): { tag: string; id?: string; classes: string[] } {
  const parsed = getWebRunner().call('web_parse_tag_spec', spec) as [string, string, string];
  const tag = parsed?.[0] || 'div';
  const id = parsed?.[1] ? parsed[1] : undefined;
  const classes = parsed?.[2] ? parsed[2].split(' ').filter(Boolean) : [];
  return { tag, id, classes };
}

function normalizeClassValue(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v.trim();
  if (Array.isArray(v)) return v.map(normalizeClassValue).filter(Boolean).join(' ');
  if (isPlainObject(v)) {
    return Object.entries(v)
      .filter(([, on]) => Boolean(on))
      .map(([k]) => k)
      .join(' ');
  }
  return asStr(v);
}

function parseSimpleMarkdown(md: string): string {
  return callSdevWeb('web_render_markdown', [md]);
}

/* ──────────────────────────────────────────────────────────────────────── */

export function createWebBuiltins(emit: WebEmitCallback): Map<string, SdevFunction> {
  const builtins = new Map<string, SdevFunction>();

  const state: WebState = {
    title: 'sdev Web App',
    lang: 'en',
    dir: 'ltr',
    htmlAttrs: {},
    bodyAttrs: {},
    head: [],
    stack: [[]],
    css: [],
    js: [],
    moduleJs: [],
    theme: 'plain',
    includeUtilities: false,
    produced: false,
  };

  let inlineHandlerSeq = 0;
  const nameStack: string[] = [];

  const top = () => state.stack[state.stack.length - 1];
  const push = (html: string) => { top().push(stripSafeMarkers(html)); };
  const mark = () => { state.produced = true; emit(state); };
  const enableDesignSystem = () => {
    state.includeUtilities = true;
    if (!state.theme || state.theme === 'plain') state.theme = 'sdev-dark';
  };

  function compileHandlerCode(handler: unknown, defaultParams = ['event', 'el']): string {
    if (typeof handler === 'string') return handler;
    if (isFunction(handler)) {
      const transpiled = sdevFuncToJs(handler);
      if (transpiled) {
        const p0 = transpiled.params[0];
        const p1 = transpiled.params[1];
        const binds: string[] = [];
        if (p0 && p0 !== defaultParams[0]) binds.push(`const ${p0} = ${defaultParams[0]};`);
        if (p1 && p1 !== defaultParams[1]) binds.push(`const ${p1} = ${defaultParams[1]};`);
        return [...binds, transpiled.body].join('\n');
      }
      // Fallback for builtin/host functions without AST: run during build to capture any JS emitted
      const prevLen = state.js.length;
      try { handler.call([], 0); } catch { /* ignore */ }
      if (state.js.length > prevLen) {
        return state.js.splice(prevLen).join('\n');
      }
    }
    return asStr(handler);
  }

  function renderAttrs(
    attrs: Record<string, unknown> | undefined,
    extraSpec?: { id?: string; classes?: string[] }
  ): string {
    const merged: Record<string, unknown> = { ...(attrs ?? {}) };
    if (extraSpec?.id && !merged.id) merged.id = extraSpec.id;
    const clsList: string[] = [...(extraSpec?.classes ?? [])];
    if (merged.class !== undefined) {
      clsList.push(normalizeClassValue(merged.class));
      delete merged.class;
    }
    if (merged.className !== undefined) {
      clsList.push(normalizeClassValue(merged.className));
      delete merged.className;
    }
    const finalClass = clsList.filter(Boolean).join(' ').trim();

    const parts: string[] = [];
    if (merged.id !== undefined && merged.id !== null && merged.id !== false) {
      parts.push(`id="${escapeAttr(asStr(merged.id))}"`);
      delete merged.id;
    }
    if (finalClass) {
      parts.push(`class="${escapeAttr(finalClass)}"`);
    }

    for (const [k, v] of Object.entries(merged)) {
      if (v === false || v === null || v === undefined) continue;
      if (k === 'html' || k === 'innerHTML' || k === 'children' || k === 'text') continue;

      if (k === 'style' && isPlainObject(v)) {
        const cleanStyle: Record<string, string> = {};
        for (const [sk, sv] of Object.entries(v)) {
          if (sv !== null && sv !== undefined && sv !== false) cleanStyle[sk] = stripSafeMarkers(asStr(sv));
        }
        const inlineStyle = Object.keys(cleanStyle).length ? callSdevWeb('web_tome_to_inline_style', [cleanStyle]) : '';
        if (inlineStyle) parts.push(`style="${escapeAttr(inlineStyle)}"`);
        continue;
      }

      if ((k === 'data' || k === 'dataset') && isPlainObject(v)) {
        for (const [dk, dv] of Object.entries(v)) {
          if (dv === false || dv === null || dv === undefined) continue;
          const attrName = `data-${cssPropName(dk)}`;
          if (dv === true) parts.push(attrName);
          else parts.push(`${attrName}="${escapeAttr(asStr(dv))}"`);
        }
        continue;
      }

      if (k === 'aria' && isPlainObject(v)) {
        for (const [ak, av] of Object.entries(v)) {
          if (av === false || av === null || av === undefined) continue;
          parts.push(`aria-${cssPropName(ak)}="${escapeAttr(asStr(av))}"`);
        }
        continue;
      }

      if (k === 'bind' || k === 'bindText') {
        parts.push(`data-bind-text="${escapeAttr(asStr(v))}"`);
        continue;
      }
      if (k === 'bindValue') {
        parts.push(`data-bind-value="${escapeAttr(asStr(v))}"`);
        continue;
      }
      if (k === 'bindShow') {
        parts.push(`data-bind-show="${escapeAttr(asStr(v))}"`);
        continue;
      }
      if (k === 'bindClass') {
        parts.push(`data-bind-class="${escapeAttr(asStr(v))}"`);
        continue;
      }

      if (k.startsWith('on') && isFunction(v)) {
        const fnName = `__sdev_h${++inlineHandlerSeq}`;
        const body = compileHandlerCode(v, ['event', 'el']);
        state.js.push(`window.${fnName} = function(event, el) {\n${body}\n};`);
        parts.push(`${k}="${fnName}(event, this)"`);
        continue;
      }

      if (v === true) {
        parts.push(k);
        continue;
      }
      parts.push(`${k}="${escapeAttr(asStr(v))}"`);
    }
    return parts.length ? ' ' + parts.join(' ') : '';
  }

  interface ParsedElArgs {
    text: string;
    rawHtml?: string;
    attrs: Record<string, unknown>;
    childrenFn?: SdevFunction;
    childrenList?: unknown[];
  }

  function parseElArgs(tag: string, args: unknown[]): ParsedElArgs {
    let text = '';
    let rawHtml: string | undefined;
    const attrs: Record<string, unknown> = {};
    let childrenFn: SdevFunction | undefined;
    let childrenList: unknown[] | undefined;

    // Convenience positional forms for `a` and `img`:
    //   a("Docs", "/docs", { class: "nav-link" })
    //   img("/logo.png", "sdev", { class: "w-7" })
    if (tag === 'a' && args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
      text = args[0];
      attrs.href = args[1];
      if (isPlainObject(args[2])) Object.assign(attrs, args[2]);
      if (isFunction(args[3])) childrenFn = args[3];
      return { text, attrs, childrenFn };
    }
    if (tag === 'img' && args.length >= 1 && typeof args[0] === 'string') {
      attrs.src = args[0];
      if (typeof args[1] === 'string') attrs.alt = args[1];
      else if (isPlainObject(args[1])) Object.assign(attrs, args[1]);
      if (isPlainObject(args[2])) Object.assign(attrs, args[2]);
      return { text: '', attrs };
    }
    // button("Click me", () -> :: ... ;;, { class: "btn" }) where arg[1] is either onclick or children
    if (tag === 'button' && args.length >= 2 && typeof args[0] === 'string' && isFunction(args[1])) {
      text = args[0];
      const fn = args[1];
      if (isPlainObject(args[2])) Object.assign(attrs, args[2]);
      const transpiled = sdevFuncToJs(fn);
      // If the function doesn't emit HTML tags, treat it as an onclick handler!
      if (transpiled && !/\b(div|span|p|h[1-6]|icon|img|svg|raw_html|tag|open)\s*\(/.test(transpiled.body)) {
        attrs.onclick = fn;
        return { text, attrs };
      }
      childrenFn = fn;
      return { text, attrs, childrenFn };
    }

    for (const arg of args) {
      if (arg === null || arg === undefined) continue;
      if (isFunction(arg)) {
        childrenFn = arg;
      } else if (Array.isArray(arg)) {
        childrenList = arg;
      } else if (isPlainObject(arg)) {
        Object.assign(attrs, arg);
      } else {
        text += (text ? ' ' : '') + asStr(arg);
      }
    }

    if (typeof attrs.html === 'string') rawHtml = attrs.html;
    else if (typeof attrs.innerHTML === 'string') rawHtml = attrs.innerHTML;
    if (typeof attrs.text === 'string' && !text) text = attrs.text;
    if (isFunction(attrs.children) && !childrenFn) childrenFn = attrs.children;
    if (Array.isArray(attrs.children) && !childrenList) childrenList = attrs.children as unknown[];

    return { text, rawHtml, attrs, childrenFn, childrenList };
  }

  function renderElementToString(rawTagSpec: string, args: unknown[]): string {
    const spec = parseTagSpec(rawTagSpec);
    const tag = spec.tag;
    const { text, rawHtml, attrs, childrenFn, childrenList } = parseElArgs(tag, args);
    const attrStr = renderAttrs(attrs, spec);

    if (VOID_TAGS.has(tag)) {
      return `<${tag}${attrStr}>`;
    }

    let inner = '';
    if (rawHtml !== undefined) {
      inner += stripSafeMarkers(rawHtml);
    } else if (text) {
      inner += renderSafeText(text);
    }

    if (childrenList) {
      for (const item of childrenList) {
        if (item === null || item === undefined || item === false) continue;
        if (isFunction(item)) {
          state.stack.push([]);
          const ret = item.call([], 0);
          const buf = state.stack.pop()!.join('');
          inner += buf || (typeof ret === 'string' ? renderSafeText(ret) : '');
        } else if (tag === 'ul' || tag === 'ol') {
          const s = asStr(item);
          if (s.includes(SAFE_START) || s.trim().startsWith('<li')) {
            inner += renderSafeText(s);
          } else {
            inner += `<li>${renderSafeText(s)}</li>`;
          }
        } else if (tag === 'tr') {
          const s = asStr(item);
          if (s.includes(SAFE_START) || /^<\s*t[dh]\b/i.test(s.trim())) {
            inner += renderSafeText(s);
          } else {
            inner += `<td>${renderSafeText(s)}</td>`;
          }
        } else if (tag === 'select') {
          if (isPlainObject(item)) {
            const val = asStr(item.value ?? item.label ?? '');
            const lbl = asStr(item.label ?? item.value ?? '');
            const sel = item.selected ? ' selected' : '';
            inner += `<option value="${escapeAttr(val)}"${sel}>${escapeHtml(lbl)}</option>`;
          } else {
            const s = asStr(item);
            if (s.includes(SAFE_START) || s.trim().startsWith('<option')) {
              inner += renderSafeText(s);
            } else {
              inner += `<option value="${escapeAttr(s)}">${escapeHtml(s)}</option>`;
            }
          }
        } else {
          const s = asStr(item);
          inner += renderSafeText(s);
        }
      }
    }

    if (childrenFn) {
      state.stack.push([]);
      const ret = childrenFn.call([], 0);
      const emitted = state.stack.pop()!.join('');
      if (emitted) inner += emitted;
      else if (typeof ret === 'string') inner += renderSafeText(ret);
    }

    return `<${tag}${attrStr}>${inner}</${tag}>`;
  }

  function emitElement(rawTagSpec: string, args: unknown[]): string {
    const html = renderElementToString(rawTagSpec, args);
    push(html);
    mark();
    return markSafeHtml(html);
  }

  function openEl(rawTagSpec: string, args: unknown[]) {
    const spec = parseTagSpec(rawTagSpec);
    const { attrs, childrenFn } = parseElArgs(spec.tag, args);
    if (childrenFn) {
      emitElement(rawTagSpec, args);
      return;
    }
    push(`<${spec.tag}${renderAttrs(attrs, spec)}>`);
    state.stack.push([]);
    nameStack.push(spec.tag);
    mark();
  }

  function closeEl() {
    if (state.stack.length <= 1 || nameStack.length === 0) return;
    const tag = nameStack.pop()!;
    const inner = state.stack.pop()!.join('');
    top().push(inner + `</${tag}>`);
    mark();
  }

  /* ─────────────────────────── Page Lifecycle & Head ─────────────────────────── */

  builtins.set('page', { type: 'builtin', call: (args: unknown[]) => {
    const opts = isPlainObject(args[1]) ? args[1] : isPlainObject(args[0]) ? args[0] : {};
    const titleArg = typeof args[0] === 'string' ? args[0] : asStr(opts.title, 'sdev Web App');
    state.title = titleArg;
    state.lang = asStr(opts.lang, 'en');
    state.dir = asStr(opts.dir, 'ltr');
    state.htmlAttrs = isPlainObject(opts.htmlAttrs) ? { ...opts.htmlAttrs } : {};
    state.bodyAttrs = isPlainObject(opts.bodyAttrs) ? { ...opts.bodyAttrs } : {};
    if (opts.class || opts.bodyClass) state.bodyAttrs.class = opts.class ?? opts.bodyClass;
    if (opts.style || opts.bodyStyle) state.bodyAttrs.style = opts.style ?? opts.bodyStyle;
    state.head.length = 0;
    state.stack.length = 0;
    state.stack.push([]);
    state.css.length = 0;
    state.js.length = 0;
    state.moduleJs = [];
    nameStack.length = 0;
    if (typeof opts.theme === 'string') {
      state.theme = opts.theme;
      state.includeUtilities = true;
    } else {
      state.theme = 'plain';
      state.includeUtilities = Boolean(opts.utilities);
    }
    if (typeof opts.description === 'string') {
      state.head.push(`<meta name="description" content="${escapeAttr(opts.description)}">`);
    }
    if (typeof opts.favicon === 'string') {
      state.head.push(`<link rel="icon" href="${escapeAttr(opts.favicon)}">`);
    }
    mark();
    return null;
  }});

  builtins.set('endpage', { type: 'builtin', call: () => {
    while (nameStack.length) closeEl();
    mark();
    return renderWebDocument(state);
  }});

  builtins.set('title', { type: 'builtin', call: (args: unknown[]) => {
    const raw = asStr(args[0], state.title);
    if (state.produced) {
      state.title = raw;
      mark();
    }
    return raw.replace(/\b\w/g, (c) => c.toUpperCase());
  }});

  builtins.set('page_title', { type: 'builtin', call: (args: unknown[]) => {
    state.title = asStr(args[0], state.title);
    mark();
    return state.title;
  }});

  builtins.set('html_lang', { type: 'builtin', call: (args: unknown[]) => {
    state.lang = asStr(args[0], 'en');
    if (args[1]) state.dir = asStr(args[1], 'ltr');
    mark();
    return null;
  }});

  builtins.set('body_class', { type: 'builtin', call: (args: unknown[]) => {
    state.bodyAttrs = state.bodyAttrs ?? {};
    state.bodyAttrs.class = normalizeClassValue(args[0]);
    mark();
    return null;
  }});

  builtins.set('body_attr', { type: 'builtin', call: (args: unknown[]) => {
    state.bodyAttrs = state.bodyAttrs ?? {};
    if (isPlainObject(args[0])) Object.assign(state.bodyAttrs, args[0]);
    else if (args.length >= 2) state.bodyAttrs[asStr(args[0])] = args[1];
    mark();
    return null;
  }});

  builtins.set('web_meta', { type: 'builtin', call: (args: unknown[]) => {
    const desc = asStr(args[0]);
    const favicon = asStr(args[1]);
    if (desc) state.head.push(`<meta name="description" content="${escapeAttr(desc)}">`);
    if (favicon) state.head.push(`<link rel="icon" href="${escapeAttr(favicon)}">`);
    mark();
    return null;
  }});

  builtins.set('meta', { type: 'builtin', call: (args: unknown[]) => {
    let attrs: Record<string, unknown> = {};
    if (isPlainObject(args[0])) {
      attrs = args[0];
    } else if (args.length >= 2) {
      const k = asStr(args[0]);
      if (k.startsWith('og:') || k.startsWith('article:')) attrs = { property: k, content: asStr(args[1]) };
      else attrs = { name: k, content: asStr(args[1]) };
    }
    state.head.push(`<meta${renderAttrs(attrs)}>`);
    mark();
    return null;
  }});

  builtins.set('link', { type: 'builtin', call: (args: unknown[]) => {
    const attrs = isPlainObject(args[0]) ? args[0] : { rel: asStr(args[0]), href: asStr(args[1]) };
    state.head.push(`<link${renderAttrs(attrs)}>`);
    mark();
    return null;
  }});

  builtins.set('stylesheet', { type: 'builtin', call: (args: unknown[]) => {
    state.head.push(`<link rel="stylesheet" href="${escapeAttr(asStr(args[0]))}">`);
    mark();
    return null;
  }});

  builtins.set('favicon', { type: 'builtin', call: (args: unknown[]) => {
    const href = escapeAttr(asStr(args[0]));
    const type = args[1] ? ` type="${escapeAttr(asStr(args[1]))}"` : '';
    state.head.push(`<link rel="icon" href="${href}"${type}>`);
    mark();
    return null;
  }});

  builtins.set('google_font', { type: 'builtin', call: (args: unknown[]) => {
    const families = Array.isArray(args[0]) ? args[0].map((f) => asStr(f)) : [asStr(args[0], 'Inter')];
    const weights = asStr(args[1], '400;500;600;700');
    const query = families
      .map((f) => `family=${encodeURIComponent(f.trim())}:wght@${weights}`)
      .join('&');
    state.head.push(`<link rel="preconnect" href="https://fonts.googleapis.com">`);
    state.head.push(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`);
    state.head.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${query}&display=swap">`);
    mark();
    return null;
  }});

  builtins.set('seo', { type: 'builtin', call: (args: unknown[]) => {
    const opts = isPlainObject(args[0]) ? args[0] : { title: asStr(args[0]), description: asStr(args[1]) };
    if (opts.title) state.title = asStr(opts.title);
    const desc = asStr(opts.description);
    if (desc) {
      state.head.push(`<meta name="description" content="${escapeAttr(desc)}">`);
      state.head.push(`<meta property="og:description" content="${escapeAttr(desc)}">`);
      state.head.push(`<meta name="twitter:description" content="${escapeAttr(desc)}">`);
    }
    state.head.push(`<meta property="og:title" content="${escapeAttr(state.title)}">`);
    state.head.push(`<meta name="twitter:title" content="${escapeAttr(state.title)}">`);
    state.head.push(`<meta property="og:type" content="${escapeAttr(asStr(opts.type, 'website'))}">`);
    state.head.push(`<meta name="twitter:card" content="${escapeAttr(asStr(opts.twitterCard, 'summary_large_image'))}">`);
    if (opts.url || opts.canonical) {
      const url = escapeAttr(asStr(opts.url ?? opts.canonical));
      state.head.push(`<link rel="canonical" href="${url}">`);
      state.head.push(`<meta property="og:url" content="${url}">`);
    }
    if (opts.image) {
      const img = escapeAttr(asStr(opts.image));
      state.head.push(`<meta property="og:image" content="${img}">`);
      state.head.push(`<meta name="twitter:image" content="${img}">`);
    }
    if (opts.themeColor) {
      state.head.push(`<meta name="theme-color" content="${escapeAttr(asStr(opts.themeColor))}">`);
    }
    mark();
    return null;
  }});

  builtins.set('external_script', { type: 'builtin', call: (args: unknown[]) => {
    const src = asStr(args[0]);
    const extra = isPlainObject(args[1]) ? args[1] : {};
    state.head.push(`<script src="${escapeAttr(src)}"${renderAttrs(extra)}></script>`);
    mark();
    return null;
  }});

  builtins.set('import_map', { type: 'builtin', call: (args: unknown[]) => {
    const imports = isPlainObject(args[0]) ? args[0] : {};
    const payload = JSON.stringify({ imports }, null, 2);
    state.head.push(`<script type="importmap">\n${payload}\n</script>`);
    mark();
    return null;
  }});

  builtins.set('head_raw', { type: 'builtin', call: (args: unknown[]) => {
    state.head.push(stripSafeMarkers(asStr(args[0])));
    mark();
    return null;
  }});

  /* ─────────────────────────── Generic & Inline Builders ─────────────────────────── */

  builtins.set('tag', { type: 'builtin', call: (args: unknown[]) => {
    const name = asStr(args[0], 'div');
    return emitElement(name, args.slice(1));
  }});

  builtins.set('el', { type: 'builtin', call: (args: unknown[]) => {
    const name = asStr(args[0], 'span');
    return markSafeHtml(renderElementToString(name, args.slice(1)));
  }});

  builtins.set('raw', { type: 'builtin', call: (args: unknown[]) => {
    return markSafeHtml(asStr(args[0]));
  }});

  builtins.set('text_node', { type: 'builtin', call: (args: unknown[]) => {
    push(renderSafeText(asStr(args[0])));
    mark();
    return null;
  }});

  builtins.set('comment_html', { type: 'builtin', call: (args: unknown[]) => {
    push(`<!-- ${asStr(args[0]).replace(/-->/g, '--&gt;')} -->`);
    mark();
    return null;
  }});

  builtins.set('markdown', { type: 'builtin', call: (args: unknown[]) => {
    const md = asStr(args[0]);
    const attrs = isPlainObject(args[1]) ? args[1] : { class: 'prose' };
    const html = `<div${renderAttrs(attrs)}>${parseSimpleMarkdown(md)}</div>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('md_html', { type: 'builtin', call: (args: unknown[]) => {
    return markSafeHtml(parseSimpleMarkdown(asStr(args[0])));
  }});

  builtins.set('open', { type: 'builtin', call: (args: unknown[]) => {
    const name = asStr(args[0], 'div');
    openEl(name, args.slice(1));
    return null;
  }});

  builtins.set('close', { type: 'builtin', call: () => {
    closeEl();
    return null;
  }});

  /* ─────────────────────────── Icons & SVG Builders ─────────────────────────── */

  builtins.set('icon', { type: 'builtin', call: (args: unknown[]) => {
    const name = asStr(args[0], 'sparkles');
    const cls = typeof args[1] === 'string' ? args[1] : isPlainObject(args[1]) ? normalizeClassValue(args[1].class) || 'sdev-icon' : 'sdev-icon';
    const extraObj = isPlainObject(args[1]) ? { ...args[1], class: undefined } : {};
    const svg = renderIconSvg(name, renderAttrs(extraObj), cls);
    push(svg);
    mark();
    return markSafeHtml(svg);
  }});

  builtins.set('inline_icon', { type: 'builtin', call: (args: unknown[]) => {
    const name = asStr(args[0], 'sparkles');
    const cls = typeof args[1] === 'string' ? args[1] : isPlainObject(args[1]) ? normalizeClassValue(args[1].class) || 'sdev-icon' : 'sdev-icon';
    const extraObj = isPlainObject(args[1]) ? { ...args[1], class: undefined } : {};
    return markSafeHtml(renderIconSvg(name, renderAttrs(extraObj), cls));
  }});

  builtins.set('web_icon_svg', { type: 'builtin', call: (args: unknown[]) => {
    const name = asStr(args[0], 'sparkles');
    const cls = asStr(args[1], 'sdev-icon');
    return markSafeHtml(callSdevWeb('web_icon_svg', [name, cls]));
  }});

  builtins.set('svg_path', { type: 'builtin', call: (args: unknown[]) => {
    const d = asStr(args[0]);
    const attrs = isPlainObject(args[1]) ? { d, ...args[1] } : { d };
    const html = `<path${renderAttrs(attrs)}/>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('svg_circle', { type: 'builtin', call: (args: unknown[]) => {
    const [cx, cy, r] = [args[0] ?? 12, args[1] ?? 12, args[2] ?? 10];
    const extra = isPlainObject(args[3]) ? args[3] : {};
    const html = `<circle${renderAttrs({ cx, cy, r, ...extra })}/>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('svg_rect', { type: 'builtin', call: (args: unknown[]) => {
    const [x, y, width, height] = [args[0] ?? 0, args[1] ?? 0, args[2] ?? 24, args[3] ?? 24];
    const extra = isPlainObject(args[4]) ? args[4] : {};
    const html = `<rect${renderAttrs({ x, y, width, height, ...extra })}/>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('svg_line', { type: 'builtin', call: (args: unknown[]) => {
    const [x1, y1, x2, y2] = [args[0] ?? 0, args[1] ?? 0, args[2] ?? 24, args[3] ?? 24];
    const extra = isPlainObject(args[4]) ? args[4] : {};
    const html = `<line${renderAttrs({ x1, y1, x2, y2, ...extra })}/>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('svg_polygon', { type: 'builtin', call: (args: unknown[]) => {
    const points = Array.isArray(args[0]) ? args[0].join(' ') : asStr(args[0]);
    const extra = isPlainObject(args[1]) ? args[1] : {};
    const html = `<polygon${renderAttrs({ points, ...extra })}/>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('svg_text', { type: 'builtin', call: (args: unknown[]) => {
    const [txt, x, y] = [asStr(args[0]), args[1] ?? 0, args[2] ?? 12];
    const extra = isPlainObject(args[3]) ? args[3] : {};
    const html = `<text${renderAttrs({ x, y, ...extra })}>${escapeHtml(txt)}</text>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('svg_g', { type: 'builtin', call: (args: unknown[]) => {
    return emitElement('g', args);
  }});

  /* ─────────────────────────── CSS, Themes & Media Queries ─────────────────────────── */

  builtins.set('style', { type: 'builtin', call: (args: unknown[]) => {
    if (args.length === 1 && typeof args[0] === 'string') {
      state.css.push(args[0]);
    } else if (args.length === 1 && isPlainObject(args[0])) {
      for (const [sel, rules] of Object.entries(args[0])) {
        if (isPlainObject(rules)) state.css.push(cssRuleFromDict(sel, rules));
      }
    } else {
      const selector = asStr(args[0], '*');
      const dict = isPlainObject(args[1]) ? args[1] : {};
      state.css.push(cssRuleFromDict(selector, dict));
    }
    mark();
    return null;
  }});

  builtins.set('styles', { type: 'builtin', call: (args: unknown[]) => {
    const sheet = isPlainObject(args[0]) ? args[0] : {};
    for (const [sel, rules] of Object.entries(sheet)) {
      if (isPlainObject(rules)) state.css.push(cssRuleFromDict(sel, rules));
      else if (typeof rules === 'string') state.css.push(`${sel} { ${rules} }`);
    }
    mark();
    return null;
  }});

  builtins.set('css_vars', { type: 'builtin', call: (args: unknown[]) => {
    const vars = isPlainObject(args[0]) ? args[0] : {};
    const selector = asStr(args[1], ':root');
    const flat: Record<string, string> = {};
    for (const [k, v] of Object.entries(vars)) flat[k] = asStr(v);
    state.css.push(callSdevWeb('web_css_vars_for', [flat, selector]));
    mark();
    return null;
  }});

  builtins.set('css_var', { type: 'builtin', call: (args: unknown[]) => {
    return callSdevWeb('web_css_var', [asStr(args[0]), args.length >= 2 ? asStr(args[1]) : '']);
  }});

  builtins.set('media', { type: 'builtin', call: (args: unknown[]) => {
    const bp = asStr(args[0], 'md');
    const bodyArg = args[1];
    if (isPlainObject(bodyArg)) {
      const inner = Object.entries(bodyArg)
        .map(([sel, dict]) => (isPlainObject(dict) ? cssRuleFromDict(sel, dict) : `${sel} { ${asStr(dict)} }`))
        .join('\n');
      state.css.push(callSdevWeb('web_media_rule', [bp, inner]));
    } else if (isFunction(bodyArg)) {
      const prevLen = state.css.length;
      bodyArg.call([], 0);
      const captured = state.css.splice(prevLen).join('\n');
      state.css.push(callSdevWeb('web_media_rule', [bp, captured]));
    } else if (typeof bodyArg === 'string') {
      state.css.push(callSdevWeb('web_media_rule', [bp, bodyArg]));
    }
    mark();
    return null;
  }});

  builtins.set('keyframes', { type: 'builtin', call: (args: unknown[]) => {
    const name = asStr(args[0], 'kf');
    const steps = isPlainObject(args[1]) ? args[1] : {};
    const stepNames: string[] = [];
    const stepTomes: Record<string, string>[] = [];
    for (const [k, v] of Object.entries(steps)) {
      if (!isPlainObject(v)) continue;
      const flat: Record<string, string> = {};
      for (const [p, pv] of Object.entries(v)) flat[p] = stripSafeMarkers(asStr(pv));
      stepNames.push(k);
      stepTomes.push(flat);
    }
    state.css.push(callSdevWeb('web_keyframes_steps', [name, stepNames, stepTomes]));
    mark();
    return null;
  }});

  builtins.set('font_face', { type: 'builtin', call: (args: unknown[]) => {
    const family = asStr(args[0]);
    const src = asStr(args[1]);
    const extra = isPlainObject(args[2]) ? args[2] : {};
    const flatExtra: Record<string, string> = {};
    for (const [k, v] of Object.entries(extra)) flatExtra[k] = asStr(v);
    state.css.push(callSdevWeb('web_font_face_rule', [family, src, flatExtra]));
    mark();
    return null;
  }});

  builtins.set('theme', { type: 'builtin', call: (args: unknown[]) => {
    const arg0 = args[0];
    state.includeUtilities = true;
    if (typeof arg0 === 'string') {
      const name = arg0.trim().toLowerCase();
      if (name === 'sdev' || name === 'sdev-dark' || name === 'dark') {
        state.theme = 'sdev-dark';
      } else if (name === 'sdev-light' || name === 'light') {
        state.theme = 'sdev-light';
      } else if (name === 'glass' || name === 'liquid-glass') {
        state.theme = 'glass';
      } else if (name === 'cyberpunk' || name === 'neon') {
        state.theme = 'cyberpunk';
      } else {
        state.theme = name;
      }
      if (isPlainObject(args[1])) {
        builtins.get('css_vars')!.call([args[1]], 0);
      }
    } else if (isPlainObject(arg0)) {
      state.theme = 'sdev-dark';
      builtins.get('css_vars')!.call([arg0], 0);
    }
    mark();
    return null;
  }});

  builtins.set('use_utilities', { type: 'builtin', call: () => {
    enableDesignSystem();
    mark();
    return null;
  }});

  /* ─────────────────────────── JavaScript, Events & sdevToJs ─────────────────────────── */

  builtins.set('sdev_to_js', { type: 'builtin', call: (args: unknown[]) => {
    const arg = args[0];
    if (isFunction(arg)) {
      const res = sdevFuncToJs(arg);
      return res ? res.fullFn : '';
    }
    return sdevSourceToJs(asStr(arg));
  }});

  builtins.set('script', { type: 'builtin', call: (args: unknown[]) => {
    const arg0 = args[0];
    const attrs = isPlainObject(args[1]) ? args[1] : {};
    let code = '';
    if (isFunction(arg0)) {
      const res = sdevFuncToJs(arg0);
      code = res ? res.body : compileHandlerCode(arg0, []);
    } else {
      code = asStr(arg0);
    }
    if (attrs.type === 'module') {
      state.moduleJs = state.moduleJs ?? [];
      state.moduleJs.push(code);
    } else {
      state.js.push(code);
    }
    mark();
    return null;
  }});

  builtins.set('script_module', { type: 'builtin', call: (args: unknown[]) => {
    state.moduleJs = state.moduleJs ?? [];
    const arg0 = args[0];
    const code = isFunction(arg0) ? (sdevFuncToJs(arg0)?.body ?? '') : asStr(arg0);
    state.moduleJs.push(code);
    mark();
    return null;
  }});

  builtins.set('client_fn', { type: 'builtin', call: (args: unknown[]) => {
    if (isFunction(args[0])) {
      const res = sdevFuncToJs(args[0]);
      if (res) state.js.push(`window.${res.name} = ${res.fullFn};`);
      mark();
      return null;
    }
    const name = asStr(args[0], 'fn');
    if (args.length >= 3 && typeof args[1] === 'string' && typeof args[2] === 'string') {
      state.js.push(callSdevWeb('web_client_fn_js', [name, asStr(args[1]), asStr(args[2])]));
      mark();
      return null;
    }
    const fnOrBody = args[1];
    if (isFunction(fnOrBody)) {
      const res = sdevFuncToJs(fnOrBody, name);
      if (res) {
        state.js.push(`function ${name}(${res.params.join(', ')}) {\n${res.body}\n}\nwindow.${name} = ${name};`);
      }
    } else {
      state.js.push(callSdevWeb('web_client_fn_js', [name, '', asStr(fnOrBody)]));
    }
    mark();
    return null;
  }});

  builtins.set('onclick', { type: 'builtin', call: (args: unknown[]) => {
    const sel = asStr(args[0]);
    const code = compileHandlerCode(args[1], ['event', 'el']);
    state.js.push(`document.querySelectorAll(${JSON.stringify(sel)}).forEach(el => el.addEventListener('click', (event) => { ${code} }));`);
    mark();
    return null;
  }});

  builtins.set('on', { type: 'builtin', call: (args: unknown[]) => {
    const evt = asStr(args[0]);
    const sel = asStr(args[1]);
    const code = compileHandlerCode(args[2], ['event', 'el']);
    const opts = isPlainObject(args[3]) ? `, ${JSON.stringify(args[3])}` : '';
    if (sel === 'window') {
      state.js.push(`window.addEventListener(${JSON.stringify(evt)}, (event) => { const el = window; ${code} }${opts});`);
    } else if (sel === 'document') {
      state.js.push(`document.addEventListener(${JSON.stringify(evt)}, (event) => { const el = document; ${code} }${opts});`);
    } else {
      state.js.push(`document.querySelectorAll(${JSON.stringify(sel)}).forEach(el => el.addEventListener(${JSON.stringify(evt)}, (event) => { ${code} }${opts}));`);
    }
    mark();
    return null;
  }});

  builtins.set('on_ready', { type: 'builtin', call: (args: unknown[]) => {
    const code = compileHandlerCode(args[0], []);
    state.js.push(`if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', () => { ${code} }); } else { ${code} }`);
    mark();
    return null;
  }});

  builtins.set('on_scroll', { type: 'builtin', call: (args: unknown[]) => {
    const code = compileHandlerCode(args[0], ['scrollY', 'progress']);
    state.js.push(`(function() {
  let raf = 0;
  const run = () => {
    const scrollY = window.scrollY;
    const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(scrollY / max, 0), 1);
    ${code}
  };
  window.addEventListener('scroll', () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); }, { passive: true });
  run();
})();`);
    mark();
    return null;
  }});

  builtins.set('on_intersect', { type: 'builtin', call: (args: unknown[]) => {
    const sel = asStr(args[0], '.reveal');
    const handler = args[1];
    if (handler === undefined || typeof handler === 'string') {
      const cls = asStr(handler, 'is-visible');
      const r = callSdevWebWithDoc('scroll_reveal', []);
      let js = r.js;
      if (sel !== '.reveal') js = js.replace("'.reveal'", JSON.stringify(sel));
      if (cls !== 'is-visible') js = js.replace("'is-visible'", JSON.stringify(cls));
      state.js.push(js);
    } else {
      const code = compileHandlerCode(handler, ['el', 'entry']);
      state.js.push(`(function() {
  const els = document.querySelectorAll(${JSON.stringify(sel)});
  if (!els.length || typeof IntersectionObserver === 'undefined') return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        ${code}
        io.unobserve(el);
      }
    });
  }, { threshold: 0.15 });
  els.forEach((el) => io.observe(el));
})();`);
    }
    mark();
    return null;
  }});

  builtins.set('on_keydown', { type: 'builtin', call: (args: unknown[]) => {
    if (args.length === 1) {
      const code = compileHandlerCode(args[0], ['event']);
      state.js.push(`window.addEventListener('keydown', (event) => { ${code} });`);
    } else {
      const combo = asStr(args[0]).toLowerCase();
      const code = compileHandlerCode(args[1], ['event']);
      state.js.push(`window.addEventListener('keydown', (event) => {
  if (event.repeat || event.isComposing) return;
  const wantCtrl = ${combo.includes('ctrl+') || combo.includes('cmd+') || combo.includes('meta+')};
  const key = ${JSON.stringify(combo.split('+').pop() || '')};
  if (wantCtrl && !(event.ctrlKey || event.metaKey)) return;
  if (key && event.key.toLowerCase() !== key) return;
  ${code}
});`);
    }
    mark();
    return null;
  }});

  builtins.set('set_interval', { type: 'builtin', call: (args: unknown[]) => {
    const code = compileHandlerCode(args[0], []);
    const ms = Number(args[1] ?? 1000);
    state.js.push(`setInterval(() => { ${code} }, ${ms});`);
    mark();
    return null;
  }});

  builtins.set('set_timeout', { type: 'builtin', call: (args: unknown[]) => {
    const code = compileHandlerCode(args[0], []);
    const ms = Number(args[1] ?? 500);
    state.js.push(`setTimeout(() => { ${code} }, ${ms});`);
    mark();
    return null;
  }});

  /* ─────────────────────────── Reactive State & DOM Primitives ─────────────────────────── */

  builtins.set('web_state', { type: 'builtin', call: (args: unknown[]) => {
    const initial = isPlainObject(args[0]) ? args[0] : {};
    state.js.unshift(`window.$sdev && window.$sdev.initState(${JSON.stringify(initial)});`);
    mark();
    return initial;
  }});

  builtins.set('state_set', { type: 'builtin', call: (args: unknown[]) => {
    state.js.push(`window.$sdev && window.$sdev.stateSet(${JSON.stringify(asStr(args[0]))}, ${JSON.stringify(args[1] ?? null)});`);
    mark();
    return null;
  }});

  builtins.set('state_get', { type: 'builtin', call: (args: unknown[]) => {
    return args[1] ?? null;
  }});

  // Top-level DOM manipulation helpers (also mapped inside sdevToJs)
  const domHelpers: Array<[string, string]> = [
    ['dom_text', 'text'],
    ['dom_set_text', 'text'],
    ['dom_html', 'html'],
    ['dom_set_html', 'html'],
    ['dom_val', 'val'],
    ['dom_value', 'val'],
    ['dom_set_val', 'val'],
    ['dom_attr', 'attr'],
    ['dom_set_attr', 'attr'],
    ['dom_style', 'style'],
    ['dom_css_var', 'cssVar'],
    ['dom_add_class', 'addClass'],
    ['dom_remove_class', 'removeClass'],
    ['dom_toggle_class', 'toggleClass'],
    ['dom_show', 'show'],
    ['dom_hide', 'hide'],
    ['dom_toggle', 'toggle'],
    ['dom_append', 'append'],
    ['dom_remove', 'remove'],
    ['dom_scroll_to', 'scrollTo'],
    ['clipboard_copy', 'copy'],
    ['storage_set', 'storageSet'],
    ['navigate_route', 'navigate'],
    ['toast', 'toast'],
    ['toast_notify', 'toast'],
    ['open_modal', 'openModal'],
    ['close_modal', 'closeModal'],
  ];

  for (const [sdevName, method] of domHelpers) {
    builtins.set(sdevName, {
      type: 'builtin',
      call: (args: unknown[]) => {
        const serialized = args.map((a) => JSON.stringify(a)).join(', ');
        state.js.push(`window.$sdev && window.$sdev.${method}(${serialized});`);
        mark();
        return null;
      },
    });
  }

  /* ─────────────────────────── Motion, 3D & SDEV Website Engines ─────────────────────────── */

  builtins.set('scroll_driver', { type: 'builtin', call: () => {
    enableDesignSystem();
    const r = callSdevWebWithDoc('scroll_driver', []);
    if (r.js) state.js.push(r.js);
    mark();
    return null;
  }});

  builtins.set('scroll_reveal', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const sel = asStr(args[0], '.reveal');
    const cls = asStr(args[1], 'is-visible');
    const r = callSdevWebWithDoc('scroll_reveal', []);
    let js = r.js;
    if (sel !== '.reveal') js = js.replace("'.reveal'", JSON.stringify(sel));
    if (cls !== 'is-visible') js = js.replace("'is-visible'", JSON.stringify(cls));
    state.js.push(js);
    mark();
    return null;
  }});

  builtins.set('count_up', { type: 'builtin', call: (args: unknown[]) => {
    const sel = asStr(args[0], '[data-count]');
    const r = callSdevWebWithDoc('count_up', []);
    let js = r.js;
    if (sel !== '[data-count]') js = js.replace("'[data-count]'", JSON.stringify(sel));
    state.js.push(js);
    mark();
    return null;
  }});

  builtins.set('pointer_spotlight', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const sel = asStr(args[0], '.bento');
    const r = callSdevWebWithDoc('pointer_spotlight', []);
    let js = r.js;
    if (sel !== '.bento') js = js.replace("'.bento'", JSON.stringify(sel));
    state.js.push(js);
    mark();
    return null;
  }});

  builtins.set('hero_demo_html', { type: 'builtin', call: () => {
    enableDesignSystem();
    const r = callSdevWebWithDoc('hero_demo_html', []);
    if (r.js) state.js.push(r.js);
    mark();
    return markSafeHtml(r.ret);
  }});

  builtins.set('hero_demo_widget', { type: 'builtin', call: () => {
    enableDesignSystem();
    const r = callSdevWebWithDoc('hero_demo_html', []);
    push(r.ret);
    if (r.js) state.js.push(r.js);
    mark();
    return markSafeHtml(r.ret);
  }});

  builtins.set('compiler_scene_3d', { type: 'builtin', call: () => {
    enableDesignSystem();
    const r = callSdevWebWithDoc('compiler_scene_3d', []);
    push(r.html);
    if (r.js) state.js.push(r.js);
    mark();
    return markSafeHtml(r.html);
  }});

  builtins.set('three_scene', builtins.get('compiler_scene_3d')!);

  builtins.set('sdev_playground', { type: 'builtin', call: () => {
    enableDesignSystem();
    const r = callSdevWebWithDoc('sdev_playground', []);
    push(r.html);
    if (r.js) state.js.push(r.js);
    mark();
    return markSafeHtml(r.html);
  }});

  builtins.set('canvas_2d', { type: 'builtin', call: (args: unknown[]) => {
    const id = typeof args[0] === 'string' ? args[0] : 'sdev-canvas-' + (++inlineHandlerSeq);
    const width = Number(args[1] ?? 400);
    const height = Number(args[2] ?? 300);
    const drawCode = compileHandlerCode(args[3], ['ctx', 'canvas']);
    const html = `<canvas id="${escapeAttr(id)}" width="${width}" height="${height}"></canvas>`;
    push(html);
    state.js.push(`(function() {
  const canvas = document.getElementById(${JSON.stringify(id)});
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ${drawCode}
})();`);
    mark();
    return markSafeHtml(html);
  }});

  /* ─────────────────────────── High-Level Web Components & Routing ─────────────────────────── */

  builtins.set('route', { type: 'builtin', call: (args: unknown[]) => {
    const path = asStr(args[0], '/');
    const isDefault = path === '/' || path === 'home' || Boolean((isPlainObject(args[1]) ? args[1] : {}).default);
    const extraAttrs = isPlainObject(args[1]) ? args[1] : {};
    const fn = isFunction(args[1]) ? args[1] : isFunction(args[2]) ? args[2] : undefined;
    const viewAttrs: Record<string, unknown> = {
      ...extraAttrs,
      'data-route-view': path,
      'data-active': isDefault ? 'true' : 'false',
      style: isDefault ? undefined : 'display: none',
    };
    return emitElement('div', [viewAttrs, fn]);
  }});

  builtins.set('open_route', { type: 'builtin', call: (args: unknown[]) => {
    const path = asStr(args[0], '/');
    const isDefault = path === '/' || path === 'home';
    openEl('div', [{
      'data-route-view': path,
      'data-active': isDefault ? 'true' : 'false',
      style: isDefault ? undefined : 'display: none',
    }]);
    return null;
  }});

  builtins.set('end_route', { type: 'builtin', call: () => { closeEl(); return null; }});

  builtins.set('router_link', { type: 'builtin', call: (args: unknown[]) => {
    const path = asStr(args[0], '/');
    const label = asStr(args[1], path);
    const extra = isPlainObject(args[2]) ? args[2] : { class: 'nav-link' };
    return emitElement('a', [label, { href: path, 'data-route': path, ...extra }]);
  }});

  builtins.set('route_view', { type: 'builtin', call: (args: unknown[]) => {
    const r = callSdevWebWithDoc('route_view', [asStr(args[0], '/'), Number(args[1] ?? 1), stripSafeMarkers(asStr(args[2], ''))]);
    push(r.html);
    mark();
    return markSafeHtml(r.html);
  }});

  builtins.set('navbar', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    if (args.length >= 4 && typeof args[1] === 'string' && Array.isArray(args[2])) {
      const r = callSdevWebWithDoc('navbar', [
        asStr(args[0], 'sdev'),
        asStr(args[1], ''),
        args[2],
        stripSafeMarkers(asStr(args[3], '')),
      ]);
      push(r.html);
      mark();
      return markSafeHtml(r.html);
    }
    const brandArg = args[0];
    const linksArg = Array.isArray(args[1]) ? args[1] : [];
    const actionsArg = args[2];
    const extraAttrs = isPlainObject(args[3]) ? args[3] : {};

    const brandTitle = isPlainObject(brandArg) ? asStr(brandArg.name ?? brandArg.title, 'sdev') : asStr(brandArg, 'sdev');
    const brandHref = isPlainObject(brandArg) ? asStr(brandArg.href, '/') : '/';
    const logoSvg = renderIconSvg('sdev-logo', '', 'w-7 h-7');

    const linksHtml = linksArg
      .map((item) => {
        if (isPlainObject(item)) {
          const label = escapeHtml(asStr(item.label ?? item.title ?? item.name));
          const href = asStr(item.href ?? item.to ?? '#');
          const onclick = item.onclick ? ` onclick="${escapeAttr(asStr(item.onclick))}"` : '';
          const routeAttr = item.route ? ` data-route="${escapeAttr(asStr(item.route))}"` : '';
          return `<a href="${escapeAttr(href)}" class="nav-link"${routeAttr}${onclick}>${label}</a>`;
        }
        const s = asStr(item);
        return `<a href="#${escapeAttr(s.toLowerCase().replace(/\s+/g, '-'))}" class="nav-link">${escapeHtml(s)}</a>`;
      })
      .join('');

    let actionsHtml = '';
    if (isFunction(actionsArg)) {
      state.stack.push([]);
      actionsArg.call([], 0);
      actionsHtml = state.stack.pop()!.join('');
    } else if (Array.isArray(actionsArg)) {
      actionsHtml = actionsArg
        .map((act) => {
          if (isPlainObject(act)) {
            const lbl = escapeHtml(asStr(act.label ?? act.title, 'Action'));
            const href = escapeAttr(asStr(act.href, '#'));
            const variant = asStr(act.variant, 'primary');
            return `<a href="${href}" class="btn btn-${variant} btn-sm">${lbl}</a>`;
          }
          return renderSafeText(asStr(act));
        })
        .join('');
    }

    const html = `
<header class="site-nav"${renderAttrs(extraAttrs)}>
  <nav class="nav-inner">
    <div class="flex items-center gap-8">
      <a href="${escapeAttr(brandHref)}" class="flex items-center gap-2.5">
        ${logoSvg}
        <span class="text-lg font-display text-foreground">${escapeHtml(brandTitle)}</span>
      </a>
      <div class="hidden md:flex items-center gap-1 text-sm">${linksHtml}</div>
    </div>
    <div class="flex items-center gap-2">${actionsHtml}</div>
  </nav>
  <div class="reading-progress" aria-hidden="true"></div>
</header>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('hero_section', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    if (typeof args[0] === 'string' && args.length >= 4) {
      const r = callSdevWebWithDoc('hero_section', [
        asStr(args[0]),
        stripSafeMarkers(asStr(args[1])),
        asStr(args[2]),
        stripSafeMarkers(asStr(args[3])),
        stripSafeMarkers(asStr(args[4], '')),
      ]);
      push(r.html);
      mark();
      return markSafeHtml(r.html);
    }
    const opts = isPlainObject(args[0]) ? args[0] : { title: asStr(args[0]), subtitle: asStr(args[1]) };
    const visualFn = isFunction(args[1]) ? args[1] : isFunction(args[2]) ? args[2] : undefined;

    const badge = opts.badge
      ? `<div class="enter pill mb-7"><span class="badge-dot"></span>${renderSafeText(asStr(opts.badge))}</div>`
      : '';
    const titleHtml = opts.highlight
      ? `${renderSafeText(asStr(opts.title))}<br><span class="text-primary">${renderSafeText(asStr(opts.highlight))}</span>`
      : renderSafeText(asStr(opts.title, 'Write in plain words.'));
    const subHtml = opts.subtitle
      ? `<p class="enter hero-sub" style="animation-delay:120ms">${renderSafeText(asStr(opts.subtitle))}</p>`
      : '';

    const primaryCta = opts.primaryCta
      ? isPlainObject(opts.primaryCta)
        ? `<a href="${escapeAttr(asStr(opts.primaryCta.href, '#'))}" class="btn btn-primary btn-lg">${escapeHtml(asStr(opts.primaryCta.label, 'Get Started'))} ${renderIconSvg('arrow-right')}</a>`
        : `<a href="#playground" class="btn btn-primary btn-lg">${escapeHtml(asStr(opts.primaryCta))} ${renderIconSvg('arrow-right')}</a>`
      : '';
    const secondaryCta = opts.secondaryCta
      ? isPlainObject(opts.secondaryCta)
        ? `<a href="${escapeAttr(asStr(opts.secondaryCta.href, '#playground'))}" class="btn btn-outline btn-lg">${renderIconSvg('play')} ${escapeHtml(asStr(opts.secondaryCta.label, 'Try it here'))}</a>`
        : `<a href="#playground" class="btn btn-outline btn-lg">${renderIconSvg('play')} ${escapeHtml(asStr(opts.secondaryCta))}</a>`
      : '';
    const cliCmd = opts.cli
      ? `<button type="button" onclick="window.$sdev.copy(${escapeAttr(JSON.stringify(asStr(opts.cli)))}); window.$sdev.toast('Copied CLI command')" class="enter hero-cli" style="animation-delay:240ms"><span class="text-primary">$</span> ${escapeHtml(asStr(opts.cli))} ${renderIconSvg('copy', '', 'w-3.5 h-3.5')}</button>`
      : '';

    let visualHtml = '';
    if (visualFn) {
      state.stack.push([]);
      visualFn.call([], 0);
      visualHtml = state.stack.pop()!.join('');
    } else if (opts.demo !== false) {
      const demoWidget = callSdevWebWithDoc('hero_demo_html', []);
      visualHtml = demoWidget.ret;
      if (demoWidget.js) state.js.push(demoWidget.js);
    }

    const html = `
<section class="hero">
  <div class="hero-grid" aria-hidden="true"></div>
  <div class="hero-inner">
    <div class="hero-copy">
      ${badge}
      <h1 class="enter hero-title" style="animation-delay:60ms">${titleHtml}</h1>
      ${subHtml}
      <div class="enter hero-actions" style="animation-delay:180ms">${primaryCta}${secondaryCta}</div>
      ${cliCmd}
    </div>
    <div class="hero-visual enter" style="animation-delay:200ms">${visualHtml}</div>
  </div>
</section>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('stat_card_html', { type: 'builtin', call: (args: unknown[]) => {
    return markSafeHtml(callSdevWeb('stat_card_html', [asStr(args[0]), asStr(args[1]), asStr(args[2])]));
  }});

  builtins.set('stat_band', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const stats = Array.isArray(args[0]) ? args[0] : [];
    const itemsHtml = stats
      .map((s) => {
        if (!isPlainObject(s)) return '';
        const val = asStr(s.value ?? s.v ?? '0');
        const label = asStr(s.label ?? s.l ?? '');
        const desc = asStr(s.description ?? s.desc ?? s.d ?? '');
        return `<div class="stat"><dt class="stat-label">${escapeHtml(label)}</dt><dd class="stat-num" data-count="${escapeAttr(val)}">${escapeHtml(val)}</dd><dd class="stat-desc">${escapeHtml(desc)}</dd></div>`;
      })
      .join('');
    const html = `<div class="stats-band"><dl class="stats-grid">${itemsHtml}</dl></div>`;
    push(html);
    const cu = callSdevWebWithDoc('count_up', []);
    if (cu.js) state.js.push(cu.js);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('feature_card_html', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    return markSafeHtml(callSdevWeb('feature_card_html', [
      asStr(args[0]),
      asStr(args[1]),
      asStr(args[2], 'sparkles'),
      Number(args[3] ?? 2),
      stripSafeMarkers(asStr(args[4], '')),
    ]));
  }});

  builtins.set('bento_grid', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const ps = callSdevWebWithDoc('pointer_spotlight', []);
    if (ps.js) state.js.push(ps.js);
    if (typeof args[0] === 'string') {
      const r = callSdevWebWithDoc('bento_grid', [stripSafeMarkers(args[0])]);
      push(r.html);
      mark();
      return markSafeHtml(r.html);
    }
    const extra = isPlainObject(args[0]) ? args[0] : isPlainObject(args[1]) ? args[1] : {};
    const cls = normalizeClassValue(extra.class);
    const mergedAttrs = { ...extra, class: `bento-grid ${cls}`.trim() };
    const fnOrList = isFunction(args[0]) ? args[0] : Array.isArray(args[0]) ? args[0] : args[1];
    return emitElement('div', [mergedAttrs, fnOrList]);
  }});

  builtins.set('code_card_html', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    return markSafeHtml(callSdevWeb('code_card_html', [asStr(args[0], 'program.sdev'), asStr(args[1], '')]));
  }});

  builtins.set('feature_card', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    if (isPlainObject(args[0])) {
      const o = args[0];
      const title = asStr(o.title);
      const body = asStr(o.body ?? o.description);
      const iconName = asStr(o.icon, 'sparkles');
      const span = Number(o.span ?? 2);
      const extraFn = isFunction(args[1]) ? args[1] : isFunction(o.children) ? o.children : undefined;
      let extraHtml = '';
      if (extraFn) {
        state.stack.push([]);
        extraFn.call([], 0);
        extraHtml = state.stack.pop()!.join('');
      }
      const html = `<article class="feature reveal md:col-span-${span}">
  <span class="text-primary">${renderIconSvg(iconName, '', 'w-5 h-5')}</span>
  <h3 class="mt-5 text-xl">${renderSafeText(title)}</h3>
  <p class="mt-2 text-muted-foreground">${renderSafeText(body)}</p>
  ${extraHtml}
</article>`;
      push(html);
      mark();
      return markSafeHtml(html);
    }
    const title = asStr(args[0]);
    const body = asStr(args[1]);
    const iconName = typeof args[2] === 'string' ? args[2] : 'sparkles';
    const attrs = isPlainObject(args[3]) ? args[3] : isPlainObject(args[2]) ? args[2] : {};
    const extraFn = isFunction(args[4]) ? args[4] : isFunction(args[3]) ? args[3] : undefined;
    const span = Number(attrs.span ?? 2);
    delete attrs.span;
    let extraHtml = '';
    if (extraFn) {
      state.stack.push([]);
      extraFn.call([], 0);
      extraHtml = state.stack.pop()!.join('');
    }
    const cls = normalizeClassValue(attrs.class) || `feature reveal md:col-span-${span}`;
    const html = `<article${renderAttrs({ ...attrs, class: cls })}>
  <span class="text-primary">${renderIconSvg(iconName, '', 'w-5 h-5')}</span>
  <h3 class="mt-5 text-xl">${renderSafeText(title)}</h3>
  <p class="mt-2 text-muted-foreground">${renderSafeText(body)}</p>
  ${extraHtml}
</article>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('code_card', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const title = asStr(args[0], 'program.sdev');
    const code = asStr(args[1], '');
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    if (Object.keys(attrs).length === 0) {
      const r = callSdevWebWithDoc('code_card', [title, code]);
      push(r.html);
      mark();
      return markSafeHtml(r.html);
    }
    const r = callSdevWebWithDoc('code_card', [title, code]);
    const html = r.html.replace('<div ', `<div${renderAttrs(attrs)} `);
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('tabs_component', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const id = asStr(args[0], 'tabs-' + (++inlineHandlerSeq));
    const tabs = Array.isArray(args[1]) ? args[1] : [];
    const normTabs = tabs
      .filter((t): t is Record<string, unknown> => isPlainObject(t))
      .map((t, idx) => {
        const key = asStr(t.id ?? t.key ?? `tab-${idx}`);
        const label = asStr(t.label ?? t.title ?? key);
        let contentStr = '';
        if (isFunction(t.content)) {
          state.stack.push([]);
          t.content.call([], 0);
          contentStr = `\x01${state.stack.pop()!.join('')}\x02`;
        } else {
          contentStr = asStr(t.content ?? t.body ?? '');
        }
        return { id: key, label, content: contentStr };
      });
    const r = callSdevWebWithDoc('tabs_component', [id, normTabs]);
    push(r.html);
    mark();
    return markSafeHtml(r.html);
  }});

  builtins.set('accordion', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const items = Array.isArray(args[0]) ? args[0] : [];
    const normItems = items
      .filter((item): item is Record<string, unknown> => isPlainObject(item))
      .map((item, idx) => {
        const title = asStr(item.title ?? item.question ?? `Item ${idx + 1}`);
        const open = Object.prototype.hasOwnProperty.call(item, 'open') ? Boolean(item.open) : idx === 0;
        let bodyStr = '';
        if (isFunction(item.content)) {
          state.stack.push([]);
          item.content.call([], 0);
          bodyStr = `\x01${state.stack.pop()!.join('')}\x02`;
        } else {
          bodyStr = asStr(item.content ?? item.body ?? item.answer ?? '');
        }
        return { title, open, content: bodyStr };
      });
    const r = callSdevWebWithDoc('accordion', [normItems]);
    push(r.html);
    mark();
    return markSafeHtml(r.html);
  }});

  builtins.set('modal_dialog', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const id = asStr(args[0], 'modal-' + (++inlineHandlerSeq));
    const title = asStr(args[1], 'Dialog');
    const bodyArg = args[2];
    let bodyStr = '';
    if (isFunction(bodyArg)) {
      state.stack.push([]);
      bodyArg.call([], 0);
      bodyStr = `\x01${state.stack.pop()!.join('')}\x02`;
    } else {
      bodyStr = `\x01<p class="text-muted-foreground">${renderSafeText(asStr(bodyArg))}</p>\x02`;
    }
    const footerStr = args[3] !== undefined ? asStr(args[3], '') : '';
    const r = callSdevWebWithDoc('modal_dialog', [id, title, bodyStr, footerStr]);
    push(r.html);
    mark();
    return markSafeHtml(r.html);
  }});

  builtins.set('data_table', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const headers = Array.isArray(args[0]) ? args[0].map((h) => asStr(h)) : [];
    const rows = Array.isArray(args[1]) ? args[1] : [];
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    const normRows = rows
      .map((row) => {
        if (Array.isArray(row)) return row.map((c) => asStr(c));
        if (isPlainObject(row)) return headers.map((h) => asStr(row[h] ?? ''));
        return null;
      })
      .filter((row): row is string[] => row !== null);
    const r = callSdevWebWithDoc('data_table', [headers, normRows]);
    const html = Object.keys(attrs).length > 0 ? r.html.replace('<div class="table-wrap">', `<div class="table-wrap"${renderAttrs(attrs)}>`) : r.html;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('form_field', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    const labelText = asStr(args[0]);
    const name = asStr(args[1], labelText.toLowerCase().replace(/\s+/g, '_'));
    const type = asStr(args[2], 'text');
    const extra = isPlainObject(args[3]) ? args[3] : {};
    if (Object.keys(extra).length === 0) {
      const r = callSdevWebWithDoc('form_field', [labelText, name, type]);
      push(r.html);
      mark();
      return markSafeHtml(r.html);
    }
    const id = asStr(extra.id, `field-${name}`);
    const inputHtml =
      type === 'textarea'
        ? `<textarea id="${escapeAttr(id)}" name="${escapeAttr(name)}" class="textarea"${renderAttrs(extra)}></textarea>`
        : `<input id="${escapeAttr(id)}" name="${escapeAttr(name)}" type="${escapeAttr(type)}" class="input"${renderAttrs(extra)}>`;
    const html = `<div class="flex flex-col gap-1.5 mb-4"><label for="${escapeAttr(id)}" class="text-sm font-medium">${escapeHtml(labelText)}</label>${inputHtml}</div>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  builtins.set('footer_section', { type: 'builtin', call: (args: unknown[]) => {
    enableDesignSystem();
    if (typeof args[0] === 'string' && typeof args[1] === 'string' && Array.isArray(args[2])) {
      const r = callSdevWebWithDoc('footer_section', [asStr(args[0]), asStr(args[1]), args[2], asStr(args[3], '')]);
      push(r.html);
      mark();
      return markSafeHtml(r.html);
    }
    const brandArg = args[0];
    const linksArg = Array.isArray(args[1]) ? args[1] : [];
    const copyright = asStr(args[2], '© 2026 SDEV Programming Language · Built in sdev');
    const brandName = isPlainObject(brandArg) ? asStr(brandArg.name ?? 'sdev') : asStr(brandArg, 'sdev');
    const tagline = isPlainObject(brandArg) ? asStr(brandArg.tagline, '— a language that builds itself') : '— a language that builds itself';

    const linksHtml = linksArg
      .map((item) => {
        if (isPlainObject(item)) {
          return `<a href="${escapeAttr(asStr(item.href, '#'))}" class="text-muted-foreground hover:text-foreground">${escapeHtml(asStr(item.label ?? item.title))}</a>`;
        }
        return `<a href="#" class="text-muted-foreground hover:text-foreground">${escapeHtml(asStr(item))}</a>`;
      })
      .join('');

    const html = `<footer class="border-t" style="background:hsl(var(--card)/.4)">
  <div class="max-w-[1240px] mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
    <div class="flex items-center gap-2.5">
      ${renderIconSvg('sdev-logo', '', 'w-6 h-6')}
      <span class="font-display text-foreground">${escapeHtml(brandName)}</span>
      <span class="text-sm text-muted-foreground">${escapeHtml(tagline)}</span>
    </div>
    <div class="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">${linksHtml}</div>
  </div>
  <div class="max-w-[1240px] mx-auto px-6 pb-8 text-center text-xs text-muted-foreground" style="padding-bottom:2rem">${renderSafeText(copyright)}</div>
</footer>`;
    push(html);
    mark();
    return markSafeHtml(html);
  }});

  /* ─────────────────────────── V2 Self-Hosted Helper Builtins ─────────────────────────── */

  builtins.set('style_nested', { type: 'builtin', call: (args: unknown[]) => {
    const css = callSdevWeb('web_nested_rule', [asStr(args[0]), asStr(args[1]), isPlainObject(args[2]) ? args[2] : {}]);
    state.css.push(css);
    mark();
    return null;
  }});

  builtins.set('media_style', { type: 'builtin', call: (args: unknown[]) => {
    const bp = asStr(args[0], 'mobile');
    const sel = asStr(args[1], '*');
    const dict = isPlainObject(args[2]) ? args[2] : {};
    state.css.push(`@media ${resolveMediaQuery(bp)} {\n${cssRuleFromDict(sel, dict)}\n}`);
    mark();
    return null;
  }});

  builtins.set('script_raw', { type: 'builtin', call: (args: unknown[]) => {
    state.js.push(asStr(args[0]));
    mark();
    return null;
  }});

  builtins.set('script_sdev', { type: 'builtin', call: (args: unknown[]) => {
    state.js.push(sdevSourceToJs(asStr(args[0])));
    mark();
    return null;
  }});

  builtins.set('web_state_init', { type: 'builtin', call: (args: unknown[]) => {
    const key = asStr(args[0]);
    const valJson = asStr(args[1], 'null');
    state.js.unshift(`window.$sdev && window.$sdev.initState({ ${JSON.stringify(key)}: ${valJson} });`);
    mark();
    return null;
  }});

  builtins.set('web_emit', { type: 'builtin', call: (args: unknown[]) => {
    push(asStr(args[0]));
    mark();
    return null;
  }});

  builtins.set('web_el', { type: 'builtin', call: (args: unknown[]) => {
    const tag = asStr(args[0], 'div');
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    return markSafeHtml(renderElementToString(tag, [args[1], attrs]));
  }});

  builtins.set('web_el_raw', { type: 'builtin', call: (args: unknown[]) => {
    const tag = asStr(args[0], 'div');
    const inner = stripSafeMarkers(asStr(args[1]));
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    return markSafeHtml(renderElementToString(tag, [{ ...attrs, html: inner }]));
  }});

  builtins.set('web_void_el', { type: 'builtin', call: (args: unknown[]) => {
    const tag = asStr(args[0], 'br');
    const attrs = isPlainObject(args[1]) ? args[1] : {};
    return markSafeHtml(`<${tag}${renderAttrs(attrs)}>`);
  }});

  builtins.set('web_tag_emmet', { type: 'builtin', call: (args: unknown[]) => {
    const spec = asStr(args[0], 'div');
    const content = args[1];
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    return markSafeHtml(renderElementToString(spec, [content, attrs]));
  }});

  builtins.set('a_html', { type: 'builtin', call: (args: unknown[]) => {
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    return markSafeHtml(renderElementToString('a', [args[0], asStr(args[1], '#'), attrs]));
  }});

  builtins.set('a_link', { type: 'builtin', call: (args: unknown[]) => {
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    return emitElement('a', [args[0], asStr(args[1], '#'), attrs]);
  }});

  builtins.set('btn_html', { type: 'builtin', call: (args: unknown[]) => {
    const attrs = isPlainObject(args[1]) ? { type: 'button', ...args[1] } : { type: 'button' };
    return markSafeHtml(renderElementToString('button', [args[0], attrs]));
  }});

  builtins.set('btn', { type: 'builtin', call: (args: unknown[]) => {
    const attrs = isPlainObject(args[1]) ? { type: 'button', ...args[1] } : { type: 'button' };
    return emitElement('button', [args[0], attrs]);
  }});

  builtins.set('img_el', { type: 'builtin', call: (args: unknown[]) => {
    return emitElement('img', args);
  }});

  builtins.set('input_el', { type: 'builtin', call: (args: unknown[]) => {
    const inputType = asStr(args[0], 'text');
    const placeholder = asStr(args[1], '');
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    return emitElement('input', [{ type: inputType, ...(placeholder ? { placeholder } : {}), ...attrs }]);
  }});

  builtins.set('textarea_el', { type: 'builtin', call: (args: unknown[]) => {
    const placeholder = asStr(args[0], '');
    const attrs = isPlainObject(args[1]) ? args[1] : {};
    return emitElement('textarea', [{ ...(placeholder ? { placeholder } : {}), ...attrs }]);
  }});

  builtins.set('label_el', { type: 'builtin', call: (args: unknown[]) => {
    const text = args[0];
    const forId = asStr(args[1], '');
    const attrs = isPlainObject(args[2]) ? args[2] : {};
    return emitElement('label', [text, { ...(forId ? { for: forId } : {}), ...attrs }]);
  }});

  builtins.set('option_el', { type: 'builtin', call: (args: unknown[]) => {
    const text = args[0];
    const value = asStr(args[1], '');
    const selected = Boolean(args[2]);
    return emitElement('option', [text, { value, ...(selected ? { selected: true } : {}) }]);
  }});

  builtins.set('li_html', { type: 'builtin', call: (args: unknown[]) => {
    const attrs = isPlainObject(args[1]) ? args[1] : {};
    return markSafeHtml(renderElementToString('li', [args[0], attrs]));
  }});

  builtins.set('li_el', { type: 'builtin', call: (args: unknown[]) => {
    const attrs = isPlainObject(args[1]) ? args[1] : {};
    return emitElement('li', [args[0], attrs]);
  }});

  builtins.set('ul_list', { type: 'builtin', call: (args: unknown[]) => {
    const items = Array.isArray(args[0]) ? args[0] : [];
    const attrs = isPlainObject(args[1]) ? args[1] : {};
    return emitElement('ul', [items, attrs]);
  }});

  builtins.set('ol_list', { type: 'builtin', call: (args: unknown[]) => {
    const items = Array.isArray(args[0]) ? args[0] : [];
    const attrs = isPlainObject(args[1]) ? args[1] : {};
    return emitElement('ol', [items, attrs]);
  }});

  builtins.set('hr_el', { type: 'builtin', call: () => emitElement('hr', []) });
  builtins.set('br_el', { type: 'builtin', call: () => markSafeHtml('<br>') });
  builtins.set('header_el', { type: 'builtin', call: (args: unknown[]) => emitElement('header', args) });
  builtins.set('footer_el', { type: 'builtin', call: (args: unknown[]) => emitElement('footer', args) });
  builtins.set('nav_el', { type: 'builtin', call: (args: unknown[]) => emitElement('nav', args) });
  builtins.set('code_el', { type: 'builtin', call: (args: unknown[]) => emitElement('code', args) });
  builtins.set('pre_el', { type: 'builtin', call: (args: unknown[]) => emitElement('pre', args) });

  /* ─────────────────────────── Raw Passthrough & Export ─────────────────────────── */

  builtins.set('raw_html', { type: 'builtin', call: (args: unknown[]) => { push(asStr(args[0])); mark(); return null; }});
  builtins.set('raw_css',  { type: 'builtin', call: (args: unknown[]) => { state.css.push(asStr(args[0])); mark(); return null; }});
  builtins.set('raw_js',   { type: 'builtin', call: (args: unknown[]) => { state.js.push(asStr(args[0])); mark(); return null; }});

  builtins.set('render_html', { type: 'builtin', call: () => renderWebDocument(state) });
  builtins.set('get_html',    { type: 'builtin', call: () => renderWebDocument(state) });
  builtins.set('get_body_html', { type: 'builtin', call: () => state.stack[0]?.join('') ?? '' });
  builtins.set('get_css',     { type: 'builtin', call: () => state.css.join('\n\n') });
  builtins.set('get_js',      { type: 'builtin', call: () => state.js.join('\n\n') });

  builtins.set('save_html', { type: 'builtin', call: (args: unknown[]) => {
    const path = asStr(args[0], 'index.html');
    const doc = renderWebDocument(state);
    const host = (globalThis as unknown as { __sdevHost?: { writeFile?: (p: string, c: string) => void } }).__sdevHost;
    if (host?.writeFile) {
      host.writeFile(path, doc);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.setItem(`sdev:file:${path}`, doc);
    }
    return doc;
  }});

  /* ─────────────────────────── Element Helpers ─────────────────────────── */

  // Only avoid direct registration on names that we already defined above as
  // special web builtins (`title`, `meta`, `link`, `script`, `style`, `tag`, `page`)
  // or that collide with UI / core builtins when NOT in web mode.
  // Notice: `header`, `footer`, `form`, `video`, `audio`, `option` do NOT collide
  // with anything in core or UI, so they are now directly available!
  const DIRECT_SKIP = new Set([
    'input', 'select', 'button', 'textarea', 'label', 'progress',
    'table', 'menu', 'image', 'title', 'meta', 'link', 'script',
    'style', 'on', 'open', 'close', 'tag', 'page', 'canvas',
    'del', 'time', 'map',
  ]);

  for (const tagName of ELEMENT_TAGS) {
    if (!DIRECT_SKIP.has(tagName)) {
      builtins.set(tagName, {
        type: 'builtin',
        call: (args: unknown[]) => emitElement(tagName, args),
      });
    }

    // Always expose `html_<tag>` as the unambiguous form.
    builtins.set(`html_${tagName}`, {
      type: 'builtin',
      call: (args: unknown[]) => emitElement(tagName, args),
    });

    // Container open/close (both `open_<tag>` / `end_<tag>` AND `open<tag>` / `end<tag>`).
    if (!VOID_TAGS.has(tagName)) {
      const openFn: SdevFunction = {
        type: 'builtin',
        call: (args: unknown[]) => { openEl(tagName, args); return null; },
      };
      const closeFn: SdevFunction = {
        type: 'builtin',
        call: () => { closeEl(); return null; },
      };
      builtins.set(`open_${tagName}`, openFn);
      builtins.set(`end_${tagName}`, closeFn);
      builtins.set(`open${tagName}`, openFn);
      builtins.set(`end${tagName}`, closeFn);
    }
  }

  // Expose internal state getter for Interpreter / IDE / Studio integration
  (builtins as unknown as { __getWebState?: () => WebState }).__getWebState = () => state;

  return builtins;
}

/* ──────────────────────────────────────────────────────────────────────── */

/** Render a complete HTML document from the captured state. */
export function renderWebDocument(state: WebState): string {
  const body = stripSafeMarkers(state.stack[0]?.join('') ?? '');
  const customCss = state.css.join('\n\n');
  const customJs = state.js.join('\n\n');
  const head = state.head.join('\n');
  const lang = escapeAttr(state.lang || 'en');
  const dirAttr = state.dir && state.dir !== 'ltr' ? ` dir="${escapeAttr(state.dir)}"` : '';

  const themeKey = state.theme && state.theme !== 'plain' ? state.theme : '';
  const themeCss = themeKey ? callSdevWeb('web_theme_css', [themeKey]) : '';
  const utilCss = themeCss || state.includeUtilities ? callSdevWeb('web_utilities_css', []) : '';

  const baseCss =
    themeCss || state.includeUtilities
      ? `${themeCss || callSdevWeb('web_theme_css', ['sdev-dark'])}\n${utilCss}`
      : `*, *::before, *::after { box-sizing: border-box; }\nbody { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; line-height: 1.5; color: #0b1220; background: #ffffff; }`;

  const bodyAttrsStr = state.bodyAttrs
    ? Object.entries(state.bodyAttrs)
        .filter(([, v]) => v !== undefined && v !== null && v !== false)
        .map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${escapeAttr(asStr(v))}"`))
        .join('')
    : '';

  const moduleScripts = (state.moduleJs ?? [])
    .map((m) => `<script type="module">\n${m}\n</script>`)
    .join('\n');

  const runtimeJs = callSdevWeb('web_browser_runtime_js', []);

  return `<!DOCTYPE html>
<html lang="${lang}"${dirAttr}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(state.title)}</title>
${head}
<style>
${baseCss}
${customCss}
</style>
</head>
<body${bodyAttrsStr}>
${body}
<script>
${runtimeJs}
${customJs}
</script>
${moduleScripts}
</body>
</html>`;
}

/**
 * Bind Web Toolkit builtins onto an Environment while preserving core/parity/UI/graphics
 * functions when outside a `page(...)` block, and smart-dispatching shared HTML tags
 * (`button`, `input`, `select`, `textarea`, `label`, `progress`, `table`, `menu`, `image`,
 * `canvas`, `title`, `close`, `del`, `time`, `map`) when inside a `page(...)`.
 */
export function bindWebBuiltinsToEnv(
  env: Environment,
  webBuiltins: Map<string, SdevFunction>,
  opts: { hasUiRoot?: () => boolean } = {}
): void {
  const getWebState =
    (webBuiltins as unknown as { __getWebState?: () => WebState }).__getWebState ??
    (() => ({ produced: false } as WebState));
  const isWebActive = () => Boolean(getWebState()?.produced) && !opts.hasUiRoot?.();

  const existing = (name: string): SdevFunction | null =>
    env.hasOwn(name) ? (env.get(name, 0) as SdevFunction) : null;

  const prevTitle = existing('title');
  const prevClose = existing('close');
  const prevInput = existing('input');
  const prevDel = existing('del');
  const prevTime = existing('time');
  const prevMap = existing('map');
  const prevCanvas = existing('canvas');

  const uiShared = ['button', 'select', 'textarea', 'label', 'progress', 'table', 'menu', 'image', 'dialog'];
  const prevUi = new Map<string, SdevFunction | null>();
  for (const name of uiShared) {
    prevUi.set(name, existing(name));
  }

  webBuiltins.forEach((fn, name) => {
    if (name === 'title' || name === 'close' || name === 'canvas') return;
    env.define(name, fn);
  });

  // `title`: sets document title when inside `page()`, always returns title-cased string
  const webTitle = webBuiltins.get('title')!;
  env.define('title', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (isWebActive()) return webTitle.call(args, line);
      if (prevTitle) return prevTitle.call(args, line);
      return webTitle.call(args, line);
    },
  });

  // `close`: closes generator if given a generator, otherwise closes open HTML container
  const webClose = webBuiltins.get('close')!;
  env.define('close', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length >= 1 && isGenerator(args[0]) && prevClose) {
        return prevClose.call(args, line);
      }
      return webClose.call(args, line);
    },
  });

  // `del`: deletes from tome unless called as HTML `<del>` inside `page()`
  const htmlDel = webBuiltins.get('html_del')!;
  env.define('del', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (
        args.length === 2 &&
        isPlainObject(args[0]) &&
        typeof args[1] === 'string' &&
        (!isWebActive() || args[1] in (args[0] as object))
      ) {
        if (prevDel) return prevDel.call(args, line);
        delete (args[0] as Record<string, unknown>)[args[1]];
        return args[0];
      }
      if (isWebActive()) return htmlDel.call(args, line);
      if (prevDel) return prevDel.call(args, line);
      return htmlDel.call(args, line);
    },
  });

  // `time`: 0-arg `time()` always returns the core time tome; with args inside `page()`, emits `<time>`
  const htmlTime = webBuiltins.get('html_time')!;
  env.define('time', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 0 && prevTime) return prevTime.call(args, line);
      if (isWebActive() && args.length > 0) return htmlTime.call(args, line);
      if (prevTime) return prevTime.call(args, line);
      return htmlTime.call(args, line);
    },
  });

  // `map`: if first arg is a function, calls Python-parity `map(fn, seq)`; inside `page()`, emits `<map>`
  const htmlMap = webBuiltins.get('html_map')!;
  env.define('map', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (prevMap && args.length >= 2 && isFunction(args[0])) return prevMap.call(args, line);
      if (isWebActive()) return htmlMap.call(args, line);
      if (prevMap) return prevMap.call(args, line);
      return htmlMap.call(args, line);
    },
  });

  // `canvas`: 2 numeric args outside `page()` -> 2D graphics canvas; inside `page()` with attrs/0 args -> `<canvas>`
  const htmlCanvas = webBuiltins.get('html_canvas')!;
  env.define('canvas', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (isWebActive() && (args.length === 0 || isPlainObject(args[0]) || typeof args[0] === 'string')) {
        return htmlCanvas.call(args, line);
      }
      if (prevCanvas) return prevCanvas.call(args, line);
      return htmlCanvas.call(args, line);
    },
  });

  // `input`: inside `page()` with 0 args or tome attrs -> `<input>`; in UI window -> UI input; else prompt
  const htmlInput = webBuiltins.get('html_input')!;
  env.define('input', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (isWebActive() && (args.length === 0 || isPlainObject(args[0]) || isPlainObject(args[1]))) {
        return htmlInput.call(args, line);
      }
      if (prevInput) return prevInput.call(args, line);
      return htmlInput.call(args, line);
    },
  });

  // Shared UI / HTML widget names (`button`, `select`, `textarea`, `label`, `progress`, `table`, `menu`, `image`, `dialog`)
  for (const name of uiShared) {
    const uiFn = prevUi.get(name);
    const webFn =
      name === 'image'
        ? webBuiltins.get('html_img')!
        : webBuiltins.get(`html_${name}`)!;
    const dataTableFn = webBuiltins.get('data_table')!;

    env.define(name, {
      type: 'builtin',
      call: (args: unknown[], line: number) => {
        if (isWebActive()) {
          if (name === 'table' && Array.isArray(args[0]) && Array.isArray(args[1])) {
            return dataTableFn.call(args, line);
          }
          return webFn.call(args, line);
        }
        if (uiFn) return uiFn.call(args, line);
        if (name === 'table' && Array.isArray(args[0]) && Array.isArray(args[1])) {
          return dataTableFn.call(args, line);
        }
        return webFn.call(args, line);
      },
    });
  }
}
