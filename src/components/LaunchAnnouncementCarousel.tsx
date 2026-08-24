import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowLeft, Rocket, Sparkles, Code2, Cpu, Globe2, PartyPopper, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
        A new programming language. Runs in your browser, in a full IDE, with no install — and its
        compiler is written in itself.
      </p>

    ),
  },
  {
    icon: Sparkles,
    eyebrow: 'Why sdev exists',
    title: 'Code that reads out loud.',
    body: (
      <>
        <p className="mb-3 text-sm text-muted-foreground">
          Every popular language was designed for people who already program. sdev isn't.
        </p>
        <pre className="text-left text-xs sm:text-sm bg-muted/50 border border-border/50 rounded-lg p-4 overflow-x-auto font-mono">
{`set greeting to "hello, world"
say greeting

for each n in [1, 2, 3]
  say n * 10
end`}
        </pre>
      </>
    ),
  },
  {
    icon: Code2,
    eyebrow: 'What shipped day one',
    title: 'Not a toy. A real language.',
    body: (
      <ul className="text-left text-sm space-y-2 max-w-md mx-auto">
        <li>• Bytecode VM with a documented opcode set</li>
        <li>• Virtual kernel, syscalls, mark-and-sweep GC</li>
        <li>• Browser IDE — debugger, terminal, canvas + web preview</li>
        <li>• Web DSL: a full page in 6 lines. Leaflet map in 2.</li>
        <li>• Decentralized packages via <code className="text-brand-cyan">summon "gist-url"</code></li>
        <li>• 26-language keyword translator</li>
      </ul>
    ),
  },
  {
    icon: Cpu,
    eyebrow: 'The flex',
    title: 'The compiler compiles itself.',
    body: (
      <>
        <p className="mb-3">
          sdev's v2 compiler is written in sdev. Lexer and parser round-trip{' '}
          <span className="text-brand-cyan font-semibold">byte-identically</span> through a hand-written
          WebAssembly seed.
        </p>
        <pre className="text-left text-xs bg-muted/50 border border-border/50 rounded-lg p-3 font-mono">
{`✓ lang/compiler/lexer.sdev   byte-identical
✓ lang/compiler/parser.sdev  byte-identical`}
        </pre>
      </>
    ),
  },
  {
    icon: Globe2,
    eyebrow: "What's next",
    title: 'This is day one.',
    body: (
      <ul className="text-left text-sm space-y-2 max-w-md mx-auto">
        <li>• Milestone 5n — widen the seed VM for full self-hosting</li>
        <li>• Delete the JS bootstrap entirely</li>
        <li>• Native x64 codegen (already scaffolded)</li>
        <li>• Hardware DSL for Arduino / ESP32</li>
      </ul>
    ),
  },
  {
    icon: PartyPopper,
    eyebrow: 'Launch contest — 48 hours',
    title: 'Build something. Get in the README.',
    body: (
      <p>
        Publish anything you make as a public Gist and tag it{' '}
        <code className="text-brand-cyan">sdev-launch-2026</code>. Best submission gets named in the
        README and a lifetime pro tier once we ship one.
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
      // Small delay so the page paints first.
      const id = window.setTimeout(() => setOpen(true), 600);
      return () => window.clearTimeout(id);
    }
  }, []);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(STORAGE_KEY, '1');
    } catch {}
  };

  const slide = SLIDES[i];
  const Icon = slide.icon;
  const last = i === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card/95 backdrop-blur border-border/60">
        <button
          onClick={close}
          className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative px-6 sm:px-10 pt-10 pb-6 text-center min-h-[420px] flex flex-col">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border/50 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5" /> {slide.eyebrow}
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent mb-5">
            {slide.title}
          </h2>
          <div className="flex-1 text-base text-foreground/90 max-w-lg mx-auto">
            {slide.body}
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setI(idx)}
                aria-label={`Slide ${idx + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  idx === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/50 bg-muted/20 px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setI((v) => Math.max(0, v - 1))}
            disabled={i === 0}
            className="gap-1"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>

          {last ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={close}>
                Maybe later
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  close();
                  navigate('/ide');
                }}
                className="gap-1"
              >
                Open the IDE <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setI((v) => Math.min(SLIDES.length - 1, v + 1))} className="gap-1">
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
