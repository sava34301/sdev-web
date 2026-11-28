import { useCallback, useEffect, useState } from 'react';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { GalleryHero, RunPanel } from '@/components/community/Gallery';
import { SdevCode } from '@/components/home/SdevCode';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Copy, Download, HardDriveDownload, Loader2, Package, Search, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useReveal } from '@/hooks/useReveal';
import { cachedLibraries, exportOfflineBundle, fetchLibrary, forgetBundle, importOfflineBundle, type LibraryBundle } from '@/lang/dialect/registry';
import { parseAddress } from '@/lang/dialect/address';
import { downloadText } from '@/lib/download';

const LIB_SOURCE = 'conjure hello(who) ::\n  yield "hello, " + who + "!"\n;;';
const LIB_USAGE = 'use "@you/greetings@1.0.0"\n\nspeak(hello("world"))\nspeak(hello("sdev"))';

const db = supabase;

interface PublicLibrary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  latest_version: string;
  download_count: number;
  username: string | null;
}

export default function Libraries() {
  const { user } = useAuth();
  const [browse, setBrowse] = useState<PublicLibrary[]>([]);
  const [query, setQuery] = useState('');
  const [installed, setInstalled] = useState<LibraryBundle[]>(() => cachedLibraries());
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [entrySource, setEntrySource] = useState('conjure greet(who) ::\n  yield "hello, " + who + "!"\n;;\n');
  const [testCall, setTestCall] = useState('speak(greet("sdev"))');

  useReveal([browse.length]);

  const loadBrowse = useCallback(async () => {
    try {
      const { data } = await db.from('libraries').select('id, user_id, slug, name, description, latest_version, download_count')
        .eq('visibility', 'public').order('download_count', { ascending: false }).limit(50);
      const rows = Array.isArray(data) ? data : [];
      const ownerIds = [...new Set(rows.map((r: { user_id: string }) => r.user_id).filter(Boolean))];
      let handles: Record<string, string> = {};
      if (ownerIds.length) {
        const { data: names } = await db.from('usernames').select('user_id, username').in('user_id', ownerIds);
        handles = Object.fromEntries((Array.isArray(names) ? names : []).map((n: { user_id: string; username: string }) => [n.user_id, n.username]));
      }
      setBrowse(rows.map((r: PublicLibrary & { user_id: string }) => ({ ...r, username: handles[r.user_id] ?? null })));
    } catch { setBrowse([]); }
  }, []);

  useEffect(() => { loadBrowse(); }, [loadBrowse]);

  const install = async (ref?: string) => {
    const address = parseAddress(ref ?? reference);
    if (!address) { toast.error('Use @username/library or @username/library@1.0.0'); return; }
    setBusy(true);
    try {
      const bundle = await fetchLibrary(address);
      setInstalled(cachedLibraries());
      if (!ref) setReference('');
      toast.success(`Installed ${bundle.address}@${bundle.version}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not install');
    } finally { setBusy(false); }
  };

  const publish = async () => {
    if (!user) { toast.error('Sign in to publish a library.'); return; }
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug)) { toast.error('Slug must be lowercase letters, digits or dashes.'); return; }
    setBusy(true);
    try {
      const { data: lib, error } = await db.from('libraries')
        .upsert({ user_id: user.id, slug, name: name || slug, description, latest_version: version, updated_at: new Date().toISOString() }, { onConflict: 'user_id,slug' })
        .select('id').single();
      if (error) throw error;
      const { error: verError } = await db.from('library_versions').insert({
        library_id: lib.id, version, modules: { 'main.sdev': entrySource }, manifest: { entry: 'main.sdev' },
      });
      if (verError) throw verError;
      toast.success(`Published ${slug}@${version}`);
      loadBrowse();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not publish');
    } finally { setBusy(false); }
  };

  const downloadOffline = () => {
    downloadText(exportOfflineBundle(), 'sdev-libraries.bundle.json', 'application/json');
  };

  const uploadOffline = async (file: File) => {
    try {
      const count = importOfflineBundle(await file.text());
      setInstalled(cachedLibraries());
      toast.success(`Loaded ${count} librar${count === 1 ? 'y' : 'ies'} from the bundle`);
    } catch {
      toast.error('That file is not an sdev library bundle.');
    }
  };

  const shown = browse.filter((l) => !query.trim() || l.name.toLowerCase().includes(query.toLowerCase()) || l.slug.includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="libraries-page">
      <SEO title="Libraries — sdev registry" description={'Publish sdev libraries, import them with use "@user/lib", and download an offline bundle for the native CLI and desktop IDE.'} path="/libraries" />

      <SiteNav />
      <GalleryHero label="Libraries" title="Code worth" accent="sharing." intro={'Publish sdev modules once, import them anywhere with use "@user/lib@1.0.0", or export an offline bundle for the native CLI and desktop IDE.'}>
        <div className="flex gap-2">
          <Input data-testid="libraries-address" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="@user/library" className="h-11 rounded-full bg-card font-mono text-xs" />
          <button data-testid="libraries-install-address" onClick={() => install()} disabled={busy || !reference.trim()} className="btn-ink shrink-0 disabled:opacity-50"><Download className="h-4 w-4" />Install</button>
        </div>
      </GalleryHero>

      <section className="wrap py-12" data-testid="libraries-live-example">
        <p className="label mb-5">§01 — How a library works</p>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {[
            ['Write', 'greetings.sdev — published as @you/greetings', LIB_SOURCE],
            ['Import', 'any program, IDE or CLI', LIB_USAGE],
          ].map(([t, d, c]) => (
            <div key={t} className="bg-card p-6">
              <h3 className="font-display text-2xl font-bold">{t}</h3>
              <p className="mb-4 mt-1 text-xs text-muted-foreground">{d}</p>
              <div className="ink rounded-xl border border-border p-4"><SdevCode code={c} className="text-[12px]" /></div>
            </div>
          ))}
          <div className="bg-card p-6">
            <h3 className="font-display text-2xl font-bold">Run</h3>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">live here — executed by the real interpreter</p>
            <RunPanel code={`${LIB_SOURCE}\n\n${LIB_USAGE.split('\n').slice(2).join('\n')}`} label="Run example" />
          </div>
        </div>
      </section>

      <main className="wrap pb-24">
        <p className="label mb-5 border-t border-foreground/15 pt-6">§02 — Registry & studio</p>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse"><Search className="h-3.5 w-3.5 mr-1.5" />Browse ({browse.length})</TabsTrigger>
            <TabsTrigger value="installed"><Package className="h-3.5 w-3.5 mr-1.5" />Cached ({installed.length})</TabsTrigger>
            <TabsTrigger value="publish"><Upload className="h-3.5 w-3.5 mr-1.5" />Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-6">
            <div className="relative mb-6">
              <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search public libraries…" className="h-12 rounded-full bg-card pl-11" />
            </div>
            {shown.length === 0 && (
              <div data-testid="libraries-empty" className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">No matching public libraries yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Open the Publish tab to release the first version of yours.</p>
              </div>
            )}
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {shown.map((l) => (
                <article key={l.id} data-testid={`library-card-${l.slug}`} className="flex flex-col rounded-2xl border border-border bg-card p-5 transition-[border-color] hover:border-foreground/30">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="truncate font-display text-xl font-bold">{l.name}</h3>
                    <span className="shrink-0 rounded-full border border-border px-2 py-0.5 font-mono text-[10px]">v{l.latest_version}</span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">{l.username ? `@${l.username}/${l.slug}` : l.slug} · {l.download_count} installs</p>
                  <p className="mt-3 flex-1 text-sm text-muted-foreground">{l.description || 'No description'}</p>
                  {l.username && <div className="ink mt-4 rounded-xl border border-border px-4 py-3"><SdevCode code={`use "@${l.username}/${l.slug}@${l.latest_version}"`} className="text-[12px]" /></div>}
                  {l.username ? (
                    <div className="mt-4 flex gap-2">
                      <button className="btn-ink !h-9 !px-4" disabled={busy} onClick={() => install(`@${l.username}/${l.slug}`)}><Download className="h-3.5 w-3.5" />Install</button>
                      <button className="btn-line !h-9 !px-4" onClick={() => { navigator.clipboard.writeText(`use "@${l.username}/${l.slug}@${l.latest_version}"`); toast.success('use line copied'); }}><Copy className="h-3.5 w-3.5" />Copy use</button>
                    </div>
                  ) : (
                    <span className="mt-4 text-xs text-muted-foreground">Owner has no handle yet</span>
                  )}
                </article>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="installed" className="mt-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-5">
              <div>
                <h3 className="font-display text-xl font-bold">Offline library cache</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cached modules work without internet in the Web IDE, CLI, and desktop editor.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={downloadOffline} disabled={installed.length === 0} className="btn-line !h-9 !px-4 !text-xs disabled:opacity-50">
                  <HardDriveDownload className="h-3.5 w-3.5" /> Export .bundle.json
                </button>
                <label className="btn-ink !h-9 !px-4 !text-xs cursor-pointer">
                  <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOffline(f); }} />
                  <Upload className="h-3.5 w-3.5" /> Load bundle
                </label>
              </div>
            </div>

            {installed.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">Nothing cached on this device yet.</p>
                <p className="mt-2 text-sm text-muted-foreground">Install a library from Browse or import an offline <code className="font-mono">.bundle.json</code> file.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {installed.map((b) => (
                  <div key={b.address} className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-medium truncate">{b.address}@{b.version}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{Object.keys(b.modules).length} module(s) cached locally</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => navigator.clipboard.writeText(`use "${b.address}@${b.version}"`).then(() => toast.success('use line copied'))}
                        className="btn-line !h-8 !px-3 !text-xs"
                      >
                        <Copy className="h-3.5 w-3.5" /> Copy use
                      </button>
                      <button
                        onClick={() => { forgetBundle(b.address); setInstalled(cachedLibraries()); }}
                        aria-label={`Remove ${b.address}`}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="publish" className="mt-6">
            <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-display text-2xl font-bold">Publish a library</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Display name</Label><Input className="mt-1 bg-background" value={name} onChange={(e) => setName(e.target.value)} placeholder="Matrix Kit" /></div>
                  <div><Label>Slug</Label><Input className="mt-1 font-mono bg-background" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="matrixkit" /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div><Label>Version</Label><Input className="mt-1 font-mono bg-background" value={version} onChange={(e) => setVersion(e.target.value)} /></div>
                  <div><Label>Import preview</Label><div className="mt-1 flex h-10 items-center rounded-md border border-border bg-muted/50 px-3 font-mono text-xs text-muted-foreground truncate">use "@you/{slug || 'library'}@{version || '1.0.0'}"</div></div>
                </div>
                <div><Label>Description</Label><Textarea className="mt-1 bg-background" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="What functions or utilities does this module export?" /></div>
                <div><Label>main.sdev</Label><Textarea value={entrySource} onChange={(e) => setEntrySource(e.target.value)} rows={10} className="mt-1 font-mono text-xs bg-background" /></div>
                <button onClick={publish} disabled={busy} className="btn-ink disabled:opacity-50">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Publish {slug ? `${slug}@${version}` : 'library'}
                </button>
              </div>

              <aside className="lg:sticky lg:top-24 self-start space-y-4">
                <div className="ink overflow-hidden rounded-2xl border border-border">
                  <div className="border-b border-border px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">main.sdev preview</div>
                  <SdevCode code={entrySource} numbered className="p-4 text-[12px]" />
                </div>
                <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                  <p className="label">Test before publishing</p>
                  <Input value={testCall} onChange={(e) => setTestCall(e.target.value)} className="font-mono text-xs bg-background" placeholder='speak(greet("sdev"))' />
                  <RunPanel code={`${entrySource}\n\n${testCall}`} label="Run test call" />
                </div>
              </aside>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <SiteFooter />
    </div>
  );
}
