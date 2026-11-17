import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Trash2, Copy, Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface InviteCode {
  code: string;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  note: string | null;
  created_at: string;
  created_by: string;
}

function randomCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  // Cryptographically secure, unbiased: 16 chars from 31 symbols ≈ 79 bits.
  let out = '';
  const limit = 256 - (256 % chars.length);
  while (out.length < 16) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    for (const b of bytes) if (b < limit && out.length < 16) out += chars[b % chars.length];
  }
  return out;
}

export function AdminInviteCodes() {
  const { user } = useAuth();
  const [codes, setCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(randomCode());
  const [maxUses, setMaxUses] = useState('1');
  const [note, setNote] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    else setCodes((data as InviteCode[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!user) return;
    const trimmed = code.trim();
    if (!trimmed) return toast.error('Code required');
    const mu = Math.max(1, parseInt(maxUses) || 1);
    setCreating(true);
    const { error } = await supabase.from('invite_codes').insert({
      code: trimmed,
      max_uses: mu,
      note: note.trim() || null,
      created_by: user.id,
    });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Invite code created');
    setCode(randomCode());
    setNote('');
    load();
  };

  const remove = async (c: string) => {
    if (!confirm(`Delete code "${c}"?`)) return;
    const { error } = await supabase.from('invite_codes').delete().eq('code', c);
    if (error) return toast.error(error.message);
    setCodes(cs => cs.filter(x => x.code !== c));
    toast.success('Deleted');
  };

  const copy = (c: string) => {
    navigator.clipboard.writeText(c);
    toast.success('Copied');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">Invite codes (admin)</h2>

      <Card className="p-4 space-y-3 max-w-xl">
        <div className="font-medium text-sm">Create new code</div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <Label className="text-xs">Code</Label>
            <div className="flex gap-2">
              <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className="font-mono" />
              <Button type="button" variant="outline" onClick={() => setCode(randomCode())}>↻</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Max uses</Label>
            <Input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} />
          </div>
        </div>
        <div>
          <Label className="text-xs">Note (optional)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. for early beta testers" />
        </div>
        <Button onClick={create} disabled={creating} className="gap-2">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create code
        </Button>
      </Card>

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!loading && codes.length === 0 && <p className="text-sm text-muted-foreground">No invite codes yet.</p>}
        {codes.map(c => (
          <Card key={c.code} className="p-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-mono text-sm">{c.code}</div>
              <div className="text-xs text-muted-foreground">
                {c.uses} / {c.max_uses} used
                {c.note && ` · ${c.note}`}
                {' · '}
                {new Date(c.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => copy(c.code)} aria-label="Copy code"><Copy className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" onClick={() => remove(c.code)} aria-label="Delete code"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
