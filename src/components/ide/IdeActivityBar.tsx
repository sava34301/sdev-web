import {
  FolderOpen, Search, ListTree, AlertCircle, Sparkles,
  Usb, BookOpen, Users, Languages, Settings, Eye, Maximize2, Minimize2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SidePanel } from '@/ide/types';

interface IdeActivityBarProps {
  sidePanel: SidePanel;
  onToggleSidePanel: (panel: SidePanel) => void;
  problemsCount: number;
  zenMode: boolean;
  onToggleZenMode: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function IdeActivityBar({
  sidePanel,
  onToggleSidePanel,
  problemsCount,
  zenMode,
  onToggleZenMode,
  isFullscreen,
  onToggleFullscreen,
}: IdeActivityBarProps) {
  const sidebarIcons = [
    { id: 'explorer' as SidePanel, icon: FolderOpen, label: 'Explorer (Ctrl+B)' },
    { id: 'search'   as SidePanel, icon: Search,    label: 'Search (Ctrl+Shift+F)' },
    { id: 'outline'  as SidePanel, icon: ListTree,  label: 'Outline (Ctrl+Shift+O)' },
    { id: 'problems' as SidePanel, icon: AlertCircle, label: `Problems (${problemsCount})` },
    { id: 'assistant' as SidePanel, icon: Sparkles,  label: 'AI Doctor — fix & explain' },
    { id: 'hardware' as SidePanel, icon: Usb,       label: 'Hardware — boards & uploader' },
    { id: 'runtime'  as SidePanel, icon: BookOpen,  label: 'Runtime & API Explorer' },
    { id: 'classroom' as SidePanel, icon: Users,    label: 'Live Classroom & Pair Rooms' },
    { id: 'personal' as SidePanel, icon: Languages, label: 'Personal sdev — dialects, libraries, extensions' },
    { id: 'settings' as SidePanel, icon: Settings,  label: 'Settings' },
  ];

  return (
    <div className="ide-activitybar w-12 flex-shrink-0 flex flex-col items-center py-2 gap-1">
      {sidebarIcons.map(({ id, icon: Icon, label }) => {
        const active = sidePanel === id;
        return (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onToggleSidePanel(sidePanel === id ? null : id)}
                data-active={active}
                className="ide-activity-btn"
                aria-label={label}
              >
                <Icon className="w-[18px] h-[18px]" />
                {id === 'problems' && problemsCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center shadow-md">
                    {problemsCount > 9 ? '9+' : problemsCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{label}</TooltipContent>
          </Tooltip>
        );
      })}
      <div className="flex-1" />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggleZenMode}
            data-active={zenMode}
            className="ide-activity-btn"
            aria-label="Zen Mode"
          >
            <Eye className="w-[18px] h-[18px]" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{zenMode ? 'Exit Zen Mode' : 'Zen Mode'}</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onToggleFullscreen}
            className="ide-activity-btn"
            aria-label="Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-[18px] h-[18px]" /> : <Maximize2 className="w-[18px] h-[18px]" />}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
      </Tooltip>
    </div>
  );
}
