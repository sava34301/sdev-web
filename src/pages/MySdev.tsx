import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { GalleryHero, RunPanel } from '@/components/community/Gallery';
import { SdevCode } from '@/components/home/SdevCode';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowUpRight, Check, Copy, ExternalLink, Loader2, Plus, Share2, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useDialects } from '@/hooks/useDialects';
import { useCloudFiles } from '@/hooks/useCloudFiles';
import { presetList } from '@/lang/dialect/presets';

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
  const navigate = useNavigate();
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
        supabase.from('sdev_extensions').select('id, name, kind, about, source, visibility').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('gists').select('id, slug, title, view_count').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]);
      setExtensions(Array.isArray(e.data) ? (e.data as MyExtension[]) : []);
      setGists(Array.isArray(g.data) ? (g.data as MyGist[]) : []);
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
    try {
      const { error } = await supabase.from('sdev_extensions').delete().eq('id', id);
      if (error) throw error;
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete extension');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="my-sdev-page">
      <SEO title="My sdev — dialects, extensions and programs" description="Manage your own sdev dialects, extensions, files and shared programs in one place." path="/my" />

      <SiteNav />
      <GalleryHero
        label="My sdev"
        title="Your personal"
        accent="workshop."
        intro="Everything you have crafted in sdev: your custom dialects, language extensions, cloud-synced files, and public share links."
      >
        <div className="flex flex-wrap gap-2">
          <Link to="/ide" className="btn-ink !h-10">Open IDE <ArrowUpRight className="h-4 w-4" /></Link>
          <Link to="/explore" className="btn-line !h-10">Explore community</Link>
        </div>
      </GalleryHero>

      <main className="wrap py-12 pb-24">
        {!user && (
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
            <div>
              <p className="font-display text-lg font-bold">Working locally on this device</p>
              <p className="text-sm text-muted-foreground">Local dialects work immediately. Sign in to sync cloud files, extensions, and shared programs across devices.</p>
            </div>
            <Link to="/auth" className="btn-ink !h-9 !px-4 !text-xs">Sign in</Link>
          </div>
        )}

        <Tabs defaultValue="dialects">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="dialects">Dialects ({dialects.length})</TabsTrigger>
            <TabsTrigger value="extensions">Extensions ({extensions.length})</TabsTrigger>
            <TabsTrigger value="files">Cloud files ({files.length})</TabsTrigger>
            <TabsTrigger value="shared">Shared ({gists.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="dialects" className="mt-6 space-y-6">
            <div className="rounded-2xl border border-border bg-card p-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 font-display text-xl font-bold"><Sparkles className="h-4 w-4 text-primary" /> Ready-made presets</div>
                <p className="mt-1 text-sm text-muted-foreground">Install a complete dialect in one click and start writing immediately.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {presetList().map((p) => (
                  <button key={p.spec.meta.slug} onClick={() => installPreset(p.spec.meta.slug)} className="btn-line !h-9 !px-4 !text-xs">
                    + Install {p.spec.meta.name}
                  </button>
                ))}
                <Link to="/dialects" className="btn-ink !h-9 !px-4 !text-xs"><Plus className="h-3.5 w-3.5" /> Build custom</Link>
              </div>
            </div>

            {dialects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No dialects installed yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Pick a preset above or head to <Link to="/dialects" className="text-primary underline underline-offset-4">Dialect Studio</Link>.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {dialects.map((d) => {
                  const isActive = activeSlug === d.meta.slug;
                  return (
                    <article key={d.meta.slug} className={`flex flex-col justify-between rounded-2xl border bg-card p-5 ${isActive ? 'border-foreground/50 ring-1 ring-[hsl(var(--lime))]' : 'border-border'}`}>
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate font-display text-xl font-bold">{d.meta.name}</h3>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">{d.meta.slug} · v{d.meta.version} · {d.meta.visibility}</p>
                          </div>
                          {isActive && <span className="rounded-full bg-[hsl(var(--lime))] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ink))]">Active</span>}
                        </div>
                        {d.meta.description && <p className="mt-3 text-sm text-muted-foreground">{d.meta.description}</p>}
                      </div>
                      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                        <button onClick={() => activate(isActive ? null : d.meta.slug)} className={isActive ? 'btn-line !h-8 !px-3 !text-xs' : 'btn-ink !h-8 !px-3 !text-xs'}>
                          <Check className="h-3.5 w-3.5" /> {isActive ? 'Switch off' : 'Use in IDE'}
                        </button>
                        <button onClick={() => doPublish(d.meta.slug)} disabled={busy === d.meta.slug} className="btn-line !h-8 !px-3 !text-xs disabled:opacity-50">
                          {busy === d.meta.slug ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Share2 className="h-3.5 w-3.5" />} Publish
                        </button>
                        <Link to="/dialects" className="btn-line !h-8 !px-3 !text-xs">Edit</Link>
                        <button onClick={() => remove(d.meta.slug)} aria-label={`Delete ${d.meta.name}`} className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="extensions" className="mt-6">
            {extensions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No extensions saved yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Create new functions and operators on the <Link to="/extensions" className="text-primary underline underline-offset-4">Extensions page</Link>.</p>
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {extensions.map((e) => (
                  <article key={e.id} className="flex flex-col rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-display text-xl font-bold">{e.name}</h3>
                        <p className="mt-0.5 font-mono text-xs text-muted-foreground">{e.kind} · {e.visibility}</p>
                      </div>
                      <button onClick={() => removeExtension(e.id)} aria-label={`Delete ${e.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {e.about && <p className="mt-2 text-sm text-muted-foreground">{e.about}</p>}
                    <div className="ink mt-4 overflow-hidden rounded-xl border border-border">
                      <SdevCode code={e.source.trim()} className="p-4 text-[12px]" />
                    </div>
                    <div className="mt-4">
                      <RunPanel code={e.source} label="Verify syntax" />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="files" className="mt-6">
            {files.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No cloud files saved yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Save any file from the <Link to="/ide" className="text-primary underline underline-offset-4">Web IDE</Link> to access it anywhere.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium truncate">{f.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Updated {new Date(f.updated_at).toLocaleString()}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => navigate(`/ide?cloud=${f.id}`)} className="btn-ink !h-8 !px-3.5 !text-xs">
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </button>
                      <button onClick={() => deleteFile(f.id)} aria-label={`Delete ${f.name}`} className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="shared" className="mt-6">
            {gists.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No shared programs yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Click Share inside the IDE to publish a runnable link.</p>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {gists.map((g) => (
                  <div key={g.id} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                    <div className="min-w-0">
                      <div className="font-display text-lg font-bold truncate">{g.title}</div>
                      <div className="mt-0.5 font-mono text-xs text-muted-foreground">/g/{g.slug} · {g.view_count ?? 0} views</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/g/${g.slug}`); toast.success('Link copied'); }}
                        className="btn-line !h-8 !px-3 !text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy URL
                      </button>
                      <Link to={`/g/${g.slug}`} className="btn-ink !h-8 !px-3.5 !text-xs">View</Link>
                    </div>
                  </div>
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
