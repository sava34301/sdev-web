import {
  Play, Zap, Download, Cpu, Save, ChevronDown, Search, Terminal,
  Code, BookOpen, RotateCcw, Maximize2, Minimize2, FolderOpen, Command,
  Bug, Palette, Languages, RefreshCw, Eye, EyeOff, Wand2, ArrowRight,
  Sparkles, Github, Globe, Boxes,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserMenu } from '@/components/ide/UserMenu';
import { SUPPORTED_LANGUAGES } from '@/ide/themes';
import { SNIPPETS } from '@/ide/starterFiles';
import type { IdeFile, RunMode, SidePanel, BottomPanel } from '@/ide/types';
import type { TranslationResult } from '@/hooks/useCodeTranslation';
import { SdevMark } from '@/components/site/SdevMark';

interface IdeTitleBarProps {
  activeFile?: IdeFile;
  currentCloudId: string | null;
  runMode: RunMode;
  onSetRunMode: (mode: RunMode) => void;
  isRunning: boolean;
  isTranslating: boolean;
  selectedLanguage: string;
  onSelectLanguage: (lang: string) => void;
  lastResult: TranslationResult | null;
  hasTranslation: boolean;
  showTranslated: boolean;
  onToggleShowTranslated: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onNewFile: () => void;
  onUploadFile: () => void;
  onDownloadCurrentFile: (variant: 'written' | 'translated') => void;
  onDownloadAllFiles: (variant: 'written' | 'translated') => void;
  onOpenGitHubPush: () => void;
  onOpenWasiDialog: () => void;
  onDownloadElectron: () => void;
  onPackageAsExe: () => void;
  onResetToDefaults: () => void;
  onFormatCurrent: () => void;
  onOpenFind: () => void;
  onOpenGoToLine: () => void;
  onReunderstand: () => void;
  onConvertAiView: () => void;
  onOpenSample: (file: string) => void;
  onInsertSnippet: (name: string, snippet: string) => void;
  onToggleSidePanel: (panel: SidePanel) => void;
  onSetBottomPanel: (panel: BottomPanel) => void;
  onOpenCanvas: () => void;
  onRunCode: () => void;
  onRunWithoutUnderstanding: () => void;
  onOpenCommandPalette: () => void;
  onNavigateHome: () => void;
  onCloudIdChange: (cid: string) => void;
  onLoadCloudFile: (name: string, content: string, cid: string) => void;
}

export function IdeTitleBar({
  activeFile,
  currentCloudId,
  runMode,
  onSetRunMode,
  isRunning,
  isTranslating,
  selectedLanguage,
  onSelectLanguage,
  lastResult,
  hasTranslation,
  showTranslated,
  onToggleShowTranslated,
  isFullscreen,
  onToggleFullscreen,
  onNewFile,
  onUploadFile,
  onDownloadCurrentFile,
  onDownloadAllFiles,
  onOpenGitHubPush,
  onOpenWasiDialog,
  onDownloadElectron,
  onPackageAsExe,
  onResetToDefaults,
  onFormatCurrent,
  onOpenFind,
  onOpenGoToLine,
  onReunderstand,
  onConvertAiView,
  onOpenSample,
  onInsertSnippet,
  onToggleSidePanel,
  onSetBottomPanel,
  onOpenCanvas,
  onRunCode,
  onRunWithoutUnderstanding,
  onOpenCommandPalette,
  onNavigateHome,
  onCloudIdChange,
  onLoadCloudFile,
}: IdeTitleBarProps) {
  return (
    <div className="ide-titlebar relative z-10 flex items-center justify-between px-3 py-1.5 flex-shrink-0 select-none">
      {/* Left */}
      <div className="flex items-center gap-2">
        <h1 className="flex items-center gap-2 m-0 text-sm font-display font-bold pl-1">
          <span className="relative flex items-center justify-center w-7 h-7">
            <SdevMark size={24} />
          </span>
          <span className="hidden sm:block tracking-tight font-display">sdev <span className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">IDE</span></span>
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
              <DropdownMenuItem onClick={onNewFile} className="text-xs gap-2 cursor-pointer">
                <Code className="w-3.5 h-3.5" /> New File <span className="ml-auto text-muted-foreground">⌃N</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onUploadFile} className="text-xs gap-2 cursor-pointer">
                <FolderOpen className="w-3.5 h-3.5" /> Open File…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDownloadCurrentFile('written')} className="text-xs gap-2 cursor-pointer">
                <Save className="w-3.5 h-3.5" /> Save (user-written) <span className="ml-auto text-muted-foreground">⌃S</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownloadCurrentFile('translated')} className="text-xs gap-2 cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Download translated (.sdev)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownloadAllFiles('written')} className="text-xs gap-2 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Save All Files
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onOpenGitHubPush} className="text-xs gap-2 cursor-pointer">
                <Github className="w-3.5 h-3.5" /> Push to GitHub…
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDownloadElectron} className="text-xs gap-2 cursor-pointer">
                <Download className="w-3.5 h-3.5" /> Download Desktop App
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onResetToDefaults} className="text-xs gap-2 cursor-pointer text-destructive">
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
              <DropdownMenuItem onClick={onFormatCurrent} className="text-xs gap-2 cursor-pointer">
                <Wand2 className="w-3.5 h-3.5" /> Format Document <span className="ml-auto text-muted-foreground">⇧⌃I</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenFind} className="text-xs gap-2 cursor-pointer">
                <Search className="w-3.5 h-3.5" /> Find / Replace <span className="ml-auto text-muted-foreground">⌃F</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenGoToLine} className="text-xs gap-2 cursor-pointer">
                <ArrowRight className="w-3.5 h-3.5" /> Go to Line… <span className="ml-auto text-muted-foreground">⌃G</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReunderstand} className="text-xs gap-2 cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5" /> Re-understand File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onConvertAiView} className="text-xs gap-2 cursor-pointer">
                <Wand2 className="w-3.5 h-3.5" /> {activeFile && /^\s*(\/\/[^\n]*\n\s*)*!#ai\b/.test(activeFile.content) ? 'Open as plain sdev' : 'Open as sdev:ai'}
              </DropdownMenuItem>
              {([['quiz.ai.sdev', 'sdev:ai example: quiz game'], ['todo.ai.sdev', 'sdev:ai example: to-do list']] as const).map(([file, label]) => (
                <DropdownMenuItem key={file} onClick={() => onOpenSample(file)} className="text-xs gap-2 cursor-pointer">
                  <Wand2 className="w-3.5 h-3.5" /> {label}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Snippets</DropdownMenuLabel>
              {Object.entries(SNIPPETS).map(([name, snippet]) => (
                <DropdownMenuItem
                  key={name}
                  onClick={() => onInsertSnippet(name, snippet)}
                  className="text-xs gap-2 cursor-pointer font-mono"
                >
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
              <DropdownMenuItem onClick={() => onToggleSidePanel('explorer')} className="text-xs gap-2 cursor-pointer">
                <FolderOpen className="w-3.5 h-3.5" /> Explorer <span className="ml-auto text-muted-foreground">⌃B</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleSidePanel('search')} className="text-xs gap-2 cursor-pointer">
                <Search className="w-3.5 h-3.5" /> Search <span className="ml-auto text-muted-foreground">⇧⌃F</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSetBottomPanel('terminal')} className="text-xs gap-2 cursor-pointer">
                <Terminal className="w-3.5 h-3.5" /> Terminal <span className="ml-auto text-muted-foreground">⌃`</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCanvas} className="text-xs gap-2 cursor-pointer">
                <Palette className="w-3.5 h-3.5" /> Canvas
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onToggleFullscreen} className="text-xs gap-2 cursor-pointer">
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
            <DropdownMenuContent className="w-56 bg-card border-border/50">
              <DropdownMenuItem onClick={onRunCode} className="text-xs gap-2 cursor-pointer">
                <Play className="w-3.5 h-3.5 text-neon-green" /> Run Program <span className="ml-auto text-muted-foreground">⌃↵</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRunWithoutUnderstanding} className="text-xs gap-2 cursor-pointer">
                <Zap className="w-3.5 h-3.5 text-neon-cyan" /> Run without Understanding <span className="ml-auto text-muted-foreground">⇧⌃↵</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReunderstand} className="text-xs gap-2 cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5 text-primary" /> Re-understand & Run
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onSetRunMode('interpreter')} className="text-xs gap-2 cursor-pointer">
                <Zap className="w-3.5 h-3.5 text-neon-cyan" /> Tree-walk Interpreter {runMode === 'interpreter' && '✓'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetRunMode('vm')} className="text-xs gap-2 cursor-pointer">
                <Cpu className="w-3.5 h-3.5 text-neon-violet" /> Compiler (Bytecode VM) {runMode === 'vm' && '✓'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Help Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ide-menu-btn font-mono">Help</button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52 bg-card border-border/50">
              <DropdownMenuItem onClick={() => window.open('/documentation/02-language/v1-reference.md', '_blank')} className="text-xs gap-2 cursor-pointer">
                <BookOpen className="w-3.5 h-3.5" /> Documentation
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCommandPalette} className="text-xs gap-2 cursor-pointer">
                <Command className="w-3.5 h-3.5" /> Command Palette <span className="ml-auto text-muted-foreground">⌃P</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs text-muted-foreground">Keyboard Shortcuts</DropdownMenuLabel>
              <div className="px-2 py-1 text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between"><span>Run code</span><kbd className="font-mono">⌃↵</kbd></div>
                <div className="flex justify-between"><span>Save file</span><kbd className="font-mono">⌃S</kbd></div>
                <div className="flex justify-between"><span>Command palette</span><kbd className="font-mono">⌃P</kbd></div>
                <div className="flex justify-between"><span>Toggle explorer</span><kbd className="font-mono">⌃B</kbd></div>
                <div className="flex justify-between"><span>Toggle search</span><kbd className="font-mono">⇧⌃F</kbd></div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Right: quick actions */}
      <div className="flex min-w-0 items-center gap-1.5 max-md:overflow-x-auto max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={onNavigateHome}
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
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onOpenCommandPalette} aria-label="Open command palette">
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
              <Select value={selectedLanguage} onValueChange={onSelectLanguage}>
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
              <div>The system translates to English on first run,</div>
              <div>then caches for instant future runs.</div>
              {(lastResult?.detectedLanguage || activeFile?.understood?.detectedLanguage) && (
                <div className="mt-1 text-primary">
                  Last: {lastResult?.detectedLanguage ?? activeFile?.understood?.detectedLanguage}{' '}
                  {(lastResult?.fromCache ?? activeFile?.understood?.fromCache) ? '(cached ⚡)' : '(translated ✨)'}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Show translated source toggle */}
        {hasTranslation && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={showTranslated ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                onClick={onToggleShowTranslated}
                aria-label={showTranslated ? 'Show original code' : 'Preview translated sdev'}
              >
                {showTranslated ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showTranslated ? 'Show original code' : 'Preview translated sdev'}</TooltipContent>
          </Tooltip>
        )}

        {activeFile && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 px-2 text-xs font-mono text-muted-foreground hover:text-primary"
                onClick={onReunderstand}
                disabled={isRunning || isTranslating}
                aria-label="Re-understand code"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
                <span className="hidden lg:inline">Re-understand</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear cached reading and re-understand this file</TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center gap-1 border border-border/40 rounded-md overflow-hidden">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onSetRunMode('interpreter')}
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
                onClick={() => onSetRunMode('vm')}
                className={`px-2 py-1 text-xs font-mono transition-all ${runMode === 'vm' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'}`}
              >
                <Cpu className="w-3 h-3 inline mr-1" />Compiler
              </button>
            </TooltipTrigger>
            <TooltipContent>Compiler (Bytecode VM)</TooltipContent>
          </Tooltip>
        </div>

        {hasTranslation ? (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/50 h-7">
                    <Save className="w-3 h-3" />
                    <span className="hidden sm:inline">Save</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Download user-written or translated version</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border/50">
              <DropdownMenuItem onClick={() => onDownloadCurrentFile('written')} className="gap-2 text-xs cursor-pointer">
                <Save className="w-3.5 h-3.5 text-neon-cyan" /> User-written version (.sdev)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownloadCurrentFile('translated')} className="gap-2 text-xs cursor-pointer">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Translated version (.sdev)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => onDownloadCurrentFile('written')} className="gap-1.5 text-xs border-border/50 h-7">
                <Save className="w-3 h-3" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save file (Ctrl+S)</TooltipContent>
          </Tooltip>
        )}

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
          <DropdownMenuContent align="end" className="w-60 bg-card border-border/50">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Downloads</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDownloadCurrentFile('written')} className="gap-2 text-xs cursor-pointer">
              <Save className="w-3.5 h-3.5 text-neon-cyan" /> Current file — user-written (.sdev)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadCurrentFile('translated')} className="gap-2 text-xs cursor-pointer">
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Current file — translated (.sdev)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadAllFiles('written')} className="gap-2 text-xs cursor-pointer">
              <Download className="w-3.5 h-3.5 text-neon-green" /> All files (user-written)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownloadAllFiles('translated')} className="gap-2 text-xs cursor-pointer">
              <Download className="w-3.5 h-3.5 text-primary" /> All files (translated)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenWasiDialog} className="gap-2 text-xs cursor-pointer">
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
              <div>
                <div className="font-medium">WASI 0.2 Component (.wasm)</div>
                <div className="text-muted-foreground text-[10px]">Polyglot .wit + Rust/Python/Node/Go</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onPackageAsExe} className="gap-2 text-xs cursor-pointer">
              <Cpu className="w-3.5 h-3.5 text-neon-cyan" />
              <div>
                <div className="font-medium">Compile to .exe</div>
                <div className="text-muted-foreground text-[10px]">Standalone Windows binary (~82 MB)</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDownloadElectron} className="gap-2 text-xs cursor-pointer">
              <Bug className="w-3.5 h-3.5 text-neon-violet" />
              <div>
                <div className="font-medium">Electron Desktop App</div>
                <div className="text-muted-foreground text-[10px]">Windows / Mac / Linux</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center">
          <Button
            size="sm"
            onClick={onRunCode}
            disabled={isRunning || isTranslating}
            className="ide-run-btn gap-1.5 font-semibold h-7 text-xs min-w-[68px] rounded-l-md rounded-r-none border-0"
          >
            {isTranslating ? (
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Translating</span>
            ) : isRunning ? (
              <span className="flex items-center gap-1"><span className="animate-spin">⟳</span> Running</span>
            ) : (
              <><Play className="w-3 h-3 fill-current" /> Run</>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                disabled={isRunning || isTranslating}
                aria-label="Run options"
                className="ide-run-btn h-7 px-1.5 rounded-r-md rounded-l-none border-0 border-l border-background/20"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border/50">
              <DropdownMenuItem onClick={onRunCode} className="text-xs gap-2 cursor-pointer">
                <Play className="w-3.5 h-3.5 text-neon-green" /> Run Program <span className="ml-auto text-muted-foreground">⌃↵</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRunWithoutUnderstanding} className="text-xs gap-2 cursor-pointer">
                <Zap className="w-3.5 h-3.5 text-neon-cyan" /> Run without Understanding <span className="ml-auto text-muted-foreground">⇧⌃↵</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReunderstand} className="text-xs gap-2 cursor-pointer">
                <RefreshCw className="w-3.5 h-3.5 text-primary" /> Re-understand & Run
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {activeFile && (
          <UserMenu
            currentName={activeFile.name}
            currentContent={activeFile.content}
            currentCloudId={currentCloudId}
            onCloudIdChange={onCloudIdChange}
            onLoadFile={onLoadCloudFile}
          />
        )}
      </div>
    </div>
  );
}
