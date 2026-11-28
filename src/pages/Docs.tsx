import {
  BookOpen, Layers, Library, ScrollText, Brain, Code2, Cpu, Wrench, Terminal, Shield, MapPin, History,
} from 'lucide-react';

export type DocCategoryId =
  | 'overview'
  | 'language'
  | 'stdlib'
  | 'ai-oce'
  | 'tooling'
  | 'compiler'
  | 'domains'
  | 'operations';

export interface DocCategory {
  id: DocCategoryId;
  label: string;
}

export interface DocSource {
  id: string;
  title: string;
  relPath: string;
  url: string;
  category: DocCategoryId;
  icon: React.ComponentType<{ className?: string }>;
}

const BASE_URL = import.meta.env.BASE_URL || '/';
const docUrl = (relPath: string) => `${BASE_URL}documentation/${relPath}`;

export const CATEGORIES: DocCategory[] = [
  { id: 'overview',   label: 'Overview & Books' },
  { id: 'language',   label: 'Language & Personal' },
  { id: 'stdlib',     label: 'Stdlib & Accel' },
  { id: 'ai-oce',     label: 'AI & Causal Engine' },
  { id: 'tooling',    label: 'IDE, CLI & MCP' },
  { id: 'compiler',   label: 'Compiler & Targets' },
  { id: 'domains',    label: 'Domains' },
  { id: 'operations', label: 'Ops & History' },
];

export const SOURCES: DocSource[] = [
  // 01 — Overview & Books
  { id: 'hub',       title: 'Documentation Index',               relPath: 'README.md',                                 url: docUrl('README.md'),                                 category: 'overview', icon: Library },
  { id: 'book-en',   title: 'The sdev Book (EN)',                relPath: '01-overview/the-sdev-book-en.md',           url: docUrl('01-overview/the-sdev-book-en.md'),           category: 'overview', icon: BookOpen },
  { id: 'book-bg',   title: 'Книгата за sdev (BG)',              relPath: '01-overview/the-sdev-book-bg.md',           url: docUrl('01-overview/the-sdev-book-bg.md'),           category: 'overview', icon: BookOpen },
  { id: 'full',      title: 'Language Overview',                 relPath: '01-overview/language-overview.md',          url: docUrl('01-overview/language-overview.md'),          category: 'overview', icon: Layers },
  { id: 'ultimate',  title: 'Ultimate Reference (All)',          relPath: '01-overview/ultimate-reference.md',         url: docUrl('01-overview/ultimate-reference.md'),         category: 'overview', icon: Library },

  // 02 — Language & Personal SDEV
  { id: 'reference',      title: 'sdev v1 Reference',            relPath: '02-language/v1-reference.md',                      url: docUrl('02-language/v1-reference.md'),                      category: 'language', icon: Library },
  { id: 'v2',             title: 'sdev v2 "Prism" Guide',        relPath: '02-language/v2-prism-guide.md',                    url: docUrl('02-language/v2-prism-guide.md'),                    category: 'language', icon: ScrollText },
  { id: 'ai-syntax',      title: 'sdev:ai Syntax',               relPath: '02-language/ai-syntax-reference.md',               url: docUrl('02-language/ai-syntax-reference.md'),               category: 'language', icon: Brain },
  { id: 'personal',       title: 'Personal SDEV & @user/lib',    relPath: '02-language/personal-dialects-and-libraries.md',   url: docUrl('02-language/personal-dialects-and-libraries.md'),   category: 'language', icon: Code2 },
  { id: 'multi-paradigm', title: 'Multi-Paradigm Parity',        relPath: '02-language/multi-paradigm-parity.md',             url: docUrl('02-language/multi-paradigm-parity.md'),             category: 'language', icon: ScrollText },
  { id: 'fop-fp',         title: 'Feature & Function-Oriented',  relPath: '02-language/feature-and-function-oriented-programming.md', url: docUrl('02-language/feature-and-function-oriented-programming.md'), category: 'language', icon: Layers },
  { id: 'python',         title: 'Python Parity',                relPath: '02-language/python-parity-reference.md',           url: docUrl('02-language/python-parity-reference.md'),           category: 'language', icon: Code2 },

  // 03 — Standard Library & Acceleration
  { id: 'v2-stdlib',  title: 'v2 Stdlib & Web Toolkit',          relPath: '03-standard-library/v2-stdlib-and-web-toolkit.md', url: docUrl('03-standard-library/v2-stdlib-and-web-toolkit.md'), category: 'stdlib', icon: Library },
  { id: 'ml',         title: 'ML & LLM Stdlib',                  relPath: '03-standard-library/ml-and-llm-stdlib.md',         url: docUrl('03-standard-library/ml-and-llm-stdlib.md'),         category: 'stdlib', icon: Brain },
  { id: 'ffi',        title: 'FFI & Native Acceleration',        relPath: '03-standard-library/ffi-and-native-accel.md',      url: docUrl('03-standard-library/ffi-and-native-accel.md'),      category: 'stdlib', icon: Cpu },
  { id: 'webgpu',     title: 'WebGPU Acceleration',              relPath: '03-standard-library/webgpu-acceleration.md',       url: docUrl('03-standard-library/webgpu-acceleration.md'),       category: 'stdlib', icon: Cpu },
  { id: 'cuda',       title: 'CUDA Fast Path',                   relPath: '03-standard-library/cuda-fast-path.md',            url: docUrl('03-standard-library/cuda-fast-path.md'),            category: 'stdlib', icon: Cpu },
  { id: 'autoevolve', title: 'Autonomous Evolution',             relPath: '03-standard-library/autonomous-evolution.md',      url: docUrl('03-standard-library/autonomous-evolution.md'),      category: 'stdlib', icon: Brain },

  // 04 — AI & Causal Engine
  { id: 'understander', title: 'Understanding Agent & Brain',    relPath: '04-ai-and-causal-engine/understanding-agent-and-local-brain.md', url: docUrl('04-ai-and-causal-engine/understanding-agent-and-local-brain.md'), category: 'ai-oce', icon: Brain },
  { id: 'oce',          title: 'OCE Library Reference',          relPath: '04-ai-and-causal-engine/oce-library-reference.md',               url: docUrl('04-ai-and-causal-engine/oce-library-reference.md'),               category: 'ai-oce', icon: ScrollText },
  { id: 'oce-guide',    title: 'OCE Developer Guide',            relPath: '04-ai-and-causal-engine/oce-developer-guide.md',                 url: docUrl('04-ai-and-causal-engine/oce-developer-guide.md'),                 category: 'ai-oce', icon: Code2 },

  // 05 — IDE, CLI & Tooling
  { id: 'ide',      title: 'IDE & Debugging Tools',              relPath: '05-ide-and-tooling/ide-and-debugging-tools.md',  url: docUrl('05-ide-and-tooling/ide-and-debugging-tools.md'),  category: 'tooling', icon: Wrench },
  { id: 'cli',      title: 'CLI & Terminal Editor',              relPath: '05-ide-and-tooling/cli-and-terminal-editor.md',  url: docUrl('05-ide-and-tooling/cli-and-terminal-editor.md'),  category: 'tooling', icon: Terminal },
  { id: 'registry', title: 'API Registry & Linter',              relPath: '05-ide-and-tooling/api-registry-and-linter.md',  url: docUrl('05-ide-and-tooling/api-registry-and-linter.md'),  category: 'tooling', icon: Shield },
  { id: 'desktop',  title: 'Desktop, VS Code & MCP',             relPath: '05-ide-and-tooling/desktop-vscode-and-mcp.md',   url: docUrl('05-ide-and-tooling/desktop-vscode-and-mcp.md'),   category: 'tooling', icon: Wrench },

  // 06 — Compiler, VM & Target Backends
  { id: 'internals', title: 'Compiler & VM Internals',           relPath: '06-compiler-and-internals/compiler-and-vm-internals.md', url: docUrl('06-compiler-and-internals/compiler-and-vm-internals.md'), category: 'compiler', icon: Cpu },
  { id: 'zero-host', title: 'Zero-Host Native & PE',             relPath: '06-compiler-and-internals/zero-host-native-and-pe.md',   url: docUrl('06-compiler-and-internals/zero-host-native-and-pe.md'),   category: 'compiler', icon: Cpu },
  { id: 'wasi',      title: 'WASI 0.2 Component Model',          relPath: '06-compiler-and-internals/wasi-component-model.md',      url: docUrl('06-compiler-and-internals/wasi-component-model.md'),      category: 'compiler', icon: Layers },
  { id: 'parity',    title: 'Track Parity Matrix',               relPath: '06-compiler-and-internals/track-parity-matrix.md',       url: docUrl('06-compiler-and-internals/track-parity-matrix.md'),       category: 'compiler', icon: Library },

  // 07 — Domains
  { id: 'hardware', title: 'Hardware & Boards',                  relPath: '07-domains/hardware-and-boards.md', url: docUrl('07-domains/hardware-and-boards.md'), category: 'domains', icon: Cpu },
  { id: 'leaflet',  title: 'Leaflet & GIS',                      relPath: '07-domains/leaflet-and-gis.md',     url: docUrl('07-domains/leaflet-and-gis.md'),     category: 'domains', icon: MapPin },

  // 08 & 09 — Operations & Project History
  { id: 'contributing', title: 'Contributing Guide',             relPath: '08-operations/contributing-guide.md',     url: docUrl('08-operations/contributing-guide.md'),     category: 'operations', icon: ScrollText },
  { id: 'env',          title: 'Environment Variables',          relPath: '08-operations/environment-variables.md',  url: docUrl('08-operations/environment-variables.md'),  category: 'operations', icon: Wrench },
  { id: 'runbook',      title: 'Operations Runbook',             relPath: '08-operations/operations-runbook.md',     url: docUrl('08-operations/operations-runbook.md'),     category: 'operations', icon: Shield },
  { id: 'history',      title: 'Complete Project History',       relPath: '09-project/complete-project-history.md',  url: docUrl('09-project/complete-project-history.md'),  category: 'operations', icon: History },
];

const SOURCE_ALIASES: Record<string, string> = {
  index: 'hub',
  readme: 'hub',
  overview: 'full',
  book: 'book-en',
  v1: 'reference',
  'v2-prism': 'v2',
  fop: 'fop-fp',
  fp: 'fop-fp',
  functional: 'fop-fp',
  'feature-oriented': 'fop-fp',
  ai: 'ai-syntax',
  dialects: 'personal',
  extensions: 'personal',
  libraries: 'personal',
  'personal-sdev': 'personal',
  stdlib: 'v2-stdlib',
  web: 'v2-stdlib',
  agent: 'understander',
  'local-brain': 'understander',
  debugger: 'ide',
  linter: 'registry',
  vscode: 'desktop',
  mcp: 'desktop',
  'zero-host-native': 'zero-host',
  pe: 'zero-host',
  'wasi-component': 'wasi',
  boards: 'hardware',
  gis: 'leaflet',
  contrib: 'contributing',
  'env-vars': 'env',
  'project-history': 'history',
};

export function resolveSourceId(raw: string | null | undefined): string {
  if (!raw) return 'book-en';
  const key = raw.toLowerCase();
  if (SOURCES.some(s => s.id === key)) return key;
  if (SOURCE_ALIASES[key] && SOURCES.some(s => s.id === SOURCE_ALIASES[key])) {
    return SOURCE_ALIASES[key];
  }
  return 'book-en';
}

export function normalizeRelPath(baseRelPath: string, href: string): string | null {
  const cleanHref = href.split('#')[0].split('?')[0];
  if (!cleanHref || !cleanHref.endsWith('.md')) return null;
  if (cleanHref.startsWith('/documentation/')) {
    return cleanHref.slice('/documentation/'.length);
  }
  const baseParts = baseRelPath.split('/').slice(0, -1);
  for (const seg of cleanHref.split('/')) {
    if (!seg || seg === '.') continue;
    if (seg === '..') {
      baseParts.pop();
    } else {
      baseParts.push(seg);
    }
  }
  return baseParts.join('/');
}
