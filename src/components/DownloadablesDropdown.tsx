import { Button } from '@/components/ui/button';
import RELEASE from '../../release.json';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileCode, Terminal, Monitor, BookOpen, Code2, ChevronDown, Puzzle, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import { downloadBlob, downloadText } from '@/lib/download';
import { buildStandaloneHtmlApp, buildWindowsInstallerBat } from './downloadTemplates';

interface DownloadablesDropdownProps {
  code: string;
}

export function DownloadablesDropdown({ code }: DownloadablesDropdownProps) {
  const downloadSdevFile = () => {
    downloadText(code, 'main.sdev');
    toast.success('Downloaded main.sdev');
  };

  const generateHTML = () => {
    downloadText(buildStandaloneHtmlApp(code), 'sdev-app.html', 'text/html');
    toast.success('Downloaded sdev-app.html');
  };

  const downloadWindowsInstaller = () => {
    downloadText(buildWindowsInstallerBat('https://web.sdev.codes'), 'sdev-installer.bat', 'application/bat');
    toast.success('Downloaded Windows installer v2.0', {
      description: 'Includes both interpreters with built-in 25-language translator',
      duration: 6000,
    });
  };

  const downloadPythonInterpreter = () => {
    window.open('/sdev-interpreter.py', '_blank');
    toast.success('Opening Python interpreter');
  };

  const downloadJavaScriptInterpreter = () => {
    window.open('/sdev-interpreter.js', '_blank');
    toast.success('Opening JavaScript interpreter');
  };

  const openDocumentation = () => {
    window.open('/docs', '_blank');
  };
  const downloadBookEn = () => {
    const a = document.createElement('a'); a.href = '/sdev-book-en.pdf'; a.download = 'sdev-book-en.pdf'; a.click();
    toast.success('Downloaded sdev Book (EN, PDF)');
  };
  const downloadBookBg = () => {
    const a = document.createElement('a'); a.href = '/sdev-book-bg.pdf'; a.download = 'sdev-book-bg.pdf'; a.click();
    toast.success('Изтеглена книга на sdev (BG)');
  };

  const downloadVsix = () => {
    fetch('/downloads/sdev-language.vsix')
      .then((res) => { if (!res.ok) throw new Error(`Download failed: ${res.status}`); return res.blob(); })
      .then((blob) => {
        downloadBlob(blob, 'sdev-language.vsix');
        toast.success('Downloaded VS Code extension (.vsix)', {
          description: 'In VS Code: Extensions ⋯ → Install from VSIX…',
          duration: 6000,
        });
      })
      .catch((err) => toast.error(err.message));
  };

  const downloadVsixZip = () => {
    fetch('/sdev-vscode-extension.zip')
      .then((res) => { if (!res.ok) throw new Error(`Download failed: ${res.status}`); return res.blob(); })
      .then((blob) => {
        downloadBlob(blob, 'sdev-vscode-extension.zip');
        toast.success('Downloaded extension source (.zip)');
      })
      .catch((err) => toast.error(err.message));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="gap-2 border-border/50 hover:border-neon-cyan/50 hover:shadow-neon-cyan transition-all"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Downloads & Tutorials</span>
          <span className="sm:hidden">Downloads</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-56 bg-card border-border/50 backdrop-blur-xl z-50"
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Code Files
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={downloadSdevFile} className="gap-3 cursor-pointer">
          <FileCode className="w-4 h-4 text-neon-cyan" />
          <div>
            <div className="font-medium">Download .sdev</div>
            <div className="text-xs text-muted-foreground">Current code file</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={generateHTML} className="gap-3 cursor-pointer">
          <Code2 className="w-4 h-4 text-neon-violet" />
          <div>
            <div className="font-medium">Export as HTML</div>
            <div className="text-xs text-muted-foreground">Standalone web app</div>
          </div>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-border/30" />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Interpreters
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={downloadPythonInterpreter} className="gap-3 cursor-pointer">
          <Terminal className="w-4 h-4 text-neon-magenta" />
          <div>
            <div className="font-medium">Python Interpreter</div>
            <div className="text-xs text-muted-foreground">Full-featured CLI</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadJavaScriptInterpreter} className="gap-3 cursor-pointer">
          <Code2 className="w-4 h-4 text-yellow-400" />
          <div>
            <div className="font-medium">JavaScript Interpreter</div>
            <div className="text-xs text-muted-foreground">Node.js & browser</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadWindowsInstaller} className="gap-3 cursor-pointer">
          <Monitor className="w-4 h-4 text-blue-400" />
          <div>
            <div className="font-medium">Windows Installer</div>
            <div className="text-xs text-muted-foreground">Quick setup script</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            fetch('/sdev-compiler.mjs')
              .then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.blob(); })
              .then((blob) => {
                downloadBlob(blob, 'sdev-compiler.mjs');
                toast.success('Downloaded sdev compiler v3.0', {
                  description: 'Run: node sdev-compiler.mjs run file.sdev  •  compile  •  run-bc  •  disasm  •  repl',
                  duration: 7000,
                });
              })
              .catch((e) => toast.error(e.message));
          }}
          className="gap-3 cursor-pointer"
        >
          <Cpu className="w-4 h-4 text-neon-green" />
          <div>
            <div className="font-medium">sdev Compiler (.mjs)</div>
            <div className="text-xs text-muted-foreground">Full bytecode compiler + VM CLI</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/30" />

        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Editor Tools
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={downloadVsix} className="gap-3 cursor-pointer">
          <Puzzle className="w-4 h-4 text-neon-cyan" />
          <div>
            <div className="font-medium">VS Code Extension (.vsix) · v{RELEASE.version}</div>
            <div className="text-xs text-muted-foreground">Runs files exactly like the website · updates itself</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            fetch('/downloads/sdev.mjs').then((r) => { if (!r.ok) throw new Error(`Download failed: ${r.status}`); return r.blob(); })
              .then((b) => {
                downloadBlob(b, 'sdev.mjs');
                toast.success('Downloaded the sdev command-line tool', { description: 'Run it with: node sdev.mjs run file.sdev — "sdev update" keeps it current.' });
              })
              .catch((e) => toast.error(e.message));
          }}
          className="gap-3 cursor-pointer"
        >
          <FileCode className="w-4 h-4 text-neon-cyan" />
          <div>
            <div className="font-medium">Command-line tool (sdev.mjs) · v{RELEASE.version}</div>
            <div className="text-xs text-muted-foreground">Needs Node.js · updates itself</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadVsixZip} className="gap-3 cursor-pointer">
          <FileCode className="w-4 h-4 text-neon-violet" />
          <div>
            <div className="font-medium">Extension Source (.zip)</div>
            <div className="text-xs text-muted-foreground">Unpacked folder for dev</div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-border/30" />

        <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
          Tutorials
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={openDocumentation} className="gap-3 cursor-pointer">
          <BookOpen className="w-4 h-4 text-green-400" />
          <div>
            <div className="font-medium">Docs Site</div>
            <div className="text-xs text-muted-foreground">Browse /docs with search</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadBookEn} className="gap-3 cursor-pointer">
          <BookOpen className="w-4 h-4 text-green-400" />
          <div>
            <div className="font-medium">The sdev Book (EN)</div>
            <div className="text-xs text-muted-foreground">Full downloadable book</div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={downloadBookBg} className="gap-3 cursor-pointer">
          <BookOpen className="w-4 h-4 text-green-400" />
          <div>
            <div className="font-medium">Книга за sdev (BG)</div>
            <div className="text-xs text-muted-foreground">Пълна изтегляема книга</div>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
