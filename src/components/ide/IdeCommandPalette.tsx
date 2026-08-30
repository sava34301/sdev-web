import { useState, useEffect, useRef } from 'react';
import { FileCode, Play, Plus, FolderOpen, Search, Settings, BookOpen, Zap, Cpu, Command, Languages, Package, Blocks } from 'lucide-react';
import type { IdeFile, SidePanel } from './types';

interface Props {
  files: IdeFile[];
  onClose: () => void;
  onSelectFile: (id: string) => void;
  onNewFile: () => void;
  onRun: () => void;
  onTogglePanel: (panel: SidePanel) => void;
}

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  action: () => void;
  shortcut?: string;
  category: string;
}

export function IdeCommandPalette({ files, onClose, onSelectFile, onNewFile, onRun, onTogglePanel }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: PaletteItem[] = [
    { id: 'run', label: 'Run Program', description: 'Execute current file', icon: Play, action: onRun, shortcut: '⌃↵', category: 'Run' },
    { id: 'new', label: 'New File', description: 'Create a new sdev file', icon: Plus, action: onNewFile, shortcut: '⌃N', category: 'File' },
    { id: 'explorer', label: 'Toggle Explorer', description: 'Show/hide file explorer', icon: FolderOpen, action: () => onTogglePanel('explorer'), shortcut: '⌃B', category: 'View' },
    { id: 'search', label: 'Toggle Search', description: 'Search across files', icon: Search, action: () => onTogglePanel('search'), shortcut: '⌃F', category: 'View' },
    { id: 'settings', label: 'Open Settings', description: 'Editor preferences', icon: Settings, action: () => onTogglePanel('settings'), category: 'View' },
    { id: 'personal', label: 'Personal sdev', description: 'Dialects, libraries and extensions', icon: Languages, action: () => onTogglePanel('personal'), category: 'View' },
    { id: 'studio', label: 'Open Dialect Studio', description: 'Build sdev in your own words', icon: Languages, action: () => window.open('/dialects', '_blank'), category: 'Personal' },
    { id: 'registry', label: 'Open Library Registry', description: 'Browse and install sdev libraries', icon: Package, action: () => window.open('/libraries', '_blank'), category: 'Personal' },
    { id: 'extensions', label: 'Open Extensions', description: 'Add functions and operators to sdev', icon: Blocks, action: () => window.open('/extensions', '_blank'), category: 'Personal' },
    { id: 'docs', label: 'Open Documentation', description: 'View sdev language reference', icon: BookOpen, action: () => window.open('/docs', '_blank'), category: 'Help' },
    ...files.map(f => ({
      id: `file-${f.id}`, label: f.name, description: `Open ${f.name}`, icon: FileCode,
      action: () => onSelectFile(f.id), category: 'Files'
    })),
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); filtered[selected]?.action(); onClose(); }
    if (e.key === 'Escape') onClose();
  };

  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const categories = [...new Set(filtered.map(c => c.category))];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-card border border-border/60 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
          <Command className="w-4 h-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or file name…"
            className="flex-1 bg-transparent text-sm font-mono text-foreground placeholder:text-muted-foreground/50 outline-none"
          />
          <kbd className="text-[10px] text-muted-foreground border border-border/40 rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground/50 font-mono">
              No commands found for "{query}"
            </div>
          ) : categories.map(cat => (
            <div key={cat}>
              <div className="px-3 py-1 text-[10px] font-mono text-muted-foreground/50 uppercase tracking-wider">{cat}</div>
              {filtered.filter(c => c.category === cat).map((cmd, i) => {
                const globalIdx = filtered.indexOf(cmd);
                const Icon = cmd.icon;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => { cmd.action(); onClose(); }}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors text-sm ${
                      globalIdx === selected ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${globalIdx === selected ? 'bg-primary/20' : 'bg-muted/30'}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-xs">{cmd.label}</div>
                      {cmd.description && <div className="text-[10px] text-muted-foreground/60 truncate">{cmd.description}</div>}
                    </div>
                    {cmd.shortcut && (
                      <kbd className="text-[10px] text-muted-foreground border border-border/40 rounded px-1.5 py-0.5 font-mono flex-shrink-0">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="px-3 py-2 border-t border-border/40 flex items-center gap-3 text-[10px] text-muted-foreground/50 font-mono">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>ESC Close</span>
        </div>
      </div>
    </div>
  );
}
