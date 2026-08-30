import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, BookOpen, Check, Download, Loader2, Plus, Share2, Sparkles, Trash2, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useDialects } from '@/hooks/useDialects';
import { CATALOG, GROUP_LABELS, type CatalogGroup } from '@/lang/dialect/catalog';
import { validateDialect, type DialectSpec } from '@/lang/dialect/spec';
import { dialectize } from '@/lang/dialect/canonicalize';
import { SAMPLE } from '@/lang/dialect/sample';
import { generateDialectDocs } from '@/lang/dialect/docs';

const GROUP_ORDER: CatalogGroup[] = ['core', 'control', 'functions', 'errors', 'objects', 'modules', 'literals', 'operators', 'builtins'];

export default function Dialects() {
  const { dialects, activeSlug, create, save, publish, remove, install, activate } = useDialects();
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [draft, setDraft] = useState<DialectSpec | null>(null);
  const [query, setQuery] = useState('');
  const [reference, setReference] = useState('');
  const [aiRequest, setAiRequest] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const issues = useMemo(() => (draft ? validateDialect(draft) : []), [draft]);
  const errors = issues.filter((i) => i.level === 'error');
  const preview = useMemo(() => (draft ? dialectize(SAMPLE, draft) : ''), [draft]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATALOG.filter((e) => !q || e.word.includes(q) || e.about.toLowerCase().includes(q) || (draft?.names[e.word] ?? '').toLowerCase().includes(q));
  }, [query, draft]);

  const openEditor = (spec: DialectSpec) => { setEditingSlug(spec.meta.slug); setDraft(structuredClone(spec)); };

  const handleCreate = () => {
    const name = prompt('Name your version of sdev', 'My sdev');
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'my-sdev';
    openEditor(create(name, slug));
  };

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    await save(draft);
    setSaving(false);
    toast.success('Dialect saved');
  };

  const handlePublish = async () => {
    if (!draft) return;
    try {
      const published = await publish(draft);
      setDraft(published);
      toast.success('Published — share it with @you/' + published.meta.slug);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not publish');
    }
  };

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
    const blob = new Blob([JSON.stringify(draft, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.meta.slug}.dialect.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** Living documentation: the core reference, rendered in this dialect's words. */
  const handleDocs = () => {
    if (!draft) return;
    const blob = new Blob([generateDialectDocs(draft)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${draft.meta.slug}.documentation.md`;
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-background">
      <SEO title="Dialect Studio — build your own sdev" description="Create a personal version of sdev: rename every keyword in any language, choose your own style, add your own functions and operators, then share it." path="/dialects" />

      <header className="border-b border-border/50">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/ide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to IDE
          </Link>
          <div className="flex items-center gap-2">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="@user/dialect or share code" className="h-9 w-56 font-mono text-xs" />
            <Button size="sm" variant="outline" onClick={handleInstall} disabled={!reference.trim()}>
              <Download className="h-4 w-4 mr-1.5" />Install
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Dialect Studio</h1>
        <p className="text-muted-foreground mb-8">Your own words, your own style, your own additions — compiled by the same sdev toolchain.</p>

        <section className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold tracking-tight">Your dialects</h2>
            <Button size="sm" onClick={handleCreate}><Plus className="h-4 w-4 mr-1.5" />New dialect</Button>
          </div>
          {dialects.length === 0 && <p className="text-sm text-muted-foreground">No dialects yet. Create one, or install someone else's.</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            {dialects.map((d) => (
              <Card key={d.meta.slug} className="p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {d.meta.name}{' '}
                    {activeSlug === d.meta.slug && <Badge variant="secondary" className="ml-1">active</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono truncate">{d.meta.slug} · v{d.meta.version} · {d.meta.visibility}</div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button size="sm" variant={activeSlug === d.meta.slug ? 'secondary' : 'outline'} onClick={() => activate(activeSlug === d.meta.slug ? null : d.meta.slug)}>
                    {activeSlug === d.meta.slug ? 'Deactivate' : 'Use'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEditor(d)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(d.meta.slug)} aria-label={`Delete ${d.meta.name}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {draft && (
          <section>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-xl font-semibold tracking-tight">Editing {draft.meta.name}</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDocs}><BookOpen className="h-4 w-4 mr-1.5" />Docs</Button>
                <Button size="sm" variant="outline" onClick={handleExport}><Share2 className="h-4 w-4 mr-1.5" />Export</Button>
                <Button size="sm" variant="outline" onClick={handlePublish} disabled={errors.length > 0}><Upload className="h-4 w-4 mr-1.5" />Publish</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}Save
                </Button>
              </div>
            </div>

            {errors.length > 0 && (
              <Card className="p-3 mb-4 border-destructive/50">
                <p className="text-sm font-medium text-destructive mb-1">{errors.length} problem{errors.length === 1 ? '' : 's'} to fix before publishing</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  {errors.slice(0, 8).map((i, n) => <li key={n}><span className="font-mono">{i.field}</span> — {i.message}</li>)}
                </ul>
              </Card>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Tabs defaultValue="words">
                <TabsList>
                  <TabsTrigger value="words">Words</TabsTrigger>
                  <TabsTrigger value="style">Style</TabsTrigger>
                  <TabsTrigger value="constructs">Additions</TabsTrigger>
                  <TabsTrigger value="assisted"><Sparkles className="h-3.5 w-3.5 mr-1.5" />Assisted</TabsTrigger>
                  <TabsTrigger value="about">About</TabsTrigger>
                </TabsList>

                <TabsContent value="words" className="mt-4">
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search commands…" className="mb-4" />
                  {GROUP_ORDER.map((group) => {
                    const rows = filtered.filter((e) => e.group === group);
                    if (!rows.length) return null;
                    return (
                      <div key={group} className="mb-6">
                        <h3 className="text-sm font-semibold mb-2">{GROUP_LABELS[group]}</h3>
                        <div className="space-y-1.5">
                          {rows.map((entry) => (
                            <div key={entry.word} className="grid grid-cols-[140px_1fr] gap-3 items-center">
                              <div className="min-w-0">
                                <div className="font-mono text-xs truncate">{entry.word}</div>
                                <div className="text-[11px] text-muted-foreground truncate">{entry.about}</div>
                              </div>
                              <Input
                                value={draft.names[entry.word] ?? ''}
                                onChange={(e) => setDraft({ ...draft, names: { ...draft.names, [entry.word]: e.target.value } })}
                                className="h-8 font-mono text-xs"
                                aria-label={`Word for ${entry.word}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>

                <TabsContent value="style" className="mt-4 space-y-4 max-w-md">
                  <div>
                    <Label>Block style</Label>
                    <Select value={draft.style.blockStyle} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, blockStyle: v as 'word' | 'braces' } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="word">Closing word (end)</SelectItem>
                        <SelectItem value="braces">Braces {'{ }'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Assignment form</Label>
                    <Select value={draft.style.assignment} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, assignment: v as DialectSpec['style']['assignment'] } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set-to">set x to 1</SelectItem>
                        <SelectItem value="equals">x = 1</SelectItem>
                        <SelectItem value="arrow">1 -&gt; x</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Comment marker</Label>
                    <Input value={draft.style.commentMarker} onChange={(e) => setDraft({ ...draft, style: { ...draft.style, commentMarker: e.target.value } })} className="font-mono" />
                  </div>
                  <div>
                    <Label>String quote</Label>
                    <Select value={draft.style.stringQuote} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, stringQuote: v as '"' | "'" } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={'"'}>Double quotes</SelectItem>
                        <SelectItem value={"'"}>Single quotes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Argument separator</Label>
                    <Select value={draft.style.argSeparator} onValueChange={(v) => setDraft({ ...draft, style: { ...draft.style, argSeparator: v as 'space' | 'comma' } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="space">Spaces</SelectItem>
                        <SelectItem value="comma">Commas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>

                <TabsContent value="constructs" className="mt-4 space-y-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">Functions you added</h3>
                      <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, constructs: { ...draft.constructs, functions: [...draft.constructs.functions, { name: 'twice', source: 'to twice with n\n  return n * 2\nend' }] } })}>
                        <Plus className="h-4 w-4 mr-1.5" />Add
                      </Button>
                    </div>
                    {draft.constructs.functions.length === 0 && <p className="text-xs text-muted-foreground">Write new sdev functions here — they ship with the dialect as a prelude.</p>}
                    <div className="space-y-3">
                      {draft.constructs.functions.map((fn, idx) => (
                        <Card key={idx} className="p-3 space-y-2">
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
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-semibold">Operators you added</h3>
                      <Button size="sm" variant="outline" onClick={() => setDraft({ ...draft, constructs: { ...draft.constructs, operators: [...draft.constructs.operators, { symbol: '<>', precedence: 5, fn: draft.constructs.functions[0]?.name ?? 'twice' }] } })}>
                        <Plus className="h-4 w-4 mr-1.5" />Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {draft.constructs.operators.map((op, idx) => (
                        <Card key={idx} className="p-3 flex gap-2 items-center">
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
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assisted" className="mt-4 space-y-3 max-w-xl">
                  <p className="text-sm text-muted-foreground">Describe the language you want. The proposal lands in the Words tab — nothing is saved until you say so.</p>
                  <Textarea value={aiRequest} onChange={(e) => setAiRequest(e.target.value)} rows={4} placeholder="Bulgarian keywords, braces instead of end, // comments" />
                  <Button onClick={askAi} disabled={aiBusy || !aiRequest.trim()}>
                    {aiBusy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}Draft it
                  </Button>
                </TabsContent>

                <TabsContent value="about" className="mt-4 space-y-4 max-w-md">
                  <div><Label>Display name</Label><Input value={draft.meta.name} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, name: e.target.value } })} /></div>
                  <div><Label>Slug</Label><Input value={draft.meta.slug} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, slug: e.target.value } })} className="font-mono" /></div>
                  <div><Label>Version</Label><Input value={draft.meta.version} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, version: e.target.value } })} className="font-mono" /></div>
                  <div><Label>Languages (comma separated)</Label><Input value={draft.meta.languages.join(', ')} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, languages: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })} /></div>
                  <div><Label>Description</Label><Textarea value={draft.meta.description ?? ''} rows={3} onChange={(e) => setDraft({ ...draft, meta: { ...draft.meta, description: e.target.value } })} /></div>
                  <div>
                    <Label>Visibility</Label>
                    <Select value={draft.meta.visibility} onValueChange={(v) => setDraft({ ...draft, meta: { ...draft.meta, visibility: v as DialectSpec['meta']['visibility'] } })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="unlisted">Unlisted (share code only)</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </TabsContent>
              </Tabs>

              <aside className="lg:sticky lg:top-6 self-start">
                <h3 className="text-sm font-semibold mb-2">Live preview</h3>
                <pre className="text-xs bg-muted/40 border border-border/50 rounded-lg p-3 overflow-x-auto max-h-[70vh]"><code>{preview}</code></pre>
              </aside>
            </div>
          </section>
        )}

        {!draft && editingSlug === null && dialects.length > 0 && (
          <p className="text-sm text-muted-foreground">Pick a dialect above to edit it.</p>
        )}
      </main>
    </div>
  );
}
