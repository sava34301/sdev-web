import { useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { EditorState, Compartment, StateEffect, type Extension } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter,
  highlightSpecialChars, drawSelection, dropCursor, rectangularSelection,
  crosshairCursor, tooltips, hoverTooltip,
} from '@codemirror/view';
import {
  defaultKeymap, history, historyKeymap, indentWithTab,
  toggleComment, moveLineUp, moveLineDown, copyLineDown, indentMore, indentLess,
} from '@codemirror/commands';
import {
  StreamLanguage, HighlightStyle, syntaxHighlighting, indentUnit,
  bracketMatching, foldGutter, foldKeymap, codeFolding,
} from '@codemirror/language';
import { searchKeymap, highlightSelectionMatches, openSearchPanel, search } from '@codemirror/search';
import {
  autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap,
  type CompletionContext, type CompletionResult,
} from '@codemirror/autocomplete';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { tags as t } from '@lezer/highlight';

import { SDEV_KEYWORDS, SDEV_BUILTINS, SDEV_CONSTANTS, SDEV_SNIPPETS } from './languageData';
import { getHoverDoc } from './IdeAutocomplete';
import type { IdeSettings } from './types';
import type { Problem } from './IdeProblems';

export interface IdeEditorHandle {
  jumpToLine: (line: number, col?: number) => void;
  focus: () => void;
  openFind: () => void;
  format: () => void;
  insertAtCursor: (text: string) => void;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  onFormat?: () => void;
  fileName?: string;
  readOnly?: boolean;
  problems?: Problem[];
  settings?: Partial<IdeSettings>;
  onCursorChange?: (pos: { line: number; col: number }) => void;
  onSelectionChange?: (count: number) => void;
}

/* ── sdev stream tokenizer ─────────────────────────────────────────── */

const KEYWORD_SET = new Set(SDEV_KEYWORDS);
const BUILTIN_SET = new Set(SDEV_BUILTINS.map(b => b.name));
const CONSTANT_SET = new Set(SDEV_CONSTANTS);

const sdevLanguage = StreamLanguage.define<{ inBlockComment: boolean }>({
  name: 'sdev',
  startState: () => ({ inBlockComment: false }),
  token(stream, state) {
    if (state.inBlockComment) {
      while (!stream.eol()) {
        if (stream.match('*/')) { state.inBlockComment = false; break; }
        stream.next();
      }
      return 'comment';
    }
    if (stream.eatSpace()) return null;

    if (stream.match('/*')) { state.inBlockComment = true; return 'comment'; }
    if (stream.match('//')) { stream.skipToEnd(); return 'comment'; }
    if (stream.match('#')) { stream.skipToEnd(); return 'comment'; }

    const quote = stream.peek();
    if (quote === '"' || quote === "'" || quote === '`') {
      stream.next();
      let escaped = false;
      while (!stream.eol()) {
        const ch = stream.next();
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        if (ch === quote) break;
      }
      return 'string';
    }

    if (stream.match(/^\d[\d_]*(\.\d+)?([eE][+-]?\d+)?/)) return 'number';

    if (stream.match(/^[A-Za-z_]\w*/)) {
      const word = stream.current();
      if (KEYWORD_SET.has(word)) return 'keyword';
      if (CONSTANT_SET.has(word)) return 'constant';
      if (BUILTIN_SET.has(word)) return 'builtin';
      if (stream.peek() === '(') return 'function';
      if (/^[A-Z]/.test(word)) return 'type';
      return 'variable';
    }

    if (stream.match('::') || stream.match(';;')) return 'blockDelimiter';
    if (stream.match(/^(->|=>|==|!=|<=|>=|&&|\|\||\+\+|--)/)) return 'operator';
    if (stream.match(/^[+\-*/%<>=!&|^~?:]/)) return 'operator';
    if (stream.match(/^[()[\]{}]/)) return 'bracket';
    stream.next();
    return null;
  },
  languageData: {
    commentTokens: { line: '//', block: { open: '/*', close: '*/' } },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'"] },
  },
  tokenTable: {
    builtin: t.standard(t.variableName),
    blockDelimiter: t.punctuation,
    bracket: t.bracket,
    constant: t.constant(t.variableName),
    function: t.function(t.variableName),
  },
});

const sdevHighlight = HighlightStyle.define([
  { tag: t.comment, color: 'hsl(var(--muted-foreground) / 0.75)', fontStyle: 'italic' },
  { tag: t.keyword, color: 'hsl(var(--primary))', fontWeight: '600' },
  { tag: t.string, color: 'hsl(var(--brand-green))' },
  { tag: t.number, color: 'hsl(var(--brand-amber))' },
  { tag: t.constant(t.variableName), color: 'hsl(var(--brand-orange))' },
  { tag: t.standard(t.variableName), color: 'hsl(var(--brand-cyan))' },
  { tag: t.function(t.variableName), color: 'hsl(var(--brand-sky))' },
  { tag: t.typeName, color: 'hsl(var(--brand-steel))' },
  { tag: t.operator, color: 'hsl(var(--brand-rose))' },
  { tag: t.punctuation, color: 'hsl(var(--muted-foreground))' },
  { tag: t.bracket, color: 'hsl(var(--foreground) / 0.7)' },
  { tag: t.variableName, color: 'hsl(var(--foreground))' },
]);

/* ── autocompletion ────────────────────────────────────────────────── */

function sdevCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/[\w$]+/);
  if (!word && !context.explicit) return null;
  const from = word ? word.from : context.pos;

  const seen = new Set<string>();
  const options: { label: string; type: string; detail?: string; info?: string; apply?: string }[] = [];

  for (const k of SDEV_KEYWORDS) {
    if (seen.has(k)) continue; seen.add(k);
    options.push({ label: k, type: 'keyword' });
  }
  for (const c of SDEV_CONSTANTS) {
    if (seen.has(c)) continue; seen.add(c);
    options.push({ label: c, type: 'constant' });
  }
  for (const b of SDEV_BUILTINS) {
    if (seen.has(b.name)) continue; seen.add(b.name);
    options.push({ label: b.name, type: 'function', detail: b.signature, info: b.doc });
  }
  for (const s of SDEV_SNIPPETS) {
    options.push({
      label: s.prefix, type: 'text', detail: s.description,
      apply: s.body.replace(/\$\d+/g, ''),
    });
  }
  // Identifiers from the current document
  const text = context.state.doc.toString();
  for (const m of text.matchAll(/[A-Za-z_]\w{2,}/g)) {
    if (seen.has(m[0])) continue; seen.add(m[0]);
    options.push({ label: m[0], type: 'variable' });
  }

  return { from, options, validFor: /^[\w$]*$/ };
}

const sdevHover = hoverTooltip((view, pos) => {
  const { from, to, text } = view.state.doc.lineAt(pos);
  let start = pos, end = pos;
  while (start > from && /\w/.test(text[start - from - 1])) start--;
  while (end < to && /\w/.test(text[end - from])) end++;
  if (start === end) return null;
  const word = text.slice(start - from, end - from);
  const doc = getHoverDoc(word);
  if (!doc) return null;
  return {
    pos: start, end, above: true,
    create() {
      const dom = document.createElement('div');
      dom.className = 'cm-sdev-hover';
      dom.innerHTML = `<div class="cm-sdev-hover-title"></div><div class="cm-sdev-hover-doc"></div>`;
      (dom.firstChild as HTMLElement).textContent = doc.title;
      (dom.lastChild as HTMLElement).textContent = doc.doc;
      return { dom };
    },
  };
});

/* ── theme ─────────────────────────────────────────────────────────── */

function makeTheme(fontSize: number, fontFamily: string): Extension {
  return EditorView.theme({
    '&': {
      height: '100%',
      fontSize: `${fontSize}px`,
      backgroundColor: 'transparent',
      color: 'hsl(var(--foreground))',
    },
    '.cm-scroller': {
      fontFamily: `'${fontFamily}', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace`,
      lineHeight: '1.6',
      overflow: 'auto',
    },
    '.cm-content': { padding: '12px 0', caretColor: 'hsl(var(--primary))' },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'hsl(var(--muted-foreground) / 0.5)',
      borderRight: '1px solid hsl(var(--border) / 0.35)',
      paddingRight: '2px',
    },
    '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'hsl(var(--primary))' },
    '.cm-activeLine': { backgroundColor: 'hsl(var(--foreground) / 0.035)' },
    '.cm-lineNumbers .cm-gutterElement': { padding: '0 6px 0 12px', minWidth: '34px' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'hsl(var(--primary))', borderLeftWidth: '2px' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: 'hsl(var(--primary) / 0.28)',
    },
    '.cm-selectionMatch': { backgroundColor: 'hsl(var(--primary) / 0.16)' },
    '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
      backgroundColor: 'hsl(var(--primary) / 0.22)',
      outline: '1px solid hsl(var(--primary) / 0.5)',
    },
    '.cm-nonmatchingBracket': { outline: '1px solid hsl(var(--destructive) / 0.6)' },
    '.cm-foldGutter .cm-gutterElement': { color: 'hsl(var(--muted-foreground) / 0.6)' },
    '.cm-panels': {
      backgroundColor: 'hsl(var(--card))',
      color: 'hsl(var(--foreground))',
      border: 'none',
      borderTop: '1px solid hsl(var(--border))',
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
    },
    '.cm-panel input, .cm-panel button, .cm-panel select': {
      backgroundColor: 'hsl(var(--input))',
      color: 'hsl(var(--foreground))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '4px',
      padding: '2px 6px',
      fontFamily: 'inherit',
    },
    '.cm-panel.cm-search label': { color: 'hsl(var(--muted-foreground))' },
    '.cm-tooltip': {
      backgroundColor: 'hsl(var(--popover))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '8px',
      color: 'hsl(var(--foreground))',
      boxShadow: '0 8px 30px hsl(0 0% 0% / 0.4)',
      overflow: 'hidden',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '12px',
      maxHeight: '16em',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
      backgroundColor: 'hsl(var(--primary) / 0.2)',
      color: 'hsl(var(--foreground))',
    },
    '.cm-completionIcon': { opacity: 0.6, paddingRight: '10px' },
    '.cm-completionDetail': { color: 'hsl(var(--muted-foreground))', fontStyle: 'normal', marginLeft: '8px' },
    '.cm-sdev-hover': { padding: '8px 10px', maxWidth: '340px' },
    '.cm-sdev-hover-title': {
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: '11px',
      color: 'hsl(var(--primary))',
      marginBottom: '3px',
    },
    '.cm-sdev-hover-doc': { fontSize: '11px', color: 'hsl(var(--muted-foreground))', lineHeight: '1.5' },
    '.cm-lint-marker': { width: '0.8em', height: '0.8em' },
    '.cm-diagnostic': { fontFamily: "'JetBrains Mono', monospace", fontSize: '11px' },
  });
}

/* ── component ─────────────────────────────────────────────────────── */

export const CodeMirrorEditor = forwardRef<IdeEditorHandle, Props>(function CodeMirrorEditor(
  { value, onChange, onRun, onFormat, readOnly, problems, settings, onCursorChange, onSelectionChange },
  ref
) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const cbRef = useRef({ onChange, onRun, onFormat, onCursorChange, onSelectionChange });
  cbRef.current = { onChange, onRun, onFormat, onCursorChange, onSelectionChange };

  const fontSize = settings?.fontSize ?? 14;
  const tabSize = settings?.tabSize ?? 2;
  const fontFamily = settings?.fontFamily ?? 'JetBrains Mono';
  const showLineNumbers = settings?.lineNumbers !== false;
  const wordWrap = settings?.wordWrap ?? false;

  const compartments = useMemo(() => ({
    theme: new Compartment(),
    wrap: new Compartment(),
    gutter: new Compartment(),
    tab: new Compartment(),
    readonly: new Compartment(),
  }), []);

  // Create the view once
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        codeFolding(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        bracketMatching(),
        closeBrackets(),
        search({ top: true }),
        autocompletion({ override: [sdevCompletions], activateOnTyping: true, icons: true }),
        lintGutter(),
        tooltips({ position: 'absolute' }),
        sdevHover,
        sdevLanguage,
        syntaxHighlighting(sdevHighlight, { fallback: true }),
        keymap.of([
          { key: 'Mod-Enter', preventDefault: true, run: () => { cbRef.current.onRun?.(); return true; } },
          { key: 'Shift-Mod-i', preventDefault: true, run: () => { cbRef.current.onFormat?.(); return true; } },
          { key: 'Shift-Alt-f', preventDefault: true, run: () => { cbRef.current.onFormat?.(); return true; } },
          { key: 'Mod-f', preventDefault: true, run: openSearchPanel },
          { key: 'Mod-/', preventDefault: true, run: toggleComment },
          { key: 'Alt-ArrowUp', preventDefault: true, run: moveLineUp },
          { key: 'Alt-ArrowDown', preventDefault: true, run: moveLineDown },
          { key: 'Mod-d', preventDefault: true, run: copyLineDown },
          { key: 'Mod-]', preventDefault: true, run: indentMore },
          { key: 'Mod-[', preventDefault: true, run: indentLess },
          ...closeBracketsKeymap,
          ...completionKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...defaultKeymap,
          indentWithTab,
        ]),
        compartments.theme.of(makeTheme(fontSize, fontFamily)),
        compartments.wrap.of(wordWrap ? EditorView.lineWrapping : []),
        compartments.gutter.of(showLineNumbers ? [] : EditorView.theme({ '.cm-lineNumbers': { display: 'none' } })),
        compartments.tab.of([EditorState.tabSize.of(tabSize), indentUnit.of(' '.repeat(tabSize))]),
        compartments.readonly.of(EditorState.readOnly.of(!!readOnly)),
        EditorView.updateListener.of((u) => {
          if (u.docChanged) cbRef.current.onChange(u.state.doc.toString());
          if (u.selectionSet || u.docChanged) {
            const sel = u.state.selection.main;
            const line = u.state.doc.lineAt(sel.head);
            cbRef.current.onCursorChange?.({ line: line.number, col: sel.head - line.from + 1 });
            cbRef.current.onSelectionChange?.(Math.abs(sel.to - sel.from));
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // External value changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } });
    }
  }, [value]);

  // Settings changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [
        compartments.theme.reconfigure(makeTheme(fontSize, fontFamily)),
        compartments.wrap.reconfigure(wordWrap ? EditorView.lineWrapping : []),
        compartments.gutter.reconfigure(showLineNumbers ? [] : EditorView.theme({ '.cm-lineNumbers': { display: 'none' } })),
        compartments.tab.reconfigure([EditorState.tabSize.of(tabSize), indentUnit.of(' '.repeat(tabSize))]),
        compartments.readonly.reconfigure(EditorState.readOnly.of(!!readOnly)),
      ] as StateEffect<unknown>[],
    });
  }, [fontSize, fontFamily, wordWrap, showLineNumbers, tabSize, readOnly, compartments]);

  // Diagnostics
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const doc = view.state.doc;
    const diags: Diagnostic[] = (problems ?? [])
      .filter(p => p.line >= 1 && p.line <= doc.lines)
      .map(p => {
        const line = doc.line(p.line);
        return {
          from: line.from,
          to: line.to,
          severity: p.severity === 'error' ? 'error' : p.severity === 'warning' ? 'warning' : 'info',
          message: p.message,
        } as Diagnostic;
      });
    view.dispatch(setDiagnostics(view.state, diags));
  }, [problems]);

  useImperativeHandle(ref, () => ({
    jumpToLine(lineNo: number, col = 1) {
      const view = viewRef.current;
      if (!view) return;
      const n = Math.max(1, Math.min(lineNo, view.state.doc.lines));
      const line = view.state.doc.line(n);
      const pos = Math.min(line.from + col - 1, line.to);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
        scrollIntoView: true,
      });
      view.focus();
    },
    focus() { viewRef.current?.focus(); },
    openFind() { const v = viewRef.current; if (v) { openSearchPanel(v); } },
    format() { cbRef.current.onFormat?.(); },
    insertAtCursor(text: string) {
      const view = viewRef.current;
      if (!view) return;
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: text },
        selection: { anchor: sel.from + text.length },
      });
      view.focus();
    },
  }), []);

  return <div ref={hostRef} className="h-full w-full overflow-hidden bg-background/40" />;
});

export default CodeMirrorEditor;
