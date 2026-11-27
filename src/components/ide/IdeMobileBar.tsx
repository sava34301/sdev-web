import { Files, Search, ListTree, Settings, TerminalSquare, Play } from 'lucide-react';

type Panel = 'explorer' | 'search' | 'outline' | 'settings';

interface Props {
  sidePanel: string | null;
  onTogglePanel: (p: Panel) => void;
  bottomOpen: boolean;
  onToggleBottom: () => void;
  onRun: () => void;
}

const ITEMS: { id: Panel; icon: typeof Files; label: string }[] = [
  { id: 'explorer', icon: Files, label: 'Files' },
  { id: 'search', icon: Search, label: 'Search' },
  { id: 'outline', icon: ListTree, label: 'Outline' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

/** Phone-only bottom bar: panels open as a drawer, the editor stays full width. */
export function IdeMobileBar({ sidePanel, onTogglePanel, bottomOpen, onToggleBottom, onRun }: Props) {
  return (
    <nav data-testid="ide-mobile-bar" aria-label="IDE panels" className="md:hidden flex flex-shrink-0 items-stretch border-t border-border bg-card">
      {ITEMS.map(({ id, icon: Icon, label }) => (
        <button key={id} data-testid={`ide-mobile-${id}`} onClick={() => onTogglePanel(id)} aria-pressed={sidePanel === id}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${sidePanel === id ? 'text-primary' : 'text-muted-foreground'}`}>
          <Icon className="h-[18px] w-[18px]" />{label}
        </button>
      ))}
      <button data-testid="ide-mobile-output" onClick={onToggleBottom} aria-pressed={bottomOpen}
        className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${bottomOpen ? 'text-primary' : 'text-muted-foreground'}`}>
        <TerminalSquare className="h-[18px] w-[18px]" />Output
      </button>
      <div className="flex items-center px-2">
        <button data-testid="ide-mobile-run" onClick={onRun} aria-label="Run"
          className="grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--lime))] text-[hsl(var(--ink))] active:scale-95 transition-transform">
          <Play className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
