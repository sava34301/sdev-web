import { ChevronRight, FileCode, Folder } from 'lucide-react';
import type { IdeFile, IdeFolder } from '@/ide/types';

interface Props {
  file?: IdeFile;
  folders: IdeFolder[];
  onSelectSymbol?: () => void;
}

export function IdeBreadcrumbs({ file, folders }: Props) {
  if (!file) return null;
  const path: string[] = [];
  let cursor: string | null | undefined = file.folderId ?? null;
  while (cursor) {
    const f = folders.find(x => x.id === cursor);
    if (!f) break;
    path.unshift(f.name);
    cursor = f.parentId;
  }

  return (
    <div className="flex items-center gap-1 px-3 py-1 text-[11px] font-mono text-muted-foreground bg-muted/5 border-b border-border/30 select-none flex-shrink-0">
      <span className="opacity-60">workspace</span>
      {path.map((p, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="w-3 h-3 opacity-40" />
          <Folder className="w-3 h-3 opacity-50" />
          <span>{p}</span>
        </span>
      ))}
      <ChevronRight className="w-3 h-3 opacity-40" />
      <FileCode className="w-3 h-3 text-primary/70" />
      <span className="text-foreground/90">{file.name}</span>
    </div>
  );
}
