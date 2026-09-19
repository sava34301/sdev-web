/**
 * One place for everything that is yours: your dialects, your extensions,
 * your files and the programs you have shared.
 */
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Check, Copy, Loader2, Share2, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDialects } from '@/hooks/useDialects';
import { useCloudFiles } from '@/hooks/useCloudFiles';
import { presetList } from '@/lang/dialect/presets';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface MyExtension {
  id: string;
  name: string;
  kind: string;
  about: string | null;
  source: string;
  visibility: string;
}

interface MyGist {
  id: string;
  slug: string;
  title: string;
  view_count: number;
}

export default function MySdev() {
  const { user } = useAuth();
  const { dialects, activeSlug, activate, publish, remove, save, refresh } = useDialects();
  const { files, deleteFile } = useCloudFiles();
  const [extensions, setExtensions] = useState<MyExtension[]>([]);
  const [gists, setGists] = useState<MyGist[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) { setExtensions([]); setGists([]); return; }
    try {
      const [e, g] = await Promise.all([
        db.from('sdev_extensions').select('id, name, kind, about, source, visibility').eq('user_id', user.id).order('created_at', { ascending: false }),
        db.from('gists').select('id, slug, title, view_count').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setExtensions(Array.isArray(e.data) ? e.data : []);
      setGists(Array.isArray(g.data) ? g.data : []);
    } catch { /* offline */ }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const installPreset = async (slug: string) => {
    const preset = presetList().find((p) => p.spec.meta.slug === slug);
    if (!preset) return;
    await save(structuredClone(preset.spec));
    activate(preset.spec.meta.slug);
    await refresh();
    toast.success(`${preset.spec.meta.name} installed and switched on.`);
  };

  const doPublish = async (slug: string) => {
    const spec = dialects.find((d) => d.meta.slug === slug);
    if (!spec) return;
    setBusy(slug);
    try {
      await publish(spec);
      toast.success('Published — it now shows up on the Explore page.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not publish');
    } finally { setBusy(null); }
  };

  const removeExtension = async (id: string) => {
    try { await db.from('sdev_extensions').delete().eq('id', id); load(); } catch { /* noop */ }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="My sdev — dialects, extensions and programs" description="Manage your own sdev dialects, extensions, files and shared programs in one place." path="/my" />

      <header className="border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <Link to="/ide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to IDE
          </Link>
          <Button asChild size="sm" variant="ghost"><Link to="/explore">Explore what others shared</Link></Button>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">My sdev</h1>
        <p className="text-muted-foreground mb-6">Everything you have made: the words you write sdev in, the functions you added, your files and what you have shared.</p>

        {!user && (
          <Card className="p-4 mb-6 text-sm">
            You are not signed in, so only the dialects stored on this computer are shown.{' '}
            <Link to="/auth" className="underline">Sign in</Link> to see your files and published work.
          </Card>
        )}

        <Tabs defaultValue="dialects">
          <TabsList>
            <TabsTrigger value="dialects">Dialects ({dialects.length})</TabsTrigger>
            <TabsTrigger value="extensions">Extensions ({extensions.length})</TabsTrigger>
            <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
            <TabsTrigger value="shared">Shared ({gists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dialects" className="mt-4 space-y-2">
            <Card className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-medium flex items-center gap-2"><Sparkles className="h-4 w-4" /> Ready-made dialects</div>
                <p className="text-sm text-muted-foreground">Complete, working dialects you can install and run right now.</p>
              </div>
              <div className="flex gap-2">
                {presetList().map((p) => (
                  <Button key={p.spec.meta.slug} size="sm" variant="outline" onClick={() => installPreset(p.spec.meta.slug)}>
                    Install {p.spec.meta.name}
                  </Button>
                ))}
              </div>
            </Card>

            {dialects.length === 0 && <p className="text-sm text-muted-foreground">No dialects yet — install a ready-made one above or <Link to="/dialects" className="underline">build your own</Link>.</p>}
            {dialects.map((d) => (
              <Card key={d.meta.slug} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium">
                    {d.meta.name} <span className="font-mono text-xs text-muted-foreground">{d.meta.slug}</span>
                    {activeSlug === d.meta.slug && <Badge className="ml-2">active</Badge>}
                  </div>
                  {d.meta.description && <p className="text-sm text-muted-foreground mt-1">{d.meta.description}</p>}
                  <div className="flex gap-1.5 mt-2">
                    <Badge variant="outline">v{d.meta.version}</Badge>
                    <Badge variant="secondary">{d.meta.visibility}</Badge>
                    {(d.meta.languages ?? []).map((l) => <Badge key={l} variant="secondary">{l}</Badge>)}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <Button size="sm" variant={activeSlug === d.meta.slug ? 'secondary' : 'outline'} onClick={() => activate(activeSlug === d.meta.slug ? null : d.meta.slug)}>
                    <Check className="h-4 w-4 mr-1.5" />{activeSlug === d.meta.slug ? 'Switch off' : 'Use it'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => doPublish(d.meta.slug)} disabled={busy === d.meta.slug}>
                    {busy === d.meta.slug ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Share2 className="h-4 w-4 mr-1.5" />}Publish
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(d.meta.slug)} aria-label={`Delete ${d.meta.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="extensions" className="mt-4 space-y-2">
            {extensions.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet — add one on the <Link to="/extensions" className="underline">Extensions page</Link>.</p>}
            {extensions.map((e) => (
              <Card key={e.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{e.name} <Badge variant="secondary" className="ml-1">{e.kind}</Badge> <Badge variant="outline">{e.visibility}</Badge></div>
                    {e.about && <p className="text-sm text-muted-foreground mt-1">{e.about}</p>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => removeExtension(e.id)} aria-label={`Delete ${e.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <pre className="text-xs bg-muted/40 rounded p-2 mt-3 overflow-x-auto"><code>{e.source}</code></pre>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="files" className="mt-4 space-y-2">
            {files.length === 0 && <p className="text-sm text-muted-foreground">No saved files yet.</p>}
            {files.map((f) => (
              <Card key={f.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate">{f.name}</div>
                  <div className="text-xs text-muted-foreground">saved {new Date(f.updated_at).toLocaleString()}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button asChild size="sm" variant="outline"><Link to="/ide">Open IDE</Link></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteFile(f.id)} aria-label={`Delete ${f.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="shared" className="mt-4 space-y-2">
            {gists.length === 0 && <p className="text-sm text-muted-foreground">You have not shared a program yet.</p>}
            {gists.map((g) => (
              <Card key={g.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm truncate">{g.title}</div>
                  <div className="text-xs text-muted-foreground">{g.view_count ?? 0} views</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/g/${g.slug}`); toast.success('Link copied'); }}>
                    <Copy className="h-4 w-4 mr-1.5" />Copy link
                  </Button>
                  <Button asChild size="sm" variant="outline"><Link to={`/g/${g.slug}`}>Open</Link></Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
