export interface IdeFile {
  id: string;
  name: string;
  content: string;
  modified?: boolean;
  folderId?: string | null; // null = root
  cloudId?: string | null;  // backing cloud row id (when synced)
  /** hidden: what the understander made of this exact content, so a re-run skips the thinking */
  understood?: {
    key: string;
    /** fnv-1a checksum of the stripped written body this reading belongs to */
    bodySum?: string;
    source: string;
    notesCount?: number;
    brainUsed?: 'none' | 'local' | 'online';
    fromCache?: boolean;
    detectedLanguage?: string | null;
    /** number of compact recipe ops when stored/loaded via the hidden file signature */
    recipeOps?: number;
  };
}

export interface IdeFolder {
  id: string;
  name: string;
  parentId: string | null;
  cloudId?: string | null;
  expanded?: boolean;
}

export type RunMode = 'interpreter' | 'vm';
export type SidePanel = 'explorer' | 'search' | 'outline' | 'problems' | 'assistant' | 'settings' | 'hardware' | 'personal' | 'runtime' | 'classroom' | null;

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
