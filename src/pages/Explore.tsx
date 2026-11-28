import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Download, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { type ExtensionRecord } from '@/lang/dialect/extensions';
import { readLocalDialects, writeLocalDialects } from '@/hooks/useDialects';
import type { DialectSpec } from '@/lang/dialect/spec';
import { STARTER_FILES } from '@/ide/starterFiles';
import { ProgramCard, type ShowcaseProgram } from '@/components/community/ProgramCard';
import { ExtensionCard } from '@/components/community/Gallery';
import { useReveal } from '@/hooks/useReveal';
import { FEATURED, EXTRA_EXAMPLES } from '@/data/featured';

const CURATED: ShowcaseProgram[] = [
  ...EXTRA_EXAMPLES.map((e) => ({ id: `example-${e.name}`, title: e.name, author: 'sdev examples', code: e.code })),
  ...STARTER_FILES
    .filter((f) => !['blink.sdev', 'sdev-website.sdev'].includes(f.name))
    .map((f) => ({ id: `starter-${f.id}`, title: f.name, author: 'sdev examples', code: f.content })),
];
const pinned = (key: string) => FEATURED.includes(key);

const kindOf = (code: string): 'web' | 'graphics' | 'console' => {
  if (/\b(page|endpage|tag|stylesheet|onclick)\s*\(/.test(code)) return 'web';
  if (/\b(canvas|turtle|forward|circle|rect|clear)\s*\(/.test(code)) return 'graphics';
  return 'console';
};

interface PublicDialect {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string | null;
  languages: string[] | null;
  visibility: string;
  share_code: string;
  latest_version: string;
  install_count: number;
  spec: DialectSpec;
}

interface PublicExtension extends ExtensionRecord {
  user_id: string;
}

interface PublicProgram {
  id: string;
  user_id: string;
  slug: string;
  title: string;
  description: string | null;
  language: string;
  view_count: number;
  content?: string | null;
}

function authorLabel(map: Record<string, string>, userId: string): string {
  return map[userId] ? `@${map[userId]}` : 'someone';
}

export default function Explore() {
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'web' | 'graphics' | 'console'>('all');
  const [loading, setLoading] = useState(true);
  const [dialects, setDialects] = useState<PublicDialect[]>([]);
  const [extensions, setExtensions] = useState<PublicExtension[]>([]);
  const [programs, setPrograms] = useState<PublicProgram[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, e, g] = await Promise.all([
        supabase.from('dialects').select('*').eq('visibility', 'public').order('install_count', { ascending: false }).limit(60),
        supabase.from('sdev_extensions').select('*').eq('visibility', 'public').order('created_at', { ascending: false }).limit(60),
        supabase.from('gists').select('id, user_id, slug, title, description, language, view_count, content').order('created_at', { ascending: false }).limit(60),
      ]);
      const ds: PublicDialect[] = Array.isArray(d.data) ? (d.data as unknown as PublicDialect[]) : [];
      const es: PublicExtension[] = Array.isArray(e.data) ? (e.data as unknown as PublicExtension[]) : [];
      const gs: PublicProgram[] = Array.isArray(g.data) ? (g.data as unknown as PublicProgram[]) : [];
      setDialects(ds);
      setExtensions(es);
      setPrograms(gs);

      const ids = [...new Set([...ds, ...es, ...gs].map((r) => r.user_id).filter(Boolean))];
      if (ids.length) {
        const { data: names } = await supabase.from('usernames').select('user_id, username').in('user_id', ids);
        const map: Record<string, string> = {};
        for (const row of names ?? []) map[row.user_id] = row.username;
        setAuthors(map);
      }
    } catch {
      /* offline: the shelf is simply empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useReveal([loading, query, kindFilter]);

  const q = query.trim().toLowerCase();
  const match = useCallback(
    (...fields: (string | null | undefined)[]) =>
      !q || fields.some((f) => (f ?? '').toLowerCase().includes(q)),
    [q],
  );

  const shownDialects = useMemo(() => dialects.filter((d) => match(d.name, d.slug, d.description, (d.languages ?? []).join(' '))), [dialects, match]);
  const shownExtensions = useMemo(() => extensions.filter((e) => match(e.name, e.about, e.symbol)), [extensions, match]);
  const shownPrograms = useMemo(() => programs.filter((p) => match(p.title, p.description, p.slug)), [programs, match]);

  const allShowcase = useMemo<ShowcaseProgram[]>(() => [
    ...shownPrograms.filter((p) => (p.content ?? '').trim().length > 40).map((p) => ({ id: p.id, title: p.title, author: authorLabel(authors, p.user_id), code: p.content ?? '', href: `/g/${p.slug}`, views: p.view_count ?? 0, featured: pinned(p.slug) })),
    ...CURATED.filter((c) => match(c.title, c.code)).map((c) => ({ ...c, featured: pinned(c.title) })),
  ].sort((a, b) => Number(!!b.featured) - Number(!!a.featured)), [shownPrograms, authors, match]);

  const showcase = useMemo(
    () => (kindFilter === 'all' ? allShowcase : allShowcase.filter((p) => kindOf(p.code) === kindFilter)),
    [allShowcase, kindFilter],
  );

  const installDialect = (row: PublicDialect) => {
    if (!row.spec?.meta?.slug) { toast.error('That dialect has nothing to install yet.'); return; }
    const next = readLocalDialects().filter((d) => d.meta.slug !== row.spec.meta.slug);
    writeLocalDialects([...next, row.spec]);
    supabase.from('dialects').update({ install_count: (row.install_count ?? 0) + 1 }).eq('id', row.id).then(() => undefined, () => undefined);
    toast.success(`${row.name} installed — pick it in the IDE to start writing in it.`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="explore-page">
      <SEO
        title="Explore sdev — dialects, extensions and programs"
        description="Browse every dialect, extension and program shared by the sdev community. Install a dialect and write sdev in your own words."
        path="/explore"
      />

      <SiteNav />

      <section className="wrap pt-14 sm:pt-20" data-testid="community-hero">
        <div className="flex items-center justify-between border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Community</span>
          <span className="hidden sm:inline">{allShowcase.length} programs · {dialects.length} dialects · {extensions.length} extensions</span>
        </div>
        <div className="grid gap-8 pt-10 lg:grid-cols-12 lg:items-end">
          <h1 className="lg:col-span-8 font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Programs worth <span className="serif-i font-normal text-primary">running.</span></h1>
          <div className="lg:col-span-4 space-y-5">
            <p className="text-muted-foreground">Everything people have shared, plus the official examples. Press Run on any card — console, 2D canvas, and HTML pages execute right here.</p>
            <div className="flex gap-2">
              <Link to="/ide" className="btn-ink !h-10">Share your own</Link>
              <Link to="/my" className="btn-line !h-10">My sdev</Link>
            </div>
          </div>
        </div>
        <div className="relative mt-10">
          <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="community-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs, dialects, extensions…" className="h-12 rounded-full pl-11 bg-card" aria-label="Search shared sdev work" />
        </div>
      </section>

      <section className="wrap py-12" data-testid="community-showcase">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <p className="label">§01 — Showcase</p>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter showcase by output type">
            {([
              ['all', 'All'],
              ['web', 'Web pages'],
              ['graphics', 'Graphics'],
              ['console', 'Console'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                data-testid={`showcase-filter-${k}`}
                onClick={() => setKindFilter(k)}
                className={`rounded-full border px-3.5 py-1 text-xs font-medium transition-colors ${kindFilter === k ? 'border-foreground bg-foreground text-background' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading shared programs…</div>}
        {showcase.length === 0 && !loading && <p className="text-sm text-muted-foreground">Nothing matches your filter.</p>}
        <div className="columns-1 gap-5 md:columns-2 xl:columns-3">
          {showcase.map((p, i) => <ProgramCard key={p.id} p={p} index={i} />)}
        </div>
      </section>

      <main className="wrap pb-24">
        <p className="label mb-5 border-t border-foreground/15 pt-6">§02 — Shared dialects & extensions</p>

        <Tabs defaultValue="dialects">
          <TabsList>
            <TabsTrigger value="dialects">Dialects ({shownDialects.length})</TabsTrigger>
            <TabsTrigger value="extensions">Extensions ({shownExtensions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dialects" className="mt-6">
            {shownDialects.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No public dialects shared yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Create and publish yours in <Link to="/dialects" className="text-primary underline underline-offset-4">Dialect Studio</Link>.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {shownDialects.map((d) => (
                  <article key={d.id} className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 transition-[border-color] hover:border-foreground/30">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-2xl font-bold">{d.name}</h3>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {authorLabel(authors, d.user_id)}/{d.slug} · v{d.latest_version} · {d.install_count ?? 0} installs
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1 shrink-0">
                          {(d.languages ?? []).map((l) => (
                            <span key={l} className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{l}</span>
                          ))}
                        </div>
                      </div>
                      {d.description && <p className="mt-3 text-sm text-muted-foreground">{d.description}</p>}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                      <button onClick={() => installDialect(d)} className="btn-ink !h-9 !px-4 !text-xs">
                        <Download className="h-3.5 w-3.5" /> Install dialect
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(d.share_code); toast.success('Share code copied'); }}
                        className="btn-line !h-9 !px-4 !text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy share code
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="extensions" className="mt-6">
            {shownExtensions.length === 0 && !loading ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No public extensions shared yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Add one on the <Link to="/extensions" className="text-primary underline underline-offset-4">Extensions page</Link>.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {shownExtensions.map((e) => (
                  <ExtensionCard
                    key={e.id}
                    ext={e}
                    usage={e.kind === 'operator' && e.symbol ? `speak(1 ${e.symbol} 2)` : `speak(${e.name}(1))`}
                    author={authorLabel(authors, e.user_id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
