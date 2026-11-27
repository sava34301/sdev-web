import { SiteNav } from '@/components/site/SiteNav';
/**
 * The public shelf: every dialect, extension and program people have shared.
 * Anyone can browse it, signed in or not, and install what they like.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Download, Eye, Loader2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { installExtension, type ExtensionRecord } from '@/lang/dialect/extensions';
import { readLocalDialects, writeLocalDialects } from '@/hooks/useDialects';
import type { DialectSpec } from '@/lang/dialect/spec';
import { STARTER_FILES } from '@/ide/starterFiles';
import { ProgramCard, type ShowcaseProgram } from '@/components/community/ProgramCard';
import { SiteFooter } from '@/components/site/SiteFooter';
import { useReveal } from '@/hooks/useReveal';

const CURATED: ShowcaseProgram[] = STARTER_FILES
  .filter((f) => !['blink.sdev', 'sdev-website.sdev'].includes(f.name))
  .map((f) => ({ id: `starter-${f.id}`, title: f.name, author: 'sdev examples', code: f.content }));

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
  useReveal([loading, query]);

  const q = query.trim().toLowerCase();
  const match = useCallback(
    (...fields: (string | null | undefined)[]) =>
      !q || fields.some((f) => (f ?? '').toLowerCase().includes(q)),
    [q]
  );

  const shownDialects = useMemo(() => dialects.filter((d) => match(d.name, d.slug, d.description, (d.languages ?? []).join(' '))), [dialects, match]);
  const shownExtensions = useMemo(() => extensions.filter((e) => match(e.name, e.about, e.symbol)), [extensions, match]);
  const shownPrograms = useMemo(() => programs.filter((p) => match(p.title, p.description, p.slug)), [programs, match]);
  const showcase = useMemo<ShowcaseProgram[]>(() => [
    ...shownPrograms.filter((p) => (p.content ?? '').trim().length > 40).map((p) => ({ id: p.id, title: p.title, author: authorLabel(authors, p.user_id), code: p.content ?? '', href: `/g/${p.slug}`, views: p.view_count ?? 0 })),
    ...CURATED.filter((c) => match(c.title, c.code)),
  ], [shownPrograms, authors, match]);

  const installDialect = (row: PublicDialect) => {
    if (!row.spec?.meta?.slug) { toast.error('That dialect has nothing to install yet.'); return; }
    const next = readLocalDialects().filter((d) => d.meta.slug !== row.spec.meta.slug);
    writeLocalDialects([...next, row.spec]);
    supabase.from('dialects').update({ install_count: (row.install_count ?? 0) + 1 }).eq('id', row.id).then(() => undefined, () => undefined);
    toast.success(`${row.name} installed — pick it in the IDE to start writing in it.`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Explore sdev — dialects, extensions and programs"
        description="Browse every dialect, extension and program shared by the sdev community. Install a dialect and write sdev in your own words."
        path="/explore"
      />

      <SiteNav />

      <section className="wrap pt-14 sm:pt-20" data-testid="community-hero">
        <div className="flex items-center justify-between border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <span>Community</span>
          <span className="hidden sm:inline">{showcase.length} programs · {dialects.length} dialects · {extensions.length} extensions</span>
        </div>
        <div className="grid gap-8 pt-10 lg:grid-cols-12 lg:items-end">
          <h1 className="lg:col-span-8 font-display text-5xl font-extrabold leading-[0.95] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Programs worth <span className="serif-i font-normal text-primary">running.</span></h1>
          <div className="lg:col-span-4 space-y-5">
            <p className="text-muted-foreground">Everything people have shared, plus the official examples. Press Run on any card — it executes right here with the real interpreter.</p>
            <div className="flex gap-2">
              <Link to="/ide" className="btn-ink !h-10">Share your own</Link>
              <Link to="/my" className="btn-line !h-10">My sdev</Link>
            </div>
          </div>
        </div>
        <div className="relative mt-10">
          <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input data-testid="community-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search programs, dialects, extensions" className="h-12 rounded-full pl-11 bg-card" aria-label="Search shared sdev work" />
        </div>
      </section>

      <section className="wrap py-12" data-testid="community-showcase">
        <p className="label mb-5">§01 — Showcase</p>
        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading shared programs</div>}
        {showcase.length === 0 && !loading && <p className="text-sm text-muted-foreground">Nothing matches “{query}”.</p>}
        <div className="columns-1 gap-5 md:columns-2 xl:columns-3">
          {showcase.map((p, i) => <ProgramCard key={p.id} p={p} index={i} />)}
        </div>
      </section>

      <main className="wrap pb-24">
        <p className="label mb-5 border-t border-foreground/15 pt-6">§02 — Dialects & extensions</p>

        <Tabs defaultValue="dialects">
          <TabsList>
            <TabsTrigger value="dialects">Dialects ({shownDialects.length})</TabsTrigger>
            <TabsTrigger value="extensions">Extensions ({shownExtensions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dialects" className="mt-4 space-y-2">
            {shownDialects.length === 0 && !loading && <p className="text-sm text-muted-foreground">No dialects shared yet.</p>}
            {shownDialects.map((d) => (
              <Card key={d.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {d.name} <span className="text-muted-foreground font-mono text-xs">{authorLabel(authors, d.user_id)}/{d.slug}</span>
                    </div>
                    {d.description && <p className="text-sm text-muted-foreground mt-1">{d.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant="outline">v{d.latest_version}</Badge>
                      {(d.languages ?? []).map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}
                      <Badge variant="secondary">{d.install_count ?? 0} installs</Badge>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button size="sm" onClick={() => installDialect(d)}><Download className="h-4 w-4 mr-1.5" />Install</Button>
                    <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(d.share_code); toast.success('Share code copied'); }}>
                      <Copy className="h-4 w-4 mr-1.5" />Code
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="extensions" className="mt-4 space-y-2">
            {shownExtensions.length === 0 && !loading && <p className="text-sm text-muted-foreground">No extensions shared yet.</p>}
            {shownExtensions.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">
                      {e.name} <Badge variant="secondary" className="ml-1">{e.kind}</Badge>{' '}
                      <span className="text-muted-foreground font-mono text-xs">{authorLabel(authors, e.user_id)}</span>
                    </div>
                    {e.about && <p className="text-sm text-muted-foreground mt-1">{e.about}</p>}
                  </div>
                  <Button size="sm" onClick={() => { installExtension(e); toast.success(`${e.name} enabled — it now runs with your code`); }}>
                    <Download className="h-4 w-4 mr-1.5" />Install
                  </Button>
                </div>
                <pre className="text-xs bg-muted/40 rounded p-2 mt-3 overflow-x-auto"><code>{e.source}</code></pre>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
