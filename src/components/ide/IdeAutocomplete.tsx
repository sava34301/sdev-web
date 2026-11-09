import { useEffect, useRef } from 'react';
import { SDEV_KEYWORDS, SDEV_BUILTINS, SDEV_CONSTANTS, SDEV_SNIPPETS, type Snippet, type BuiltinDoc } from './languageData';

export type CompletionKind = 'keyword' | 'builtin' | 'constant' | 'snippet' | 'identifier';

export interface Completion {
  label: string;
  kind: CompletionKind;
  detail?: string;
  doc?: string;
  insertText: string;
  /** Cursor offset within insertText after insertion (for snippets) */
  cursorOffset?: number;
}

const KIND_COLOR: Record<CompletionKind, string> = {
  keyword:    'text-primary',
  builtin:    'text-neon-magenta',
  constant:   'text-neon-orange',
  snippet:    'text-neon-violet',
  identifier: 'text-foreground',
};

const KIND_LABEL: Record<CompletionKind, string> = {
  keyword: 'kw', builtin: 'fn', constant: 'const', snippet: 'snip', identifier: 'id',
};

interface Props {
  prefix: string;
  position: { top: number; left: number };
  selectedIndex: number;
  identifiers: string[];
  onSelect: (c: Completion) => void;
  onIndexChange: (i: number) => void;
}

export function buildCompletions(prefix: string, identifiers: string[]): Completion[] {
  const list: Completion[] = [];
  const lc = prefix.toLowerCase();

  for (const k of SDEV_KEYWORDS) {
    if (!lc || k.startsWith(lc)) list.push({ label: k, kind: 'keyword', insertText: k });
  }
  for (const c of SDEV_CONSTANTS) {
    if (!lc || c.toLowerCase().startsWith(lc)) list.push({ label: c, kind: 'constant', insertText: c });
  }
  for (const b of SDEV_BUILTINS) {
    if (!lc || b.name.toLowerCase().startsWith(lc)) {
      list.push({ label: b.name, kind: 'builtin', detail: b.signature, doc: b.doc, insertText: b.name });
    }
  }
  for (const s of SDEV_SNIPPETS) {
    if (!lc || s.prefix.toLowerCase().startsWith(lc)) {
      const clean = s.body.replace(/\$\d+/g, '');
      const firstSlot = s.body.indexOf('$1');
      list.push({
        label: s.prefix, kind: 'snippet', detail: s.description,
        insertText: clean,
        cursorOffset: firstSlot >= 0 ? firstSlot : clean.length,
      });
    }
  }
  for (const id of identifiers) {
    if (!lc || id.toLowerCase().startsWith(lc)) {
      if (!list.some(l => l.label === id)) list.push({ label: id, kind: 'identifier', insertText: id });
    }
  }
  // Order: snippets first if exact prefix match, then by length
  return list
    .sort((a, b) => {
      const ae = a.label.toLowerCase() === lc ? -2 : 0;
      const be = b.label.toLowerCase() === lc ? -2 : 0;
      const ap = a.label.toLowerCase().startsWith(lc) ? -1 : 0;
      const bp = b.label.toLowerCase().startsWith(lc) ? -1 : 0;
      return (ae + ap) - (be + bp) || a.label.length - b.label.length;
    })
    .slice(0, 30);
}

export function AutocompletePopup({ prefix, position, selectedIndex, identifiers, onSelect, onIndexChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const items = buildCompletions(prefix, identifiers);

  useEffect(() => {
    const el = ref.current?.children[selectedIndex] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (items.length === 0) return null;

  return (
    <div
      className="absolute z-50 w-80 max-h-72 overflow-y-auto bg-card border border-border/60 rounded-md shadow-2xl text-xs font-mono"
      style={{ top: position.top, left: position.left }}
      ref={ref}
      onMouseDown={e => e.preventDefault()}
    >
      {items.map((c, i) => (
        <div
          key={c.kind + ':' + c.label + ':' + i}
          onClick={() => onSelect(c)}
          onMouseEnter={() => onIndexChange(i)}
          className={`flex items-center gap-2 px-2 py-1 cursor-pointer ${
            i === selectedIndex ? 'bg-primary/15' : 'hover:bg-muted/30'
          }`}
        >
          <span className={`w-7 text-center text-[9px] uppercase tracking-wider rounded bg-muted/40 px-1 ${KIND_COLOR[c.kind]}`}>
            {KIND_LABEL[c.kind]}
          </span>
          <span className={`${KIND_COLOR[c.kind]} font-medium`}>{c.label}</span>
          {c.detail && <span className="text-muted-foreground/60 truncate">{c.detail}</span>}
        </div>
      ))}
    </div>
  );
}

export function getHoverDoc(word: string): { title: string; doc: string } | null {
  const b = SDEV_BUILTINS.find(x => x.name === word);
  if (b) return { title: b.signature, doc: b.doc };
  if (SDEV_KEYWORDS.includes(word)) return { title: word, doc: 'sdev keyword' };
  if (SDEV_CONSTANTS.includes(word)) return { title: word, doc: 'sdev constant' };
  return null;
}
