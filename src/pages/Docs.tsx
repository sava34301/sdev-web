import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { SEO } from '@/components/SEO';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import {
  Search, BookOpen, Download, FileCode, Code2, Terminal, ArrowLeft, Library,
  ScrollText, Loader2, ChevronRight, Cpu, Brain, Wrench, MapPin, Shield, History, Layers,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { slugify } from '@/lib/utils';

interface Heading { id: string; text: string; level: number }

type DocCategoryId =
  | 'overview'
  | 'language'
  | 'stdlib'
  | 'ai-oce'
  | 'tooling'
  | 'compiler'
  | 'domains'
  | 'operations';

interface DocCategory {
  id: DocCategoryId;
  label: string;
}

interface DocSource {
  id: string;
  title: string;
  relPath: string;
  url: string;
  category: DocCategoryId;
  icon: React.ComponentType<{ className?: string }>;
}

const BASE_URL = import.meta.env.BASE_URL || '/';
const docUrl = (relPath: string) => `${BASE_URL}documentation/${relPath}`;

const CATEGORIES: DocCategory[] = [
  { id: 'overview',   label: 'Overview & Books' },
  { id: 'language',   label: 'Language & Personal' },
  { id: 'stdlib',     label: 'Stdlib & Accel' },
  { id: 'ai-oce',     label: 'AI & Causal Engine' },
  { id: 'tooling',    label: 'IDE, CLI & MCP' },
  { id: 'compiler',   label: 'Compiler & Targets' },
  { id: 'domains',    label: 'Domains' },
  { id: 'operations', label: 'Ops & History' },
];

const SOURCES: DocSource[] = [
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

function resolveSourceId(raw: string | null | undefined): string {
  if (!raw) return 'book-en';
  const key = raw.toLowerCase();
  if (SOURCES.some(s => s.id === key)) return key;
  if (SOURCE_ALIASES[key] && SOURCES.some(s => s.id === SOURCE_ALIASES[key])) {
    return SOURCE_ALIASES[key];
  }
  return 'book-en';
}

function normalizeRelPath(baseRelPath: string, href: string): string | null {
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

function extractHeadings(md: string): Heading[] {
  const out: Heading[] = [];
  const lines = md.split('\n');
  let inFence = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) { inFence = !inFence; continue; }
    if (inFence) continue;
    const m = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/`/g, '');
    out.push({ id: slugify(text), text, level });
  }
  return out;
}

export default function Docs() {
  const { section } = useParams<{ section?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialSource = resolveSourceId(section || searchParams.get('doc'));
  const [activeSource, setActiveSource] = useState<string>(initialSource);
  const [activeCategory, setActiveCategory] = useState<DocCategoryId | 'all'>(() => {
    const src = SOURCES.find(s => s.id === initialSource);
    return src?.category ?? 'overview';
  });
  const [query, setQuery] = useState('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  // Sync URL parameter / query changes
  useEffect(() => {
    const requested = section || searchParams.get('doc');
    if (!requested) return;
    const resolved = resolveSourceId(requested);
    setActiveSource(resolved);
    const src = SOURCES.find(s => s.id === resolved);
    if (src && activeCategory !== 'all') setActiveCategory(src.category);
  }, [section, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentSource = useMemo(
    () => SOURCES.find(s => s.id === activeSource) ?? SOURCES[1],
    [activeSource],
  );

  const selectSource = useCallback((id: string) => {
    const src = SOURCES.find(s => s.id === id);
    if (!src) return;
    setActiveSource(id);
    if (activeCategory !== 'all') setActiveCategory(src.category);
    navigate(`/docs/${id}`);
  }, [activeCategory, navigate]);

  useEffect(() => {
    document.title = `${currentSource.title} — sdev Documentation`;
  }, [currentSource.title]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(currentSource.url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(text => {
        if (cancelled) return;
        setContent(text);
        setHeadings(extractHeadings(text));
        setLoading(false);
        contentRef.current?.scrollTo({ top: 0 });
      })
      .catch(() => {
        if (cancelled) return;
        setContent(`# Failed to load\n\nCould not fetch \`${currentSource.relPath}\`.`);
        setHeadings([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [currentSource]);

  const visibleSources = useMemo(() => {
    if (activeCategory === 'all') return SOURCES;
    return SOURCES.filter(s => s.category === activeCategory);
  }, [activeCategory]);

  const filteredHeadings = useMemo(() => {
    if (!query.trim()) return headings;
    const q = query.toLowerCase();
    return headings.filter(h => h.text.toLowerCase().includes(q));
  }, [headings, query]);

  // Scroll-spy
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const obs = new IntersectionObserver((entries) => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]?.target.id) setActiveId(visible[0].target.id);
    }, { root, rootMargin: '-10% 0px -70% 0px', threshold: 0 });
    root.querySelectorAll('h1[id], h2[id], h3[id], h4[id]').forEach(h => obs.observe(h));
    return () => obs.disconnect();
  }, [content]);

  const totalLines = content.split('\n').length;
  const totalWords = content.trim() ? content.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title={`${currentSource.title} — sdev Documentation`} description="Complete structured sdev documentation: language guides, Personal SDEV, v2 stdlib & web toolkit, Understanding Agent, OCE, IDE/CLI/MCP tools, native ELF/PE & WASI 0.2, hardware boards, and the sdev Book in English and Bulgarian." path={section ? `/docs/${currentSource.id}` : '/docs'} />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "sdev Programming Language Documentation",
          description: "Complete structured language reference, the sdev Book, Personal SDEV, OCE, Understanding Agent, IDE/CLI/MCP tooling, and Leaflet/GIS guide for sdev.",
          inLanguage: ["en", "bg"],
          author: { "@type": "Organization", name: "sdev" },
          publisher: { "@type": "Organization", name: "sdev" },
          url: "https://web.sdev.codes/docs",
          mainEntityOfPage: "https://web.sdev.codes/docs"
        })}</script>
      </Helmet>
      <header className="border-b border-border/60 backdrop-blur-xl sticky top-0 z-40 bg-background/80">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <h1 className="text-xl font-bold tracking-tight">sdev <span className="text-muted-foreground font-normal">/ Documentation</span></h1>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/docs/self-hosting-design-guide" className="hidden lg:inline-flex">
              <Button size="sm" variant="ghost" className="gap-2"><Code2 className="w-4 h-4" />Language design guide</Button>
            </Link>
            <a href={`${BASE_URL}sdev-book-en.pdf`} download>
              <Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" />Book PDF (EN)</Button>
            </a>
            <a href={`${BASE_URL}sdev-book-bg.pdf`} download>
              <Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" />Book PDF (BG)</Button>
            </a>
            <Link to="/ide"><Button size="sm" className="gap-2"><Terminal className="w-4 h-4" />Open IDE</Button></Link>
          </div>
        </div>

        {/* Category tabs */}
        <div className="border-t border-border/40 bg-card/20">
          <div className="max-w-[1600px] mx-auto px-6 py-1.5 flex items-center gap-1 overflow-x-auto">
            {CATEGORIES.map(cat => {
              const isCatActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    const first = SOURCES.find(s => s.category === cat.id);
                    if (first && currentSource.category !== cat.id) {
                      navigate(`/docs/${first.id}`);
                      setActiveSource(first.id);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition ${
                    isCatActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
            <button
              onClick={() => setActiveCategory('all')}
              className={`ml-auto px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition ${
                activeCategory === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              All ({SOURCES.length})
            </button>
          </div>
        </div>

        {/* Source switcher within category */}
        <div className="border-t border-border/40">
          <div className="max-w-[1600px] mx-auto px-6 py-2 flex items-center gap-1 overflow-x-auto">
            {visibleSources.map(s => {
              const Icon = s.icon;
              const active = s.id === currentSource.id;
              return (
                <button
                  key={s.id}
                  onClick={() => selectSource(s.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition ${
                    active ? 'bg-primary/10 text-primary border border-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {s.title}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-6 grid grid-cols-12 gap-6">
        {/* Sidebar – TOC */}
        <aside className="col-span-12 md:col-span-3 lg:col-span-3">
          <div className="sticky top-40 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Filter sections…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 bg-card border-border"
              />
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span>{headings.length} sections</span>
              <span>·</span>
              <span>{totalLines.toLocaleString()} lines</span>
              <span>·</span>
              <span>{totalWords.toLocaleString()} words</span>
            </div>
            <ScrollArea className="h-[calc(100vh-300px)] pr-2 rounded-lg border border-border/50 bg-card/30">
              <nav className="p-2 space-y-0.5">
                {filteredHeadings.map((h, i) => (
                  <a
                    key={`${h.id}-${i}`}
                    href={`#${h.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      const el = contentRef.current?.querySelector(`#${CSS.escape(h.id)}`);
                      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      setActiveId(h.id);
                    }}
                    className={`flex items-start gap-1 text-xs rounded px-2 py-1 transition leading-snug ${
                      activeId === h.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                    }`}
                    style={{ paddingLeft: `${0.5 + (h.level - 1) * 0.75}rem` }}
                  >
                    {h.level === 1 && <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" />}
                    <span className={h.level === 1 ? 'font-semibold text-foreground/90' : ''}>{h.text}</span>
                  </a>
                ))}
                {filteredHeadings.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No matches.</p>
                )}
              </nav>
            </ScrollArea>
          </div>
        </aside>

        {/* Content */}
        <main className="col-span-12 md:col-span-9 lg:col-span-9">
          <div
            ref={contentRef}
            className="h-[calc(100vh-220px)] overflow-y-auto pr-4 rounded-lg border border-border/50 bg-card/20 px-8 py-8"
          >
            {loading ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading documentation…
              </div>
            ) : (
              <article className="prose prose-invert max-w-none
                prose-headings:scroll-mt-8 prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-4xl prose-h1:mt-12 prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border/60
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-primary
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
                prose-h4:text-base prose-h4:mt-6 prose-h4:mb-2 prose-h4:text-foreground/80
                prose-p:leading-relaxed prose-p:text-foreground/85
                prose-li:text-foreground/85 prose-li:my-1
                prose-strong:text-foreground prose-strong:font-semibold
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-code:bg-muted prose-code:text-primary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:text-sm
                prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:not-italic
                prose-table:text-sm prose-th:bg-muted/60 prose-th:font-semibold prose-td:border-border
                prose-hr:border-border/60">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeSlug, [rehypeAutolinkHeadings, { behavior: 'wrap' }]]}
                  components={{
                    // Demote markdown headings so the page keeps a single <h1> (the page title in the header).
                    h1: ({ node, ...props }) => <h2 {...props} />,
                    h2: ({ node, ...props }) => <h3 {...props} />,
                    h3: ({ node, ...props }) => <h4 {...props} />,
                    h4: ({ node, ...props }) => <h5 {...props} />,
                    a: ({ node, href, children, ...props }) => {
                      const resolvedRel = href ? normalizeRelPath(currentSource.relPath, href) : null;
                      const matched = resolvedRel ? SOURCES.find(s => s.relPath === resolvedRel) : undefined;
                      if (matched) {
                        return (
                          <a
                            {...props}
                            href={`/docs/${matched.id}`}
                            onClick={(e) => {
                              e.preventDefault();
                              selectSource(matched.id);
                            }}
                          >
                            {children}
                          </a>
                        );
                      }
                      return <a {...props} href={href}>{children}</a>;
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Source: <code className="bg-muted px-1.5 py-0.5 rounded">docs/{currentSource.relPath}</code></span>
            <a href={currentSource.url} download className="inline-flex items-center gap-1 hover:text-foreground transition">
              <FileCode className="w-3 h-3" /> Download raw markdown
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
