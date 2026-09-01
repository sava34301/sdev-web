import { useMemo } from 'react';
import { FileText, Cloud, CloudOff } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useDialects } from '@/hooks/useDialects';
import { cachedLibraries } from '@/lang/dialect/registry';
import { checksum, readSignature, stripSignature } from '@/lang/dialect/signature';

interface Props {
  fileName?: string;
  /** editor buffer (signature already stripped) */
  content: string;
  cloudId?: string | null;
  runtime: string;
}

/** Library pins the open file actually imports: `use "@user/lib@1.0.0"`. */
function scanPins(source: string): string[] {
  const found = new Set<string>();
  const re = /use\s+"(@[^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) found.add(m[1]);
  return [...found];
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-mono break-all">{children}</span>
    </div>
  );
}

/**
 * Status-bar control that decodes the hidden file signature: which runtime,
 * dialect and libraries the open file is written against, plus the checksum
 * the IDE stamps on save.
 */
export function FileInfoPopover({ fileName, content, cloudId, runtime }: Props) {
  const { active } = useDialects();

  const info = useMemo(() => {
    const body = stripSignature(content);
    const existing = readSignature(content);
    const pins = scanPins(body);
    const cached = cachedLibraries();
    const resolved = pins.map((p) => {
      const addr = p.split('@').length > 2 ? p.slice(0, p.lastIndexOf('@')) : p;
      const bundle = cached.find((b) => b.address === addr);
      return bundle ? `${bundle.address}@${bundle.version}` : p;
    });
    return {
      sum: checksum(body),
      existing,
      pins: resolved,
      bytes: new TextEncoder().encode(body).length,
      lines: body ? body.split('\n').length : 0,
      stale: existing?.sum ? existing.sum !== checksum(body) : false,
    };
  }, [content]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="ide-status-seg" aria-label="File information">
          <FileText className="w-3 h-3 ide-status-accent" /> Info
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 space-y-3">
        <div>
          <p className="text-xs font-medium mb-0.5">File signature</p>
          <p className="text-[11px] text-muted-foreground">
            Hidden metadata written into {fileName ?? 'this file'} on save and export.
          </p>
        </div>

        <div className="space-y-1.5">
          <Row label="Name">{fileName ?? '—'}</Row>
          <Row label="Runtime">{runtime}</Row>
          <Row label="Dialect">
            {active ? `${active.meta.slug} v${active.meta.version}` : 'canonical sdev'}
          </Row>
          <Row label="Checksum">{info.sum}</Row>
          <Row label="Size">{info.lines} lines · {info.bytes} bytes</Row>
          <Row label="Last stamp">
            {info.existing?.ts ? new Date(info.existing.ts).toLocaleString() : 'on next save'}
          </Row>
          {info.existing?.origin && <Row label="Translated from">{info.existing.origin}</Row>}
          <Row label="Signature">
            {info.stale ? (
              <Badge variant="destructive" className="text-[10px]">stale — repaired on save</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">valid</Badge>
            )}
          </Row>
          <Row label="Cloud">
            <span className="inline-flex items-center gap-1">
              {cloudId
                ? <><Cloud className="w-3 h-3" /> synced</>
                : <><CloudOff className="w-3 h-3" /> local only</>}
            </span>
          </Row>
        </div>

        <div>
          <p className="text-xs font-medium mb-1">Library pins</p>
          {info.pins.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">None — this file imports no registry libraries.</p>
          ) : (
            <ul className="space-y-1">
              {info.pins.map((p) => (
                <li key={p} className="font-mono text-[11px]">{p}</li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
