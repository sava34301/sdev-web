/**
 * The Create Dialect form: name it, give it a web address, say which
 * languages it speaks, pick who can see it, and optionally start from a
 * dialect that already exists.
 */
import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus } from 'lucide-react';
import type { DialectSpec } from '@/lang/dialect/spec';
import { presetList } from '@/lang/dialect/presets';

export interface CreateDialectValues {
  name: string;
  slug: string;
  description: string;
  languages: string[];
  visibility: DialectSpec['meta']['visibility'];
  base: DialectSpec | null;
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingSlugs: string[];
  /** Dialects already installed here, offered as a starting point. */
  installed: DialectSpec[];
  onCreate: (values: CreateDialectValues) => Promise<void> | void;
}

export function CreateDialectDialog({ open, onOpenChange, existingSlugs, installed, onCreate }: Props) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [languages, setLanguages] = useState('en');
  const [visibility, setVisibility] = useState<DialectSpec['meta']['visibility']>('private');
  const [baseKey, setBaseKey] = useState('blank');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(''); setSlug(''); setSlugTouched(false); setDescription('');
    setLanguages('en'); setVisibility('private'); setBaseKey('blank'); setBusy(false);
  }, [open]);

  const bases = useMemo(() => {
    const fromPresets = presetList().map((p) => ({ key: `preset:${p.spec.meta.slug}`, label: `${p.spec.meta.name} (ready-made)`, spec: p.spec }));
    const mine = installed.map((d) => ({ key: `mine:${d.meta.slug}`, label: `${d.meta.name} (yours)`, spec: d }));
    return [...fromPresets, ...mine];
  }, [installed]);

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const taken = existingSlugs.includes(effectiveSlug);
  const valid = name.trim().length > 0 && /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(effectiveSlug) && !taken;

  const submit = async () => {
    if (!valid) return;
    setBusy(true);
    try {
      await onCreate({
        name: name.trim(),
        slug: effectiveSlug,
        description: description.trim(),
        languages: languages.split(',').map((l) => l.trim()).filter(Boolean),
        visibility,
        base: bases.find((b) => b.key === baseKey)?.spec ?? null,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a dialect</DialogTitle>
          <DialogDescription>Your own version of sdev — your words, your style, saved to your account.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="dialect-name">Name</Label>
            <Input id="dialect-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Сдев, Pirate sdev, Team sdev…" autoFocus />
          </div>
          <div>
            <Label htmlFor="dialect-slug">Short address</Label>
            <Input
              id="dialect-slug"
              value={effectiveSlug}
              onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }}
              placeholder="my-sdev"
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              {taken ? 'You already have a dialect with this address.' : 'Used when you share it: @you/' + (effectiveSlug || 'my-sdev')}
            </p>
          </div>
          <div>
            <Label htmlFor="dialect-about">What it is for</Label>
            <Textarea id="dialect-about" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="sdev in Bulgarian, for my students." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="dialect-langs">Languages</Label>
              <Input id="dialect-langs" value={languages} onChange={(e) => setLanguages(e.target.value)} className="font-mono text-xs" placeholder="bg, en" />
            </div>
            <div>
              <Label>Who can see it</Label>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as DialectSpec['meta']['visibility'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Only me</SelectItem>
                  <SelectItem value="unlisted">Anyone with the link</SelectItem>
                  <SelectItem value="public">Everyone</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Start from</Label>
            <Select value={baseKey} onValueChange={setBaseKey}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="blank">Plain sdev words</SelectItem>
                {bases.map((b) => <SelectItem key={b.key} value={b.key}>{b.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!valid || busy}>
            {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
