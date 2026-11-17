import { useState } from 'react';
import { Search, FileCode, ChevronRight, RefreshCw } from 'lucide-react';
import type { IdeFile } from './types';

interface Match {
  fileId: string;
  fileName: string;
  line: number;
  lineContent: string;
  index: number;
}

interface Props {
  files: IdeFile[];
  onSelectFile: (id: string) => void;
}

export function IdeSearchPanel({ files, onSelectFile }: Props) {
  const [query, setQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const matches: Match[] = [];
  if (query.trim()) {
    files.forEach(file => {
      file.content.split('\n').forEach((lineContent, i) => {
        const haystack = caseSensitive ? lineContent : lineContent.toLowerCase();
        const needle = caseSensitive ? query : query.toLowerCase();
        if (haystack.includes(needle)) {
          matches.push({ fileId: file.id, fileName: file.name, line: i + 1, lineContent: lineContent.trim(), index: matches.length });
        }
      });
    });
  }

  const byFile: Record<string, Match[]> = {};
  matches.forEach(m => { (byFile[m.fileId] = byFile[m.fileId] || []).push(m); });

  const toggleFile = (id: string) => {
    setExpandedFiles(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const highlightMatch = (text: string, q: string, cs: boolean) => {
    const needle = cs ? q : q.toLowerCase();
    const haystack = cs ? text : text.toLowerCase();
    const idx = haystack.indexOf(needle);
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-primary/30 text-primary rounded-sm">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/20">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-neon-cyan" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Search</span>
        </div>
        <button
          onClick={() => setShowReplace(!showReplace)}
          className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-neon-cyan transition-colors"
          title="Toggle replace"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search inputs */}
      <div className="p-2 space-y-2 border-b border-border/20">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground/50" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search…"
            className="w-full bg-background/60 border border-border/40 rounded px-7 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
          />
          <button
            onClick={() => setCaseSensitive(!caseSensitive)}
            title="Case sensitive"
            className={`absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1 rounded transition-colors ${caseSensitive ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground'}`}
          >
            Aa
          </button>
        </div>
        {showReplace && (
          <input
            value={replaceQuery}
            onChange={e => setReplaceQuery(e.target.value)}
            placeholder="Replace…"
            className="w-full bg-background/60 border border-border/40 rounded px-2 py-1.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50"
          />
        )}
        {query && (
          <div className="text-[10px] text-muted-foreground/60 font-mono px-1">
            {matches.length} result{matches.length !== 1 ? 's' : ''} in {Object.keys(byFile).length} file{Object.keys(byFile).length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {!query.trim() && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground/40">
            <Search className="w-8 h-8" />
            <span className="text-xs font-mono">Type to search</span>
          </div>
        )}
        {Object.entries(byFile).map(([fileId, fileMatches]) => {
          const isExpanded = !expandedFiles.has(fileId);
          return (
            <div key={fileId}>
              <div
                onClick={() => toggleFile(fileId)}
                className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-muted/20 border-b border-border/10"
              >
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                <FileCode className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-xs font-mono text-foreground flex-1 truncate">{fileMatches[0].fileName}</span>
                <span className="text-[10px] text-muted-foreground/50 bg-muted/30 rounded px-1">{fileMatches.length}</span>
              </div>
              {isExpanded && fileMatches.map((match, i) => (
                <div
                  key={i}
                  onClick={() => onSelectFile(fileId)}
                  className="flex items-start gap-2 px-4 py-1 cursor-pointer hover:bg-primary/5 group"
                >
                  <span className="text-[10px] text-muted-foreground/40 font-mono w-6 flex-shrink-0 text-right pt-0.5">{match.line}</span>
                  <span className="text-[11px] font-mono text-muted-foreground group-hover:text-foreground truncate">
                    {highlightMatch(match.lineContent, query, caseSensitive)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
