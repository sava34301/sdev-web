import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowRightLeft, Blocks, BookOpen, Check, Download, ExternalLink, Languages, Package, Trash2 } from 'lucide-react';
import { useDialects } from '@/hooks/useDialects';
import { cachedLibraries, fetchLibrary, forgetBundle, type LibraryBundle } from '@/lang/dialect/registry';
import { parseAddress } from '@/lang/dialect/address';
import { translateDialect } from '@/lang/dialect/canonicalize';
import { generateDialectDocs } from '@/lang/dialect/docs';
import type { DialectSpec } from '@/lang/dialect/spec';

interface Props {
  /** current editor content, so the panel can translate it in place */
  content?: string;
  onReplaceContent?: (next: string) => void;
}

/**
 * "Personal sdev" — the IDE-side home for your dialect, your libraries and
 * your extensions. Everything here also has a full page; this panel keeps the
 * day-to-day actions one click from the editor.
 */
export function PersonalPanel({ content, onReplaceContent }: Props) {
  const { dialects, activeSlug, activate, install } = useDialects();
  const [reference, setReference] = useState('');
  const [libRef, setLibRef] = useState('');
  const [libs, setLibs] = useState<LibraryBundle[]>(() => cachedLibraries());
  const [busy, setBusy] = useState(false);

  const active = useMemo(() => dialects.find((d) => d.meta.slug === activeSlug) ?? null, [dialects, activeSlug]);

  const installDialect = async () => {
    if (!reference.trim()) return;
    setBusy(true);
    try {
      const spec = await install(reference.trim());
      toast.success(`Installed ${spec.meta.name}`);
      setReference('');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not install that dialect');
    } finally { setBusy(false); }
  };

  const installLibrary = async () => {
    const address = parseAddress(libRef.trim());
    if (!address) { toast.error('Use @username/library'); return; }
    setBusy(true);
    try {
      const bundle = await fetchLibrary(address);
      setLibs(cachedLibraries());
      setLibRef('');
      toast.success(`Installed ${bundle.address}@${bundle.version}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not install that library');
    } finally { setBusy(false); }
  };

  const translateTo = (target: DialectSpec | null) => {
    if (!content || !onReplaceContent) return;
    const from = active;
    if (!from && !target) return;
    const canonical: DialectSpec | null = null;
    const next = from && target
      ? translateDialect(content, from, target)
      : from
        ? translateDialect(content, from, from) && translateDialect(content, from, from)
        : content;
    void canonical;
    onReplaceContent(next);
    toast.success(target ? `Rewritten in ${target.meta.name}` : 'Rewritten in canonical sdev');
  };

  const downloadDocs = () => {
    if (!active) return;
    const blob = new Blob([generateDialectDocs(active)], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${active.meta.slug}.documentation.md`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto text-xs">
      <div className="px-3 py-2 flex items-center justify-between border-b border-border/40">
        <span className="uppercase tracking-wider text-[10px] text-muted-foreground">Personal sdev</span>
        <Link to="/dialects" className="text-muted-foreground hover:text-foreground" aria-label="Open Dialect Studio">
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Dialects ------------------------------------------------------- */}
      <section className="p-3 space-y-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-muted-foreground"><Languages className="h-3.5 w-3.5" /> Dialects</div>

        <button
          onClick={() => activate(null)}
          className={`w-full text-left rounded px-2 py-1.5 hover:bg-muted/60 flex items-center justify-between ${!activeSlug ? 'bg-muted/70' : ''}`}
        >
          <span>Canonical sdev</span>
          {!activeSlug && <Check className="h-3.5 w-3.5 text-primary" />}
        </button>

        {dialects.map((d) => (
          <div key={d.meta.slug} className="flex items-center gap-1">
            <button
              onClick={() => activate(d.meta.slug)}
              className={`flex-1 text-left rounded px-2 py-1.5 hover:bg-muted/60 flex items-center justify-between ${activeSlug === d.meta.slug ? 'bg-muted/70' : ''}`}
            >
              <span className="truncate">{d.meta.name}</span>
              <Badge variant="outline" className="ml-1 font-mono text-[10px]">v{d.meta.version}</Badge>
            </button>
            {activeSlug === d.meta.slug && content && onReplaceContent && (
              <Button size="icon" variant="ghost" className="h-7 w-7" title="Rewrite this file in canonical sdev" onClick={() => translateTo(null)}>
                <ArrowRightLeft className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}

        <div className="flex gap-1.5 pt-1">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="@user/dialect" className="h-7 text-xs font-mono" />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={installDialect} disabled={busy}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex gap-1.5">
          <Button asChild size="sm" variant="outline" className="h-7 flex-1 text-xs"><Link to="/dialects">Studio</Link></Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={downloadDocs} disabled={!active}>
            <BookOpen className="h-3.5 w-3.5 mr-1" />Docs
          </Button>
        </div>
      </section>

      {/* Libraries ------------------------------------------------------ */}
      <section className="p-3 space-y-2 border-b border-border/40">
        <div className="flex items-center gap-1.5 text-muted-foreground"><Package className="h-3.5 w-3.5" /> Libraries</div>
        {libs.length === 0 && <p className="text-muted-foreground">None installed. Import with <code className="font-mono">use "@user/lib"</code>.</p>}
        {libs.map((b) => (
          <div key={b.address} className="flex items-center justify-between gap-1 rounded px-2 py-1.5 hover:bg-muted/60">
            <span className="font-mono truncate">{b.address}</span>
            <span className="flex items-center gap-1 shrink-0">
              <Badge variant="outline" className="font-mono text-[10px]">v{b.version}</Badge>
              <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={`Remove ${b.address}`} onClick={() => { forgetBundle(b.address); setLibs(cachedLibraries()); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </span>
          </div>
        ))}
        <div className="flex gap-1.5 pt-1">
          <Input value={libRef} onChange={(e) => setLibRef(e.target.value)} placeholder="@user/library" className="h-7 text-xs font-mono" />
          <Button size="sm" variant="outline" className="h-7 px-2" onClick={installLibrary} disabled={busy}>
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
        <Button asChild size="sm" variant="outline" className="h-7 w-full text-xs"><Link to="/libraries">Browse registry</Link></Button>
      </section>

      {/* Extensions ----------------------------------------------------- */}
      <section className="p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-muted-foreground"><Blocks className="h-3.5 w-3.5" /> Extensions</div>
        <p className="text-muted-foreground">New functions and operators, written in sdev — private, shared, or proposed for the core language.</p>
        <Button asChild size="sm" variant="outline" className="h-7 w-full text-xs"><Link to="/extensions">Manage extensions</Link></Button>
      </section>
    </div>
  );
}
