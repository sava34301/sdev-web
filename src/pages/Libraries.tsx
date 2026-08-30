import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Download, HardDriveDownload, Loader2, Package, Search, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cachedLibraries, exportOfflineBundle, fetchLibrary, forgetBundle, importOfflineBundle, type LibraryBundle } from '@/lang/dialect/registry';
import { parseAddress } from '@/lang/dialect/address';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface PublicLibrary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  latest_version: string;
  download_count: number;
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
  const [entrySource, setEntrySource] = useState('to hello with who\n  say "hello, " + who\nend\n');

  const loadBrowse = useCallback(async () => {
    try {
      const { data } = await db.from('libraries').select('id, slug, name, description, latest_version, download_count')
        .eq('visibility', 'public').order('download_count', { ascending: false }).limit(50);
      setBrowse(Array.isArray(data) ? data : []);
    } catch { setBrowse([]); }
  }, []);

  useEffect(() => { loadBrowse(); }, [loadBrowse]);

  const install = async () => {
    const address = parseAddress(reference);
    if (!address) { toast.error('Use @username/library or @username/library@1.0.0'); return; }
    setBusy(true);
    try {
      const bundle = await fetchLibrary(address);
      setInstalled(cachedLibraries());
      setReference('');
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
    const blob = new Blob([exportOfflineBundle()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'sdev-libraries.bundle.json'; a.click();
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-background">
      <SEO title="Libraries — sdev registry" description={'Publish sdev libraries, import them with use "@user/lib", and download an offline bundle for the native CLI and desktop IDE.'} path="/libraries" />

      <header className="border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/ide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to IDE
          </Link>
          <div className="flex items-center gap-2">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="@user/library" className="h-9 w-52 font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={install} disabled={busy || !reference.trim()}><Download className="h-4 w-4 mr-1.5" />Install</Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Libraries</h1>
        <p className="text-muted-foreground mb-8">Share sdev code. Import it with <code className="font-mono text-xs">use "@user/lib@1.0.0"</code>, or take it offline.</p>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse"><Search className="h-3.5 w-3.5 mr-1.5" />Browse</TabsTrigger>
            <TabsTrigger value="installed"><Package className="h-3.5 w-3.5 mr-1.5" />Installed ({installed.length})</TabsTrigger>
            <TabsTrigger value="publish"><Upload className="h-3.5 w-3.5 mr-1.5" />Publish</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="mt-6 space-y-2">
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search libraries…" className="mb-3" />
            {shown.length === 0 && <p className="text-sm text-muted-foreground">Nothing published yet — be first.</p>}
            {shown.map((l) => (
              <Card key={l.id} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{l.name} <Badge variant="secondary" className="ml-1 font-mono">v{l.latest_version}</Badge></div>
                  <div className="text-xs text-muted-foreground truncate">{l.description || 'No description'} · {l.download_count} installs</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setReference(`@?/${l.slug}`)}>Copy slug</Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="installed" className="mt-6 space-y-2">
            <div className="flex gap-2 mb-3">
              <Button size="sm" variant="outline" onClick={downloadOffline} disabled={installed.length === 0}>
                <HardDriveDownload className="h-4 w-4 mr-1.5" />Export offline bundle
              </Button>
              <label className="inline-flex">
                <input type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadOffline(f); }} />
                <Button size="sm" variant="outline" asChild><span><Upload className="h-4 w-4 mr-1.5" />Load bundle</span></Button>
              </label>
            </div>
            {installed.length === 0 && <p className="text-sm text-muted-foreground">No libraries cached on this machine yet.</p>}
            {installed.map((b) => (
              <Card key={b.address} className="p-3 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-sm truncate">{b.address}@{b.version}</div>
                  <div className="text-xs text-muted-foreground">{Object.keys(b.modules).length} module(s)</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => { forgetBundle(b.address); setInstalled(cachedLibraries()); }} aria-label={`Remove ${b.address}`}><Trash2 className="h-4 w-4" /></Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="publish" className="mt-6 space-y-4 max-w-xl">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Matrix Kit" /></div>
            <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="matrixkit" className="font-mono" /></div>
            <div><Label>Version</Label><Input value={version} onChange={(e) => setVersion(e.target.value)} className="font-mono" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
            <div><Label>main.sdev</Label><Textarea value={entrySource} onChange={(e) => setEntrySource(e.target.value)} rows={10} className="font-mono text-xs" /></div>
            <Button onClick={publish} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}Publish
            </Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
