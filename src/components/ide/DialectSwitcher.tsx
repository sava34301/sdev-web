import { useState } from 'react';
import { Languages } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useDialects } from '@/hooks/useDialects';

/** Status-bar control: pick the dialect this workspace reads and writes. */
export function DialectSwitcher() {
  const { dialects, active, activeSlug, activate, install } = useDialects();
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchOne = async () => {
    setBusy(true);
    try {
      const spec = await install(reference);
      activate(spec.meta.slug);
      setReference('');
      toast.success(`Now writing in ${spec.meta.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not fetch that dialect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ide-status-seg" aria-label="Change dialect">
          <Languages className="w-3 h-3 ide-status-accent" /> {active ? active.meta.name : 'sdev'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-3 space-y-3">
        <div>
          <p className="text-xs font-medium mb-1.5">Dialect</p>
          <div className="space-y-1">
            <button
              className={`w-full text-left text-xs px-2 py-1.5 rounded ${!activeSlug ? 'bg-secondary' : 'hover:bg-muted'}`}
              onClick={() => activate(null)}
            >
              sdev (canonical)
            </button>
            {dialects.map((d) => (
              <button
                key={d.meta.slug}
                className={`w-full text-left text-xs px-2 py-1.5 rounded ${activeSlug === d.meta.slug ? 'bg-secondary' : 'hover:bg-muted'}`}
                onClick={() => activate(d.meta.slug)}
              >
                {d.meta.name} <span className="text-muted-foreground font-mono">{d.meta.slug}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium">Open someone else's</p>
          <div className="flex gap-1.5">
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="@user/dialect" className="h-8 text-xs font-mono" />
            <Button size="sm" className="h-8" onClick={fetchOne} disabled={busy || !reference.trim()}>Get</Button>
          </div>
        </div>
        <Link to="/dialects" className="block text-xs text-muted-foreground hover:text-foreground underline">Open Dialect Studio</Link>
      </PopoverContent>
    </Popover>
  );
}
