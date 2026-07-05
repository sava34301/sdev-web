import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { SEO } from '@/components/SEO';
import { useNavigate } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { IdeFileTree } from '@/components/ide/IdeFileTree';
import { IdeEditor, type IdeEditorHandle } from '@/components/ide/IdeEditor';
import { IdeTabs } from '@/components/ide/IdeTabs';
import { IdeTerminal } from '@/components/ide/IdeTerminal';
import { IdeStatusBar } from '@/components/ide/IdeStatusBar';
import { IdeCommandPalette } from '@/components/ide/IdeCommandPalette';
import { IdeSearchPanel } from '@/components/ide/IdeSearchPanel';
import { IdeSettingsPanel } from '@/components/ide/IdeSettingsPanel';
import { IdeOutline } from '@/components/ide/IdeOutline';
import { IdeProblems, lintSdev, type Problem } from '@/components/ide/IdeProblems';
import { IdeBreadcrumbs } from '@/components/ide/IdeBreadcrumbs';
import { IdeGoToLine } from '@/components/ide/IdeGoToLine';
import { IdeAssistantPanel } from '@/components/ide/IdeAssistantPanel';
import { formatSdev } from '@/components/ide/formatSdev';
import { CanvasPanel, CanvasHandle } from '@/components/CanvasPanel';
import type { GraphicsCommand, TurtleState } from '@/lang/graphics';
import { createGraphicsBuiltins } from '@/lang/graphics';
import { Lexer } from '@/lang/lexer';
import { Parser } from '@/lang/parser';
import { Interpreter } from '@/lang/interpreter';
import { SdevError } from '@/lang/errors';
import { supabase } from '@/integrations/supabase/client';
import { Compiler } from '@/lang/compiler';

import { Button } from '@/components/ui/button';
import {
  Play, Zap, ArrowLeft, Download, Cpu, Save, Settings,
  ChevronDown, Search, Terminal, Code, BookOpen, RotateCcw,
  Maximize2, Minimize2, SplitSquareHorizontal, FolderOpen, Command,
  Bug, Palette, X, Languages, RefreshCw, CheckCircle2, Eye, EyeOff,
  AlertCircle, Hash, Wand2, ListTree, ArrowRight, Sparkles, Github, Globe, Usb,
} from 'lucide-react';
import { HardwarePanel } from '@/components/ide/HardwarePanel';
import { GitHubPushDialog } from '@/components/ide/GitHubPushDialog';
import { DesktopNativeButton } from '@/components/ide/DesktopNativeButton';
import { toast } from 'sonner';
import { stripBoardBlocks } from '@/lang/hardware/strip';
import type { IdeFile, IdeFolder, SidePanel, IdeSettings } from '@/components/ide/types';
import { createUiBuiltins, type UiState, type UiCallback } from '@/lang/ui';
import { createWebBuiltins, type WebState } from '@/lang/web';
import { AppPreviewPanel } from '@/components/ide/AppPreviewPanel';
import { WebPreviewPanel } from '@/components/ide/WebPreviewPanel';
import { useWorkspaceSync } from '@/hooks/useWorkspaceSync';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCodeTranslation, mightNeedTranslation } from '@/hooks/useCodeTranslation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserMenu } from '@/components/ide/UserMenu';
import { useCloudFiles } from '@/hooks/useCloudFiles';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'react-router-dom';
import sdevLogo from '@/assets/sdev-logo.png';
import sdevStubAsset from '@/runtime/sdev-stub-win-x64.exe.asset.json';

const patchLegacyRuntimeStub = (stub: Uint8Array): boolean => {
  // Existing uploaded Windows runtimes contain the web DSL helper named
  // canvas(), which overwrites graphics canvas() inside the executable. Patch
  // that single embedded string in-place so downloaded .exe files use the
  // native canvas window without needing users to wait for a CDN replacement.
  const pattern = new TextEncoder().encode('"object",\n  "canvas",\n  "svg"');
  const replacement = new TextEncoder().encode('"object",\n  "xanvas",\n  "svg"');
  outer: for (let i = 0; i <= stub.length - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) {
      if (stub[i + j] !== pattern[j]) continue outer;
    }
    stub.set(replacement, i);
    return true;
  }
  return false;
};

const STARTER_FILES: IdeFile[] = [
  {
    id: '1',
    name: 'main.sdev',
    content: `// ═══════════════════════════════════════
// Welcome to the sdev IDE!
// Press Ctrl+Enter to run your code
// ═══════════════════════════════════════

forge message be "Hello, World!"
speak(message)

// Functions:
conjure greet(name) ::
  yield "Hello, " + name + "!"
;;

speak(greet("sdev"))

// Lists and higher-order functions:
forge nums be [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
forge evens be sift(nums, x -> x % 2 equals 0)
forge doubled be each(evens, x -> x * 2)
speak("Doubled evens:", doubled)
`,
  },
  {
    id: '2',
    name: 'graphics.sdev',
    content: `// Psychedelic Turtle Spiral
canvas(400, 400)
clear("#0d0d15")
turtle()

forge i be 0
cycle i < 200 ::
  pencolor(hue(i * 1.8))
  penwidth(1 + i * 0.02)
  forward(i * 0.7)
  right(29)
  i be i + 1
;;
`,
  },
  {
    id: '3',
    name: 'oop.sdev',
    content: `// Object-Oriented Programming in sdev

essence Animal ::
  conjure init(self, name, sound) ::
    self.name be name
    self.sound be sound
    self.energy be 100
  ;;

  conjure speak(self) ::
    speak(self.name + " says: " + self.sound + "!")
  ;;

  conjure eat(self, food) ::
    self.energy be self.energy + 20
    speak(self.name + " eats " + food + " (energy: " + morph(self.energy, "text") + ")")
  ;;
;;

essence Dog extend Animal ::
  conjure init(self, name, breed) ::
    super.init(name, "Woof")
    self.breed be breed
  ;;

  conjure fetch(self) ::
    self.energy be self.energy - 15
    speak(self.name + " the " + self.breed + " fetches the ball!")
  ;;
;;

forge buddy be new Dog("Buddy", "Golden Retriever")
buddy.speak()
buddy.eat("kibble")
buddy.fetch()
speak("Energy left:", buddy.energy)
`,
  },
  {
    id: '4',
    name: 'algorithms.sdev',
    content: `// Classic Algorithms

// Fibonacci (recursive)
conjure fib(n) ::
  ponder n <= 1 :: yield n ;;
  yield fib(n - 1) + fib(n - 2)
;;

speak("Fibonacci:")
forge i be 0
cycle i < 10 ::
  speak("  fib(" + morph(i, "text") + ") =", fib(i))
  i be i + 1
;;

// Bubble sort
conjure bubbleSort(arr) ::
  forge n be measure(arr)
  forge sorted be clone(arr)
  forge i be 0
  cycle i < n ::
    forge j be 0
    cycle j < n - i - 1 ::
      ponder sorted[j] > sorted[j + 1] ::
        forge temp be sorted[j]
        sorted[j] be sorted[j + 1]
        sorted[j + 1] be temp
      ;;
      j be j + 1
    ;;
    i be i + 1
  ;;
  yield sorted
;;

forge arr be [64, 34, 25, 12, 22, 11, 90]
speak("\\nOriginal:", arr)
speak("Sorted:", bubbleSort(arr))

// Binary search
conjure binarySearch(arr, target) ::
  forge left be 0
  forge right be measure(arr) - 1
  cycle left <= right ::
    forge mid be ground((left + right) / 2)
    ponder arr[mid] equals target ::
      yield mid
    ;; otherwise ponder arr[mid] < target ::
      left be mid + 1
    ;; otherwise ::
      right be mid - 1
    ;;
  ;;
  yield -1
;;

forge sorted be [1, 3, 5, 7, 9, 11, 13, 15]
speak("\\nBinary search for 7:", binarySearch(sorted, 7))
speak("Binary search for 6:", binarySearch(sorted, 6))
`,
  },
  {
    id: '5',
    name: 'data-structures.sdev',
    content: `// Data Structures Demo

speak("=== Stack ===")
forge stack be Stack()
stack.push(10)
stack.push(20)
stack.push(30)
speak("Push 10, 20, 30")
speak("Peek:", stack.peek())
speak("Pop:", stack.pop())
speak("Size:", stack.size())

speak("")
speak("=== Queue ===")
forge queue be Queue()
queue.enqueue("first")
queue.enqueue("second")
queue.enqueue("third")
speak("Dequeue:", queue.dequeue())
speak("Peek:", queue.peek())

speak("")
speak("=== Set ===")
forge s be Set()
s.add(1)
s.add(2)
s.add(2)
s.add(3)
speak("Set values (no dupes):", s.values())
speak("Has 2:", s.has(2))
s.remove(2)
speak("After removing 2:", s.values())

speak("")
speak("=== Map ===")
forge m be Map()
m.set("name", "Alice")
m.set("age", 30)
m.set("city", "NYC")
speak("Get name:", m.get("name"))
speak("Keys:", m.keys())
speak("Has age:", m.has("age"))
`,
  },
  {
    id: '99',
    name: 'blink.sdev',
    content: `// Arduino Uno — classic blink, written in sdev.
// Open the Hardware panel (Usb icon), pick your board, hit Detect Board,
// then Compile + Upload. Requires Chrome / Edge / Opera on desktop.

board "uno" {
  conjure setup() {
    pin 13 be output
    serial begin 9600
  }

  conjure loop() {
    pin 13 write high
    serial println "ON"
    wait 500
    pin 13 write low
    serial println "OFF"
    wait 500
  }
}
`,
  },
];

const SNIPPETS: Record<string, string> = {
  'hello': 'speak("Hello, World!")\n',
  'forge': 'forge $1 be $2\n',
  'conjure': 'conjure $1($2) ::\n  $3\n;;\n',
  'ponder': 'ponder $1 ::\n  $2\n;;\n',
  'cycle': 'cycle $1 ::\n  $2\n;;\n',
  'within': 'within $1 be $2 ::\n  $3\n;;\n',
  'class': 'essence $1 ::\n  conjure init(self) ::\n    $2\n  ;;\n;;\n',
};

let fileIdCounter = 10;
type BottomPanel = 'terminal' | 'canvas' | 'app' | 'web' | 'problems';

const DEFAULT_SETTINGS: IdeSettings = {
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  theme: 'dark',
  minimap: false,
  lineNumbers: true,
  autoSave: true,
  fontFamily: 'JetBrains Mono',
  liquidGlass: false,
};

// IDE theme palettes — applied as CSS custom properties directly on the IDE root
const IDE_THEME_VARS: Record<IdeSettings['theme'], Record<string, string>> = {
  dark: {
    '--background': '212 45% 6%',  '--foreground': '200 25% 96%',
    '--card': '212 40% 9%',        '--card-foreground': '200 25% 96%',
    '--popover': '212 40% 10%',    '--popover-foreground': '200 25% 96%',
    '--muted': '212 30% 14%',      '--muted-foreground': '210 18% 65%',
    '--border': '212 30% 18%',     '--input': '212 30% 12%',
    '--primary': '205 90% 58%',    '--primary-foreground': '212 45% 6%',
    '--secondary': '188 78% 60%',  '--secondary-foreground': '212 45% 6%',
    '--accent': '25 92% 58%',      '--accent-foreground': '212 45% 6%',
    '--ring': '205 90% 58%',
  },
  midnight: {
    '--background': '230 45% 5%',  '--foreground': '220 25% 94%',
    '--card': '230 42% 8%',        '--card-foreground': '220 25% 94%',
    '--popover': '230 42% 9%',     '--popover-foreground': '220 25% 94%',
    '--muted': '230 32% 13%',      '--muted-foreground': '220 18% 65%',
    '--border': '230 32% 17%',     '--input': '230 32% 11%',
    '--primary': '248 75% 66%',    '--primary-foreground': '230 45% 5%',
    '--secondary': '195 80% 60%',  '--secondary-foreground': '230 45% 5%',
    '--accent': '195 90% 62%',     '--accent-foreground': '230 45% 5%',
    '--ring': '248 75% 66%',
  },
  sky: {
    '--background': '205 80% 10%', '--foreground': '200 35% 97%',
    '--card': '205 65% 14%',       '--card-foreground': '200 35% 97%',
    '--popover': '205 65% 15%',    '--popover-foreground': '200 35% 97%',
    '--muted': '205 50% 18%',      '--muted-foreground': '200 25% 75%',
    '--border': '205 50% 24%',     '--input': '205 55% 16%',
    '--primary': '195 95% 62%',    '--primary-foreground': '205 80% 10%',
    '--secondary': '188 85% 65%',  '--secondary-foreground': '205 80% 10%',
    '--accent': '25 95% 62%',      '--accent-foreground': '205 80% 10%',
    '--ring': '195 95% 62%',
  },
  sunset: {
    '--background': '18 35% 8%',   '--foreground': '35 35% 96%',
    '--card': '18 32% 11%',        '--card-foreground': '35 35% 96%',
    '--popover': '18 32% 12%',     '--popover-foreground': '35 35% 96%',
    '--muted': '18 25% 16%',       '--muted-foreground': '30 18% 70%',
    '--border': '18 28% 20%',      '--input': '18 28% 14%',
    '--primary': '25 95% 62%',     '--primary-foreground': '18 35% 8%',
    '--secondary': '350 80% 65%',  '--secondary-foreground': '18 35% 8%',
    '--accent': '205 90% 62%',     '--accent-foreground': '18 35% 8%',
    '--ring': '25 95% 62%',
  },
  light: {
    '--background': '205 60% 97%', '--foreground': '215 35% 14%',
    '--card': '0 0% 100%',         '--card-foreground': '215 35% 14%',
    '--popover': '0 0% 100%',      '--popover-foreground': '215 35% 14%',
    '--muted': '205 35% 92%',      '--muted-foreground': '215 20% 40%',
    '--border': '205 30% 84%',     '--input': '205 40% 95%',
    '--primary': '205 88% 48%',    '--primary-foreground': '0 0% 100%',
    '--secondary': '188 75% 45%',  '--secondary-foreground': '0 0% 100%',
    '--accent': '22 92% 52%',      '--accent-foreground': '0 0% 100%',
    '--ring': '205 88% 48%',
  },
};

// Load/save to localStorage (used for guests; logged-in users sync to cloud)
const LS_FILES = 'sdev-ide-files';
const LS_FOLDERS = 'sdev-ide-folders';
const LS_ACTIVE = 'sdev-ide-active';
const LS_OPEN = 'sdev-ide-open';
const LS_SETTINGS = 'sdev-ide-settings';

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  } catch {
    return fallback;
  }
}

const SUPPORTED_LANGUAGES = [
  { value: 'auto', label: '🌐 Auto-detect' },
  { value: 'Spanish', label: '🇪🇸 Spanish' },
  { value: 'French', label: '🇫🇷 French' },
  { value: 'German', label: '🇩🇪 German' },
  { value: 'Portuguese', label: '🇧🇷 Portuguese' },
  { value: 'Italian', label: '🇮🇹 Italian' },
  { value: 'Dutch', label: '🇳🇱 Dutch' },
  { value: 'Russian', label: '🇷🇺 Russian' },
  { value: 'Chinese', label: '🇨🇳 Chinese' },
  { value: 'Japanese', label: '🇯🇵 Japanese' },
  { value: 'Korean', label: '🇰🇷 Korean' },
  { value: 'Arabic', label: '🇸🇦 Arabic' },
  { value: 'Hindi', label: '🇮🇳 Hindi' },
  { value: 'Turkish', label: '🇹🇷 Turkish' },
  { value: 'Polish', label: '🇵🇱 Polish' },
  { value: 'Swedish', label: '🇸🇪 Swedish' },
  { value: 'Norwegian', label: '🇳🇴 Norwegian' },
  { value: 'Danish', label: '🇩🇰 Danish' },
  { value: 'Finnish', label: '🇫🇮 Finnish' },
  { value: 'Greek', label: '🇬🇷 Greek' },
  { value: 'Hebrew', label: '🇮🇱 Hebrew' },
  { value: 'Ukrainian', label: '🇺🇦 Ukrainian' },
  { value: 'Czech', label: '🇨🇿 Czech' },
  { value: 'Romanian', label: '🇷🇴 Romanian' },
  { value: 'Hungarian', label: '🇭🇺 Hungarian' },
  { value: 'Bulgarian', label: '🇧🇬 Bulgarian' },
  { value: 'English', label: '🇬🇧 English (no translate)' },
];

export default function IDEPage() {
  const navigate = useNavigate();

  // Persistent state
  const [files, setFiles] = useState<IdeFile[]>(() => loadFromStorage(LS_FILES, STARTER_FILES));
  const [folders, setFolders] = useState<IdeFolder[]>(() => loadFromStorage(LS_FOLDERS, []));
  const [activeId, setActiveId] = useState<string>(() => loadFromStorage(LS_ACTIVE, '1'));
  const [openIds, setOpenIds] = useState<string[]>(() => loadFromStorage(LS_OPEN, ['1']));
  const [settings, setSettings] = useState<IdeSettings>(() => loadFromStorage(LS_SETTINGS, DEFAULT_SETTINGS));

  // UI state
  const [sidePanel, setSidePanel] = useState<SidePanel>('explorer');
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('terminal');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runMode, setRunMode] = useState<'interpreter' | 'vm'>('interpreter');

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [translatedContent, setTranslatedContent] = useState<Map<string, string>>(new Map());
  const [showTranslated, setShowTranslated] = useState(false);
  const { isTranslating, lastResult, translate } = useCodeTranslation();

  // Execution state
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [graphicsCommands, setGraphicsCommands] = useState<GraphicsCommand[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Ready');
  const [execTime, setExecTime] = useState<number | null>(null);

  // UI app preview state
  const [uiState, setUiState] = useState<UiState | null>(null);
  const uiStateRef = useRef<UiState | null>(null);
  const uiHandlersRef = useRef<Map<number, UiCallback>>(new Map());
  const uiHandlerIdRef = useRef(0);

  // Web (HTML/CSS/JS) preview state
  const [webState, setWebState] = useState<WebState | null>(null);

  // Cursor position
  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [selection, setSelection] = useState(0);

  const canvasRef = useRef<CanvasHandle>(null);
  const editorRef = useRef<IdeEditorHandle>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pro IDE state
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [showGitHubPush, setShowGitHubPush] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  // Auth + cloud sync
  const { user } = useAuth();
  const { recordRun } = useCloudFiles();
  const [searchParams] = useSearchParams();
  // Map of local file id → cloud file id (so "Save" updates instead of duplicates)
  const [cloudIds, setCloudIds] = useState<Record<string, string>>({});

  const activeFile = files.find(f => f.id === activeId);
  const openFiles = openIds.map(id => files.find(f => f.id === id)).filter(Boolean) as IdeFile[];

  // Import code from a Gist (sessionStorage) on mount
  useEffect(() => {
    const imported = sessionStorage.getItem('sdev:imported_code');
    const importedName = sessionStorage.getItem('sdev:imported_name');
    if (imported) {
      sessionStorage.removeItem('sdev:imported_code');
      sessionStorage.removeItem('sdev:imported_name');
      const id = String(++fileIdCounter);
      const name = (importedName || 'imported').replace(/[^\w.\-]/g, '_') + (importedName?.endsWith('.sdev') ? '' : '.sdev');
      const file: IdeFile = { id, name, content: imported };
      setFiles(prev => [...prev, file]);
      setOpenIds(prev => [...prev, id]);
      setActiveId(id);
      toast.success('Imported gist into IDE');
    }
  }, []);

  // Load a cloud file when ?cloud=<id> is present
  useEffect(() => {
    const cloudParam = searchParams.get('cloud');
    if (!cloudParam || !user) return;
    (async () => {
      const { data } = await supabase.from('code_files').select('*').eq('id', cloudParam).maybeSingle();
      if (!data) return;
      const id = String(++fileIdCounter);
      const file: IdeFile = { id, name: data.name, content: data.content, cloudId: data.id };
      setFiles(prev => [...prev, file]);
      setOpenIds(prev => [...prev, id]);
      setActiveId(id);
      setCloudIds(prev => ({ ...prev, [id]: data.id }));
      toast.success('Loaded ' + data.name);
    })();
  }, [searchParams, user]);

  // Persist to localStorage (guests + as backup for logged-in users)
  useEffect(() => { localStorage.setItem(LS_FILES, JSON.stringify(files)); }, [files]);
  useEffect(() => { localStorage.setItem(LS_FOLDERS, JSON.stringify(folders)); }, [folders]);
  useEffect(() => {
    localStorage.setItem(LS_ACTIVE, JSON.stringify(activeId));
    localStorage.setItem(LS_OPEN, JSON.stringify(openIds));
  }, [activeId, openIds]);
  useEffect(() => {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  // ─────── Cloud workspace sync (logged-in users) ───────
  const workspaceSnapshot = user ? { files, folders, openIds, activeId } : null;
  const { hydrated, isSyncing, lastSavedAt } = useWorkspaceSync(workspaceSnapshot, !!user);
  const hydratedAppliedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || hydratedAppliedRef.current) return;
    hydratedAppliedRef.current = true;
    if (!hydrated.hasRemoteData) {
      setCloudIds({});
      setFiles(prev => prev.map(file => ({ ...file, cloudId: null })));
      return;
    }
    setFolders(hydrated.folders);
    setFiles(hydrated.files);
    if (hydrated.activeId) setActiveId(hydrated.activeId);
    setOpenIds(hydrated.openIds);
    if (hydrated.files.length > 0) toast.success(`Restored ${hydrated.files.length} files from cloud`);
  }, [hydrated]);
  // Reset hydration flag when user changes (logout/login)
  useEffect(() => { hydratedAppliedRef.current = false; }, [user?.id]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'p') { e.preventDefault(); setShowCommandPalette(true); }
      if (ctrl && e.key === 'Enter') { e.preventDefault(); runCode(); }
      if (ctrl && e.key === 's') { e.preventDefault(); downloadCurrentFile(); toast.success('File saved!'); }
      if (ctrl && e.key === 'b') { e.preventDefault(); setSidePanel(p => p === 'explorer' ? null : 'explorer'); }
      if (ctrl && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); setSidePanel(p => p === 'search' ? null : 'search'); }
      if (ctrl && e.shiftKey && (e.key === 'O' || e.key === 'o')) { e.preventDefault(); setSidePanel(p => p === 'outline' ? null : 'outline'); }
      if (ctrl && e.shiftKey && (e.key === 'M' || e.key === 'm')) { e.preventDefault(); setBottomPanel('problems'); }
      if (ctrl && e.shiftKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); setShowCommandPalette(true); }
      if (ctrl && e.key === 'g') { e.preventDefault(); setShowGoToLine(true); }
      if (e.key === 'F1') { e.preventDefault(); setShowCommandPalette(true); }
      if (e.key === 'F11') { e.preventDefault(); setIsFullscreen(f => !f); }
      if (ctrl && e.key === '`') { e.preventDefault(); setBottomPanel('terminal'); }
      if (ctrl && e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); setZenMode(z => !z); }
      if (e.key === 'Escape') { setShowCommandPalette(false); setShowGoToLine(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeFile]);

  // Live linting (problems)
  const problems: Problem[] = useMemo(
    () => activeFile ? lintSdev(activeFile.content) : [],
    [activeFile?.content]
  );

  const formatCurrent = useCallback(() => {
    if (!activeFile) return;
    const formatted = formatSdev(activeFile.content, settings.tabSize);
    setFiles(prev => prev.map(f => f.id === activeId ? { ...f, content: formatted, modified: true } : f));
    toast.success('Formatted');
  }, [activeFile, activeId, settings.tabSize]);

  const updateActiveContent = useCallback((content: string) => {
    setFiles(prev => prev.map(f => f.id === activeId ? { ...f, content, modified: true } : f));
    if (settings.autoSave) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        setFiles(prev => prev.map(f => f.id === activeId ? { ...f, modified: false } : f));
        setStatusMsg('Auto-saved');
        setTimeout(() => setStatusMsg('Ready'), 1500);
      }, 1500);
    }
  }, [activeId, settings.autoSave]);

  const runCode = useCallback(async () => {
    if (!activeFile) return;

    // ─── v2 "Prism" runtime short-circuit ───
    // Three v2 execution paths:
    //   • JS reference runtime (default v2): pure JavaScript interpreter
    //   • WASM stage-0 (`#!sdev v2-wasm` or pref `v2-wasm`): real WebAssembly
    //     execution via the hand-written seed VM (lang/bootstrap/seed.wat).
    //     Falls back to JS runtime if the source uses a feature outside the
    //     bootstrap subset.
    const rawSrc = activeFile.content;
    const head10 = rawSrc.split('\n', 10).map(l => l.trim());
    const shebangV2Wasm = head10.some(l => l.startsWith('#!sdev v2-wasm'));
    const shebangV2 = head10.some(l => l.startsWith('#!sdev v2') && !l.startsWith('#!sdev v2-wasm'));
    const shebangV1 = head10.some(l => l.startsWith('#!sdev v1'));
    const runtimePref = (typeof localStorage !== 'undefined' && localStorage.getItem('sdev_runtime')) || null;
    const useV2Wasm = shebangV2Wasm || (!shebangV1 && !shebangV2 && runtimePref === 'v2-wasm');
    const useV2 = !useV2Wasm && (shebangV2 || (!shebangV1 && runtimePref === 'v2'));

    if (useV2Wasm) {
      setIsRunning(true);
      setStatusMsg('Running (v2 · WASM)…');
      setUiState(null); setWebState(null);
      try {
        const { runWasm, WasmSubsetError } = await import('@/lang-bridge/wasm-runtime');
        try {
          const r = await runWasm(rawSrc);
          setOutput(r.output);
          setStatusMsg(r.success ? 'Done (v2 · WASM)' : `✗ ${r.error ?? 'error'}`);
        } catch (e) {
          if (e instanceof WasmSubsetError) {
            // Graceful fallback to JS v2 runtime for out-of-subset features.
            const { run: runV2 } = await import('../../lang/runtime/v2.js') as {
              run: (src: string, opts?: { onOutput?: (l: string) => void }) => { success: boolean; output: string[]; error: string | null };
            };
            const lines: string[] = [];
            const r = runV2(rawSrc, { onOutput: (l) => lines.push(l) });
            setOutput(r.output.length ? r.output : lines);
            setStatusMsg(r.success ? 'Done (v2 · JS fallback)' : `✗ ${r.error ?? 'error'}`);
          } else throw e;
        }
      } catch (e) {
        setStatusMsg(`✗ v2-wasm: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    if (useV2) {
      setIsRunning(true);
      setStatusMsg('Running (v2)…');
      setUiState(null);
      setWebState(null);
      try {
        const { run: runV2 } = await import('../../lang/runtime/v2.js') as {
          run: (src: string, opts?: { onOutput?: (l: string) => void }) => { success: boolean; output: string[]; error: string | null };
        };
        const lines: string[] = [];
        const r = runV2(rawSrc, { onOutput: (l) => lines.push(l) });
        setOutput(r.output.length ? r.output : lines);
        setStatusMsg(r.success ? 'Done (v2)' : `✗ ${r.error ?? 'error'}`);
      } catch (e) {
        setStatusMsg(`✗ v2: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsRunning(false);
      }
      return;
    }


    let code = stripBoardBlocks(activeFile.content);
    const outputLines: string[] = [];
    const commands: GraphicsCommand[] = [];
    let turtleState: TurtleState = { x: 200, y: 200, angle: -90, penDown: true, color: '#00ff88', width: 2 };
    uiStateRef.current = null;
    setUiState(null);
    setWebState(null);
    setIsRunning(true);
    setStatusMsg('Running…');

    // ─── Hybrid translation pre-pass ───
    // Stage 1: dictionary + fuzzy (sync, in Lexer). Stage 2: AI fallback
    // only fires when foreign-script words remain after stage 1.
    try {
      const { translateSource } = await import('@/lang/translator');
      const stage1 = translateSource(code, selectedLanguage);
      const stripped = stage1.translated
        .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, '')
        .replace(/(\/\/|#)[^\n]*/g, '');
      if (/[\u00A0-\uFFFF]{3,}/.test(stripped)) {
        setStatusMsg('Translating with AI…');
        try {
          const { data } = await supabase.functions.invoke('translate-fuzzy', {
            body: { code: stage1.translated, original: code, sourceLanguage: stage1.detectedLanguage ?? selectedLanguage },
          });
          if (data?.translated) {
            code = data.translated;
            if (data.usedAI) toast.info('Translated with AI fallback');
          } else {
            code = stage1.translated;
          }
        } catch {
          code = stage1.translated;
        }
      } else {
        code = stage1.translated;
      }
    } catch {/* fallback to raw lexer */}

    // ─── Module linking ───
    // Resolve `link "file.sdev"` directives by inlining other workspace files.
    try {
      const { resolveLinks } = await import('@/lang/linker');
      code = resolveLinks(
        code,
        files.map(f => ({ name: f.name, content: f.content })),
        { entryName: activeFile.name }
      );
    } catch {/* linker is best-effort */}

    // Translation already applied above — disable Lexer's built-in pass.
    const lexerOpts = { sourceLanguage: 'English' as const, translate: false };

    const t0 = performance.now();

    try {
      let detectedLanguage: string | null = null;
      if (runMode === 'interpreter') {
        const lexer = new Lexer(code, lexerOpts);
        const tokens = lexer.tokenize();
        detectedLanguage = lexer.detectedLanguage;
        const parser = new Parser(tokens);
        const ast = parser.parse();
        const interpreter = new Interpreter((msg) => outputLines.push(msg));
        const env = interpreter.getGlobalEnv();
        const gfx = createGraphicsBuiltins(
          (cmd) => commands.push(cmd),
          () => turtleState,
          (state) => { turtleState = { ...turtleState, ...state }; }
        );
        gfx.forEach((fn, name) => env.define(name, fn));
        const runtimeInput = env.get('input', 0) as { type: 'builtin' | 'user' | 'lambda'; call: (args: unknown[], line: number) => unknown };
        // ── UI toolkit builtins ──
        uiHandlersRef.current.clear();
        uiHandlerIdRef.current = 0;
        let producedUi = false;
        const ui = createUiBuiltins(
          (s) => {
            producedUi = true;
            uiStateRef.current = s;
            setUiState({ nodes: new Map(s.nodes), rootId: s.rootId, values: new Map(s.values) });
          },
          (cb) => { const id = ++uiHandlerIdRef.current; uiHandlersRef.current.set(id, cb); return id; }
        );
        const uiInput = ui.get('input');
        ui.forEach((fn, name) => {
          if (name !== 'input') env.define(name, fn);
        });
        if (uiInput) {
          env.define('input', {
            type: 'builtin',
            call: (args: unknown[], line: number) => {
              const hasUiRoot = uiStateRef.current?.rootId != null;
              if (hasUiRoot && args.length <= 2) return uiInput.call(args, line);
              return runtimeInput.call(args, line);
            },
          });
        }
        // ── Web (HTML/CSS/JS) builtins ──
        let producedWeb = false;
        const web = createWebBuiltins((s) => {
          producedWeb = true;
          setWebState({ ...s, head: [...s.head], stack: s.stack.map(b => [...b]), css: [...s.css], js: [...s.js] });
        });
        web.forEach((fn, name) => {
          if (name !== 'canvas') env.define(name, fn);
        });
        interpreter.interpret(ast);
        if (producedWeb) setBottomPanel('web');
        else if (producedUi) { setBottomPanel('app'); }
      } else {
        // "Compiler" mode — uses the rebuilt sdev compiler pipeline:
        //   parse → compile-to-container → execute via the full Interpreter
        // This gives the compiler full feature parity with the interpreter
        // (classes, methods, OOP, UI, graphics, all builtins) instead of the
        // limited stack VM, while still producing a real bytecode chunk for
        // disassembly/export in the Compiler panel.
        const lexer = new Lexer(code, lexerOpts);
        const tokens = lexer.tokenize();
        detectedLanguage = lexer.detectedLanguage;
        const parser = new Parser(tokens);
        const ast = parser.parse();
        // Best-effort compile to bytecode (for IR/export). Unsupported features
        // are ignored — execution still uses the interpreter below.
        try { new Compiler().compile(ast); } catch { /* IR unsupported for this program */ }

        const interpreter = new Interpreter((msg) => outputLines.push(msg));
        const env = interpreter.getGlobalEnv();
        const gfx = createGraphicsBuiltins(
          (cmd) => commands.push(cmd),
          () => turtleState,
          (state) => { turtleState = { ...turtleState, ...state }; }
        );
        gfx.forEach((fn, name) => env.define(name, fn));
        const runtimeInput = env.get('input', 0) as { type: 'builtin' | 'user' | 'lambda'; call: (args: unknown[], line: number) => unknown };
        uiHandlersRef.current.clear();
        uiHandlerIdRef.current = 0;
        let producedUi = false;
        const ui = createUiBuiltins(
          (s) => {
            producedUi = true;
            uiStateRef.current = s;
            setUiState({ nodes: new Map(s.nodes), rootId: s.rootId, values: new Map(s.values) });
          },
          (cb) => { const id = ++uiHandlerIdRef.current; uiHandlersRef.current.set(id, cb); return id; }
        );
        const uiInput = ui.get('input');
        ui.forEach((fn, name) => {
          if (name !== 'input') env.define(name, fn);
        });
        if (uiInput) {
          env.define('input', {
            type: 'builtin',
            call: (args: unknown[], line: number) => {
              const hasUiRoot = uiStateRef.current?.rootId != null;
              if (hasUiRoot && args.length <= 2) return uiInput.call(args, line);
              return runtimeInput.call(args, line);
            },
          });
        }
        // ── Web (HTML/CSS/JS) builtins ──
        let producedWeb = false;
        const web = createWebBuiltins((s) => {
          producedWeb = true;
          setWebState({ ...s, head: [...s.head], stack: s.stack.map(b => [...b]), css: [...s.css], js: [...s.js] });
        });
        web.forEach((fn, name) => {
          if (name !== 'canvas') env.define(name, fn);
        });
        interpreter.interpret(ast);
        if (producedWeb) setBottomPanel('web');
        else if (producedUi) { setBottomPanel('app'); }
      }

      // Stash the translated source so the "view translated" toggle works.
      if (detectedLanguage && detectedLanguage !== 'English') {
        const { translateSource } = await import('@/lang/translator');
        const result = translateSource(code, selectedLanguage);
        setTranslatedContent(prev => {
          const next = new Map(prev);
          next.set(activeFile.id, result.translated);
          return next;
        });
      }

      const elapsed = Math.round((performance.now() - t0) * 10) / 10;
      setOutput(outputLines);
      setError(undefined);
      setGraphicsCommands(commands);
      setExecTime(elapsed);
      if (commands.length > 0) {
        setShowCanvas(true);
        setBottomPanel('canvas');
      }
      setStatusMsg(`✓ Done in ${elapsed}ms`);
      recordRun(activeFile.name, activeFile.content, outputLines.join('\n'), 'success', elapsed);
    } catch (e) {
      setOutput(outputLines);
      const msg = e instanceof SdevError ? e.message : String(e);
      setError(msg);
      setExecTime(null);
      setStatusMsg('✗ Error');
      setBottomPanel('terminal');
      recordRun(activeFile.name, activeFile.content, outputLines.join('\n') + '\nERROR: ' + msg, 'error', Math.round((performance.now() - t0) * 10) / 10);
    } finally {
      setIsRunning(false);
    }
  }, [activeFile, runMode, selectedLanguage, recordRun, files]);

  const newFile = useCallback((folderId: string | null = null) => {
    const id = String(++fileIdCounter);
    const name = `untitled${fileIdCounter}.sdev`;
    const file: IdeFile = { id, name, content: `// ${name}\n`, folderId };
    setFiles(prev => [...prev, file]);
    setOpenIds(prev => [...prev, id]);
    setActiveId(id);
  }, []);

  const newFolder = useCallback((parentId: string | null = null) => {
    const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setFolders(prev => [...prev, { id, name: 'New Folder', parentId, expanded: true }]);
  }, []);

  const deleteFolder = useCallback((id: string) => {
    if (!confirm('Delete this folder and everything inside it?')) return;
    // Recursively gather all descendant folder ids
    const toDelete = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const f of folders) {
        if (f.parentId && toDelete.has(f.parentId) && !toDelete.has(f.id)) {
          toDelete.add(f.id); changed = true;
        }
      }
    }
    setFolders(prev => prev.filter(f => !toDelete.has(f.id)));
    setFiles(prev => prev.filter(f => !f.folderId || !toDelete.has(f.folderId)));
  }, [folders]);

  const renameFolder = useCallback((id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  }, []);

  const toggleFolder = useCallback((id: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, expanded: !(f.expanded ?? true) } : f));
  }, []);

  const deleteFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setOpenIds(prev => {
      const next = prev.filter(x => x !== id);
      if (activeId === id && next.length > 0) setActiveId(next[next.length - 1]);
      return next;
    });
  }, [activeId]);

  const renameFile = useCallback((id: string, name: string) => {
    const safe = name.endsWith('.sdev') ? name : name + '.sdev';
    setFiles(prev => prev.map(f => f.id === id ? { ...f, name: safe } : f));
  }, []);

  const selectFile = useCallback((id: string) => {
    setActiveId(id);
    setOpenIds(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  const closeTab = useCallback((id: string) => {
    const next = openIds.filter(x => x !== id);
    setOpenIds(next);
    if (activeId === id && next.length > 0) setActiveId(next[next.length - 1]);
  }, [openIds, activeId]);

  const downloadCurrentFile = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = activeFile.name; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadAllFiles = () => {
    files.forEach(file => {
      const blob = new Blob([file.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = file.name; a.click();
      URL.revokeObjectURL(url);
    });
    toast.success(`Downloaded ${files.length} files`);
  };

  const downloadElectron = () => {
    const pkg = JSON.stringify({
      name: "sdev-ide", version: "1.0.0",
      description: "sdev IDE – desktop edition",
      main: "main.js",
      scripts: { start: "electron .", build: "electron-builder" },
      dependencies: { electron: "^28.0.0" },
      devDependencies: { "electron-builder": "^24.0.0" },
      build: { appId: "dev.sdev.ide", productName: "sdev IDE", directories: { output: "dist-electron" } }
    }, null, 2);
    const mainJs = `const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
function createWindow() {
  const win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset', backgroundColor: '#0d0e1a',
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  win.loadURL('https://s-dev.lovable.app/ide');
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });`;
    const readme = `# sdev IDE – Desktop Edition\n\n## Quick Start\n\n1. Install Node.js (https://nodejs.org)\n2. Open terminal here\n3. Run:\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n\n## Build installer\n\`\`\`bash\nnpm run build\n\`\`\`\n`;
    [{ name: 'package.json', content: pkg }, { name: 'main.js', content: mainJs }, { name: 'README.md', content: readme }]
      .forEach(({ name, content }) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
      });
    toast.success('Downloaded Electron wrapper! See README for setup.');
  };

  // Package the active file as a true standalone Windows .exe.
  // Mechanism (same as PyInstaller / Node SEA / pkg / Deno compile):
  //   [ prebuilt runtime stub (node SEA with embedded sdev interpreter) ]
  //   [ SDEV source bytes ]
  //   [ MAGIC "SDEVPACK" (8 bytes) ][ payload length (u64 LE) ]
  // On launch the stub reads its own file, finds the magic trailer at EOF,
  // extracts the payload, and runs the SDEV interpreter on it.
  const packageAsExe = async () => {
    if (!activeFile) { toast.error('No file open'); return; }
    const t = toast.loading('Packaging .exe — downloading runtime (~82 MB)…');
    try {
      const res = await fetch(sdevStubAsset.url);
      if (!res.ok) throw new Error(`stub fetch failed: ${res.status}`);
      const stub = new Uint8Array(await res.arrayBuffer());
      patchLegacyRuntimeStub(stub);
      const payload = new TextEncoder().encode(activeFile.content);
      const magic = new TextEncoder().encode('SDEVPACK'); // 8 bytes
      const lenBuf = new ArrayBuffer(8);
      new DataView(lenBuf).setBigUint64(0, BigInt(payload.length), true); // little-endian
      const out = new Uint8Array(stub.length + payload.length + 8 + 8);
      out.set(stub, 0);
      out.set(payload, stub.length);
      out.set(magic, stub.length + payload.length);
      out.set(new Uint8Array(lenBuf), stub.length + payload.length + 8);

      const blob = new Blob([out], { type: 'application/vnd.microsoft.portable-executable' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name.replace(/\.sdev$/i, '') + '.exe';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Compiled to .exe — double-click to run on Windows', {
        id: t,
        description: 'Graphical apps open as native Windows windows. Unsigned builds may still show SmartScreen until SDEV is code-signed.',
      });
    } catch (e) {
      toast.error(`Package failed: ${e instanceof Error ? e.message : String(e)}`, { id: t });
    }
  };

  const uploadFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.sdev,.txt';
    input.multiple = true;
    input.onchange = (e) => {
      const inputEl = e.target as HTMLInputElement;
      Array.from(inputEl.files || []).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const id = String(++fileIdCounter);
          const newFile: IdeFile = { id, name: file.name, content: ev.target?.result as string };
          setFiles(prev => [...prev, newFile]);
          setOpenIds(prev => [...prev, id]);
          setActiveId(id);
          toast.success(`Opened ${file.name}`);
        };
        reader.readAsText(file);
      });
    };
    input.click();
  };

  const resetToDefaults = () => {
    setFiles(STARTER_FILES);
    setActiveId('1');
    setOpenIds(['1']);
    setOutput([]);
    setError(undefined);
    toast.info('Reset to default files');
  };

  const currentContent = activeFile?.content ?? '';
  const currentLines = currentContent.split('\n').length;
  const currentChars = currentContent.length;

  const sidebarIcons = [
    { id: 'explorer' as SidePanel, icon: FolderOpen, label: 'Explorer (Ctrl+B)' },
    { id: 'search'   as SidePanel, icon: Search,    label: 'Search (Ctrl+Shift+F)' },
    { id: 'outline'  as SidePanel, icon: ListTree,  label: 'Outline (Ctrl+Shift+O)' },
    { id: 'problems' as SidePanel, icon: AlertCircle, label: `Problems (${problems.length})` },
    { id: 'assistant' as SidePanel, icon: Sparkles,  label: 'AI Doctor — fix & explain' },
    { id: 'hardware' as SidePanel, icon: Usb,       label: 'Hardware — boards & uploader' },
    { id: 'settings' as SidePanel, icon: Settings,  label: 'Settings' },
  ];

  return (
    <TooltipProvider delayDuration={400}>
      <SEO title="IDE — sdev" description="Full-featured sdev IDE in your browser. File tree, terminal, debugger, and live preview for the sdev programming language." path="/ide" />
      <div
        className={`ide-shell ide-theme-${settings.theme} relative flex flex-col h-screen text-foreground overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        style={{ fontFamily: settings.fontFamily, ...(IDE_THEME_VARS[settings.theme] as React.CSSProperties) }}
      >


        {/* ── Title / Menu Bar ── */}
        {!zenMode && <div className="ide-titlebar relative z-10 flex items-center justify-between px-3 py-1.5 flex-shrink-0 select-none">
          {/* Left */}
          <div className="flex items-center gap-2">
            <h1 className="flex items-center gap-2 m-0 text-sm font-display font-bold pl-1">
              <span className="relative flex items-center justify-center w-7 h-7">
                <img src={sdevLogo} alt="" aria-hidden="true" className="w-7 h-7 object-contain" />
              </span>
              <span className="gradient-text hidden sm:block tracking-tight">SDEV IDE</span>
              <span className="sr-only">sdev IDE</span>
            </h1>
            <div className="w-px h-4 bg-border/50 mx-1" />
            {/* Menu items */}
            <div className="hidden md:flex items-center">
              {/* File Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ide-menu-btn font-mono">File</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 bg-card border-border/50">
                  <DropdownMenuItem onClick={() => newFile()} className="text-xs gap-2 cursor-pointer">
                    <Code className="w-3.5 h-3.5" /> New File <span className="ml-auto text-muted-foreground">⌃N</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={uploadFile} className="text-xs gap-2 cursor-pointer">
                    <FolderOpen className="w-3.5 h-3.5" /> Open File…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadCurrentFile} className="text-xs gap-2 cursor-pointer">
                    <Save className="w-3.5 h-3.5" /> Save <span className="ml-auto text-muted-foreground">⌃S</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadAllFiles} className="text-xs gap-2 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> Save All Files
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowGitHubPush(true)} className="text-xs gap-2 cursor-pointer">
                    <Github className="w-3.5 h-3.5" /> Push to GitHub…
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={downloadElectron} className="text-xs gap-2 cursor-pointer">
                    <Download className="w-3.5 h-3.5" /> Download Desktop App
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetToDefaults} className="text-xs gap-2 cursor-pointer text-destructive">
                    <RotateCcw className="w-3.5 h-3.5" /> Reset to Defaults
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Edit Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ide-menu-btn font-mono">Edit</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-card border-border/50">
                  <DropdownMenuItem onClick={formatCurrent} className="text-xs gap-2 cursor-pointer">
                    <Wand2 className="w-3.5 h-3.5" /> Format Document <span className="ml-auto text-muted-foreground">⇧⌃I</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editorRef.current?.openFind()} className="text-xs gap-2 cursor-pointer">
                    <Search className="w-3.5 h-3.5" /> Find / Replace <span className="ml-auto text-muted-foreground">⌃F</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowGoToLine(true)} className="text-xs gap-2 cursor-pointer">
                    <ArrowRight className="w-3.5 h-3.5" /> Go to Line… <span className="ml-auto text-muted-foreground">⌃G</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Snippets</DropdownMenuLabel>
                  {Object.entries(SNIPPETS).map(([name, snippet]) => (
                    <DropdownMenuItem key={name} onClick={() => {
                      if (!activeFile) return;
                      editorRef.current?.insertAtCursor(snippet.replace(/\$[0-9]/g, ''));
                      toast.success(`Inserted ${name} snippet`);
                    }} className="text-xs gap-2 cursor-pointer font-mono">
                      {name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* View Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ide-menu-btn font-mono">View</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 bg-card border-border/50">
                  <DropdownMenuItem onClick={() => setSidePanel(p => p === 'explorer' ? null : 'explorer')} className="text-xs gap-2 cursor-pointer">
                    <FolderOpen className="w-3.5 h-3.5" /> Explorer <span className="ml-auto text-muted-foreground">⌃B</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSidePanel(p => p === 'search' ? null : 'search')} className="text-xs gap-2 cursor-pointer">
                    <Search className="w-3.5 h-3.5" /> Search <span className="ml-auto text-muted-foreground">⌃F</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setBottomPanel('terminal')} className="text-xs gap-2 cursor-pointer">
                    <Terminal className="w-3.5 h-3.5" /> Terminal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setBottomPanel('canvas'); setShowCanvas(true); }} className="text-xs gap-2 cursor-pointer">
                    <Palette className="w-3.5 h-3.5" /> Canvas
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setIsFullscreen(f => !f)} className="text-xs gap-2 cursor-pointer">
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Run Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ide-menu-btn font-mono">Run</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 bg-card border-border/50">
                  <DropdownMenuItem onClick={runCode} className="text-xs gap-2 cursor-pointer">
                    <Play className="w-3.5 h-3.5 text-neon-green" /> Run Program <span className="ml-auto text-muted-foreground">⌃↵</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setRunMode('interpreter')} className="text-xs gap-2 cursor-pointer">
                    <Zap className="w-3.5 h-3.5 text-neon-cyan" /> Tree-walk Interpreter {runMode === 'interpreter' && '✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRunMode('vm')} className="text-xs gap-2 cursor-pointer">
                    <Cpu className="w-3.5 h-3.5 text-neon-violet" /> Compiler (full features) {runMode === 'vm' && '✓'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Help Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="ide-menu-btn font-mono">Help</button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-52 bg-card border-border/50">
                  <DropdownMenuItem onClick={() => window.open('/SDEV_DOCUMENTATION.md', '_blank')} className="text-xs gap-2 cursor-pointer">
                    <BookOpen className="w-3.5 h-3.5" /> Documentation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowCommandPalette(true)} className="text-xs gap-2 cursor-pointer">
                    <Command className="w-3.5 h-3.5" /> Command Palette <span className="ml-auto text-muted-foreground">⌃P</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Keyboard Shortcuts</DropdownMenuLabel>
                  <div className="px-2 py-1 text-xs text-muted-foreground space-y-1">
                    <div className="flex justify-between"><span>Run code</span><kbd className="font-mono">⌃↵</kbd></div>
                    <div className="flex justify-between"><span>Save file</span><kbd className="font-mono">⌃S</kbd></div>
                    <div className="flex justify-between"><span>Command palette</span><kbd className="font-mono">⌃P</kbd></div>
                    <div className="flex justify-between"><span>Toggle explorer</span><kbd className="font-mono">⌃B</kbd></div>
                    <div className="flex justify-between"><span>Toggle search</span><kbd className="font-mono">⌃F</kbd></div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Right: quick actions */}
          <div className="flex items-center gap-1.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
                  onClick={() => navigate('/')}
                  aria-label="Visit website"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Website</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Visit sdev website</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowCommandPalette(true)} aria-label="Open command palette">
                  <Command className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Command Palette (Ctrl+P)</TooltipContent>
            </Tooltip>

            {/* Language selector */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 border border-border/40 rounded-md px-1.5 h-7 bg-background/20">
                  <Languages className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                    <SelectTrigger className="h-5 w-[90px] border-0 bg-transparent text-xs p-0 focus:ring-0 font-mono text-muted-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border/50 max-h-64">
                      {SUPPORTED_LANGUAGES.map(lang => (
                        <SelectItem key={lang.value} value={lang.value} className="text-xs font-mono cursor-pointer">
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-semibold mb-1">Code Language</div>
                  <div>Write sdev in your language.</div>
                  <div>AI translates to English on first run,</div>
                  <div>then caches for instant future runs.</div>
                  {lastResult && <div className="mt-1 text-primary">Last: {lastResult.detectedLanguage} {lastResult.fromCache ? '(cached ⚡)' : '(translated ✨)'}</div>}
                </div>
              </TooltipContent>
            </Tooltip>

            {/* Show translated source toggle */}
            {lastResult && lastResult.detectedLanguage !== 'English' && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                    onClick={() => setShowTranslated(v => !v)}
                    aria-label={showTranslated ? 'Show original code' : 'Show English translation'}
                  >
                    {showTranslated ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showTranslated ? 'Show original code' : 'Show English translation'}</TooltipContent>
              </Tooltip>
            )}

            <div className="flex items-center gap-1 border border-border/40 rounded-md overflow-hidden">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRunMode('interpreter')}
                    className={`px-2 py-1 text-xs font-mono transition-all ${runMode === 'interpreter' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
                  >
                    <Zap className="w-3 h-3 inline mr-1" />Interp
                  </button>
                </TooltipTrigger>
                <TooltipContent>Tree-walk Interpreter</TooltipContent>
              </Tooltip>
              <div className="w-px h-4 bg-border/40" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setRunMode('vm')}
                    className={`px-2 py-1 text-xs font-mono transition-all ${runMode === 'vm' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
                  >
                    <Cpu className="w-3 h-3 inline mr-1" />Compiler
                  </button>
                </TooltipTrigger>
                <TooltipContent>Compiler (full features)</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={downloadCurrentFile} className="gap-1.5 text-xs border-border/50 h-7">
                  <Save className="w-3 h-3" />
                  <span className="hidden sm:inline">Save</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save file (Ctrl+S)</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs border-border/50 h-7 px-2" aria-label="Downloads">
                      <Download className="w-3 h-3" />
                      <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>Downloads</TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-52 bg-card border-border/50">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Downloads</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={downloadCurrentFile} className="gap-2 text-xs cursor-pointer">
                  <Save className="w-3.5 h-3.5 text-neon-cyan" /> Current file (.sdev)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadAllFiles} className="gap-2 text-xs cursor-pointer">
                  <Download className="w-3.5 h-3.5 text-neon-green" /> All files
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={packageAsExe} className="gap-2 text-xs cursor-pointer">
                  <Cpu className="w-3.5 h-3.5 text-neon-cyan" />
                  <div>
                    <div className="font-medium">Compile to .exe</div>
                    <div className="text-muted-foreground text-[10px]">Standalone Windows binary (~82 MB)</div>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadElectron} className="gap-2 text-xs cursor-pointer">
                  <Bug className="w-3.5 h-3.5 text-neon-violet" />
                  <div>
                    <div className="font-medium">Electron Desktop App</div>
                    <div className="text-muted-foreground text-[10px]">Windows / Mac / Linux</div>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={runCode}
              disabled={isRunning || isTranslating}
              className="ide-run-btn gap-1.5 font-semibold h-7 text-xs min-w-[72px] rounded-md border-0"
            >
              {isTranslating ? (
                <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Translating</span>
              ) : isRunning ? (
                <span className="flex items-center gap-1"><span className="animate-spin">⟳</span> Running</span>
              ) : (
                <><Play className="w-3 h-3 fill-current" /> Run</>
              )}
            </Button>

            {activeFile && (
              <UserMenu
                currentName={activeFile.name}
                currentContent={activeFile.content}
                currentCloudId={cloudIds[activeFile.id] ?? activeFile.cloudId ?? null}
                onCloudIdChange={(cid) => {
                  setCloudIds(prev => ({ ...prev, [activeFile.id]: cid }));
                  // Tag the file itself so the workspace sync recognises it
                  // and won't insert a duplicate or delete it on next flush.
                  setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, cloudId: cid } : f));
                }}
                onLoadFile={(name, content, cid) => {
                  const existing = files.find(f => (cloudIds[f.id] ?? f.cloudId ?? null) === cid);
                  if (existing) {
                    setFiles(prev => prev.map(f => f.id === existing.id ? { ...f, name, content, cloudId: cid } : f));
                    setOpenIds(prev => prev.includes(existing.id) ? prev : [...prev, existing.id]);
                    setActiveId(existing.id);
                    setCloudIds(prev => ({ ...prev, [existing.id]: cid }));
                    return;
                  }
                  const id = String(++fileIdCounter);
                  // Tag the loaded file with its cloudId so workspace sync
                  // updates this row instead of inserting a duplicate.
                  const file: IdeFile = { id, name, content, cloudId: cid };
                  setFiles(prev => [...prev, file]);
                  setOpenIds(prev => [...prev, id]);
                  setActiveId(id);
                  setCloudIds(prev => ({ ...prev, [id]: cid }));
                }}
              />
            )}
          </div>
        </div>}

        {/* ── Activity Bar + Main Body ── */}
        <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
          {!zenMode && (
          <div className="ide-activitybar w-12 flex-shrink-0 flex flex-col items-center py-2 gap-1">
            {sidebarIcons.map(({ id, icon: Icon, label }) => {
              const active = sidePanel === id;
              return (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setSidePanel(p => p === id ? null : id)}
                      data-active={active}
                      className="ide-activity-btn"
                      aria-label={label}
                    >
                      <Icon className="w-[18px] h-[18px]" />
                      {id === 'problems' && problems.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center shadow-md">
                          {problems.length > 9 ? '9+' : problems.length}
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
                  onClick={() => setZenMode(z => !z)}
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
                  onClick={() => setIsFullscreen(f => !f)}
                  className="ide-activity-btn"
                  aria-label="Fullscreen"
                >
                  {isFullscreen ? <Minimize2 className="w-[18px] h-[18px]" /> : <Maximize2 className="w-[18px] h-[18px]" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</TooltipContent>
            </Tooltip>
          </div>
          )}

          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            {/* Sidebar panel */}
            {sidePanel && (
              <>
                <ResizablePanel defaultSize={18} minSize={12} maxSize={35} className="ide-sidepanel flex min-h-0 flex-col">
                  {sidePanel === 'explorer' && (
                    <IdeFileTree
                      files={files}
                      folders={folders}
                      activeId={activeId}
                      onSelect={selectFile}
                      onNewFile={(fid) => newFile(fid)}
                      onNewFolder={(pid) => newFolder(pid)}
                      onDelete={deleteFile}
                      onDeleteFolder={deleteFolder}
                      onRename={renameFile}
                      onRenameFolder={renameFolder}
                      onToggleFolder={toggleFolder}
                      onUpload={uploadFile}
                      syncStatus={!user ? 'local' : (isSyncing ? 'syncing' : (lastSavedAt ? 'synced' : 'local'))}
                    />
                  )}
                  {sidePanel === 'search' && (
                    <IdeSearchPanel files={files} onSelectFile={selectFile} />
                  )}
                  {sidePanel === 'outline' && activeFile && (
                    <IdeOutline code={activeFile.content} onJump={(line) => editorRef.current?.jumpToLine(line)} />
                  )}
                  {sidePanel === 'problems' && (
                    <IdeProblems problems={problems} onJump={(line) => editorRef.current?.jumpToLine(line)} />
                  )}
                  {sidePanel === 'assistant' && (
                    <IdeAssistantPanel
                      code={activeFile?.content ?? ''}
                      fileName={activeFile?.name}
                      error={error}
                      problemSummary={problems.slice(0, 5).map(p => `Line ${p.line}: ${p.message}`).join('\n')}
                      onApply={(fixed) => {
                        if (!activeFile) return;
                        setFiles(prev => prev.map(f => f.id === activeId ? { ...f, content: fixed, modified: true } : f));
                      }}
                    />
                  )}
                  {sidePanel === 'hardware' && (
                    <HardwarePanel
                      source={activeFile?.content ?? ''}
                      onAppendLog={(line) => setOutput(prev => [...prev, line])}
                    />
                  )}
                  {sidePanel === 'settings' && (
                    <IdeSettingsPanel settings={settings} onChange={setSettings} />
                  )}
                </ResizablePanel>
                <ResizableHandle withHandle />
              </>
            )}

            {/* Editor + Terminal */}
            <ResizablePanel defaultSize={sidePanel ? 82 : 100} className="flex min-h-0 flex-col">
              <ResizablePanelGroup direction="vertical" className="min-h-0">
                {/* Editor */}
                <ResizablePanel defaultSize={65} minSize={25} className="min-h-0">
                  <div className="flex h-full min-h-0 flex-col">
                    <IdeTabs files={openFiles} activeId={activeId} onSelect={selectFile} onClose={closeTab} />
                    {/* Translation banner */}
                    {lastResult && lastResult.detectedLanguage !== 'English' && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border-b border-primary/20 text-xs font-mono">
                        <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-primary">
                          {lastResult.fromCache ? '⚡ Cached translation' : '✨ Translated'} from <strong>{lastResult.detectedLanguage}</strong> → English
                        </span>
                        <button
                          onClick={() => setShowTranslated(v => !v)}
                          className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showTranslated ? <><EyeOff className="w-3 h-3" /> Show original</> : <><Eye className="w-3 h-3" /> View English</>}
                        </button>
                      </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {activeFile ? (
                        showTranslated && lastResult ? (
                          <div className="flex flex-col h-full">
                            <div className="px-3 py-1 text-[10px] font-mono text-muted-foreground bg-muted/10 border-b border-border/30 flex items-center gap-2">
                              <Eye className="w-3 h-3" />
                              English translation (read-only) — edit your original to make changes
                            </div>
                            <IdeEditor
                              key={activeFile.id + '-translated'}
                              value={lastResult.translated}
                              onChange={() => {}}
                              fileName={activeFile.name}
                              settings={settings}
                            />
                          </div>
                        ) : (
                          <>
                            <IdeBreadcrumbs file={activeFile} folders={folders} />
                            <IdeEditor
                              ref={editorRef}
                              key={activeFile.id}
                              value={activeFile.content}
                              onChange={updateActiveContent}
                              onRun={runCode}
                              onFormat={formatCurrent}
                              fileName={activeFile.name}
                              settings={settings}
                              onCursorChange={setCursor}
                              onSelectionChange={setSelection}
                            />
                          </>
                        )
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-4">
                          <SplitSquareHorizontal className="w-12 h-12 opacity-20" />
                          <div className="text-sm font-mono text-center">
                            <div>No file open</div>
                            <div className="text-xs mt-1">Select a file from the Explorer or create a new one</div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => newFile()} className="text-xs gap-2">
                            <Code className="w-3.5 h-3.5" /> New File
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                {/* Bottom panel */}
                <ResizablePanel defaultSize={35} minSize={15} maxSize={65} className="min-h-0 overflow-hidden">
                  {/* Panel tabs */}
                  <div className="ide-tabsbar flex items-center flex-shrink-0">
                    <button
                      onClick={() => setBottomPanel('terminal')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'terminal' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <Terminal className="w-3 h-3" /> OUTPUT
                      {error && <span className="w-1.5 h-1.5 rounded-full bg-destructive ml-1" />}
                    </button>
                    {showCanvas && (
                      <button
                        onClick={() => setBottomPanel('canvas')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'canvas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        <Palette className="w-3 h-3" /> CANVAS
                      </button>
                    )}
                    {uiState && uiState.rootId !== null && (
                      <button
                        onClick={() => setBottomPanel('app')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'app' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        <Code className="w-3 h-3" /> APP
                      </button>
                    )}
                    {webState && webState.produced && (
                      <button
                        onClick={() => setBottomPanel('web')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'web' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                      >
                        <Globe className="w-3 h-3" /> WEB
                      </button>
                    )}
                    <button
                      onClick={() => setBottomPanel('problems')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'problems' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <AlertCircle className="w-3 h-3" /> PROBLEMS
                      {problems.length > 0 && <span className="ml-1 px-1 rounded bg-destructive/20 text-destructive text-[9px]">{problems.length}</span>}
                    </button>
                    <div className="flex-1" />
                    {showCanvas && (
                      <button onClick={() => setShowCanvas(false)} className="p-1 mr-1 text-muted-foreground hover:text-foreground transition-colors rounded">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {bottomPanel === 'terminal' && (
                    <IdeTerminal
                      lines={output}
                      error={error}
                      execTime={execTime}
                      onClear={() => { setOutput([]); setError(undefined); setExecTime(null); }}
                    />
                  )}
                  {bottomPanel === 'canvas' && showCanvas && (
                    <div className="h-full overflow-auto p-2 bg-background/30">
                      <CanvasPanel ref={canvasRef} commands={graphicsCommands} onClose={() => setShowCanvas(false)} />
                    </div>
                  )}
                  {bottomPanel === 'app' && (
                    <AppPreviewPanel
                      state={uiState}
                      invokeHandler={(id, args) => {
                        const cb = uiHandlersRef.current.get(id);
                        if (cb) {
                          try {
                            cb.fn(args ?? []);
                            if (uiStateRef.current) {
                              setUiState({
                                nodes: new Map(uiStateRef.current.nodes),
                                rootId: uiStateRef.current.rootId,
                                values: new Map(uiStateRef.current.values),
                              });
                            }
                          } catch (e) {
                            toast.error(String(e));
                          }
                        }
                      }}
                      setValue={(k, v) => {
                        if (uiStateRef.current) uiStateRef.current.values.set(k, v);
                        setUiState(prev => prev ? { ...prev, values: new Map(prev.values).set(k, v) } : prev);
                      }}
                    />
                  )}
                  {bottomPanel === 'web' && (
                    <WebPreviewPanel state={webState} />
                  )}
                  {bottomPanel === 'problems' && (
                    <IdeProblems problems={problems} onJump={(line) => editorRef.current?.jumpToLine(line)} />
                  )}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* ── Status Bar ── */}
        <IdeStatusBar
          statusMsg={statusMsg}
          runMode={runMode}
          activeFile={activeFile}
          lines={currentLines}
          chars={currentChars}
          cursor={cursor}
          selection={selection}
          execTime={execTime}
          error={!!error}
        />

        {/* Command Palette */}
        {showCommandPalette && (
          <IdeCommandPalette
            files={files}
            onClose={() => setShowCommandPalette(false)}
            onSelectFile={(id) => { selectFile(id); setShowCommandPalette(false); }}
            onNewFile={() => { newFile(); setShowCommandPalette(false); }}
            onRun={() => { runCode(); setShowCommandPalette(false); }}
            onTogglePanel={(panel) => { setSidePanel(p => p === panel ? null : panel); setShowCommandPalette(false); }}
          />
        )}

        <IdeGoToLine
          open={showGoToLine}
          totalLines={currentLines}
          onClose={() => setShowGoToLine(false)}
          onGo={(line) => editorRef.current?.jumpToLine(line)}
        />

        <GitHubPushDialog
          open={showGitHubPush}
          onOpenChange={setShowGitHubPush}
          files={files}
        />

        <DesktopNativeButton getSource={() => activeFile?.content ?? ''} />
      </div>
    </TooltipProvider>
  );
}
