import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useMemo, useCallback } from 'react';
import { SyntaxHighlighter } from './SyntaxHighlighter';
import { AutocompletePopup, buildCompletions, extractIdentifiers, getHoverDoc, type Completion } from './IdeAutocomplete';
import { FindReplacePanel, findMatches } from './IdeFindReplace';
import { IdeMinimap } from './IdeMinimap';
import type { IdeSettings } from './types';

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
  settings?: Partial<IdeSettings>;
  onCursorChange?: (pos: { line: number; col: number }) => void;
  onSelectionChange?: (count: number) => void;
}

const PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };
const CLOSERS = new Set([')', ']', '}', '"', "'"]);

export const IdeEditor = forwardRef<IdeEditorHandle, Props>(function IdeEditor(
  { value, onChange, onRun, onFormat, fileName, settings, onCursorChange, onSelectionChange },
  ref
) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fontSize = settings?.fontSize ?? 14;
  const tabSize = settings?.tabSize ?? 2;
  const fontFamily = settings?.fontFamily ?? 'JetBrains Mono';
  const showLineNumbers = settings?.lineNumbers !== false;
  const showMinimap = settings?.minimap === true;
  const wordWrap = settings?.wordWrap ?? false;

  const [scrollTop, setScrollTop] = useState(0);
  const [cursorOffset, setCursorOffset] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  // Autocomplete state
  const [acPrefix, setAcPrefix] = useState('');
  const [acIndex, setAcIndex] = useState(0);
  const [acPos, setAcPos] = useState<{ top: number; left: number } | null>(null);

  // Hover tooltip
  const [hover, setHover] = useState<{ x: number; y: number; word: string } | null>(null);

  // Find / Replace
  const [showFind, setShowFind] = useState(false);
  const [findHighlights, setFindHighlights] = useState<{ start: number; end: number }[]>([]);

  const lines = useMemo(() => value.split('\n'), [value]);
  const totalLines = lines.length;
  const lineHeight = Math.round(fontSize * 1.6);
  const fontStyle = `${fontSize}px/${lineHeight}px '${fontFamily}', 'Fira Code', monospace`;

  const currentLine = useMemo(() => value.slice(0, cursorOffset).split('\n').length, [value, cursorOffset]);
  const currentCol = useMemo(() => {
    const before = value.slice(0, cursorOffset);
    const ls = before.lastIndexOf('\n');
    return cursorOffset - ls - 1 + 1;
  }, [value, cursorOffset]);

  const identifiers = useMemo(() => extractIdentifiers(value), [value]);

  // Bracket matching
  const matchingBrackets = useMemo(() => {
    const ch = value[cursorOffset];
    const prev = value[cursorOffset - 1];
    const target = CLOSERS.has(ch as string) ? ch : (prev && '([{'.includes(prev) ? prev : null);
    if (!target) return null;
    const opens = '([{', closes = ')]}';
    const isOpen = opens.includes(target);
    const matchChar = isOpen ? closes[opens.indexOf(target)] : opens[closes.indexOf(target)];
    const start = isOpen ? cursorOffset - 1 : cursorOffset;
    let depth = 0;
    if (isOpen) {
      for (let i = start + 1; i < value.length; i++) {
        if (value[i] === target) depth++;
        else if (value[i] === matchChar) {
          if (depth === 0) return { a: start, b: i };
          depth--;
        }
      }
    } else {
      for (let i = start - 1; i >= 0; i--) {
        if (value[i] === target) depth++;
        else if (value[i] === matchChar) {
          if (depth === 0) return { a: i, b: start };
          depth--;
        }
      }
    }
    return null;
  }, [value, cursorOffset]);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (highlightRef.current) {
      highlightRef.current.scrollTop = ta.scrollTop;
      highlightRef.current.scrollLeft = ta.scrollLeft;
    }
    if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = ta.scrollTop;
    setScrollTop(ta.scrollTop);
  }, []);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.addEventListener('scroll', syncScroll, { passive: true });
    return () => ta.removeEventListener('scroll', syncScroll);
  }, [syncScroll]);

  useImperativeHandle(ref, () => ({
    jumpToLine(line: number, col = 1) {
      const ta = textareaRef.current; if (!ta) return;
      const cleanLine = Math.max(1, Math.min(line, lines.length));
      let off = 0;
      for (let i = 0; i < cleanLine - 1; i++) off += lines[i].length + 1;
      off += Math.min(col - 1, lines[cleanLine - 1].length);
      ta.focus();
      ta.selectionStart = ta.selectionEnd = off;
      const targetTop = (cleanLine - 1) * lineHeight - ta.clientHeight / 2 + lineHeight;
      ta.scrollTop = Math.max(0, targetTop);
    },
    focus() { textareaRef.current?.focus(); },
    openFind() { setShowFind(true); },
    format() { onFormat?.(); },
    insertAtCursor(text: string) {
      const ta = textareaRef.current; if (!ta) return;
      const s = ta.selectionStart, e = ta.selectionEnd;
      const next = value.slice(0, s) + text + value.slice(e);
      onChange(next);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + text.length; });
    },
  }), [lines, lineHeight, onChange, onFormat, value]);

  const updateCursor = (ta: HTMLTextAreaElement) => {
    const pos = ta.selectionStart;
    setCursorOffset(pos);
    setSelectionEnd(ta.selectionEnd);
    const before = ta.value.substring(0, pos);
    const splitL = before.split('\n');
    onCursorChange?.({ line: splitL.length, col: splitL[splitL.length - 1].length + 1 });
    onSelectionChange?.(Math.abs(ta.selectionEnd - ta.selectionStart));

    // autocomplete trigger
    const ls = before.lastIndexOf('\n') + 1;
    const lineSoFar = before.slice(ls);
    const m = lineSoFar.match(/[A-Za-z_]\w*$/);
    if (m && m[0].length >= 1 && ta.selectionStart === ta.selectionEnd) {
      // Position popup roughly under caret
      const lineIdx = splitL.length - 1;
      const colIdx = splitL[splitL.length - 1].length;
      const top = (lineIdx + 1) * lineHeight - ta.scrollTop + 4;
      const left = (showLineNumbers ? 48 : 0) + colIdx * (fontSize * 0.6) - ta.scrollLeft;
      setAcPrefix(m[0]);
      setAcPos({ top, left });
      setAcIndex(0);
    } else {
      setAcPrefix(''); setAcPos(null);
    }
  };

  const acceptCompletion = (c: Completion) => {
    const ta = textareaRef.current; if (!ta) return;
    const pos = ta.selectionStart;
    const before = value.slice(0, pos);
    const ls = before.lastIndexOf('\n') + 1;
    const lineSoFar = before.slice(ls);
    const m = lineSoFar.match(/[A-Za-z_]\w*$/);
    const wordStart = pos - (m ? m[0].length : 0);
    const next = value.slice(0, wordStart) + c.insertText + value.slice(pos);
    onChange(next);
    const newPos = wordStart + (c.cursorOffset ?? c.insertText.length);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = newPos;
      setAcPrefix(''); setAcPos(null);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;

    // Autocomplete navigation
    if (acPos) {
      const items = buildCompletions(acPrefix, identifiers);
      if (e.key === 'ArrowDown') { e.preventDefault(); setAcIndex(i => Math.min(items.length - 1, i + 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setAcIndex(i => Math.max(0, i - 1)); return; }
      if (e.key === 'Escape')    { setAcPrefix(''); setAcPos(null); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (items[acIndex]) {
          e.preventDefault();
          acceptCompletion(items[acIndex]);
          return;
        }
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'f')     { e.preventDefault(); setShowFind(true); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === ' ')     { e.preventDefault(); setAcPrefix(''); updateCursor(ta); return; }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'F' || e.key === 'I')) {
      e.preventDefault(); onFormat?.(); return;
    }
    // Ctrl+/ — toggle line comment
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const a = value.lastIndexOf('\n', start - 1) + 1;
      const b = value.indexOf('\n', end); const stop = b === -1 ? value.length : b;
      const block = value.slice(a, stop);
      const block2 = block.split('\n').every(l => l.trimStart().startsWith('//') || l.trim() === '')
        ? block.replace(/^(\s*)\/\/ ?/gm, '$1')
        : block.replace(/^(\s*)/gm, '$1// ');
      onChange(value.slice(0, a) + block2 + value.slice(stop));
      return;
    }
    // Alt+Up / Alt+Down — move line
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const ls = value.lastIndexOf('\n', start - 1) + 1;
      const le = value.indexOf('\n', end); const lineEnd = le === -1 ? value.length : le;
      const lineText = value.slice(ls, lineEnd);
      if (e.key === 'ArrowUp' && ls > 0) {
        const prevStart = value.lastIndexOf('\n', ls - 2) + 1;
        const prev = value.slice(prevStart, ls - 1);
        const next = value.slice(0, prevStart) + lineText + '\n' + prev + value.slice(lineEnd);
        onChange(next);
      } else if (e.key === 'ArrowDown' && lineEnd < value.length) {
        const nextStart = lineEnd + 1;
        const nl = value.indexOf('\n', nextStart);
        const nextLineEnd = nl === -1 ? value.length : nl;
        const nxt = value.slice(nextStart, nextLineEnd);
        const out = value.slice(0, ls) + nxt + '\n' + lineText + value.slice(nextLineEnd);
        onChange(out);
      }
      return;
    }
    // Ctrl+D — duplicate line
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
      e.preventDefault();
      const ls = value.lastIndexOf('\n', start - 1) + 1;
      const le = value.indexOf('\n', start); const lineEnd = le === -1 ? value.length : le;
      const lineText = value.slice(ls, lineEnd);
      onChange(value.slice(0, lineEnd) + '\n' + lineText + value.slice(lineEnd));
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const indent = ' '.repeat(tabSize);
      if (start !== end) {
        const before = value.substring(0, start);
        const selected = value.substring(start, end);
        const after = value.substring(end);
        if (e.shiftKey) {
          const unindented = selected.replace(new RegExp(`^${indent}`, 'gm'), '');
          onChange(before + unindented + after);
        } else {
          onChange(before + selected.replace(/^/gm, indent) + after);
        }
        return;
      }
      onChange(value.substring(0, start) + indent + value.substring(end));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + tabSize; });
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const lineStart = value.lastIndexOf('\n', start - 1) + 1;
      const currentLineText = value.substring(lineStart, start);
      const indentMatch = currentLineText.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1] : '';
      const prevChar = value[start - 1];
      const extraIndent = (prevChar === ':' && value[start - 2] === ':') ? ' '.repeat(tabSize) : '';
      const newline = '\n' + currentIndent + extraIndent;
      onChange(value.substring(0, start) + newline + value.substring(end));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + newline.length; });
      return;
    }

    if (PAIRS[e.key] && start === end) {
      e.preventDefault();
      const close = PAIRS[e.key];
      onChange(value.substring(0, start) + e.key + close + value.substring(end));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
      return;
    }
    if (CLOSERS.has(e.key) && value[start] === e.key) {
      e.preventDefault();
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; });
      return;
    }
    if (e.key === 'Backspace' && start === end && start > 0) {
      const prev = value[start - 1]; const next = value[start];
      if (PAIRS[prev] && PAIRS[prev] === next) {
        e.preventDefault();
        onChange(value.substring(0, start - 1) + value.substring(start + 1));
        requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start - 1; });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    // Show hover doc when paused over a builtin/keyword (debounced via requestAnimationFrame)
    const ta = textareaRef.current; if (!ta) return;
    const rect = ta.getBoundingClientRect();
    const x = e.clientX - rect.left + ta.scrollLeft - 16;
    const y = e.clientY - rect.top + ta.scrollTop - 16;
    const lineIdx = Math.floor(y / lineHeight);
    if (lineIdx < 0 || lineIdx >= lines.length) { setHover(null); return; }
    const charW = fontSize * 0.6;
    const colIdx = Math.floor(x / charW);
    const line = lines[lineIdx];
    if (colIdx < 0 || colIdx >= line.length) { setHover(null); return; }
    // word at column
    let s = colIdx, en = colIdx;
    while (s > 0 && /[A-Za-z0-9_]/.test(line[s - 1])) s--;
    while (en < line.length && /[A-Za-z0-9_]/.test(line[en])) en++;
    const word = line.slice(s, en);
    if (word && getHoverDoc(word)) {
      setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top + 14, word });
    } else {
      setHover(null);
    }
  };

  const findJump = (start: number, end: number) => {
    const ta = textareaRef.current; if (!ta) return;
    ta.focus();
    ta.selectionStart = start; ta.selectionEnd = end;
    const before = value.slice(0, start);
    const line = before.split('\n').length;
    const targetTop = (line - 1) * lineHeight - ta.clientHeight / 2 + lineHeight;
    ta.scrollTop = Math.max(0, targetTop);
  };

  // recompute current-line top and bracket overlay positions
  const cursorLineTop = (currentLine - 1) * lineHeight - scrollTop;

  return (
    <div ref={containerRef} className="relative flex h-full bg-background/40 overflow-hidden" style={{ fontSize }}>
      {/* Line numbers */}
      {showLineNumbers && (
        <div ref={lineNumbersRef}
             className="flex-shrink-0 w-12 overflow-hidden text-right pt-4 pb-4 pr-3 select-none bg-background/20 border-r border-border/20"
             style={{ lineHeight: `${lineHeight}px`, font: fontStyle }}>
          {lines.map((_, i) => (
            <div key={i}
                 className={`text-xs ${i + 1 === currentLine ? 'text-primary font-semibold' : 'text-muted-foreground/40'}`}
                 style={{ lineHeight: `${lineHeight}px` }}>
              {i + 1}
            </div>
          ))}
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        {/* Current line highlight */}
        <div className="absolute left-0 right-0 pointer-events-none bg-primary/[0.04]"
             style={{ top: cursorLineTop + 16, height: lineHeight }} />

        {/* Find match highlights */}
        {findHighlights.length > 0 && (
          <div aria-hidden className="absolute inset-0 pointer-events-none p-4"
               style={{ font: fontStyle, whiteSpace: wordWrap ? 'pre-wrap' : 'pre', tabSize }}>
            {/* (visual hints only — keep light) */}
          </div>
        )}

        {/* Highlight overlay */}
        <div ref={highlightRef} aria-hidden
             className="absolute inset-0 overflow-hidden pointer-events-none p-4"
             style={{
               font: fontStyle,
               whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
               wordBreak: wordWrap ? 'break-all' : 'normal',
               overflowX: wordWrap ? 'hidden' : 'auto',
               tabSize,
             }}>
          <SyntaxHighlighter code={value} />
          {'\n'}
        </div>

        {/* Bracket match indicators (drawn as floating outlines) */}
        {matchingBrackets && (() => {
          const before1 = value.slice(0, matchingBrackets.a).split('\n');
          const before2 = value.slice(0, matchingBrackets.b).split('\n');
          const charW = fontSize * 0.6;
          const top1 = (before1.length - 1) * lineHeight - scrollTop + 16;
          const left1 = (before1[before1.length - 1].length) * charW + 16;
          const top2 = (before2.length - 1) * lineHeight - scrollTop + 16;
          const left2 = (before2[before2.length - 1].length) * charW + 16;
          return (
            <>
              <div className="absolute pointer-events-none border border-primary/60 rounded-sm" style={{ top: top1, left: left1, width: charW, height: lineHeight - 2 }} />
              <div className="absolute pointer-events-none border border-primary/60 rounded-sm" style={{ top: top2, left: left2, width: charW, height: lineHeight - 2 }} />
            </>
          );
        })()}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={e => { onChange(e.target.value); requestAnimationFrame(() => updateCursor(e.target as HTMLTextAreaElement)); }}
          onKeyDown={handleKeyDown}
          onSelect={e => updateCursor(e.currentTarget)}
          onClick={e => updateCursor(e.currentTarget)}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          className="absolute inset-0 p-4 bg-transparent resize-none focus:outline-none text-transparent caret-primary overflow-auto z-10 selection:bg-primary/30"
          style={{
            font: fontStyle,
            tabSize,
            whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
            overflowX: wordWrap ? 'hidden' : 'auto',
          }}
        />

        {/* Autocomplete */}
        {acPos && (
          <AutocompletePopup
            prefix={acPrefix}
            position={acPos}
            selectedIndex={acIndex}
            identifiers={identifiers}
            onSelect={acceptCompletion}
            onIndexChange={setAcIndex}
          />
        )}

        {/* Hover doc */}
        {hover && (() => {
          const doc = getHoverDoc(hover.word);
          if (!doc) return null;
          return (
            <div className="absolute z-40 pointer-events-none bg-card border border-border/60 rounded-md shadow-xl p-2 max-w-xs"
                 style={{ left: Math.min(hover.x, 400), top: hover.y }}>
              <div className="text-[11px] font-mono text-primary mb-0.5">{doc.title}</div>
              <div className="text-[11px] text-muted-foreground">{doc.doc}</div>
            </div>
          );
        })()}

        {/* Find / Replace */}
        {showFind && (
          <FindReplacePanel
            value={value}
            onChange={onChange}
            onClose={() => { setShowFind(false); setFindHighlights([]); }}
            onJump={(s, e) => { findJump(s, e); setFindHighlights([{ start: s, end: e }]); }}
            initialQuery={value.slice(cursorOffset, selectionEnd)}
          />
        )}
      </div>

      {/* Minimap */}
      {showMinimap && (
        <IdeMinimap
          code={value}
          scrollTop={scrollTop / lineHeight}
          totalLines={totalLines}
          visibleLines={(textareaRef.current?.clientHeight ?? 400) / lineHeight}
          onScroll={(line) => {
            const ta = textareaRef.current; if (!ta) return;
            ta.scrollTop = Math.max(0, (line - 5) * lineHeight);
          }}
        />
      )}
    </div>
  );
});
