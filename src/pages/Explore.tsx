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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

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
        db.from('dialects').select('*').eq('visibility', 'public').order('install_count', { ascending: false }).limit(60),
        db.from('sdev_extensions').select('*').eq('visibility', 'public').order('created_at', { ascending: false }).limit(60),
        db.from('gists').select('id, user_id, slug, title, description, language, view_count').order('created_at', { ascending: false }).limit(60),
      ]);
      const ds: PublicDialect[] = Array.isArray(d.data) ? d.data : [];
      const es: PublicExtension[] = Array.isArray(e.data) ? e.data : [];
      const gs: PublicProgram[] = Array.isArray(g.data) ? g.data : [];
      setDialects(ds);
      setExtensions(es);
      setPrograms(gs);

      const ids = [...new Set([...ds, ...es, ...gs].map((r) => r.user_id).filter(Boolean))];
      if (ids.length) {
        const { data: names } = await db.from('usernames').select('user_id, username').in('user_id', ids);
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

  const q = query.trim().toLowerCase();
  const match = (...fields: (string | null | undefined)[]) =>
    !q || fields.some((f) => (f ?? '').toLowerCase().includes(q));

  const shownDialects = useMemo(() => dialects.filter((d) => match(d.name, d.slug, d.description, (d.languages ?? []).join(' '))), [dialects, q]);
  const shownExtensions = useMemo(() => extensions.filter((e) => match(e.name, e.about, e.symbol)), [extensions, q]);
  const shownPrograms = useMemo(() => programs.filter((p) => match(p.title, p.description, p.slug)), [programs, q]);

  const installDialect = (row: PublicDialect) => {
    if (!row.spec?.meta?.slug) { toast.error('That dialect has nothing to install yet.'); return; }
    const next = readLocalDialects().filter((d) => d.meta.slug !== row.spec.meta.slug);
    writeLocalDialects([...next, row.spec]);
    db.from('dialects').update({ install_count: (row.install_count ?? 0) + 1 }).eq('id', row.id).then(() => undefined, () => undefined);
    toast.success(`${row.name} installed — pick it in the IDE to start writing in it.`);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Explore sdev — dialects, extensions and programs"
        description="Browse every dialect, extension and program shared by the sdev community. Install a dialect and write sdev in your own words."
        path="/explore"
      />

      <header className="border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="ghost"><Link to="/my">My sdev</Link></Button>
            <Button asChild size="sm"><Link to="/ide">Open the IDE</Link></Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Explore</h1>
        <p className="text-muted-foreground mb-6">Dialects, extensions and programs people have shared. Install anything here and it works in the IDE and the command line straight away.</p>

        <div className="relative mb-6">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search dialects, extensions, programs" className="pl-9" aria-label="Search shared sdev work" />
        </div>

        {loading && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading</div>}

        <Tabs defaultValue="dialects">
          <TabsList>
            <TabsTrigger value="dialects">Dialects ({shownDialects.length})</TabsTrigger>
            <TabsTrigger value="extensions">Extensions ({shownExtensions.length})</TabsTrigger>
            <TabsTrigger value="programs">Programs ({shownPrograms.length})</TabsTrigger>
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

          <TabsContent value="programs" className="mt-4 space-y-2">
            {shownPrograms.length === 0 && !loading && <p className="text-sm text-muted-foreground">No programs shared yet.</p>}
            {shownPrograms.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.title}</div>
                    {p.description && <p className="text-sm text-muted-foreground mt-1 truncate">{p.description}</p>}
                    <div className="text-xs text-muted-foreground mt-2">
                      by {authorLabel(authors, p.user_id)} · {p.view_count ?? 0} views
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline"><Link to={`/g/${p.slug}`}><Eye className="h-4 w-4 mr-1.5" />Open</Link></Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
