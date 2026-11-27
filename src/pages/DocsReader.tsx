import { Children, isValidElement, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, ArrowRight, Copy, Download, ExternalLink, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SdevCode } from '@/components/home/SdevCode';
import { openInIde } from '@/components/home/engine';
import { slugify } from '@/lib/utils';
import { CATEGORIES, SOURCES, normalizeRelPath, resolveSourceId } from './Docs';

interface Heading { id: string; text: string; level: number }

const clean = (t: string) => t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[`*_]/g, '').trim();

function headingsOf(md: string): Heading[] {
  const out: Heading[] = [];
  let fence = false;
  for (const line of md.split('\n')) {
    if (line.trim().startsWith('```')) { fence = !fence; continue; }
    if (fence) continue;
    const m = /^(#{1,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) out.push({ id: slugify(clean(m[2])), text: clean(m[2]), level: m[1].length });
  }
  return out;
}

const textOf = (node: ReactNode): string =>
  Children.toArray(node).map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : isValidElement(c) ? textOf((c.props as { children?: ReactNode }).children) : '')).join('');

const PDFS: Record<string, string> = { 'book-en': '/sdev-book-en.pdf', 'book-bg': '/sdev-book-bg.pdf' };

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const navigate = useNavigate();
  const isSdev = !lang || lang === 'sdev' || lang === 'sd';
  return (
    <div className="ink not-prose my-7 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{lang || 'sdev'}</span>
        <div className="flex gap-1">
          {isSdev && (
            <button onClick={() => openInIde(code, 'docs-example', navigate)} className="inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] text-muted-foreground hover:bg-foreground/10 hover:text-foreground">
              <ExternalLink className="h-3 w-3" /> Open in IDE
            </button>
          )}
          <button onClick={() => navigator.clipboard.writeText(code).then(() => toast.success('Copied'))} aria-label="Copy code" className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"><Copy className="h-3.5 w-3.5" /></button>
        </div>
      </div>
      {isSdev ? <SdevCode code={code} className="p-4" /> : <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-foreground/90">{code}</pre>}
    </div>
  );
}

function useProgress(ref: React.RefObject<HTMLElement>, deps: unknown[]) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const calc = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const span = el.offsetHeight - window.innerHeight * 0.6;
      setP(Math.min(Math.max((window.scrollY - top + 120) / Math.max(span, 1), 0), 1));
    };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return p;
}

export default function DocsReader() {
  const { section } = useParams<{ section?: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sourceId = resolveSourceId(section || params.get('doc'));
  const source = SOURCES.find((s) => s.id === sourceId) ?? SOURCES[1];
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('');
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(source.url)
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then((t) => { if (!cancelled) { setContent(t); setLoading(false); window.scrollTo({ top: 0 }); } })
      .catch(() => { if (!cancelled) { setContent(`# Could not load\n\n\`${source.relPath}\` is unavailable right now.`); setLoading(false); } });
    return () => { cancelled = true; };
  }, [source]);

  const headings = useMemo(() => headingsOf(content), [content]);
  const chapterLevel = headings.some((h) => h.level === 2) ? 2 : headings.some((h) => h.level === 3) ? 3 : 1;
  const chapters = useMemo(() => headings.filter((h) => h.level === chapterLevel), [headings, chapterLevel]);
  const shown = useMemo(() => (query ? chapters.filter((c) => c.text.toLowerCase().includes(query.toLowerCase())) : chapters), [chapters, query]);
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const progress = useProgress(articleRef, [content]);
  const activeIndex = Math.max(chapters.findIndex((c) => c.id === active), 0);
  const idx = SOURCES.findIndex((s) => s.id === source.id);
  const prev = SOURCES[idx - 1];
  const next = SOURCES[idx + 1];

  useEffect(() => {
    const root = articleRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
    let raf = 0;
    const calc = () => {
      let cur = nodes[0]?.id ?? '';
      for (const n of nodes) { if (n.getBoundingClientRect().top < 140) cur = n.id; else break; }
      setActive(cur);
    };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); cancelAnimationFrame(raf); };
  }, [content, loading]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 96, behavior: 'smooth' });
  };

  const H = useCallback((level: number) => function Heading({ children }: { children?: ReactNode }) {
    const id = slugify(textOf(children));
    const isChapter = level === chapterLevel;
    if (level === 1) return <h2 id={id} className="doc-h1" data-chapter={isChapter || undefined}>{children}</h2>;
    if (level === 2) return <h2 id={id} className={isChapter ? 'chapter' : ''} data-chapter={isChapter || undefined}>{children}</h2>;
    if (level === 3) return <h3 id={id} data-chapter={isChapter || undefined}>{children}</h3>;
    return <h4 id={id}>{children}</h4>;
  }, [chapterLevel]);

  const markdown = useMemo(() => (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: H(1), h2: H(2), h3: H(3), h4: H(4),
        pre: ({ children }) => {
          const child = Children.toArray(children)[0];
          const props = isValidElement(child) ? (child.props as { className?: string; children?: ReactNode }) : {};
          const lang = /language-([\w-]+)/.exec(props.className ?? '')?.[1];
          return <CodeBlock lang={lang} code={textOf(props.children).replace(/\n$/, '')} />;
        },
        table: ({ children }) => <div className="my-7 overflow-x-auto rounded-lg border border-border"><table>{children}</table></div>,
        a: ({ href, children }) => {
          const rel = href ? normalizeRelPath(source.relPath, href) : null;
          const match = rel ? SOURCES.find((s) => s.relPath === rel) : undefined;
          if (match) return <Link to={`/docs/${match.id}`}>{children}</Link>;
          if (href?.startsWith('#')) return <a href={href} onClick={(e) => { e.preventDefault(); go(href.slice(1)); }}>{children}</a>;
          return <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noreferrer">{children}</a>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  ), [content, H, source.relPath]);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="docs-reader">
      <SEO title={`${source.title} — sdev Documentation`} description="The sdev Book and the complete sdev documentation: language, standard library, tooling, compiler internals and more." path={section ? `/docs/${source.id}` : '/docs'} />
      <SiteNav />
      <div className="fixed inset-x-0 top-16 z-40 h-[3px] bg-foreground/5" aria-hidden="true">
        <div data-testid="docs-progress" className="h-full origin-left bg-primary transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div className="wrap grid gap-10 pb-24 pt-10 lg:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2" data-lenis-prevent>
            <p className="label mb-4">Library</p>
            {CATEGORIES.map((c) => (
              <div key={c.id} className="mb-5">
                <p className="mb-1.5 text-xs font-semibold">{c.label}</p>
                {SOURCES.filter((s) => s.category === c.id).map((s) => (
                  <Link key={s.id} to={`/docs/${s.id}`} data-testid={`docs-source-${s.id}`}
                    className={`block rounded-md border-l-2 px-3 py-1.5 text-[13px] leading-snug transition-colors ${s.id === source.id ? 'border-primary bg-primary/[0.06] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {s.title}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0">
          <select data-testid="docs-source-select" value={source.id} onChange={(e) => navigate(`/docs/${e.target.value}`)}
            className="mb-8 h-11 w-full rounded-lg border border-border bg-card px-3 text-sm lg:hidden" aria-label="Choose a document">
            {CATEGORIES.map((c) => (
              <optgroup key={c.id} label={c.label}>
                {SOURCES.filter((s) => s.category === c.id).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
              </optgroup>
            ))}
          </select>

          <header className="mx-auto max-w-[70ch] border-b border-foreground/15 pb-8">
            <p className="label">{CATEGORIES.find((c) => c.id === source.category)?.label} · {Math.max(1, Math.round(words / 230))} min read</p>
            <h1 data-testid="docs-title" className="mt-4 font-display text-4xl font-bold leading-[1.02] sm:text-5xl lg:text-6xl">{source.title}</h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
              <span>{chapters.length} chapters</span><span>{words.toLocaleString()} words</span>
              {PDFS[source.id] && <a href={PDFS[source.id]} className="inline-flex items-center gap-1 text-foreground hover:text-primary"><Download className="h-3.5 w-3.5" /> PDF</a>}
              <a href={source.url} download className="inline-flex items-center gap-1 hover:text-foreground"><Download className="h-3.5 w-3.5" /> Markdown</a>
            </div>
          </header>

          <details className="mx-auto mt-6 max-w-[70ch] rounded-lg border border-border bg-card xl:hidden" data-testid="docs-chapters-mobile">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Chapters <span className="text-muted-foreground">· {activeIndex + 1} of {chapters.length}</span></summary>
            <nav className="max-h-72 overflow-y-auto border-t border-border p-2" data-lenis-prevent>
              {chapters.map((c, i) => <button key={c.id + i} onClick={() => go(c.id)} className="block w-full truncate rounded px-2 py-1.5 text-left text-sm text-muted-foreground hover:text-foreground">{c.text}</button>)}
            </nav>
          </details>

          {loading ? (
            <p className="mx-auto mt-16 flex max-w-[70ch] items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            <article ref={articleRef} className="reader mx-auto mt-10 max-w-[70ch]" data-testid="docs-article">
              {markdown}

              <nav className="not-prose mt-20 grid gap-3 border-t border-foreground/15 pt-8 sm:grid-cols-2">
                {prev ? <Link to={`/docs/${prev.id}`} data-testid="docs-prev" className="rounded-xl border border-border p-5 transition-colors hover:border-foreground/40"><span className="label inline-flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Previous</span><span className="mt-2 block font-display text-lg font-bold">{prev.title}</span></Link> : <span />}
                {next && <Link to={`/docs/${next.id}`} data-testid="docs-next" className="rounded-xl border border-border p-5 text-right transition-colors hover:border-foreground/40"><span className="label inline-flex items-center gap-1">Next <ArrowRight className="h-3 w-3" /></span><span className="mt-2 block font-display text-lg font-bold">{next.title}</span></Link>}
              </nav>
            </article>
          )}
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-24">
            <div className="flex items-baseline justify-between">
              <p className="label">Chapters</p>
              <span data-testid="docs-chapter-count" className="font-mono text-[11px] text-muted-foreground">{chapters.length ? activeIndex + 1 : 0} / {chapters.length}</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/10"><div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress * 100}%` }} /></div>
            <label className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <input data-testid="docs-chapter-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a chapter" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            </label>
            <nav className="mt-3 max-h-[calc(100vh-15rem)] overflow-y-auto pr-1" data-lenis-prevent data-testid="docs-chapter-list">
              {shown.map((c, i) => (
                <button key={c.id + i} onClick={() => go(c.id)}
                  className={`block w-full truncate border-l-2 py-1.5 pl-3 text-left text-[13px] transition-colors ${c.id === active ? 'border-primary text-foreground' : 'border-foreground/10 text-muted-foreground hover:text-foreground'}`}>
                  {c.text}
                </button>
              ))}
              {shown.length === 0 && <p className="py-2 text-xs text-muted-foreground">No chapters match.</p>}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
