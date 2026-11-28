import { useState, useCallback, useRef, useEffect, lazy, Suspense } from 'react';
import { SEO } from '@/components/SEO';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { IdeFileTree } from '@/components/ide/IdeFileTree';
import { CodeMirrorEditor as IdeEditor, type IdeEditorHandle } from '@/components/ide/CodeMirrorEditor';
import { IdeTabs } from '@/components/ide/IdeTabs';
import { IdeTerminal } from '@/components/ide/IdeTerminal';
import { IdeStatusBar } from '@/components/ide/IdeStatusBar';
import { DialectSwitcher } from '@/components/ide/DialectSwitcher';
import { FileInfoPopover } from '@/components/ide/FileInfoPopover';
import { IdeTitleBar } from '@/components/ide/IdeTitleBar';
import { IdeActivityBar } from '@/components/ide/IdeActivityBar';
import { IdeMobileBar } from '@/components/ide/IdeMobileBar';
import { IdeBreadcrumbs } from '@/components/ide/IdeBreadcrumbs';
import { IdeGoToLine } from '@/components/ide/IdeGoToLine';
import { DesktopNativeButton } from '@/components/ide/DesktopNativeButton';
import { CanvasPanel, CanvasHandle } from '@/components/CanvasPanel';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Download, Terminal, Code, SplitSquareHorizontal, Palette, X,
  RefreshCw, CheckCircle2, Eye, EyeOff, AlertCircle, Sparkles, Globe, History,
} from 'lucide-react';
import { toast } from 'sonner';

import { getActiveDialect, findLocalDialect } from '@/hooks/useDialects';
import { useWorkspaceSync } from '@/hooks/useWorkspaceSync';
import { useCodeTranslation } from '@/hooks/useCodeTranslation';
import { useCloudFiles } from '@/hooks/useCloudFiles';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { stripSignature, readSignature, checksum, buildTranslationRecipe } from '@/lang/dialect/signature';
import { formatSdev } from '@/lang/tools/formatter';
import { downloadText } from '@/lib/download';
import { loadJson, saveJson } from '@/lib/storage';
import { DEFAULT_SETTINGS, IDE_THEME_VARS } from '@/ide/themes';
import { STARTER_FILES, nextFileId, uniqueUntitled } from '@/ide/starterFiles';
import {
  translationHasDiff,
  signFileForExport,
  downloadElectronWrapper,
  packageSourceAsExe,
} from '@/ide/export';

import type { Problem } from '@/components/ide/lintSdev';
import type { GraphicsCommand, TurtleState } from '@/lang/stdlib/graphics';
import type { IdeFile, IdeFolder, SidePanel, BottomPanel, IdeSettings } from '@/ide/types';
import type { UiState, UiCallback } from '@/lang/stdlib/ui';
import type { WebState } from '@/lang/stdlib/web';

const PersonalPanel = lazy(() => import('@/components/ide/PersonalPanel').then(m => ({ default: m.PersonalPanel })));
const IdeCommandPalette = lazy(() => import('@/components/ide/IdeCommandPalette').then(m => ({ default: m.IdeCommandPalette })));
const IdeSearchPanel = lazy(() => import('@/components/ide/IdeSearchPanel').then(m => ({ default: m.IdeSearchPanel })));
const IdeSettingsPanel = lazy(() => import('@/components/ide/IdeSettingsPanel').then(m => ({ default: m.IdeSettingsPanel })));
const IdeOutline = lazy(() => import('@/components/ide/IdeOutline').then(m => ({ default: m.IdeOutline })));
const IdeProblems = lazy(() => import('@/components/ide/IdeProblems').then(m => ({ default: m.IdeProblems })));
const IdeAssistantPanel = lazy(() => import('@/components/ide/IdeAssistantPanel').then(m => ({ default: m.IdeAssistantPanel })));
const HardwarePanel = lazy(() => import('@/components/ide/HardwarePanel').then(m => ({ default: m.HardwarePanel })));
const RuntimeExplorerPanel = lazy(() => import('@/components/ide/RuntimeExplorerPanel').then(m => ({ default: m.RuntimeExplorerPanel })));
const TimeTravelDebugger = lazy(() => import('@/components/ide/TimeTravelDebugger').then(m => ({ default: m.TimeTravelDebugger })));
const LiveClassroomPanel = lazy(() => import('@/components/ide/LiveClassroomPanel').then(m => ({ default: m.LiveClassroomPanel })));
const LiveScratchpadPanel = lazy(() => import('@/components/ide/LiveScratchpadPanel').then(m => ({ default: m.LiveScratchpadPanel })));
const WasiComponentDialog = lazy(() => import('@/components/ide/WasiComponentDialog').then(m => ({ default: m.WasiComponentDialog })));
const GitHubPushDialog = lazy(() => import('@/components/ide/GitHubPushDialog').then(m => ({ default: m.GitHubPushDialog })));
const AppPreviewPanel = lazy(() => import('@/components/ide/AppPreviewPanel').then(m => ({ default: m.AppPreviewPanel })));
const WebPreviewPanel = lazy(() => import('@/components/ide/WebPreviewPanel').then(m => ({ default: m.WebPreviewPanel })));

const LS_FILES = 'sdev-ide-files';
const LS_FOLDERS = 'sdev-ide-folders';
const LS_ACTIVE = 'sdev-ide-active';
const LS_OPEN = 'sdev-ide-open';
const LS_SETTINGS = 'sdev-ide-settings';

export default function IDEPage() {
  const navigate = useNavigate();

  const [files, setFiles] = useState<IdeFile[]>(() => loadJson(LS_FILES, STARTER_FILES));
  const [folders, setFolders] = useState<IdeFolder[]>(() => loadJson(LS_FOLDERS, []));
  const [activeId, setActiveId] = useState<string>(() => loadJson(LS_ACTIVE, '1'));
  const [openIds, setOpenIds] = useState<string[]>(() => loadJson(LS_OPEN, ['1']));
  const [settings, setSettings] = useState<IdeSettings>(() => loadJson(LS_SETTINGS, DEFAULT_SETTINGS));

  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches);
  const [sidePanel, setSidePanel] = useState<SidePanel>(() => (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches ? null : 'explorer'));
  const [showBottom, setShowBottom] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setIsMobile(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const [bottomPanel, setBottomPanel] = useState<BottomPanel>('terminal');
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [runMode, setRunMode] = useState<'interpreter' | 'vm'>('interpreter');

  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [translatedContent, setTranslatedContent] = useState<Map<string, string>>(new Map());
  const [showTranslated, setShowTranslated] = useState(false);
  const { isTranslating, lastResult, translate } = useCodeTranslation();

  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | undefined>();
  const [graphicsCommands, setGraphicsCommands] = useState<GraphicsCommand[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Ready');
  const [execTime, setExecTime] = useState<number | null>(null);

  const [uiState, setUiState] = useState<UiState | null>(null);
  const uiStateRef = useRef<UiState | null>(null);
  const uiHandlersRef = useRef<Map<number, UiCallback>>(new Map());
  const uiHandlerIdRef = useRef(0);

  const [webState, setWebState] = useState<WebState | null>(null);

  const [cursor, setCursor] = useState({ line: 1, col: 1 });
  const [selection, setSelection] = useState(0);

  const canvasRef = useRef<CanvasHandle>(null);
  const editorRef = useRef<IdeEditorHandle>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showGoToLine, setShowGoToLine] = useState(false);
  const [showGitHubPush, setShowGitHubPush] = useState(false);
  const [showWasiDialog, setShowWasiDialog] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [runtimeQuery, setRuntimeQuery] = useState('');

  const { user } = useAuth();
  const { recordRun } = useCloudFiles();
  const [searchParams] = useSearchParams();
  const [cloudIds, setCloudIds] = useState<Record<string, string>>({});

  const activeFile = files.find(f => f.id === activeId);
  const openFiles = openIds.map(id => files.find(f => f.id === id)).filter(Boolean) as IdeFile[];
  const translatedSourceForActive = activeFile
    ? (activeFile.understood?.source ?? translatedContent.get(activeFile.id) ?? readSignature(activeFile.content)?.translated ?? null)
    : null;
  const activePlainBody = activeFile ? stripSignature(activeFile.content) : '';
  const hasTranslation = Boolean(activeFile && translationHasDiff(activePlainBody, translatedSourceForActive));

  useEffect(() => {
    const imported = sessionStorage.getItem('sdev:imported_code');
    const importedName = sessionStorage.getItem('sdev:imported_name');
    if (imported) {
      sessionStorage.removeItem('sdev:imported_code');
      sessionStorage.removeItem('sdev:imported_name');
      const id = nextFileId();
      const name = (importedName || 'imported').replace(/[^\w.-]/g, '_') + (importedName?.endsWith('.sdev') ? '' : '.sdev');
      const file: IdeFile = { id, name, content: imported };
      setFiles(prev => [...prev, file]);
      setOpenIds(prev => [...prev, id]);
      setActiveId(id);
      toast.success('Imported gist into IDE');
    }
  }, []);

  useEffect(() => {
    const cloudParam = searchParams.get('cloud');
    if (!cloudParam || !user) return;
    (async () => {
      const { data } = await supabase.from('code_files').select('*').eq('id', cloudParam).maybeSingle();
      if (!data) return;
      const id = nextFileId();
      const rawCloud = data.content ?? '';
      const cloudSig = readSignature(rawCloud);
      const cloudBody = stripSignature(rawCloud);
      const cloudSum = checksum(cloudBody);
      const cloudSigValid = Boolean(cloudSig?.translated && (!cloudSig.sum || cloudSig.sum === cloudSum));
      const file: IdeFile = {
        id,
        name: data.name,
        content: cloudBody,
        cloudId: data.id,
        understood: cloudSigValid && cloudSig?.translated
          ? {
              key: '',
              bodySum: cloudSum,
              source: cloudSig.translated,
              brainUsed: cloudSig.brain ?? 'none',
              fromCache: true,
              detectedLanguage: cloudSig.lang ?? null,
              recipeOps: cloudSig.recipe?.length,
            }
          : undefined,
      };
      setFiles(prev => [...prev, file]);
      setOpenIds(prev => [...prev, id]);
      setActiveId(id);
      setCloudIds(prev => ({ ...prev, [id]: data.id }));
      toast.success('Loaded ' + data.name);
    })();
  }, [searchParams, user]);

  useEffect(() => { saveJson(LS_FILES, files); }, [files]);
  useEffect(() => { saveJson(LS_FOLDERS, folders); }, [folders]);
  useEffect(() => {
    saveJson(LS_ACTIVE, activeId);
    saveJson(LS_OPEN, openIds);
  }, [activeId, openIds]);
  useEffect(() => { saveJson(LS_SETTINGS, settings); }, [settings]);

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
  useEffect(() => { hydratedAppliedRef.current = false; }, [user?.id]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'p') { e.preventDefault(); setShowCommandPalette(true); }
      if (ctrl && e.shiftKey && e.key === 'Enter') { e.preventDefault(); void runCode({ noUnderstand: true }); }
      else if (ctrl && e.key === 'Enter') { e.preventDefault(); void runCode(); }
      if (ctrl && e.key === 's') { e.preventDefault(); void downloadCurrentFile('written'); }
      if (ctrl && e.key === 'b') { e.preventDefault(); setSidePanel(p => p === 'explorer' ? null : 'explorer'); }
      if (ctrl && e.shiftKey && (e.key === 'F' || e.key === 'f')) { e.preventDefault(); setSidePanel(p => p === 'search' ? null : 'search'); }
      if (ctrl && e.shiftKey && (e.key === 'O' || e.key === 'o')) { e.preventDefault(); setSidePanel(p => p === 'outline' ? null : 'outline'); }
      if (ctrl && e.shiftKey && (e.key === 'M' || e.key === 'm')) { e.preventDefault(); setBottomPanel('problems'); }
      if (ctrl && e.shiftKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); setShowCommandPalette(true); }
      if (ctrl && e.key === 'g') { e.preventDefault(); setShowGoToLine(true); }
      if (e.key === 'F1') {
        e.preventDefault();
        const word = editorRef.current?.getWordAtCursor?.();
        if (word) {
          void import('@/lang/registry/api-registry').then(({ findApi, searchApis }) => {
            if (findApi(word) || searchApis(word).length > 0) {
              setSidePanel('runtime');
              setRuntimeQuery(word);
            } else {
              setShowCommandPalette(true);
            }
          });
          return;
        }
        setShowCommandPalette(true);
      }
      if (e.key === 'F11') { e.preventDefault(); setIsFullscreen(f => !f); }
      if (ctrl && e.key === '`') { e.preventDefault(); setBottomPanel('terminal'); }
      if (ctrl && e.altKey && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); setZenMode(z => !z); }
      if (e.key === 'Escape') { setShowCommandPalette(false); setShowGoToLine(false); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile]);

  const [problems, setProblems] = useState<Problem[]>([]);
  useEffect(() => {
    let cancelled = false;
    setProblems([]);
    const timer = setTimeout(() => {
      void import('@/components/ide/lintSdev').then(async ({ lintEditorFile }) => {
        if (cancelled) return;
        const result = activeFile
          ? await lintEditorFile(activeFile.content, { dialectActive: Boolean(getActiveDialect()) })
          : [];
        if (!cancelled) setProblems(result);
      });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activeFile?.id, activeFile?.content]);

  const formatCurrent = useCallback(() => {
    if (!activeFile) return;
    const formatted = formatSdev(activeFile.content, settings.tabSize);
    setFiles(prev => prev.map(f => f.id === activeId
      ? { ...f, content: formatted, modified: true, understood: formatted === f.content ? f.understood : undefined }
      : f));
    toast.success('Formatted');
  }, [activeFile, activeId, settings.tabSize]);

  const updateActiveContent = useCallback((content: string) => {
    setFiles(prev => prev.map(f => {
      if (f.id !== activeId) return f;
      if (f.content === content) return f;
      return { ...f, content, modified: true, understood: undefined };
    }));
    setTranslatedContent(prev => {
      if (!prev.has(activeId)) return prev;
      const next = new Map(prev);
      next.delete(activeId);
      return next;
    });
    if (settings.autoSave) {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        setFiles(prev => prev.map(f => f.id === activeId ? { ...f, modified: false } : f));
        setStatusMsg('Auto-saved');
        setTimeout(() => setStatusMsg('Ready'), 1500);
      }, 1500);
    }
  }, [activeId, settings.autoSave]);

  const runCode = useCallback(async (override?: unknown, retried = false) => {
    const overrideSrc = typeof override === 'string' ? override : undefined;
    const reunderstand = typeof override === 'object' && override !== null && 'reunderstand' in override && Boolean((override as { reunderstand?: boolean }).reunderstand);
    const noUnderstand = typeof override === 'object' && override !== null && 'noUnderstand' in override && Boolean((override as { noUnderstand?: boolean }).noUnderstand);
    if (!activeFile) return;

    let activeDialect = getActiveDialect();
    const strippedSrc = stripSignature(activeFile.content);
    let dialectSrc = strippedSrc;
    try {
      if (activeDialect || strippedSrc.includes('#!dialect')) {
        const { resolveDialectSource } = await import('@/lang/dialect/resolve');
        const { findLocalDialect } = await import('@/hooks/useDialects');
        const resolved = resolveDialectSource(strippedSrc, activeDialect,
          files.map(f => ({ name: f.name, content: stripSignature(f.content) })), findLocalDialect);
        activeDialect = resolved.dialect;
        dialectSrc = resolved.source;
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message); setOutput([]); setStatusMsg(`✗ ${message}`);
      setBottomPanel('terminal'); setIsRunning(false);
      return;
    }
    const { applyExtensions } = await import('@/lang/dialect/extensions');
    const hasDirectives = dialectSrc.includes('!#');
    const writtenSrc = hasDirectives
      ? (await import('@/lang/agent')).asWritten(dialectSrc)
      : dialectSrc;
    const runtimePref = (typeof localStorage !== 'undefined' && localStorage.getItem('sdev_runtime')) || null;
    const wantsV2 = (src: string) => {
      const head10 = src.split('\n', 10).map(l => l.trim());
      const shebangV2 = head10.some(l => l.startsWith('#!sdev v2'));
      const shebangV1 = head10.some(l => l.startsWith('#!sdev v1'));
      return Boolean(activeDialect) || shebangV2 || (!shebangV1 && (runtimePref === 'v2' || runtimePref === 'v2-wasm'));
    };

    const tryV2 = async (src: string): Promise<{ success: boolean; output: string[]; error: string | null } | { notCompiled: string }> => {
      const { runWasm, WasmSubsetError } = await import('@/lang-bridge/wasm-runtime');
      const body = applyExtensions(src);
      const { resolveLibraries } = await import('@/lang/dialect/registry');
      const moduleMap: Record<string, string> = await resolveLibraries(body);
      const canonicalizeFn = activeDialect ? (await import('@/lang/dialect/canonicalize')).canonicalize : null;
      for (const f of files) {
        const stripped = stripSignature(f.content);
        const source = canonicalizeFn && activeDialect ? canonicalizeFn(stripped, activeDialect).source : stripped;
        moduleMap[f.name] = source;
        moduleMap['./' + f.name] = source;
      }
      try {
        return await runWasm(body, moduleMap, { sourceLanguage: selectedLanguage, dialect: activeDialect });
      } catch (e) {
        if (e instanceof WasmSubsetError) return { notCompiled: e.message };
        throw e;
      }
    };
    const showV2 = (r: { success: boolean; output: string[]; error: string | null }) => {
      setOutput(r.output);
      setError(r.success ? undefined : r.error ?? 'error');
      setStatusMsg(r.success ? (noUnderstand ? 'Done (v2 · without understanding)' : 'Done (v2 · self-hosted)') : `✗ ${r.error ?? 'error'}`);
      if (!r.success) setBottomPanel('terminal');
    };

    // v2: working code is compiled exactly as written before the understander reads it
    let v2AsWrittenError: string | null = null;
    if (overrideSrc === undefined && wantsV2(writtenSrc) && (activeDialect || noUnderstand || !(await import('@/lang/agent')).wordsNeedReading(writtenSrc))) {
      setIsRunning(true);
      setStatusMsg(noUnderstand ? 'Running (v2 · without understanding)…' : 'Running (v2 · self-hosted)…');
      setUiState(null); setWebState(null);
      try {
        const r = await tryV2(writtenSrc);
        if (!('notCompiled' in r)) { showV2(r); setIsRunning(false); return; }
        if (activeDialect || noUnderstand) {
          setOutput([
            `✗ the self-hosted sdev compiler cannot compile this yet: ${r.notCompiled}`,
            '  v2 runs only on the self-hosted toolchain — no JavaScript fallback.',
            '  Run it with #!sdev v1 while this feature is being self-hosted.',
          ]);
          setError(r.notCompiled);
          setStatusMsg('✗ not yet self-hosted');
          setBottomPanel('terminal');
          setIsRunning(false);
          return;
        }
        v2AsWrittenError = r.notCompiled;
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        setError(message); setOutput([]); setBottomPanel('terminal');
        setStatusMsg(`✗ v2: ${message}`);
        setIsRunning(false);
        return;
      }
    }

    const bodySum = checksum(strippedSrc);
    const savedBySum =
      !reunderstand &&
      !noUnderstand &&
      !activeDialect &&
      activeFile.understood?.bodySum === bodySum
        ? activeFile.understood.source
        : null;

    let fileKey = activeFile.understood?.key ?? '';
    let saved: string | null = savedBySum;
    let skipUnderstandForValid = false;

    if (overrideSrc === undefined && !noUnderstand && saved === null) {
      const { senseFile, definedNames, understandKey, AGENT_VERSION } = await import('@/lang/agent');
      const { withoutBoardBlocks } = await import('@/lang/agent/boards');
      const quickSense = !reunderstand ? senseFile(withoutBoardBlocks(writtenSrc)) : null;
      if (quickSense && !quickSense.suspicious && quickSense.parses) {
        skipUnderstandForValid = true;
      } else {
        const projectNamesSet = new Set<string>();
        for (const f of files) {
          if (f.id === activeFile.id) continue;
          for (const n of definedNames(stripSignature(f.content))) projectNamesSet.add(n);
        }
        const projectNames = [...projectNamesSet];
        fileKey = understandKey(dialectSrc, JSON.stringify([AGENT_VERSION, activeDialect ?? null, projectNames]));
        if (!reunderstand && activeFile.understood?.key === fileKey) {
          saved = activeFile.understood.source;
        }
      }
    }

    const understood = overrideSrc !== undefined
      ? { source: overrideSrc, notes: [{ line: 0 }], brainUsed: 'none' as const, cached: false }
      : noUnderstand || skipUnderstandForValid
        ? { source: writtenSrc, notes: [] as unknown[], brainUsed: 'none' as const, cached: false }
        : saved !== null
          ? { source: saved, notes: [] as unknown[], brainUsed: activeFile.understood?.brainUsed ?? ('none' as const), cached: true }
          : await (async () => {
              const { understandAsync, definedNames } = await import('@/lang/agent');
              const projectNamesSet = new Set<string>();
              for (const f of files) {
                if (f.id === activeFile.id) continue;
                for (const n of definedNames(stripSignature(f.content))) projectNamesSet.add(n);
              }
              const projectNames = [...projectNamesSet];
              const { onBrowserBrain } = await import('@/lang/agent/browser-brain');
              const off = onBrowserBrain((b) => {
                if (b.state === 'loading') setStatusMsg(`Preparing the built-in AI (first time only) — ${Math.round(b.progress * 100)}%`);
              });
              try { return await understandAsync(dialectSrc, { dialect: activeDialect, projectNames, fresh: reunderstand }); } finally { off(); }
            })();
    const brainMissing =
      overrideSrc === undefined && !noUnderstand && !skipUnderstandForValid && saved === null
        ? (await import('@/lang/agent/brain')).lastBrainMissing
        : false;
    if (brainMissing) {
      const { browserBrainStatus } = await import('@/lang/agent/browser-brain');
      const b = browserBrainStatus();
      toast.info(b.state === 'unsupported' || b.state === 'failed'
        ? b.text + ' Try Chrome or Edge, or switch on the website AI in Settings → Code understander AI.'
        : 'The understander could not finish this file. Try again, or switch on the website AI in Settings → Code understander AI.');
    }
    const recipeOpsCount = translationHasDiff(strippedSrc, understood.source)
      ? buildTranslationRecipe(strippedSrc, understood.source).length
      : 0;
    const baseUnderstoodMeta = {
      key: fileKey,
      bodySum,
      source: understood.source,
      notesCount: understood.notes.length,
      brainUsed: understood.brainUsed,
      fromCache: saved !== null || Boolean('cached' in understood && understood.cached),
      detectedLanguage: activeFile.understood?.detectedLanguage ?? null,
      recipeOps: recipeOpsCount || undefined,
    };
    if (overrideSrc === undefined && !noUnderstand && !skipUnderstandForValid && saved === null && !brainMissing) {
      const fileId = activeFile.id;
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, understood: baseUnderstoodMeta } : f)));
    } else if (overrideSrc !== undefined) {
      const fileId = activeFile.id;
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, understood: { ...baseUnderstoodMeta, source: overrideSrc, fromCache: false } } : f)));
    }
    const canonicalSrc = understood.source;
    if (understood.notes.length) {
      setStatusMsg(`Agent understood ${understood.notes.length} line${understood.notes.length === 1 ? '' : 's'}`);
    }
    if (reunderstand && !brainMissing) {
      const via = understood.brainUsed === 'online'
        ? 'via Website AI'
        : understood.brainUsed === 'local'
          ? 'via Built-in AI'
          : canonicalSrc.trim() !== writtenSrc.trim()
            ? 'by understander rules'
            : '(already canonical sdev)';
      toast.success(`Re-understood ${via}`);
    }
    const rawSrc = applyExtensions(canonicalSrc);

    if (wantsV2(canonicalSrc)) {
      setIsRunning(true);
      setStatusMsg('Running (v2 · self-hosted)…');
      setUiState(null); setWebState(null);
      try {
        let r = v2AsWrittenError !== null && canonicalSrc.trim() === writtenSrc.trim()
          ? { notCompiled: v2AsWrittenError }
          : await tryV2(canonicalSrc);
        if ('notCompiled' in r && v2AsWrittenError === null && overrideSrc === undefined && canonicalSrc.trim() !== writtenSrc.trim()) {
          const asIs = await tryV2(writtenSrc);
          if (!('notCompiled' in asIs)) r = asIs;
        }
        if ('notCompiled' in r) {
          const reason = v2AsWrittenError ?? r.notCompiled;
          setOutput([
            `✗ the self-hosted sdev compiler cannot compile this yet: ${reason}`,
            '  v2 runs only on the self-hosted toolchain — no JavaScript fallback.',
            '  Run it with #!sdev v1 while this feature is being self-hosted.',
          ]);
          setError(reason);
          setStatusMsg('✗ not yet self-hosted');
          setBottomPanel('terminal');
          const failedId = activeFile.id;
          setFiles((prev) => prev.map((f) => (f.id === failedId ? { ...f, understood: undefined } : f)));
        } else {
          showV2(r);
        }
      } catch (e) {
        setStatusMsg(`✗ v2: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        setIsRunning(false);
      }
      return;
    }

    const { stripBoardBlocks } = await import('@/lang/hardware/strip');
    let code = stripBoardBlocks(rawSrc);
    const outputLines: string[] = [];
    const commands: GraphicsCommand[] = [];
    let turtleState: TurtleState = { x: 200, y: 200, angle: -90, penDown: true, color: '#00ff88', width: 2 };
    uiStateRef.current = null;
    setUiState(null);
    setWebState(null);
    setIsRunning(true);
    setStatusMsg(noUnderstand ? 'Running (without understanding)…' : 'Running…');

    if (selectedLanguage !== 'English') {
      const tr = await translate(code, selectedLanguage);
      if (tr) {
        code = tr.translated;
        if (tr.usedAI) toast.info('Translated using fallback engine');
        const humanLangDetected = tr.detectedLanguage && tr.detectedLanguage !== 'English' ? tr.detectedLanguage : null;
        if (humanLangDetected || code.trim() !== stripBoardBlocks(rawSrc).trim()) {
          const translatedCode = code;
          const fileId = activeFile.id;
          setTranslatedContent(prev => {
            const next = new Map(prev);
            next.set(fileId, translatedCode);
            return next;
          });
          setFiles((prev) => prev.map((f) => (f.id === fileId ? {
            ...f,
            understood: {
              ...baseUnderstoodMeta,
              source: translatedCode,
              detectedLanguage: humanLangDetected,
            },
          } : f)));
        }
      }
    }

    if (/\blink\s+["']/.test(code)) {
      try {
        const { resolveLinks } = await import('@/lang/tools/linker');
        code = resolveLinks(
          code,
          files.map(f => ({ name: f.name, content: f.content })),
          { entryName: activeFile.name }
        );
      } catch (linkErr) {
        toast.error(`Module link warning: ${linkErr instanceof Error ? linkErr.message : String(linkErr)}`);
      }
    }

    const lexerOpts = { sourceLanguage: 'English' as const, translate: false };
    const t0 = performance.now();

    try {
      const [{ Lexer }, { Parser }] = await Promise.all([
        import('@/lang/core/lexer'),
        import('@/lang/core/parser'),
      ]);
      const lexer = new Lexer(code, lexerOpts);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      let usedVm = false;
      if (runMode === 'vm') {
        const [{ Compiler }, { VM }, { createGraphicsBuiltins }] = await Promise.all([
          import('@/lang/runtime/compiler'),
          import('@/lang/runtime/vm'),
          import('@/lang/stdlib/graphics'),
        ]);
        const compiler = new Compiler();
        const chunk = compiler.compile(ast);
        const gfx = createGraphicsBuiltins(
          (cmd) => commands.push(cmd),
          () => turtleState,
          (state) => { turtleState = { ...turtleState, ...state }; }
        );
        const vm = new VM((msg) => outputLines.push(msg), gfx);
        vm.run(chunk);
        usedVm = true;
      } else {
        const [{ Interpreter }, { createGraphicsBuiltins }, { createUiBuiltins }, { createWebBuiltins, bindWebBuiltinsToEnv }] = await Promise.all([
          import('@/lang/runtime/interpreter'),
          import('@/lang/stdlib/graphics'),
          import('@/lang/stdlib/ui'),
          import('@/lang/stdlib/web'),
        ]);
        const interpreter = new Interpreter((msg) => outputLines.push(msg), { bindWeb: false });
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
        let interpreting = true;
        let producedUi = false;
        let pendingUi: UiState | null = null;
        const ui = createUiBuiltins(
          (s) => {
            producedUi = true;
            uiStateRef.current = s;
            if (interpreting) {
              pendingUi = s;
            } else {
              setUiState({ nodes: new Map(s.nodes), rootId: s.rootId, values: new Map(s.values) });
            }
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
        let producedWeb = false;
        let pendingWeb: WebState | null = null;
        const web = createWebBuiltins((s) => {
          producedWeb = true;
          if (interpreting) {
            pendingWeb = s;
          } else {
            setWebState({
              ...s,
              head: [...s.head],
              stack: s.stack.map(b => [...b]),
              css: [...s.css],
              js: [...s.js],
              moduleJs: [...(s.moduleJs ?? [])],
            });
          }
        });
        bindWebBuiltinsToEnv(env, web, { hasUiRoot: () => uiStateRef.current?.rootId != null });
        try {
          interpreter.interpret(ast);
        } finally {
          interpreting = false;
        }
        if (pendingUi) {
          setUiState({ nodes: new Map(pendingUi.nodes), rootId: pendingUi.rootId, values: new Map(pendingUi.values) });
        }
        if (pendingWeb) {
          setWebState({
            ...pendingWeb,
            head: [...pendingWeb.head],
            stack: pendingWeb.stack.map(b => [...b]),
            css: [...pendingWeb.css],
            js: [...pendingWeb.js],
            moduleJs: [...(pendingWeb.moduleJs ?? [])],
          });
        }
        if (producedWeb) setBottomPanel('web');
        else if (producedUi) setBottomPanel('app');
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
      setStatusMsg(
        noUnderstand
          ? `✓ Done in ${elapsed}ms (${usedVm ? 'VM · ' : ''}without understanding)`
          : `✓ Done in ${elapsed}ms${usedVm ? ' (VM)' : ''}`
      );
      recordRun(activeFile.name, activeFile.content, outputLines.join('\n'), 'success', elapsed);
    } catch (e) {
      const msg = e instanceof Error
        ? e.message
        : typeof e === 'object' && e !== null ? (() => { try { return JSON.stringify(e); } catch { return String(e); } })() : String(e);
      const rewritten = canonicalSrc.trim() !== writtenSrc.trim();
      if (!retried && !noUnderstand) {
        const { parses, unknownNames, reconsider } = await import('@/lang/agent');
        if (rewritten) {
          if (parses(writtenSrc)) { setIsRunning(false); return runCode(writtenSrc, true); }
        }
        const neededReading = rewritten || !parses(writtenSrc) || unknownNames(writtenSrc).length > 0;
        if (neededReading && !/!#agent\s*:\s*off/i.test(dialectSrc)) {
          setStatusMsg('Agent is rethinking…');
          const again = await reconsider(dialectSrc, msg, { dialect: activeDialect }).catch(() => null);
          if (again?.source) { setIsRunning(false); return runCode(again.source, true); }
        }
      }
      if (!noUnderstand) { const failedId = activeFile.id; setFiles((prev) => prev.map((f) => (f.id === failedId ? { ...f, understood: undefined } : f))); }
      setOutput(outputLines);
      setError(msg);
      setExecTime(null);
      setStatusMsg('✗ Error');
      setBottomPanel('terminal');
      recordRun(activeFile.name, activeFile.content, outputLines.join('\n') + '\nERROR: ' + msg, 'error', Math.round((performance.now() - t0) * 10) / 10);
    } finally {
      setIsRunning(false);
    }
  }, [activeFile, runMode, selectedLanguage, translate, recordRun, files]);

  const reunderstandCurrentFile = useCallback(async () => {
    if (!activeFile) return;
    const fileId = activeFile.id;
    setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, understood: undefined } : f)));
    setTranslatedContent((prev) => {
      if (!prev.has(fileId)) return prev;
      const next = new Map(prev);
      next.delete(fileId);
      return next;
    });
    await runCode({ reunderstand: true });
  }, [activeFile, runCode]);

  const newFile = useCallback((folderId: string | null = null) => {
    const id = nextFileId();
    setFiles(prev => {
      const name = uniqueUntitled(prev);
      return [...prev, { id, name, content: `// ${name}\n`, folderId } as IdeFile];
    });
    setOpenIds(prev => [...prev, id]);
    setActiveId(id);
  }, []);

  const convertAiView = useCallback(async () => {
    if (!activeFile) return;
    const { sdevToAi, aiToSdev, isAiDialect } = await import('@/lang/agent');
    const body = stripSignature(activeFile.content);
    const toAi = !isAiDialect(body);
    const source = toAi ? (activeFile.understood?.source ?? body) : body;
    const converted = toAi ? sdevToAi(source) : aiToSdev(source);
    const base = activeFile.name.replace(/(\.ai)?\.sdev$/, '');
    const id = nextFileId();
    setFiles(prev => {
      let name = `${base}${toAi ? '.ai' : ''}.sdev`;
      for (let n = 2; prev.some(f => f.name === name); n++) name = `${base}${toAi ? '.ai' : ''}-${n}.sdev`;
      return [...prev, { id, name, content: converted, folderId: activeFile.folderId ?? null } as IdeFile];
    });
    setOpenIds(prev => [...prev, id]);
    setActiveId(id);
    toast.success(toAi ? 'Opened as sdev:ai' : 'Opened as plain sdev');
  }, [activeFile]);

  const openSample = useCallback(async (file: string) => {
    const res = await fetch(`/samples/${file}`);
    if (!res.ok) { toast.error(`Could not open ${file}`); return; }
    const content = await res.text();
    const id = nextFileId();
    setFiles(prev => {
      let name = file;
      for (let n = 2; prev.some(f => f.name === name); n++) name = file.replace(/\.sdev$/, `-${n}.sdev`);
      return [...prev, { id, name, content, folderId: null } as IdeFile];
    });
    setOpenIds(prev => [...prev, id]);
    setActiveId(id);
  }, []);

  const newFolder = useCallback((parentId: string | null = null) => {
    const id = `f-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setFolders(prev => [...prev, { id, name: 'New Folder', parentId, expanded: true }]);
  }, []);

  const deleteFolder = useCallback((id: string) => {
    if (!confirm('Delete this folder and everything inside it?')) return;
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

  const selectFile = useCallback((id: string, line?: number) => {
    setActiveId(id);
    setOpenIds(prev => prev.includes(id) ? prev : [...prev, id]);
    if (line !== undefined) {
      setTimeout(() => editorRef.current?.jumpToLine(line), 20);
    }
  }, []);

  const closeTab = useCallback((id: string) => {
    const next = openIds.filter(x => x !== id);
    setOpenIds(next);
    if (activeId === id && next.length > 0) setActiveId(next[next.length - 1]);
  }, [openIds, activeId]);

  const downloadCurrentFile = async (variant: 'written' | 'translated' = 'written') => {
    if (!activeFile) return;
    const dialect = getActiveDialect();
    const existing = readSignature(activeFile.content);
    const runtime = (typeof localStorage !== 'undefined' && localStorage.getItem('sdev_runtime')) || 'v1';

    let embeddedTranslated: string | null =
      activeFile.understood?.source ?? translatedContent.get(activeFile.id) ?? existing?.translated ?? null;

    if (variant === 'translated' && !embeddedTranslated) {
      const { canonicalize } = await import('@/lang/dialect/canonicalize');
      const stripped = stripSignature(activeFile.content);
      const dialectSrc = dialect ? canonicalize(stripped, dialect).source : stripped;
      const { understandAsync, definedNames, understandKey, AGENT_VERSION } = await import('@/lang/agent');
      const projectNamesSet = new Set<string>();
      for (const f of files) {
        if (f.id === activeFile.id) continue;
        for (const n of definedNames(stripSignature(f.content))) projectNamesSet.add(n);
      }
      const projectNames = [...projectNamesSet];
      const fileKey = understandKey(dialectSrc, JSON.stringify([AGENT_VERSION, dialect ?? null, projectNames]));
      const res = await understandAsync(dialectSrc, { dialect, projectNames });
      embeddedTranslated = res.source;
      const fileId = activeFile.id;
      setFiles((prev) => prev.map((f) => (f.id === fileId ? {
        ...f,
        understood: {
          key: fileKey,
          bodySum: checksum(stripped),
          source: res.source,
          notesCount: res.notes.length,
          brainUsed: res.brainUsed,
          fromCache: !!res.cached,
          recipeOps: translationHasDiff(stripped, res.source) ? buildTranslationRecipe(stripped, res.source).length : undefined,
        },
      } : f)));
    }

    const { signed, outName } = signFileForExport(activeFile, variant, dialect, embeddedTranslated, runtime);
    downloadText(signed, outName);
    toast.success(variant === 'translated' ? `Downloaded ${outName}` : `Saved ${outName}`);
  };

  const downloadAllFiles = (variant: 'written' | 'translated' = 'written') => {
    const dialect = getActiveDialect();
    const runtime = (typeof localStorage !== 'undefined' && localStorage.getItem('sdev_runtime')) || 'v1';
    for (const file of files) {
      const existing = readSignature(file.content);
      const cachedTranslated = file.understood?.source ?? translatedContent.get(file.id) ?? existing?.translated ?? null;
      const { signed, outName } = signFileForExport(file, variant, dialect, cachedTranslated, runtime);
      downloadText(signed, outName);
    }
    toast.success(`Downloaded ${files.length} files (${variant === 'translated' ? 'translated' : 'user-written'})`);
  };

  const downloadElectron = () => {
    downloadElectronWrapper();
    toast.success('Downloaded Electron wrapper! See README for setup.');
  };

  const packageAsExe = async () => {
    if (!activeFile) { toast.error('No file open'); return; }
    const t = toast.loading('Packaging .exe — downloading runtime (~82 MB)…');
    try {
      await packageSourceAsExe(activeFile.name, activeFile.content);
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
        reader.onload = async (ev) => {
          const raw = (ev.target?.result as string) ?? '';
          const sig = readSignature(raw);
          const active = getActiveDialect();
          let content = stripSignature(raw);
          let note = '';
          if (sig?.dialect && sig.dialect !== (active?.meta.slug ?? null)) {
            const source = findLocalDialect(sig.dialect);
            if (source) {
              const { canonicalize, translateDialect } = await import('@/lang/dialect/canonicalize');
              content = active
                ? translateDialect(stripSignature(raw), source, active)
                : canonicalize(stripSignature(raw), source, { withPrelude: false }).source;
              note = ` · translated from ${source.meta.name}`;
            } else {
              note = ` · written in dialect "${sig.dialect}" (not installed)`;
            }
          }
          const id = nextFileId();
          const uploadedSum = checksum(content);
          const sigValid = Boolean(sig?.translated && (!sig.sum || sig.sum === uploadedSum));
          const newFileObj: IdeFile = {
            id,
            name: file.name,
            content,
            understood: sigValid && sig?.translated
              ? {
                  key: '',
                  bodySum: uploadedSum,
                  source: sig.translated,
                  brainUsed: sig.brain ?? 'none',
                  fromCache: true,
                  detectedLanguage: sig.lang ?? null,
                  recipeOps: sig.recipe?.length,
                }
              : undefined,
          };
          setFiles(prev => [...prev, newFileObj]);
          setOpenIds(prev => [...prev, id]);
          setActiveId(id);
          toast.success(`Opened ${file.name}${note}`);
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

  return (
    <TooltipProvider delayDuration={400}>
      <SEO title="IDE — sdev" description="Full-featured sdev IDE in your browser. File tree, terminal, debugger, and live preview for the sdev programming language." path="/ide" />
      <div
        className={`ide-shell ide-theme-${settings.theme} relative flex flex-col h-screen text-foreground overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        style={{ fontFamily: "'Geist', system-ui, sans-serif", ...(IDE_THEME_VARS[settings.theme] as React.CSSProperties) }}
      >
        {!zenMode && (
          <IdeTitleBar
            activeFile={activeFile}
            currentCloudId={activeFile ? (cloudIds[activeFile.id] ?? activeFile.cloudId ?? null) : null}
            runMode={runMode}
            onSetRunMode={setRunMode}
            isRunning={isRunning}
            isTranslating={isTranslating}
            selectedLanguage={selectedLanguage}
            onSelectLanguage={setSelectedLanguage}
            lastResult={lastResult}
            hasTranslation={hasTranslation}
            showTranslated={showTranslated}
            onToggleShowTranslated={() => setShowTranslated(v => !v)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(f => !f)}
            theme={settings.theme}
            onToggleTheme={() => setSettings(s => ({ ...s, theme: s.theme === 'light' ? 'dark' : 'light' }))}
            onNewFile={() => newFile()}
            onUploadFile={uploadFile}
            onDownloadCurrentFile={(variant) => void downloadCurrentFile(variant)}
            onDownloadAllFiles={downloadAllFiles}
            onOpenGitHubPush={() => setShowGitHubPush(true)}
            onOpenWasiDialog={() => setShowWasiDialog(true)}
            onDownloadElectron={downloadElectron}
            onPackageAsExe={() => void packageAsExe()}
            onResetToDefaults={resetToDefaults}
            onFormatCurrent={formatCurrent}
            onOpenFind={() => editorRef.current?.openFind()}
            onOpenGoToLine={() => setShowGoToLine(true)}
            onReunderstand={() => void reunderstandCurrentFile()}
            onConvertAiView={() => void convertAiView()}
            onOpenSample={(file) => void openSample(file)}
            onInsertSnippet={(name, snippet) => {
              if (!activeFile) return;
              editorRef.current?.insertAtCursor(snippet.replace(/\$[0-9]/g, ''));
              toast.success(`Inserted ${name} snippet`);
            }}
            onToggleSidePanel={(panel) => setSidePanel(p => p === panel ? null : panel)}
            onSetBottomPanel={setBottomPanel}
            onOpenCanvas={() => { setBottomPanel('canvas'); setShowCanvas(true); }}
            onRunCode={() => void runCode()}
            onRunWithoutUnderstanding={() => void runCode({ noUnderstand: true })}
            onOpenCommandPalette={() => setShowCommandPalette(true)}
            onNavigateHome={() => navigate('/')}
            onCloudIdChange={(cid) => {
              if (!activeFile) return;
              setCloudIds(prev => ({ ...prev, [activeFile.id]: cid }));
              setFiles(prev => prev.map(f => f.id === activeFile.id ? { ...f, cloudId: cid } : f));
            }}
            onLoadCloudFile={(name, content, cid) => {
              const existing = files.find(f => (cloudIds[f.id] ?? f.cloudId ?? null) === cid);
              if (existing) {
                setFiles(prev => prev.map(f => f.id === existing.id ? { ...f, name, content, cloudId: cid } : f));
                setOpenIds(prev => prev.includes(existing.id) ? prev : [...prev, existing.id]);
                setActiveId(existing.id);
                setCloudIds(prev => ({ ...prev, [existing.id]: cid }));
                return;
              }
              const id = nextFileId();
              const file: IdeFile = { id, name, content, cloudId: cid };
              setFiles(prev => [...prev, file]);
              setOpenIds(prev => [...prev, id]);
              setActiveId(id);
              setCloudIds(prev => ({ ...prev, [id]: cid }));
            }}
          />
        )}

        {/* ── Activity Bar + Main Body ── */}
        <div className="relative z-10 flex flex-1 min-h-0 overflow-hidden">
          {!zenMode && !isMobile && (
            <IdeActivityBar
              sidePanel={sidePanel}
              onToggleSidePanel={setSidePanel}
              problemsCount={problems.length}
              zenMode={zenMode}
              onToggleZenMode={() => setZenMode(z => !z)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(f => !f)}
            />
          )}

          <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0">
            {sidePanel && isMobile && <div data-testid="ide-mobile-backdrop" className="fixed inset-0 z-40 bg-black/55 md:hidden" onClick={() => setSidePanel(null)} />}
            {sidePanel && (
              <>
                <ResizablePanel id="side" order={1} defaultSize={18} minSize={12} maxSize={35} className="ide-sidepanel flex min-h-0 flex-col max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-50 max-md:!w-[86vw] max-md:max-w-sm max-md:shadow-2xl max-md:bg-card">
                  <Suspense fallback={<div role="status" className="p-3 text-xs text-muted-foreground">Loading…</div>}>
                    <h2 className="sr-only">Workspace files and tools</h2>
                    {sidePanel === 'explorer' && (
                      <IdeFileTree
                        files={files}
                        folders={folders}
                        activeId={activeId}
                        onSelect={(id) => { selectFile(id); if (isMobile) setSidePanel(null); }}
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
                        onInsertCode={(snippet) => {
                          if (!activeFile) return;
                          updateActiveContent(activeFile.content + (activeFile.content.endsWith('\n') ? '' : '\n') + snippet);
                        }}
                      />
                    )}
                    {sidePanel === 'runtime' && (
                      <RuntimeExplorerPanel
                        initialQuery={runtimeQuery}
                        onInsertCode={(snippet) => {
                          if (!activeFile) return;
                          updateActiveContent(activeFile.content + (activeFile.content.endsWith('\n') ? '' : '\n') + snippet);
                        }}
                      />
                    )}
                    {sidePanel === 'classroom' && (
                      <LiveClassroomPanel
                        fileName={activeFile?.name ?? 'main.sdev'}
                        content={activeFile?.content ?? ''}
                        cursor={cursor}
                        lastOutput={output}
                        lastError={error}
                        onApplyRemoteCode={(newCode) => updateActiveContent(newCode)}
                        onJumpToLine={(line) => editorRef.current?.jumpToLine(line)}
                      />
                    )}
                    {sidePanel === 'personal' && (
                      <PersonalPanel
                        content={activeFile?.content}
                        onReplaceContent={updateActiveContent}
                      />
                    )}
                    {sidePanel === 'settings' && (
                      <IdeSettingsPanel settings={settings} onChange={setSettings} />
                    )}
                  </Suspense>
                </ResizablePanel>
                <ResizableHandle withHandle className="max-md:hidden" />
              </>
            )}

            <ResizablePanel id="main" order={2} defaultSize={sidePanel && !isMobile ? 82 : 100} className="flex min-h-0 flex-col">
              <ResizablePanelGroup direction="vertical" className="min-h-0">
                <ResizablePanel id="editor" order={1} defaultSize={65} minSize={25} className="min-h-0">
                  <div className="flex h-full min-h-0 flex-col">
                    <IdeTabs files={openFiles} activeId={activeId} onSelect={selectFile} onClose={closeTab} />
                    {hasTranslation && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 border-b border-primary/20 text-xs font-mono">
                        <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                        <span className="text-primary truncate">
                          {activeFile?.understood?.fromCache ? '⚡ Cached translation' : '✨ Translated'}
                          {activeFile?.understood?.detectedLanguage && activeFile.understood.detectedLanguage !== 'English'
                            ? <> from <strong>{activeFile.understood.detectedLanguage}</strong> → canonical sdev</>
                            : activeFile?.understood?.brainUsed === 'online'
                              ? ' via Website AI → canonical sdev'
                              : activeFile?.understood?.brainUsed === 'local'
                                ? ' via Built-in AI → canonical sdev'
                                : ' by understander → canonical sdev'}
                        </span>
                        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
                          <button
                            onClick={() => void reunderstandCurrentFile()}
                            disabled={isRunning || isTranslating}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                          >
                            <RefreshCw className="w-3 h-3" /> Re-understand
                          </button>
                          <button
                            onClick={() => void downloadCurrentFile('translated')}
                            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="w-3 h-3" /> Download translated
                          </button>
                          <button
                            onClick={() => setShowTranslated(v => !v)}
                            className="flex items-center gap-1 text-primary hover:text-foreground transition-colors font-semibold"
                          >
                            {showTranslated ? <><EyeOff className="w-3 h-3" /> Show original</> : <><Eye className="w-3 h-3" /> Preview</>}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-h-0 overflow-hidden">
                      {activeFile ? (
                        showTranslated && hasTranslation && translatedSourceForActive ? (
                          <div className="flex flex-col h-full">
                            <div className="px-3 py-1 text-[10px] font-mono text-muted-foreground bg-muted/10 border-b border-border/30 flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                <Eye className="w-3 h-3" />
                                Translated canonical sdev (read-only) — edit your original to make changes
                              </span>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() => void reunderstandCurrentFile()}
                                  disabled={isRunning || isTranslating}
                                  className="hover:text-foreground transition-colors flex items-center gap-1 disabled:opacity-50"
                                >
                                  <RefreshCw className="w-3 h-3" /> Re-understand
                                </button>
                                <button
                                  onClick={() => void downloadCurrentFile('translated')}
                                  className="hover:text-foreground transition-colors flex items-center gap-1"
                                >
                                  <Download className="w-3 h-3" /> Download translated
                                </button>
                              </div>
                            </div>
                            <IdeEditor
                              key={activeFile.id + '-translated'}
                              value={translatedSourceForActive}
                              onChange={() => {}}
                              readOnly
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
                              onRun={() => void runCode()}
                              onFormat={formatCurrent}
                              fileName={activeFile.name}
                              problems={problems}
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

                {(!isMobile || showBottom) && <ResizableHandle withHandle />}

                {(!isMobile || showBottom) && <ResizablePanel id="bottom" order={2} defaultSize={35} minSize={15} maxSize={65} className="min-h-0 overflow-hidden">
                  <div className="ide-tabsbar flex items-center flex-shrink-0">
                    <button
                      onClick={() => setBottomPanel('terminal')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'terminal' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <Terminal className="w-3 h-3" /> OUTPUT
                      {error && <span className="w-1.5 h-1.5 rounded-full bg-destructive ml-1" />}
                    </button>
                    <button
                      onClick={() => setBottomPanel('debugger')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'debugger' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <History className="w-3 h-3" /> TIME-TRAVEL
                    </button>
                    <button
                      onClick={() => setBottomPanel('scratchpad')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border-b-2 transition-all ${bottomPanel === 'scratchpad' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                    >
                      <Sparkles className="w-3 h-3" /> LIVE SCRATCHPAD
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
                      <button onClick={() => setShowCanvas(false)} aria-label="Close canvas" className="p-1 mr-1 text-muted-foreground hover:text-foreground transition-colors rounded">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <Suspense fallback={<div role="status" className="p-3 text-xs text-muted-foreground">Loading…</div>}>
                    {bottomPanel === 'terminal' && (
                      <>
                        <h2 className="sr-only">Terminal output</h2>
                        <IdeTerminal
                          lines={output}
                          error={error}
                          execTime={execTime}
                          onClear={() => { setOutput([]); setError(undefined); setExecTime(null); }}
                        />
                      </>
                    )}
                    {bottomPanel === 'debugger' && (
                      <TimeTravelDebugger
                        source={activeFile?.content ?? ''}
                        runtime={runMode === 'vm' ? 'v2' : 'v1'}
                        onJumpToLine={(line) => editorRef.current?.jumpToLine(line)}
                        onSyncCanvas={(cmds) => {
                          setGraphicsCommands(cmds);
                          setShowCanvas(true);
                        }}
                      />
                    )}
                    {bottomPanel === 'scratchpad' && (
                      <LiveScratchpadPanel
                        source={activeFile?.content ?? ''}
                        onJumpToLine={(line) => editorRef.current?.jumpToLine(line)}
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
                  </Suspense>
                </ResizablePanel>}
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {isMobile && !zenMode && (
          <IdeMobileBar
            sidePanel={sidePanel}
            onTogglePanel={(p) => setSidePanel((cur) => (cur === p ? null : p))}
            bottomOpen={showBottom}
            onToggleBottom={() => setShowBottom((b) => !b)}
            onRun={() => { setShowBottom(true); void runCode(); }}
          />
        )}
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
          extra={
            <>
              {activeFile && (
                <FileInfoPopover
                  fileName={activeFile.name}
                  content={activeFile.content}
                  cloudId={cloudIds[activeFile.id] ?? activeFile.cloudId ?? null}
                  runtime={runMode === 'vm' ? 'v2' : (typeof localStorage !== 'undefined' && localStorage.getItem('sdev_runtime')) || 'v1'}
                  translatedSource={hasTranslation ? translatedSourceForActive : null}
                  recipeOps={activeFile.understood?.recipeOps}
                />
              )}
              <DialectSwitcher />
            </>
          }
        />

        <Suspense fallback={null}>
          {showCommandPalette && (
            <IdeCommandPalette
              files={files}
              onClose={() => setShowCommandPalette(false)}
              onSelectFile={(id) => { selectFile(id); setShowCommandPalette(false); }}
              onNewFile={() => { newFile(); setShowCommandPalette(false); }}
              onRun={() => { void runCode(); setShowCommandPalette(false); }}
              onRunWithoutUnderstanding={() => { void runCode({ noUnderstand: true }); setShowCommandPalette(false); }}
              onTogglePanel={(panel) => { setSidePanel(p => p === panel ? null : panel); setShowCommandPalette(false); }}
            />
          )}

          <IdeGoToLine
            open={showGoToLine}
            totalLines={currentLines}
            onClose={() => setShowGoToLine(false)}
            onGo={(line) => editorRef.current?.jumpToLine(line)}
          />

          {showGitHubPush && (
            <GitHubPushDialog
              open={showGitHubPush}
              onOpenChange={setShowGitHubPush}
              files={files}
            />
          )}

          {showWasiDialog && (
            <WasiComponentDialog
              open={showWasiDialog}
              onOpenChange={setShowWasiDialog}
              source={activeFile?.content ?? ''}
              fileName={activeFile?.name ?? 'module.sdev'}
            />
          )}
        </Suspense>

        <DesktopNativeButton getSource={() => activeFile?.content ?? ''} />
      </div>
    </TooltipProvider>
  );
}
