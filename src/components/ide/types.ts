export interface IdeFile {
  id: string;
  name: string;
  content: string;
  modified?: boolean;
  folderId?: string | null; // null = root
  cloudId?: string | null;  // backing cloud row id (when synced)
}

export interface IdeFolder {
  id: string;
  name: string;
  parentId: string | null;
  cloudId?: string | null;
  expanded?: boolean;
}

export type RunMode = 'interpreter' | 'vm';
export type SidePanel = 'explorer' | 'search' | 'outline' | 'problems' | 'assistant' | 'settings' | 'hardware' | 'personal' | null;

export interface IdeSettings {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  theme: 'dark' | 'midnight' | 'sky' | 'sunset' | 'light';
  minimap: boolean;
  lineNumbers: boolean;
  autoSave: boolean;
  fontFamily: string;
  liquidGlass?: boolean;
}
