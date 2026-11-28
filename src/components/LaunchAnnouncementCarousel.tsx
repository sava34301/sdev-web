import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowRight, ArrowLeft, Rocket, Sparkles, Code2, Cpu, Globe2, PartyPopper, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SdevCode } from '@/components/home/SdevCode';

const STORAGE_KEY = 'sdev-launch-carousel-seen-v1';

type Slide = {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
};

const SLIDES: Slide[] = [
  {
    icon: Rocket,
    eyebrow: 'July 12, 2026',
    title: 'sdev is here.',
    body: (
      <p>
        A self-hosting programming language. Runs in your browser in a full IDE with nothing to install — and compiles to native x86-64.
      </p>
    ),
  },
  {
    icon: Sparkles,
    eyebrow: 'Why sdev exists',
    title: 'Code that reads out loud.',
    body: (
      <>
        <p className="mb-4 text-sm text-muted-foreground">
          Every popular language was designed for people who already program. sdev reads like plain speech.
        </p>
        <div className="ink rounded-xl border border-border text-left">
          <SdevCode code={`set greeting to "hello, world"\nsay greeting\n\nfor each n in [1, 2, 3]\n  say n * 10\nend`} className="p-4 text-xs" />
        </div>
      </>
    ),
  },
  {
    icon: Code2,
    eyebrow: 'What shipped',
    title: 'Not a toy. A complete toolchain.',
    body: (
      <ul className="text-left text-sm space-y-2 max-w-md mx-auto">
        <li>• Stack-based WebAssembly VM + zero-libc native x86-64 ELF &amp; PE</li>
        <li>• Browser IDE with time-travel debugger, canvas &amp; web preview</li>
        <li>• 26 human-language keyword tables + deterministic personal dialects</li>
        <li>• Syntax-free code understander + local WebGPU brain</li>
      </ul>
    ),
  },
  {
    icon: Cpu,
    eyebrow: 'Self-hosting proof',
    title: 'The compiler compiles itself.',
    body: (
      <>
        <p className="mb-4 text-sm text-muted-foreground">
          The lexer, parser and code generator are written in sdev and rebuild themselves <strong className="text-foreground">byte-identically</strong>.
        </p>
        <div className="ink rounded-xl border border-border p-4 text-left font-mono text-xs space-y-1">
          <p className="text-[hsl(var(--lime))]">✓ lang/compiler/lexer.sdev   byte-identical</p>
          <p className="text-[hsl(var(--lime))]">✓ lang/compiler/parser.sdev  byte-identical</p>
          <p className="text-[hsl(var(--lime))]">✓ lang/compiler/codegen.sdev byte-identical</p>
        </div>
      </>
    ),
  },
  {
    icon: Globe2,
    eyebrow: 'Everywhere',
    title: 'Browser, CLI, VS Code, Hardware.',
    body: (
      <ul className="text-left text-sm space-y-2 max-w-md mx-auto">
        <li>• Single version across Web IDE, CLI, VS Code &amp; desktop</li>
        <li>• Arduino &amp; ESP32 hardware boards alongside sdev</li>
        <li>• Causal AI &amp; ML standard libraries in pure sdev</li>
      </ul>
    ),
  },
  {
    icon: PartyPopper,
    eyebrow: 'Community',
    title: 'Share programs in one click.',
    body: (
      <p className="text-sm text-muted-foreground">
        Publish dialects, libraries, extensions, and runnable programs on the Community Explore page.
      </p>
    ),
  },
];

export function LaunchAnnouncementCarousel() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const id = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(id);
    }
  }, []);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
  };

  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-card border-border rounded-2xl">
        <button
          onClick={close}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-6 sm:px-10 pt-10 pb-6 text-center min-h-[380px] flex flex-col">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3.5 w-3.5 text-primary" /> {slide.eyebrow}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground mb-5">
            {slide.title}
          </h2>
          <div className="flex-1 text-base text-foreground/90 max-w-lg mx-auto">
            {slide.body}
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-6">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-6 bg-foreground' : 'w-1.5 bg-foreground/20 hover:bg-foreground/40'}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border bg-muted/40 px-6 py-4">
          <button
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="btn-line !h-9 !px-3.5 !text-xs disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>

          {last ? (
            <div className="flex gap-2">
              <button onClick={close} className="btn-line !h-9 !px-4 !text-xs">Close</button>
              <button
                onClick={() => { close(); navigate('/ide'); }}
                className="btn-ink !h-9 !px-4 !text-xs"
              >
                Open the IDE <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={() => setI((v) => Math.min(SLIDES.length - 1, v + 1))} className="btn-ink !h-9 !px-4 !text-xs">
              Next <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
