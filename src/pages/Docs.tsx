import { useState, useMemo, useEffect, useRef } from 'react';
import { SEO } from '@/components/SEO';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import { Search, BookOpen, Download, FileCode, Code2, Terminal, ArrowLeft, Library, ScrollText, Loader2, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Heading { id: string; text: string; level: number }
interface DocSource { id: string; title: string; url: string; icon: React.ComponentType<{ className?: string }> }

const SOURCES: DocSource[] = [
  { id: 'book-en',     title: 'The sdev Book (EN)',          url: '/sdev-book-en.md',            icon: BookOpen },
  { id: 'book-bg',     title: 'Книгата за sdev (BG)',        url: '/sdev-book-bg.md',            icon: BookOpen },
  { id: 'reference',   title: 'Full Language Reference',     url: '/SDEV_DOCUMENTATION.md',      icon: Library },
  { id: 'v2',          title: 'sdev v2 "Prism" Guide',       url: '/SDEV_V2_DOCUMENTATION.md',   icon: ScrollText },
  { id: 'leaflet',     title: 'Leaflet & GIS Reference',     url: '/SDEV_LEAFLET_DOCUMENTATION.md', icon: ScrollText },
  { id: 'hardware',    title: 'Hardware & Boards',           url: '/SDEV_HARDWARE_DOCUMENTATION.md', icon: ScrollText },
  { id: 'internals',   title: 'Compiler & VM Internals',     url: '/SDEV_INTERNALS.md',          icon: Library },
  { id: 'ml',          title: 'ML & LLM Stdlib',             url: '/SDEV_ML_DOCUMENTATION.md',   icon: Library },
];

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
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
  const [activeSource, setActiveSource] = useState<string>('book-en');
  const [query, setQuery] = useState('');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => { document.title = 'sdev — Documentation'; }, []);

  useEffect(() => {
    const src = SOURCES.find(s => s.id === activeSource);
    if (!src) return;
    setLoading(true);
    fetch(src.url)
      .then(r => r.text())
      .then(text => {
        setContent(text);
        setHeadings(extractHeadings(text));
        setLoading(false);
        contentRef.current?.scrollTo({ top: 0 });
      })
      .catch(() => { setContent('# Failed to load\n\nCould not fetch this document.'); setLoading(false); });
  }, [activeSource]);

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
  const totalWords = content.trim().split(/\s+/).length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="Documentation — sdev" description="Complete sdev language documentation: syntax reference, the sdev Book, Leaflet & GIS guide, and standard library docs in English and Bulgarian." path="/docs" />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: "sdev Programming Language Documentation",
          description: "Complete language reference, the sdev Book, and Leaflet/GIS guide for the sdev programming language.",
          inLanguage: ["en", "bg"],
          author: { "@type": "Organization", name: "sdev" },
          publisher: { "@type": "Organization", name: "sdev" },
          url: "https://web.sdev.codes/docs",
          mainEntityOfPage: "https://web.sdev.codes/docs"
        })}</script>
      </Helmet>
      <header className="border-b border-border/60 backdrop-blur-xl sticky top-0 z-40 bg-background/80">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <h1 className="text-xl font-bold tracking-tight">sdev <span className="text-muted-foreground font-normal">/ Documentation</span></h1>
          <div className="ml-auto flex items-center gap-2">
            <a href="/sdev-book-en.pdf" download>
              <Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" />Book PDF (EN)</Button>
            </a>
            <a href="/sdev-book-bg.pdf" download>
              <Button size="sm" variant="outline" className="gap-2"><Download className="w-4 h-4" />Book PDF (BG)</Button>
            </a>
            <Link to="/ide"><Button size="sm" className="gap-2"><Terminal className="w-4 h-4" />Open IDE</Button></Link>
          </div>
        </div>
        {/* Source switcher */}
        <div className="border-t border-border/40">
          <div className="max-w-[1600px] mx-auto px-6 py-2 flex items-center gap-1 overflow-x-auto">
            {SOURCES.map(s => {
              const Icon = s.icon;
              const active = s.id === activeSource;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveSource(s.id)}
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
          <div className="sticky top-32 space-y-4">
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
            <ScrollArea className="h-[calc(100vh-260px)] pr-2 rounded-lg border border-border/50 bg-card/30">
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
            className="h-[calc(100vh-180px)] overflow-y-auto pr-4 rounded-lg border border-border/50 bg-card/20 px-8 py-8"
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
                  }}
                >
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>Source: <code className="bg-muted px-1.5 py-0.5 rounded">{SOURCES.find(s => s.id === activeSource)?.url}</code></span>
            <a href={SOURCES.find(s => s.id === activeSource)?.url} download className="inline-flex items-center gap-1 hover:text-foreground transition">
              <FileCode className="w-3 h-3" /> Download raw markdown
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
