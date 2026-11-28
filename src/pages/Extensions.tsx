import { useCallback, useEffect, useState } from 'react';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { GalleryHero, ExtensionCard, RunPanel, STARTER_EXTENSIONS } from '@/components/community/Gallery';
import { SdevCode } from '@/components/home/SdevCode';
import { useReveal } from '@/hooks/useReveal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Send, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Extension {
  id: string;
  name: string;
  kind: 'function' | 'operator';
  symbol: string | null;
  about: string | null;
  source: string;
  visibility: 'private' | 'unlisted' | 'public';
}

const BLANK: { name: string; kind: 'function' | 'operator'; symbol: string; about: string; source: string; visibility: 'private' | 'unlisted' | 'public' } = {
  name: '',
  kind: 'function',
  symbol: '',
  about: '',
  source: 'conjure twice(n) ::\n  yield n * 2\n;;\n',
  visibility: 'private',
};

export default function Extensions() {
  const { user } = useAuth();
  const [mine, setMine] = useState<Extension[]>([]);
  const [publicOnes, setPublicOnes] = useState<Extension[]>([]);
  const [draft, setDraft] = useState({ ...BLANK });
  const [testUsage, setTestUsage] = useState('speak(twice(21))');
  const [busy, setBusy] = useState(false);
  const [proposing, setProposing] = useState<Extension | null>(null);
  const [rationale, setRationale] = useState('');
  const [filingProposal, setFilingProposal] = useState(false);

  const load = useCallback(async () => {
    try {
      if (user) {
        const { data } = await supabase.from('sdev_extensions').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        setMine(Array.isArray(data) ? (data as unknown as Extension[]) : []);
      }
      const { data: pub } = await supabase.from('sdev_extensions').select('*').eq('visibility', 'public').limit(30);
      setPublicOnes(Array.isArray(pub) ? (pub as unknown as Extension[]) : []);
    } catch { /* offline */ }
  }, [user]);

  useEffect(() => { load(); }, [load]);
  useReveal([publicOnes.length, mine.length]);

  const save = async () => {
    if (!user) { toast.error('Sign in to add an extension.'); return; }
    if (!draft.name.trim()) { toast.error('Name your extension.'); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from('sdev_extensions').upsert({
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

  const submitProposal = async () => {
    if (!user || !proposing) return;
    setFilingProposal(true);
    try {
      const { error } = await supabase.from('core_requests').insert({
        user_id: user.id,
        extension_id: proposing.id,
        title: proposing.name,
        rationale: rationale.trim(),
        source: proposing.source,
      });
      if (error) throw error;
      toast.success('Proposal filed — thank you for shaping core sdev.');
      setProposing(null);
      setRationale('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not file the proposal');
    } finally {
      setFilingProposal(false);
    }
  };

  const remove = async (ext: Extension) => {
    try {
      const { error } = await supabase.from('sdev_extensions').delete().eq('id', ext.id);
      if (error) throw error;
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not delete extension');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="extensions-page">
      <SEO title="Extensions — add to sdev" description="Write new sdev functions and operators, keep them private or publish them, and propose the best ones for inclusion in core sdev." path="/extensions" />

      <SiteNav />
      <GalleryHero label="Extensions" title="Teach sdev" accent="new words." intro="New functions and operators, written in pure sdev. Try any of them right here, install with one click, keep them private, share them, or propose them for the core language." />

      <section className="wrap py-12" data-testid="extensions-gallery">
        <p className="label mb-5">§01 — Starter & community extensions</p>
        <div className="grid gap-5 md:grid-cols-2">
          {STARTER_EXTENSIONS.map(({ ext, usage }) => <ExtensionCard key={ext.id} ext={ext} usage={usage} author="sdev examples" />)}
          {publicOnes.map((ext) => <ExtensionCard key={ext.id} ext={ext} usage={ext.kind === 'operator' && ext.symbol ? `speak(1 ${ext.symbol} 2)` : `speak(${ext.name}(1))`} author="community" />)}
        </div>
      </section>

      <main className="wrap pb-24">
        <p className="label mb-6 border-t border-foreground/15 pt-6">§02 — Workshop</p>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
          <section>
            <h2 className="font-display text-3xl font-bold mb-4">Your extensions</h2>
            {mine.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
                <p className="font-display text-2xl font-bold">{user ? 'No personal extensions yet.' : 'Sign in to save your own extensions.'}</p>
                <p className="mt-2 text-sm text-muted-foreground">Use the workshop on the right to write and test a function or operator in pure sdev.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mine.map((ext) => (
                  <article key={ext.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-xl font-bold truncate">{ext.name}</h3>
                          {ext.symbol && <code className="rounded bg-[hsl(var(--lime))] px-1.5 py-0.5 font-mono text-xs text-[hsl(var(--ink))]">{ext.symbol}</code>}
                          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{ext.kind}</span>
                          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{ext.visibility}</span>
                        </div>
                        {ext.about && <p className="mt-1.5 text-sm text-muted-foreground">{ext.about}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => { setProposing(ext); setRationale(''); }} className="btn-line !h-8 !px-3 !text-xs">
                          <Send className="h-3.5 w-3.5" /> Propose for core
                        </button>
                        <button
                          onClick={() => remove(ext)}
                          aria-label={`Delete ${ext.name}`}
                          className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="ink mt-4 overflow-hidden rounded-xl border border-border">
                      <SdevCode code={ext.source.trim()} className="p-4 text-[12px]" />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="lg:sticky lg:top-24 self-start rounded-2xl border border-border bg-card p-6 space-y-4">
            <h2 className="font-display text-2xl font-bold">New extension</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Name</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="twice" className="mt-1 font-mono bg-background" /></div>
              <div>
                <Label>Kind</Label>
                <Select value={draft.kind} onValueChange={(v) => setDraft({ ...draft, kind: v as 'function' | 'operator' })}>
                  <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="function">Function</SelectItem>
                    <SelectItem value="operator">Operator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {draft.kind === 'operator' && (
              <div><Label>Operator symbol</Label><Input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} className="mt-1 font-mono bg-background" placeholder="^^" /></div>
            )}
            <div><Label>What it does</Label><Input value={draft.about} onChange={(e) => setDraft({ ...draft, about: e.target.value })} placeholder="Short summary shown on the extension card" className="mt-1 bg-background" /></div>
            <div><Label>sdev source</Label><Textarea value={draft.source} rows={6} className="mt-1 font-mono text-xs bg-background" onChange={(e) => setDraft({ ...draft, source: e.target.value })} /></div>
            <div className="ink rounded-xl border border-border overflow-hidden">
              <div className="border-b border-border px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Live preview</div>
              <SdevCode code={draft.source.trim()} className="p-3 text-[12px]" />
            </div>
            <div className="rounded-xl border border-border bg-background p-3 space-y-2">
              <Label className="text-xs">Test call</Label>
              <Input value={testUsage} onChange={(e) => setTestUsage(e.target.value)} className="h-8 font-mono text-xs" />
              <RunPanel code={`${draft.source}\n\n${testUsage}`} label="Run test" />
            </div>
            <div>
              <Label>Visibility</Label>
              <Select value={draft.visibility} onValueChange={(v) => setDraft({ ...draft, visibility: v as 'private' | 'unlisted' | 'public' })}>
                <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="unlisted">Unlisted</SelectItem>
                  <SelectItem value="public">Public</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button onClick={save} disabled={busy} className="btn-ink w-full justify-center disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Save extension
            </button>
          </aside>
        </div>
      </main>

      <Dialog open={!!proposing} onOpenChange={(o) => !o && setProposing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Propose “{proposing?.name}” for core sdev</DialogTitle>
            <DialogDescription>Explain why this function or operator belongs in the standard language for everyone.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            rows={4}
            placeholder="Use cases, ergonomics, and why it fits core sdev…"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setProposing(null)}>Cancel</Button>
            <Button onClick={submitProposal} disabled={filingProposal || !rationale.trim()}>
              {filingProposal ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Send className="h-4 w-4 mr-1.5" />} Submit proposal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFooter />
    </div>
  );
}
