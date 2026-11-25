import { X, FileCode2, FileText, FileJson, Braces, Circle } from 'lucide-react';
import type { IdeFile } from '@/ide/types';

interface Props {
  files: IdeFile[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

function fileIcon(name: string) {
  if (name.endsWith('.md')) return { Icon: FileText, color: 'text-brand-mist' };
  if (name.endsWith('.json')) return { Icon: FileJson, color: 'text-brand-amber' };
  if (name.endsWith('.js') || name.endsWith('.ts')) return { Icon: Braces, color: 'text-brand-green' };
  if (name.endsWith('.sdev')) return { Icon: FileCode2, color: 'text-primary' };
  return { Icon: FileCode2, color: 'text-muted-foreground' };
}

export function IdeTabs({ files, activeId, onSelect, onClose }: Props) {
  return (
    <div className="ide-tabsbar flex items-center gap-1 px-2 py-1.5 overflow-x-auto flex-shrink-0 scrollbar-none">
      {files.map(file => {
        const isActive = file.id === activeId;
        const { Icon, color } = fileIcon(file.name);
        return (
          <div
            key={file.id}
            data-active={isActive}
            onClick={() => onSelect(file.id)}
            className="ide-tab group"
          >
            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? color : 'opacity-60'}`} />
            <span className="truncate max-w-[160px]">{file.name}</span>
            <button
              onClick={e => { e.stopPropagation(); if (files.length > 1) onClose(file.id); }}
              className={`ml-1 w-4 h-4 flex items-center justify-center rounded hover:bg-muted/60 hover:text-destructive transition-all ${
                isActive ? 'opacity-70' : 'opacity-0 group-hover:opacity-70'
              }`}
              aria-label="Close tab"
            >
              {file.modified
                ? <Circle className="w-2 h-2 fill-current" />
                : <X className="w-3 h-3" />}
            </button>
          </div>
        );
      })}
      <div className="flex-1" />
    </div>
  );
}
