import { useEffect, useState } from 'react';
import type { UiState, UiNode } from '@/lang/stdlib/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Monitor } from 'lucide-react';

interface AppPreviewProps {
  state: UiState | null;
  invokeHandler: (handlerId: number, args?: unknown[]) => void;
  setValue: (key: string, value: unknown) => void;
}

export function AppPreviewPanel({ state, invokeHandler, setValue }: AppPreviewProps) {
  // force re-render when the underlying maps mutate (sdev mutates in place)
  const [, force] = useState(0);
  useEffect(() => { force(v => v + 1); }, [state]);

  if (!state || state.rootId === null) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 p-6">
        <Monitor className="w-10 h-10 opacity-30" />
        <div className="text-sm">No app yet</div>
        <div className="text-xs opacity-60 text-center max-w-xs">
          Call <code className="font-mono text-primary">window("My App")</code> in your code to start building a UI.
        </div>
      </div>
    );
  }

  const root = state.nodes.get(state.rootId);
  if (!root || root.type !== 'window') return null;
  const rootProps = root.props as { title: string; width: number; height: number };

  return (
    <div className="h-full overflow-auto bg-muted/10 p-4 flex items-start justify-center">
      <Card
        className="overflow-hidden border border-border/60 shadow-2xl bg-background"
        style={{ width: rootProps.width, maxWidth: '100%' }}
      >
        {/* Title bar */}
        <div className="bg-gradient-to-r from-neon-cyan/10 to-neon-violet/10 border-b border-border/40 px-3 py-2 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
          <span className="ml-2 text-xs font-mono text-muted-foreground">{rootProps.title}</span>
        </div>
        {/* Body */}
        <div
          className="p-4 overflow-auto"
          style={{ height: rootProps.height }}
        >
          <NodeChildren node={root} state={state} invokeHandler={invokeHandler} setValue={setValue} />
        </div>
      </Card>
    </div>
  );
}

function NodeChildren({ node, ...rest }: { node: UiNode; state: UiState; invokeHandler: (id: number, args?: unknown[]) => void; setValue: (k: string, v: unknown) => void }) {
  return (
    <>
      {node.children.map(cid => {
        const c = rest.state.nodes.get(cid);
        if (!c) return null;
        return <NodeView key={cid} node={c} {...rest} />;
      })}
    </>
  );
}

function NodeView({ node, state, invokeHandler, setValue }: { node: UiNode; state: UiState; invokeHandler: (id: number, args?: unknown[]) => void; setValue: (k: string, v: unknown) => void }) {
  const props = node.props as Record<string, unknown>;
  const recurse = <NodeChildren node={node} state={state} invokeHandler={invokeHandler} setValue={setValue} />;
  const bind = props.bind as string | undefined;
  const v = bind ? state.values.get(bind) : undefined;

  switch (node.type) {
    case 'row':
      return <div className="flex flex-row items-center gap-2 my-1.5 flex-wrap" style={{ gap: (props.gap as number) || 8 }}>{recurse}</div>;
    case 'column':
      return <div className="flex flex-col gap-2 my-1.5" style={{ gap: (props.gap as number) || 8 }}>{recurse}</div>;
    case 'group':
      return (
        <fieldset className="border border-border/40 rounded-md p-3 my-2">
          {props.title ? <legend className="px-2 text-xs text-muted-foreground">{String(props.title)}</legend> : null}
          {recurse}
        </fieldset>
      );
    case 'tabs': {
      const tabNodes = node.children.map(id => state.nodes.get(id)).filter((n): n is UiNode => !!n && n.type === 'tab');
      if (tabNodes.length === 0) return null;
      const first = String(tabNodes[0].props.title ?? 'Tab');
      return (
        <Tabs defaultValue={first} className="w-full my-2">
          <TabsList>
            {tabNodes.map(t => <TabsTrigger key={t.id} value={String(t.props.title ?? 'Tab')}>{String(t.props.title ?? 'Tab')}</TabsTrigger>)}
          </TabsList>
          {tabNodes.map(t => (
            <TabsContent key={t.id} value={String(t.props.title ?? 'Tab')}>
              <NodeChildren node={t} state={state} invokeHandler={invokeHandler} setValue={setValue} />
            </TabsContent>
          ))}
        </Tabs>
      );
    }
    case 'tab': return null; // handled by tabs
    case 'heading': {
      const lvl = Math.max(1, Math.min(4, (props.level as number) || 1));
      const sizes = ['text-2xl', 'text-xl', 'text-lg', 'text-base'];
      const Tag = (`h${lvl}`) as 'h1';
      const txt = props.bind ? String(state.values.get(String(props.bind)) ?? '') : String(props.text ?? '');
      return <Tag className={`font-semibold tracking-tight my-2 ${sizes[lvl - 1]}`}>{txt}</Tag>;
    }
    case 'label': {
      const txt = props.bind ? String(state.values.get(String(props.bind)) ?? '') : String(props.text ?? '');
      return <div className="text-sm">{txt}</div>;
    }
    case 'paragraph': {
      const txt = props.bind ? String(state.values.get(String(props.bind)) ?? '') : String(props.text ?? '');
      return <p className="text-sm text-muted-foreground my-1 leading-relaxed">{txt}</p>;
    }
    case 'divider':
      return <hr className="my-3 border-border/40" />;
    case 'spacer':
      return <div style={{ height: (props.size as number) || 8 }} />;
    case 'image': {
      const w = (props.width as number) || undefined;
      const h = (props.height as number) || undefined;
      return <img src={String(props.src ?? '')} alt={String(props.alt ?? '')} style={{ width: w, height: h }} className="rounded-md my-1" />;
    }
    case 'progress': {
      const raw = props.bind ? Number(state.values.get(String(props.bind))) : (props.value as number);
      const val = Number.isFinite(raw) ? raw : 0;
      const max = (props.max as number) || 1;
      return <Progress value={Math.max(0, Math.min(100, (val / max) * 100))} className="my-2" />;
    }
    case 'button': {
      const variant = (props.variant as string) || 'default';
      const validVariants = ['default', 'secondary', 'outline', 'ghost', 'destructive'];
      const v = validVariants.includes(variant) ? variant as 'default' : 'default';
      const handlerId = node.handlers.click;
      return (
        <Button
          size="sm"
          variant={v as 'default'}
          className="my-1"
          onClick={() => { if (handlerId !== undefined) invokeHandler(handlerId); }}
        >
          {String(props.label ?? 'Button')}
        </Button>
      );
    }
    case 'input': {
      return (
        <Input
          className="my-1"
          placeholder={String(props.placeholder ?? '')}
          value={String(v ?? '')}
          onChange={(e) => bind && setValue(bind, e.target.value)}
        />
      );
    }
    case 'textarea': {
      return (
        <Textarea
          className="my-1"
          placeholder={String(props.placeholder ?? '')}
          rows={(props.rows as number) || 4}
          value={String(v ?? '')}
          onChange={(e) => bind && setValue(bind, e.target.value)}
        />
      );
    }
    case 'checkbox': {
      return (
        <label className="flex items-center gap-2 my-1 text-sm cursor-pointer">
          <Checkbox checked={!!v} onCheckedChange={(checked) => bind && setValue(bind, !!checked)} />
          <span>{String(props.label ?? '')}</span>
        </label>
      );
    }
    case 'slider': {
      const val = typeof v === 'number' ? v : (props.min as number) || 0;
      return (
        <div className="my-2">
          <Slider
            value={[val]}
            min={(props.min as number) || 0}
            max={(props.max as number) || 100}
            step={(props.step as number) || 1}
            onValueChange={(arr) => bind && setValue(bind, arr[0])}
          />
          <div className="text-xs text-muted-foreground mt-1 font-mono">{val}</div>
        </div>
      );
    }
    case 'select': {
      const opts = (props.options as string[]) || [];
      return (
        <Select value={String(v ?? '')} onValueChange={(val) => bind && setValue(bind, val)}>
          <SelectTrigger className="my-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            {opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    case 'table': {
      const headers = (props.headers as string[]) || [];
      const rows = (props.rows as string[][]) || [];
      return (
        <Table className="my-2">
          <TableHeader>
            <TableRow>{headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>{r.map((c, j) => <TableCell key={j}>{c}</TableCell>)}</TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
    case 'menu': {
      const items = node.children.map(id => state.nodes.get(id)).filter((n): n is UiNode => !!n && n.type === 'menuitem');
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" className="my-1">{String(props.label ?? 'Menu')}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {items.map(it => (
              <DropdownMenuItem key={it.id} onClick={() => { const h = it.handlers.click; if (h !== undefined) invokeHandler(h); }}>
                {String(it.props.label ?? 'Item')}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }
    default:
      return null;
  }
}
