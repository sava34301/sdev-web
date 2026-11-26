import { SdevCode } from './SdevCode';

const CODE = `// main.sdev — runs in your browser
conjure greet(who) ::
  yield "Hello, " + who + "!"
;;

forge team be ["Ada", "Linus", "Grace"]
iterate name through team ::
  speak(greet(name))
;;`;

const FILES = ['main.sdev', 'graphics.sdev', 'oop.sdev', 'algorithms.sdev', 'sdev-website.sdev'];

/** Architectural 3D moment: a real-looking IDE frame that tilts flat as --hero-p goes 0 → 1. */
export function HeroFrame() {
  return (
    <div className="relative [perspective:1800px]" data-testid="hero-ide-frame">
      <div
        className="ink relative mx-auto overflow-hidden rounded-xl border border-border shadow-[0_60px_120px_-40px_rgba(20,23,28,0.55)] will-change-transform"
        style={{
          transformOrigin: '50% 0%',
          transform: 'rotateX(calc((1 - var(--hero-p, 0)) * 26deg)) scale(calc(0.9 + var(--hero-p, 0) * 0.1)) translateY(calc((1 - var(--hero-p, 0)) * -24px))',
        }}
      >
        <div className="flex h-9 items-center gap-3 border-b border-border px-4">
          <span className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-foreground/20" /><i className="h-2.5 w-2.5 rounded-full bg-foreground/20" /><i className="h-2.5 w-2.5 rounded-full bg-foreground/20" /></span>
          <span className="font-mono text-[11px] text-muted-foreground">sdev IDE — workspace</span>
          <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 rounded bg-[hsl(var(--lime))] px-2 py-0.5 font-mono text-[10px] font-semibold text-[hsl(var(--ink))]">▶ Run</span>
        </div>
        <div className="grid grid-cols-12 text-left">
          <aside className="col-span-3 hidden md:block border-r border-border p-3">
            <p className="label mb-3 !text-[10px]">Explorer</p>
            {FILES.map((f, i) => (
              <p key={f} className={`mb-0.5 rounded px-2 py-1 font-mono text-[12px] ${i === 0 ? 'bg-foreground/[0.07] text-foreground' : 'text-muted-foreground'}`}>{f}</p>
            ))}
          </aside>
          <div className="col-span-12 md:col-span-6 border-r border-border">
            <div className="flex border-b border-border"><span className="border-b-2 border-[hsl(var(--lime))] px-4 py-2 font-mono text-[11px]">main.sdev</span></div>
            <SdevCode code={CODE} numbered className="p-4" />
          </div>
          <div className="col-span-12 md:col-span-3 p-4">
            <p className="label mb-3 !text-[10px]">Output</p>
            {['Hello, Ada!', 'Hello, Linus!', 'Hello, Grace!'].map((l, i) => (
              <p key={l} className="font-mono text-[12px] text-foreground/90" style={{ opacity: 'clamp(0, calc(var(--hero-p, 0) * 3 - ' + i * 0.5 + '), 1)' }}>› {l}</p>
            ))}
            <p className="mt-6 font-mono text-[11px] text-[hsl(var(--lime))]">✓ ran in 0.4 ms</p>
          </div>
        </div>
        <div className="flex h-6 items-center gap-4 border-t border-border bg-foreground/[0.03] px-3 font-mono text-[10px] text-muted-foreground">
          <span>● Ready</span><span>Interpreter</span><span className="ml-auto">UTF-8</span><span>sdev</span>
        </div>
      </div>
    </div>
  );
}
