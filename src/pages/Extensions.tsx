import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

interface Extension {
  id: string;
  name: string;
  kind: 'function' | 'operator';
  symbol: string | null;
  about: string | null;
  source: string;
  visibility: 'private' | 'unlisted' | 'public';
}

const BLANK = {
  name: '',
  kind: 'function' as const,
  symbol: '',
  about: '',
  source: 'to twice with n\n  return n * 2\nend\n',
  visibility: 'private' as const,
};

export default function Extensions() {
  const { user } = useAuth();
  const [mine, setMine] = useState<Extension[]>([]);
  const [publicOnes, setPublicOnes] = useState<Extension[]>([]);
  const [draft, setDraft] = useState({ ...BLANK });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      if (user) {
        const { data } = await db.from('sdev_extensions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        setMine(Array.isArray(data) ? data : []);
      }
      const { data: pub } = await db.from('sdev_extensions').select('*').eq('visibility', 'public').limit(30);
      setPublicOnes(Array.isArray(pub) ? pub : []);
    } catch { /* tables arrive with the draft */ }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!user) { toast.error('Sign in to add an extension.'); return; }
    if (!draft.name.trim()) { toast.error('Name your extension.'); return; }
    setBusy(true);
    try {
      const { error } = await db.from('sdev_extensions').upsert({
        user_id: user.id,
        name: draft.name.trim(),
        kind: draft.kind,
        symbol: draft.kind === 'operator' ? draft.symbol : null,
        about: draft.about,
        source: draft.source,
        visibility: draft.visibility,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,name' });
      if (error) throw error;
      toast.success('Extension saved');
      setDraft({ ...BLANK });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save');
    } finally { setBusy(false); }
  };

  const propose = async (ext: Extension) => {
    if (!user) return;
    const rationale = prompt('Why should this be part of core sdev?') ?? '';
    try {
      const { error } = await db.from('core_requests').insert({
        user_id: user.id, extension_id: ext.id, title: ext.name, rationale, source: ext.source,
      });
      if (error) throw error;
      toast.success('Proposal filed — you can follow it in your account.');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not file the proposal');
    }
  };

  const remove = async (ext: Extension) => {
    try { await db.from('sdev_extensions').delete().eq('id', ext.id); load(); } catch { /* noop */ }
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Extensions — add to sdev" description="Write new sdev functions and operators, keep them private or publish them, and propose the best ones for inclusion in core sdev." path="/extensions" />

      <header className="border-b border-border/50">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <Link to="/ide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to IDE
          </Link>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 py-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <h1 className="text-3xl font-bold tracking-tight mb-1">Extensions</h1>
          <p className="text-muted-foreground mb-6">New functions and operators, written in sdev. Keep them to yourself, share them, or propose them for the core language.</p>

          <h2 className="text-xl font-semibold tracking-tight mb-3">Yours</h2>
          {mine.length === 0 && <p className="text-sm text-muted-foreground mb-6">Nothing yet.</p>}
          <div className="space-y-2 mb-8">
            {mine.map((ext) => (
              <Card key={ext.id} className="p-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {ext.name} <Badge variant="secondary" className="ml-1">{ext.kind}</Badge>{' '}
                      <Badge variant="outline">{ext.visibility}</Badge>
                    </div>
                    {ext.about && <div className="text-xs text-muted-foreground truncate">{ext.about}</div>}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => propose(ext)}><Send className="h-4 w-4 mr-1.5" />Propose for core</Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(ext)} aria-label={`Delete ${ext.name}`}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <pre className="text-xs bg-muted/40 rounded p-2 overflow-x-auto"><code>{ext.source}</code></pre>
              </Card>
            ))}
          </div>

          <h2 className="text-xl font-semibold tracking-tight mb-3">Published by others</h2>
          {publicOnes.length === 0 && <p className="text-sm text-muted-foreground">Nothing public yet.</p>}
          <div className="space-y-2">
            {publicOnes.map((ext) => (
              <Card key={ext.id} className="p-3">
                <div className="text-sm font-medium">{ext.name} <Badge variant="secondary" className="ml-1">{ext.kind}</Badge></div>
                <pre className="text-xs bg-muted/40 rounded p-2 mt-2 overflow-x-auto"><code>{ext.source}</code></pre>
              </Card>
            ))}
          </div>
        </section>

        <aside className="lg:sticky lg:top-6 self-start space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">New extension</h2>
          <div><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="font-mono" /></div>
          <div>
            <Label>Kind</Label>
            <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as 'function' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="function">Function</SelectItem>
                <SelectItem value="operator">Operator</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.kind === 'operator' && (
            <div><Label>Symbol</Label><Input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} className="font-mono" placeholder="<>" /></div>
          )}
          <div><Label>What it does</Label><Input value={draft.about} onChange={(e) => setDraft({ ...draft, about: e.target.value })} /></div>
          <div><Label>sdev source</Label><Textarea value={draft.source} rows={8} className="font-mono text-xs" onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></div>
          <div>
            <Label>Visibility</Label>
            <Select value={draft.visibility} onValueChange={(v) => setDraft({ ...draft, visibility: v as 'private' })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="unlisted">Unlisted</SelectItem>
                <SelectItem value="public">Public</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={save} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}Save extension
          </Button>
        </aside>
      </main>
    </div>
  );
}
