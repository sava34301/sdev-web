import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { GalleryHero } from '@/components/community/Gallery';
import { DialectMap } from '@/components/home/DialectMap';
import { SdevCode } from '@/components/home/SdevCode';
import { openInIde } from '@/components/home/engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { BookOpen, Check, Copy, Download, Edit3, ExternalLink, Loader2, Plus, Share2, Sparkles, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDialects } from '@/hooks/useDialects';
import { useAuth } from '@/hooks/useAuth';
import { useReveal } from '@/hooks/useReveal';
import { CreateDialectDialog, type CreateDialectValues } from '@/components/dialect/CreateDialectDialog';
import { CATALOG, GROUP_LABELS, type CatalogGroup } from '@/lang/dialect/catalog';
import { validateDialect, type DialectSpec } from '@/lang/dialect/spec';
import { serializeDialectToSdev } from '@/lang/dialect/sdev-format';
import { dialectize } from '@/lang/dialect/canonicalize';
import { SAMPLE } from '@/lang/dialect/sample';
import { presetList } from '@/lang/dialect/presets';
import { getOrGenerateDocs } from '@/lang/dialect/docs';
import { downloadText } from '@/lib/download';

const GROUP_ORDER: CatalogGroup[] = ['core', 'control', 'functions', 'errors', 'objects', 'modules', 'literals', 'operators', 'builtins'];

export default function Dialects() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { dialects, activeSlug, create, save, publish, remove, install, activate, refresh } = useDialects();
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<DialectSpec | null>(null);
  const [previewTab, setPreviewTab] = useState<'sample' | 'source'>('sample');
  const [query, setQuery] = useState('');
  const [reference, setReference] = useState('');
  const [aiRequest, setAiRequest] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  useReveal([dialects.length, editingSlug]);

  const issues = useMemo(() => (draft ? validateDialect(draft) : []), [draft]);
  const errors = issues.filter((i) => i.level === 'error');
  const preview = useMemo(() => (draft ? dialectize(SAMPLE, draft) : ''), [draft]);
  const dialectFileSource = useMemo(() => (draft ? serializeDialectToSdev(draft) : ''), [draft]);
  const draftKeywords = useMemo(() => new Set(Object.values(draft?.names ?? {}).filter(Boolean)), [draft]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((e) => !q || e.word.includes(q) || e.about.toLowerCase().includes(q) || (draft?.names[e.word] ?? '').toLowerCase().includes(q));
  }, [query, draft]);

  const openEditor = (spec: DialectSpec) => {
    setEditingSlug(spec.meta.slug);
    setDraft(structuredClone(spec));
  };

  const installPreset = async (slug: string) => {
    const preset = presetList().find((p) => p.spec.meta.slug === slug);
    if (!preset) return;
    await save(structuredClone(preset.spec));
    activate(preset.spec.meta.slug);
    await refresh();
    openEditor(preset.spec);
    toast.success(`${preset.spec.meta.name} installed and activated`);
  };

  const handleCreate = async (values: CreateDialectValues) => {
    const result = await create(
      { name: values.name, slug: values.slug, description: values.description, languages: values.languages.length ? values.languages : ['en'], visibility: values.visibility },
      values.base ?? undefined,
    );
    openEditor(result.spec);
    await refresh();
    if (result.error) toast.warning(`Saved here, but not to your account: ${result.error}`);
    else if (!user) toast.success('Dialect created on this device. Sign in to sync it across devices.');
    else toast.success('Dialect created and saved to your account.');
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    const result = await save(draft);
    setSaving(false);
    if (result?.error) toast.error(`Saved here, but not to your account: ${result.error}`);
    else if (!user) toast.success('Saved on this device. Sign in to keep it in your account.');
    else toast.success('Dialect saved to your account.');
  };

  const publishSpec = async (spec: DialectSpec) => {
    if (!user) { toast.error('Sign in first — publishing puts the dialect on your account.'); return; }
    try {
      const published = await publish(spec);
      if (draft && draft.meta.slug === published.meta.slug) setDraft(published);
      await refresh();
      toast.success('Published — share it with @you/' + published.meta.slug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not publish');
    }
  };

  const handlePublish = async () => { if (draft) await publishSpec(draft); };

  const handleInstall = async () => {
    try {
      const spec = await install(reference);
      setReference('');
      toast.success(`Installed ${spec.meta.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not install that dialect');
    }
  };

  const handleExport = () => {
    if (!draft) return;
    downloadText(serializeDialectToSdev(draft), `${draft.meta.slug}.dialect.sdev`);
  };

  const handleDocs = async () => {
    if (!draft) return;
    const db = supabase;
    let dialectId: string | null = null;
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth?.user) {
        const { data } = await db.from('dialects').select('id').eq('user_id', auth.user.id).eq('slug', draft.meta.slug).maybeSingle();
        dialectId = data?.id ?? null;
      }
    } catch { /* offline: render locally */ }
    const docs = await getOrGenerateDocs(db, draft, dialectId);
    downloadText(docs.content, `${draft.meta.slug}.documentation.md`, 'text/markdown');
    toast.success(docs.regenerated ? `Documentation regenerated from core template v${docs.templateVersion}` : 'Documentation ready');
  };

  const askAi = async () => {
    if (!draft || !aiRequest.trim()) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('draft-dialect', {
        body: { request: aiRequest, words: CATALOG.map((c) => c.word), current: draft.names },
      });
      if (error) throw error;
      const proposal = data as { names?: Record<string, string>; style?: Partial<DialectSpec['style']>; notes?: string };
      const next = structuredClone(draft);
      for (const [canonical, word] of Object.entries(proposal.names ?? {})) {
        if (canonical in next.names && typeof word === 'string' && word.trim()) next.names[canonical] = word.trim();
      }
      if (proposal.style) next.style = { ...next.style, ...proposal.style };
      setDraft(next);
      toast.success(proposal.notes || 'Proposal loaded — review and edit before saving');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Assisted drafting failed');
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="dialects-page">
      <SEO title="Dialect Studio — build your own sdev" description="Create a personal version of sdev: rename every keyword in any language, choose your own style, add your own functions and operators, then share it." path="/dialects" />

      <SiteNav />
      <GalleryHero
        label="Dialect Studio"
        title="Rename every"
        accent="word."
        intro="Build your own custom syntax as a pure .dialect.sdev file. Personal dialects translate deterministically straight into canonical sdev v2 — no AI required."
      >
        <div className="flex flex-wrap gap-2">
          <Input
            data-testid="dialect-install-input"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="@user/dialect or share code"
            className="h-11 flex-1 min-w-[200px] rounded-full bg-card font-mono text-xs"
          />
          <button
            data-testid="dialect-install-btn"
            onClick={handleInstall}
            disabled={!reference.trim()}
            className="btn-line shrink-0 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Install
          </button>
          <button data-testid="dialect-create-btn" onClick={() => setCreating(true)} className="btn-ink shrink-0">
            <Plus className="h-4 w-4" /> New dialect
          </button>
        </div>
      </GalleryHero>

      <section className="wrap py-14" data-testid="dialect-explorer">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-foreground/15 pt-6">
          <div>
            <p className="label">§01 — Built-in lexer tables</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">26 human languages out of the box</h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">Pick any pin on the map to inspect its native keyword table and execute a sample right in your browser.</p>
        </div>
        <DialectMap />
      </section>

      <main className="wrap pb-24 space-y-16">
        <section>
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-foreground/15 pt-6">
            <div>
              <p className="label">§02 — Personal dialects</p>
              <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Your dialects</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {presetList().map((p) => (
                <button
                  key={p.spec.meta.slug}
                  onClick={() => installPreset(p.spec.meta.slug)}
                  className="btn-line !h-9 !px-3.5 !text-xs"
                >
                  + Preset: {p.spec.meta.name}
                </button>
              ))}
              <button onClick={() => setCreating(true)} className="btn-ink !h-9 !px-4 !text-xs">
                <Plus className="h-3.5 w-3.5" /> Create dialect
              </button>
            </div>
          </div>

          {dialects.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-foreground/25 bg-card/50 p-10 text-center">
              <p className="font-display text-2xl font-bold">No personal dialects yet.</p>
              <p className="mt-2 text-sm text-muted-foreground">Create one from scratch, start from a preset above, or paste a friend's <code className="font-mono">@handle/slug</code> to install.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {dialects.map((d) => {
                const isActive = activeSlug === d.meta.slug;
                const isEditing = draft?.meta.slug === d.meta.slug;
                return (
                  <article
                    key={d.meta.slug}
                    data-testid={`dialect-card-${d.meta.slug}`}
                    className={`flex flex-col justify-between rounded-2xl border bg-card p-5 transition-[border-color] ${isActive ? 'border-foreground/50 ring-1 ring-[hsl(var(--lime))]' : isEditing ? 'border-primary' : 'border-border hover:border-foreground/30'}`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate font-display text-xl font-bold">{d.meta.name}</h3>
                          <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                            {d.meta.slug} · v{d.meta.version} · {d.meta.visibility}
                          </p>
                        </div>
                        {isActive && (
                          <span className="shrink-0 rounded-full bg-[hsl(var(--lime))] px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--ink))]">
                            Active in IDE
                          </span>
                        )}
                      </div>
                      {d.meta.description && <p className="mt-3 text-sm text-muted-foreground">{d.meta.description}</p>}
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                      <button
                        onClick={() => activate(isActive ? null : d.meta.slug)}
                        className={isActive ? 'btn-line !h-8 !px-3 !text-xs' : 'btn-ink !h-8 !px-3 !text-xs'}
                      >
                        <Check className="h-3.5 w-3.5" /> {isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => openEditor(d)} className="btn-line !h-8 !px-3 !text-xs">
                        <Edit3 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => downloadText(serializeDialectToSdev(d), `${d.meta.slug}.dialect.sdev`)}
                        className="btn-line !h-8 !px-3 !text-xs"
                        title="Download .dialect.sdev"
                      >
                        <Download className="h-3.5 w-3.5" /> .sdev
                      </button>
                      <button onClick={() => publishSpec(d)} className="btn-line !h-8 !px-3 !text-xs">
                        <Upload className="h-3.5 w-3.5" /> Publish
                      </button>
                      <button
                        onClick={() => remove(d.meta.slug)}
                        aria-label={`Delete ${d.meta.name}`}
                        className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <CreateDialectDialog
          open={creating}
          onOpenChange={setCreating}
          existingSlugs={dialects.map((d) => d.meta.slug)}
          installed={dialects}
          onCreate={handleCreate}
        />

        {draft && (
          <section data-testid="dialect-workbench">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-t border-foreground/15 pt-6">
              <div>
                <p className="label">§03 — Workbench</p>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Editing <span className="serif-i font-normal text-primary">{draft.meta.name}</span></h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleDocs} className="btn-line !h-9 !px-3.5 !text-xs"><BookOpen className="h-3.5 w-3.5" /> Living docs</button>
                <button onClick={handleExport} className="btn-line !h-9 !px-3.5 !text-xs"><Share2 className="h-3.5 w-3.5" /> Export .sdev</button>
                <button onClick={handlePublish} disabled={errors.length > 0} className="btn-line !h-9 !px-3.5 !text-xs disabled:opacity-50"><Upload className="h-3.5 w-3.5" /> Publish</button>
                <button onClick={handleSave} disabled={saving} className="btn-ink !h-9 !px-4 !text-xs disabled:opacity-50">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save dialect
                </button>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-destructive">{errors.length} issue{errors.length === 1 ? '' : 's'} to resolve before publishing</p>
                <ul className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                  {errors.slice(0, 8).map((i, n) => <li key={n}><code className="font-mono text-foreground">{i.field}</code> — {i.message}</li>)}
                </ul>
              </div>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_420px]">
              <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
                <Tabs defaultValue="words">
                  <TabsList className="flex-wrap h-auto gap-1">
                    <TabsTrigger value="words">Words</TabsTrigger>
                    <TabsTrigger value="style">Style</TabsTrigger>
                    <TabsTrigger value="constructs">Additions</TabsTrigger>
                    <TabsTrigger value="assisted"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Assisted</TabsTrigger>
                    <TabsTrigger value="about">About</TabsTrigger>
                  </TabsList>

                  <TabsContent value="words" className="mt-5">
                    <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search canonical commands or your words…" className="mb-5 rounded-full bg-background" />
                    {GROUP_ORDER.map((group) => {
                      const rows = filtered.filter((e) => e.group === group);
                      if (!rows.length) return null;
                      return (
                        <div key={group} className="mb-7 last:mb-0">
                          <p className="label mb-3 border-b border-border pb-1.5">{GROUP_LABELS[group]}</p>
                          <div className="space-y-2">
                            {rows.map((entry) => (
                              <div key={entry.word} className="grid grid-cols-[150px_1fr] gap-3 items-center">
                                <div className="min-w-0">
                                  <div className="font-mono text-xs font-medium truncate">{entry.word}</div>
                                  <div className="text-[11px] text-muted-foreground truncate">{entry.about}</div>
                                </div>
                                <Input
                                  value={draft.names[entry.word] ?? ''}
                                  onChange={(e) => setDraft({ ...draft, names: { ...draft.names, [entry.word]: e.target.value } })}
                                  className="h-8 font-mono text-xs bg-background"
                                  aria-label={`Word for ${entry.word}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </TabsContent>

                  <TabsContent value="style" className="mt-5 space-y-4 max-w-md">
                    <div>
                      <Label>Block style</Label>
                      <Select value={draft.style.blockStyle} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, blockStyle: v as 'word' | 'braces' } })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="word">Closing word (end)</SelectItem>
                          <SelectItem value="braces">Braces {'{ }'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assignment form</Label>
                      <Select value={draft.style.assignment} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, assignment: v as DialectSpec['style']['assignment'] } })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="set-to">set x to 1</SelectItem>
                          <SelectItem value="equals">x = 1</SelectItem>
                          <SelectItem value="arrow">1 -&gt; x</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Comment marker</Label>
                      <Input value={draft.style.commentMarker} onChange={(e) => setDraft({ ...draft, style: { ...draft.style, commentMarker: e.target.value } })} className="mt-1 font-mono" />
                    </div>
                    <div>
                      <Label>String quote</Label>
                      <Select value={draft.style.stringQuote} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, stringQuote: v as '"' | "'" } })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={'"'}>Double quotes</SelectItem>
                          <SelectItem value={"'"}>Single quotes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Argument separator</Label>
                      <Select value={draft.style.argSeparator} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, argSeparator: v as 'space' | 'comma' } })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="space">Spaces</SelectItem>
                          <SelectItem value="comma">Commas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>

                  <TabsContent value="constructs" className="mt-5 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-lg font-bold">Prelude functions</h3>
                        <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, constructs: { ...draft.constructs, functions: [...draft.constructs.functions, { name: 'twice', source: 'to twice with n\n  return n * 2\nend' }] } })}>
                          <Plus className="h-4 w-4 mr-1.5" />Add function
                        </Button>
                      </div>
                      {draft.constructs.functions.length === 0 && <p className="text-xs text-muted-foreground">Write sdev functions here — they ship automatically with your dialect.</p>}
                      <div className="space-y-3">
                        {draft.constructs.functions.map((fn, idx) => (
                          <div key={idx} className="rounded-xl border border-border bg-background p-3 space-y-2">
                            <div className="flex gap-2">
                              <Input value={fn.name} onChange={(e) => {
                                const fns = [...draft.constructs.functions];
                                fns[idx] = { ...fn, name: e.target.value };
                                setDraft({ ...draft, constructs: { ...draft.constructs, functions: fns } });
                              }} className="h-8 font-mono text-xs" aria-label="Function name" />
                              <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, constructs: { ...draft.constructs, functions: draft.constructs.functions.filter((_, i) => i !== idx) } })} aria-label="Remove function"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                            <Textarea value={fn.source} rows={4} className="font-mono text-xs" onChange={(e) => {
                              const fns = [...draft.constructs.functions];
                              fns[idx] = { ...fn, source: e.target.value };
                              setDraft({ ...draft, constructs: { ...draft.constructs, functions: fns } });
                            }} aria-label="Function source" />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-display text-lg font-bold">Custom operators</h3>
                        <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, constructs: { ...draft.constructs, operators: [...draft.constructs.operators, { symbol: '<>', precedence: 5, fn: draft.constructs.functions[0]?.name ?? 'twice' }] } })}>
                          <Plus className="h-4 w-4 mr-1.5" />Add operator
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {draft.constructs.operators.map((op, idx) => (
                          <div key={idx} className="rounded-xl border border-border bg-background p-3 flex gap-2 items-center">
                            <Input value={op.symbol} className="h-8 w-20 font-mono text-xs" aria-label="Operator symbol" onChange={(e) => {
                              const ops = [...draft.constructs.operators];
                              ops[idx] = { ...op, symbol: e.target.value };
                              setDraft({ ...draft, constructs: { ...draft.constructs, operators: ops } });
                            }} />
                            <span className="text-xs text-muted-foreground">calls</span>
                            <Input value={op.fn} className="h-8 font-mono text-xs" aria-label="Operator function" onChange={(e) => {
                              const ops = [...draft.constructs.operators];
                              ops[idx] = { ...op, fn: e.target.value };
                              setDraft({ ...draft, constructs: { ...draft.constructs, operators: ops } });
                            }} />
                            <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, constructs: { ...draft.constructs, operators: draft.constructs.operators.filter((_, i) => i !== idx) } })} aria-label="Remove operator"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="assisted" className="mt-5 space-y-3 max-w-xl">
                    <p className="text-sm text-muted-foreground">Describe the language feel you want. Proposed keyword mappings populate the Words tab so you can inspect every word before saving.</p>
                    <Textarea value={aiRequest} onChange={(e) => setAiRequest(e.target.value)} rows={4} placeholder="Minimal Rust-like keywords, braces instead of end, // comments" className="bg-background" />
                    <button onClick={askAi} disabled={aiBusy || !aiRequest.trim()} className="btn-ink !h-10 disabled:opacity-50">
                      {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Draft proposal
                    </button>
                  </TabsContent>

                  <TabsContent value="about" className="mt-5 space-y-4 max-w-md">
                    <div><Label>Display name</Label><Input className="mt-1 bg-background" value={draft.meta.name} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, name: e.target.value } })} /></div>
                    <div><Label>Slug</Label><Input className="mt-1 font-mono bg-background" value={draft.meta.slug} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, slug: e.target.value } })} /></div>
                    <div><Label>Version</Label><Input className="mt-1 font-mono bg-background" value={draft.meta.version} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, version: e.target.value } })} /></div>
                    <div><Label>Languages (comma separated)</Label><Input className="mt-1 bg-background" value={draft.meta.languages.join(', ')} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} /></div>
                    <div><Label>Description</Label><Textarea className="mt-1 bg-background" value={draft.meta.description ?? ''} rows={3} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, description: e.target.value } })} /></div>
                    <div>
                      <Label>Visibility</Label>
                      <Select value={draft.meta.visibility} onValueChange={(v) => setDraft({ ...draft, meta: { ...draft.meta, visibility: v as DialectSpec['meta']['visibility'] } })}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="unlisted">Unlisted (share code only)</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <aside className="lg:sticky lg:top-24 self-start">
                <div className="ink overflow-hidden rounded-2xl border border-border">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewTab('sample')}
                        className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${previewTab === 'sample' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        Sample
                      </button>
                      <button
                        onClick={() => setPreviewTab('source')}
                        className={`rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wider ${previewTab === 'source' ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        .dialect.sdev
                      </button>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => navigator.clipboard.writeText(previewTab === 'sample' ? preview : dialectFileSource).then(() => toast.success('Copied'))}
                        aria-label="Copy preview"
                        className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          save(draft);
                          activate(draft.meta.slug);
                          openInIde(preview, `sample-${draft.meta.slug}`, navigate);
                        }}
                        className="inline-flex h-7 items-center gap-1 rounded bg-[hsl(var(--lime))] px-2.5 text-[11px] font-semibold text-[hsl(var(--ink))]"
                      >
                        <ExternalLink className="h-3 w-3" /> Try in IDE
                      </button>
                    </div>
                  </div>
                  <div className="max-h-[68vh] overflow-auto p-4">
                    <SdevCode
                      code={previewTab === 'sample' ? preview : dialectFileSource}
                      extraKeywords={draftKeywords}
                      numbered
                    />
                  </div>
                </div>
              </aside>
            </div>
          </section>
        )}

        {!draft && editingSlug === null && dialects.length > 0 && (
          <p className="text-sm text-muted-foreground">Select <strong className="text-foreground">Edit</strong> on any dialect card above to open the workbench.</p>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
