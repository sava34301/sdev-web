import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, BookOpen, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { SEO } from '@/components/SEO';
import { SiteNav } from '@/components/site/SiteNav';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SdevCode } from '@/components/home/SdevCode';
import { openInIde } from '@/components/home/engine';

const PATH = '/docs/self-hosting-design-guide';
const TITLE = 'Programming Language Design: Building a Self-Hosting Compiler — sdev';
const DESCRIPTION =
  'A technical guide to programming language design: how the sdev compiler is written in sdev, runs on a hand-written WebAssembly stack VM, and compiles itself to byte-identical bytecode.';

const SECTIONS = [
  { id: 'why', title: 'Why self-host a language' },
  { id: 'architecture', title: 'Compiler architecture' },
  { id: 'seed', title: 'The seed VM' },
  { id: 'bytecode', title: 'Reading real bytecode' },
  { id: 'growing', title: 'Growing the subset' },
  { id: 'fixed-point', title: 'The byte-identical fixed point' },
  { id: 'retiring', title: 'Retiring the bootstrap' },
  { id: 'rules', title: 'Design rules we learned' },
  { id: 'backends', title: 'Two backends, one language' },
  { id: 'tradeoffs', title: 'Trade-offs and limits' },
  { id: 'verify', title: 'Verify it yourself' },
  { id: 'faq', title: 'FAQ' },
];

const FACT_SOURCE = `#!sdev v2
to fact with n
  if n <= 1
    return 1
  end
  return n * fact(n - 1)
end
say fact(10)`;

const FAQ = [
  {
    q: 'What does "self-hosting" mean for a programming language?',
    a: 'A language is self-hosting when its own compiler is written in that language. The sdev compiler (lexer, parser and code generator) is written in sdev and compiles its own source code.',
  },
  {
    q: 'What is a byte-identical fixed point?',
    a: 'It means that compiling the compiler with itself produces exactly the same bytes as compiling it with the reference compiler. Matching output alone is weaker; byte identity proves the two compilers make the same decisions everywhere.',
  },
  {
    q: 'Which parts of the sdev toolchain are not written in sdev?',
    a: 'The seed virtual machine is hand-written WebAssembly Text (seed.wat). A thin host layer supplies printing, file and network access. The original JavaScript bootstrap compiler is kept only as a test oracle and is no longer on the runtime path.',
  },
  {
    q: 'Does sdev only compile to WebAssembly?',
    a: 'No. The browser IDE uses the WebAssembly seed VM, and a separate native backend emits x86-64 assembly that is assembled and linked into standalone Linux ELF and Windows PE executables with zero libc dependency.',
  },
];

function CodePanel({ label, code, sdev = false, onOpenIde }: { label: string; code: string; sdev?: boolean; onOpenIde?: () => void }) {
  return (
    <div className="ink not-prose my-7 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {onOpenIde && (
            <button onClick={onOpenIde} className="inline-flex h-7 items-center gap-1 rounded bg-[hsl(var(--lime))] px-2.5 text-[11px] font-semibold text-[hsl(var(--ink))]">
              <ExternalLink className="h-3 w-3" /> Open in IDE
            </button>
          )}
          <button
            onClick={() => navigator.clipboard.writeText(code).then(() => toast.success('Copied'))}
            aria-label="Copy code"
            className="grid h-7 w-7 place-items-center rounded text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {sdev ? (
        <SdevCode code={code} numbered className="p-4" />
      ) : (
        <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6 text-foreground/90"><code>{code}</code></pre>
      )}
    </div>
  );
}

function H2({ id, n, children }: { id: string; n: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-28 font-display text-3xl font-bold tracking-tight text-foreground mt-16 mb-5 pt-8 border-t border-foreground/15 first:mt-12">
      <span className="mb-2 block font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-primary">§{n}</span>
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="my-4 text-[17px] leading-[1.8] text-foreground/85">{children}</p>;
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded-[5px] border border-foreground/[0.08] bg-foreground/[0.06] px-1.5 py-0.5 font-mono text-[0.86em] text-foreground">{children}</code>;
}

export default function SelfHostingGuide() {
  const navigate = useNavigate();
  const [active, setActive] = useState('why');
  const [progress, setProgress] = useState(0);
  const articleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    let raf = 0;
    const calc = () => {
      const el = articleRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      const span = el.offsetHeight - window.innerHeight * 0.6;
      setProgress(Math.min(Math.max((window.scrollY - top + 120) / Math.max(span, 1), 0), 1));
    };
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => { window.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="self-hosting-guide">
      <SEO title={TITLE} description={DESCRIPTION} path={PATH} />
      <Helmet>
        <meta property="og:type" content="article" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          headline: 'Programming Language Design: Building a Self-Hosting Compiler',
          description: DESCRIPTION,
          inLanguage: 'en',
          proficiencyLevel: 'Expert',
          about: ['Programming language design', 'Self-hosting compiler', 'Bootstrapping', 'WebAssembly', 'Bytecode virtual machine'],
          author: { '@type': 'Person', name: 'Sava Milanov' },
          publisher: { '@type': 'Organization', name: 'sdev' },
          url: `https://web.sdev.codes${PATH}`,
          mainEntityOfPage: `https://web.sdev.codes${PATH}`,
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        })}</script>
      </Helmet>

      <SiteNav />
      <div className="fixed inset-x-0 top-16 z-40 h-[3px] bg-foreground/5" aria-hidden="true">
        <div className="h-full origin-left bg-primary transition-transform duration-150" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <section className="wrap pt-12 sm:pt-16">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foreground/15 pb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          <Link to="/docs" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Documentation
          </Link>
          <span>Technical Monograph · Compiler Internals</span>
        </div>

        <div className="grid gap-10 pt-10 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <h1 className="font-display text-4xl font-extrabold leading-[0.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Building a compiler that <span className="serif-i font-normal text-primary">compiles itself.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              How the sdev lexer, parser and code generator are written in sdev, execute on a ~1,700-line hand-written WebAssembly stack VM, and rebuild themselves to a byte-identical fixed point.
            </p>
          </div>
          <dl className="lg:col-span-4 border-t border-foreground/15">
            {[
              ['Toolchain files', '3 / 3', 'byte-identical self-rebuild'],
              ['Seed VM', '~1,700', 'lines of auditable WAT'],
              ['Targets', '2', 'WebAssembly + native x86-64'],
            ].map(([k, v, d]) => (
              <div key={k} className="grid grid-cols-[1fr_auto] items-baseline gap-4 border-b border-foreground/15 py-3.5">
                <dt className="text-sm font-medium">{k}<span className="block text-xs font-normal text-muted-foreground">{d}</span></dt>
                <dd className="font-display text-3xl font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="wrap grid gap-12 pb-24 pt-14 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label="On this page" className="sticky top-24 space-y-0.5">
            <p className="label mb-3">Contents</p>
            {SECTIONS.map((s, idx) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block border-l-2 py-1.5 pl-3 text-[13px] transition-colors ${active === s.id ? 'border-primary font-medium text-foreground' : 'border-foreground/10 text-muted-foreground hover:text-foreground'}`}
              >
                <span className="mr-2 font-mono text-[10px] opacity-60">{String(idx + 1).padStart(2, '0')}</span>
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <article ref={articleRef} className="min-w-0 max-w-[70ch]">
          <H2 id="why" n="01">Why self-host a language</H2>
          <P>
            Self-hosting is one of the oldest tests in programming language design. If a language can express its own compiler —
            string handling, symbol tables, recursion, byte buffers — it is expressive enough for serious programs. It also means
            every improvement to the language immediately becomes available to the people improving the compiler.
          </P>
          <P>
            For sdev there was a second reason: portability. The browser can only run JavaScript and WebAssembly. Rather than
            keeping a large interpreter in a host language, sdev keeps the trusted, non-sdev part of the toolchain as small as
            possible — one virtual machine file — and writes everything above it in sdev.
          </P>

          <H2 id="architecture" n="02">Compiler architecture</H2>
          <P>The pipeline has four stages. Only the bottom one is not written in sdev.</P>
          <CodePanel label="Pipeline" code={`  your program (.sdev text)
        │
        ▼
  lexer.sdev      bytes → tokens (numbers, names, strings, punctuation)
        │
        ▼
  parser.sdev /   precedence-climbing expressions, statements, blocks,
  codegen.sdev    symbol tables, type tracking, two-pass emission
        │
        ▼
  bytecode + string pool
        │
        ▼
  seed.wat → sdev-seed.wasm    stack VM that executes the bytecode`} />
          <P>
            The compiler itself is ordinary sdev source: <C>lang/compiler/lexer.sdev</C>, <C>parser.sdev</C> and{' '}
            <C>codegen.sdev</C> (the code generator is the largest, at roughly 2,300 lines). A small driver program feeds source
            text in through the host, runs the compiler on the seed VM, and collects the emitted bytecode and string pool.
          </P>

          <H2 id="seed" n="03">The seed VM</H2>
          <P>
            The seed is a stack machine written directly in WebAssembly Text, with no compiler-generated code. Its design goal is
            to be small enough to audit by reading. Instructions are one byte, sometimes followed by inline operands:
          </P>
          <div className="my-7 overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/70 text-left">
                <tr>
                  <th className="px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">Range</th>
                  <th className="px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">Group</th>
                  <th className="px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">Examples</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-[13px]">
                {[
                  ['0x01–0x05', 'constants & variables', 'PUSH_I32, PUSH_STR, LOAD, STORE, POP'],
                  ['0x10–0x14', 'integer arithmetic', 'ADD, SUB, MUL, DIV, MOD'],
                  ['0x20–0x30', 'comparison & logic', 'EQ, NE, LT, GT, LE, GE, NOT'],
                  ['0x40–0x41', 'control flow', 'JMP, JZ (signed 16-bit relative offsets)'],
                  ['0x60–0x64', 'calls & frames', 'CALL, RET, ENTER, LOAD_LOC, STORE_LOC'],
                  ['0x70–0x91', 'heap, lists, strings, tomes', 'ALLOC, NEWLIST, LGET, LSET, LEN, STRCAT, TNEW, TGET'],
                  ['0xA0–0xAE', 'boxed 64-bit floats', 'PUSH_F64, FADD, FSQRT, FMATH'],
                  ['0xB0–0xB4', 'host I/O', 'READFILE, WRITEFILE, HTTPGET, FBYTE'],
                  ['0xFF', 'stop', 'HALT'],
                ].map((r) => (
                  <tr key={r[0]}>
                    <td className="px-4 py-2.5 text-primary font-semibold whitespace-nowrap">{r[0]}</td>
                    <td className="px-4 py-2.5 font-sans text-foreground/85">{r[1]}</td>
                    <td className="px-4 py-2.5 text-foreground/80">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <P>
            Linear memory is split into fixed regions: a 64 KiB string pool of length-prefixed UTF-8 records, 256 global slots,
            an operand stack, a call stack of frames (return address, saved frame pointer, locals), up to 80 KiB of bytecode, and
            a bump-pointer heap. Lists and strings share one shape — a 32-bit length header followed by the payload — so{' '}
            <C>LEN</C> works on both with a single load.
          </P>

          <H2 id="bytecode" n="04">Reading real bytecode</H2>
          <P>Here is the exact output of the self-hosted compiler for <C>say 2 + 3</C>:</P>
          <CodePanel label="Bytecode · say 2 + 3" code={`40 00 00          JMP +0        (jump over function bodies; there are none)
01 02 00 00 00    PUSH_I32 2
01 03 00 00 00    PUSH_I32 3
10                ADD
50                SAY_I32
ff                HALT`} />
          <P>And for a recursive factorial in Prism v2:</P>
          <CodePanel
            label="factorial.sdev"
            code={FACT_SOURCE}
            sdev
            onOpenIde={() => openInIde(FACT_SOURCE, 'factorial', navigate)}
          />
          <CodePanel label="Emitted VM bytecode" code={`40 27 00                JMP +39        skip the body, land on main
                        ── fact (offset 3) ──
63 00                   LOAD_LOC 0     n
01 01 00 00 00          PUSH_I32 1
24                      LE
41 06 00                JZ +6
01 01 00 00 00          PUSH_I32 1
61                      RET
63 00 63 00             LOAD_LOC 0, LOAD_LOC 0
01 01 00 00 00 11       PUSH_I32 1, SUB
60 03 00 01             CALL 3, 1 arg
12 61                   MUL, RET
01 00 00 00 00 61       implicit "return 0"
                        ── main ──
01 0a 00 00 00          PUSH_I32 10
60 03 00 01             CALL 3, 1 arg
50 ff                   SAY_I32, HALT`} />
          <P>
            Function bodies are hoisted ahead of the main program, guarded by a leading jump. Because the function has no locals
            beyond its parameter, no <C>ENTER</C> instruction is emitted at all.
          </P>

          <H2 id="growing" n="05">Growing the subset</H2>
          <P>
            A self-hosting compiler cannot be written in one step: the first version has to be compiled by something else.
            sdev used a JavaScript bootstrap compiler for that, and then grew the sdev-written compiler one capability at a time.
            Each step had its own differential test comparing the sdev-written pass against the reference:
          </P>
          <ol className="my-5 list-decimal space-y-2.5 pl-6 text-[17px] leading-[1.75] text-foreground/85 marker:text-primary">
            <li><strong className="text-foreground">Byte primitives first.</strong> Three opcodes — read a byte, make a one-character string, turn an integer into text — are the minimum a lexer needs to slice source text.</li>
            <li><strong className="text-foreground">Lexer in sdev.</strong> Tokens were streamed out and diffed against a reference tokenizer.</li>
            <li><strong className="text-foreground">Expression parser.</strong> Mutually recursive precedence climbing, checked by printing reverse-Polish output.</li>
            <li><strong className="text-foreground">First code generator.</strong> Emitted bytes were executed in a fresh VM instance and compared with the bootstrap's results.</li>
            <li><strong className="text-foreground">Variables, control flow, functions, strings, lists, forward calls and return types</strong>, each added with new test cases.</li>
          </ol>
          <P>
            One practical trick: the generator keeps counters in cell 0 of global lists (for example the bytecode length in{' '}
            <C>bc[0]</C>). Mutating a list element from inside a function never creates a new local, so compiler state survives
            function calls without needing a separate global-write feature.
          </P>

          <H2 id="fixed-point" n="06">The byte-identical fixed point</H2>
          <P>
            There are two levels of agreement between a self-hosted compiler and its reference. <strong className="text-foreground">Semantic</strong>{' '}
            agreement means programs compiled by both print the same thing. <strong className="text-foreground">Byte identity</strong> means the
            compiled bytes are exactly the same. sdev reached the first on all 50 test cases before the second — at that point only
            2 of 50 cases matched byte-for-byte, for two reasons:
          </P>
          <ul className="my-5 list-disc space-y-2.5 pl-6 text-[17px] leading-[1.75] text-foreground/85 marker:text-primary">
            <li><strong className="text-foreground">String encoding.</strong> The reference put literals in a shared string pool; the sdev compiler built them at run time one character at a time.</li>
            <li><strong className="text-foreground">Function placement.</strong> The reference lifted all function definitions to the front; the sdev compiler emitted them where they appeared.</li>
          </ul>
          <P>Closing the gap took four changes, landed together:</P>
          <ol className="my-5 list-decimal space-y-2.5 pl-6 text-[17px] leading-[1.75] text-foreground/85 marker:text-primary">
            <li><strong className="text-foreground">Two-pass compilation.</strong> Pass one walks the program with emission switched off, recording each function's name, arity, body start and local count, and iterating return types to a fixed point. Pass two emits for real.</li>
            <li><strong className="text-foreground">Function hoisting.</strong> Pass two writes a placeholder jump, lays down every function body, back-patches the jump, then emits the main program.</li>
            <li><strong className="text-foreground">ENTER elision.</strong> Functions with no extra locals skip the frame-reservation instruction, matching the reference's shortcut.</li>
            <li><strong className="text-foreground">A shared string pool</strong> using the same length-prefixed record format, so literals compile to a single <C>PUSH_STR</C>.</li>
          </ol>
          <P>
            The final test is the compiler itself. Feeding <C>lexer.sdev</C>, <C>parser.sdev</C> and <C>codegen.sdev</C> through the
            self-hosted compiler first exposed two missing features — the <C>%</C> operator and bare call statements such as{' '}
            <C>emit_byte(x)</C>, which the compiler uses hundreds of times. Once those were added, all three files compiled
            byte-identically.
          </P>

          <H2 id="retiring" n="07">Retiring the bootstrap</H2>
          <P>
            The driver that runs the compiler used to embed each program as a string literal, so it had to be rebuilt for every
            input. It now reads the program from the host instead. Because the driver no longer changes, its bytecode is compiled
            once and checked into the repository. The browser and the command-line tools load that artifact and compile everything
            through the sdev-written compiler.
          </P>
          <P>
            The JavaScript bootstrap still exists, but only as a <em>test oracle</em>: a gate rebuilds the driver from it and fails
            if the checked-in bytes have drifted. That keeps a second, independent implementation around to catch mistakes, without
            it being part of what users run.
          </P>

          <H2 id="rules" n="08">Design rules we learned</H2>
          <ul className="my-5 list-disc space-y-3 pl-6 text-[17px] leading-[1.75] text-foreground/85 marker:text-primary">
            <li><strong className="text-foreground">Decide local-vs-global by assignment, not by order.</strong> Every name a function assigns is local, even if it is read first and a global with the same name exists.</li>
            <li><strong className="text-foreground">Reset slot types when reusing slots.</strong> Slot tables are shared across functions; a fresh slot must forget the previous occupant's type, or <C>+</C> picks string concatenation instead of addition.</li>
            <li><strong className="text-foreground">Only make strict-superset changes.</strong> Each new feature in the self-hosted compiler had to leave every existing case byte-identical.</li>
            <li><strong className="text-foreground">Keep a bisect tool.</strong> A probe script that reports the first differing byte offset turns "something is wrong" into a one-line fix.</li>
            <li><strong className="text-foreground">Add a VM primitive rather than a workaround.</strong> To emit a float constant without bitwise operators in the language, the VM gained a single instruction that returns one byte of a float's IEEE-754 encoding.</li>
          </ul>

          <H2 id="backends" n="09">Two backends, one language</H2>
          <P>
            The WebAssembly seed VM is what runs in the browser IDE. For programs you want as a real executable, the native
            backend emits x86-64 machine code directly into standalone Linux ELF and Windows PE binaries with zero <C>libc</C> dependency. Both backends follow the same language semantics and are tracked in the{' '}
            <Link to="/docs/parity" className="text-primary underline underline-offset-4">parity matrix</Link>.
          </P>

          <H2 id="tradeoffs" n="10">Trade-offs and limits</H2>
          <ul className="my-5 list-disc space-y-2.5 pl-6 text-[17px] leading-[1.75] text-foreground/85 marker:text-primary">
            <li>The seed heap is a bump allocator with no reclamation — fine for compile runs and short programs, not for long-running servers.</li>
            <li>Global and local slots use one-byte indexes, jumps use signed 16-bit offsets and string-pool offsets are 16-bit, bounding module size.</li>
            <li>Values are typed statically as integer, text or float; mixing integers and floats needs an explicit conversion in the self-hosted path.</li>
            <li>The WebAssembly seed module itself is hand-written WAT; the "written in sdev" claim covers the compiler above it.</li>
          </ul>

          <H2 id="verify" n="11">Verify it yourself</H2>
          <P>The repository ships every gate described in this monograph:</P>
          <CodePanel label="Verification commands" code={`npm run test:toolchain      # lexer, parser, codegen compile themselves byte-identically
npm run test:fixed-point    # self-hosted compiler vs reference, byte for byte
npm run test:wasm-runtime   # seed VM instruction suite
npm run test:driver         # checked-in driver artifact has not drifted
npm run test:native         # native x86-64 backend`} />
          <P>
            For the full milestone-by-milestone log, read{' '}
            <Link to="/docs/internals" className="text-primary underline underline-offset-4">Compiler &amp; VM Internals</Link> and{' '}
            <Link to="/docs/zero-host" className="text-primary underline underline-offset-4">Zero-Host Native &amp; PE</Link>.
          </P>

          <H2 id="faq" n="12">Frequently asked questions</H2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="font-display text-xl font-bold text-foreground">{f.q}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="ink relative mt-16 overflow-hidden rounded-3xl border border-border p-8 sm:p-10">
            <div className="dots absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative">
              <p className="label text-[hsl(var(--lime))]">Next step</p>
              <h2 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Try the language the compiler is <span className="serif-i font-normal text-[hsl(var(--lime))]">written in.</span></h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">Open the browser IDE — nothing to install — and run the exact compiler pipeline described above.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/ide" className="btn-lime">Open the IDE <ArrowRight className="h-4 w-4" /></Link>
                <Link to="/docs" className="btn-line !border-foreground/30"><BookOpen className="h-4 w-4" /> All documentation</Link>
              </div>
            </div>
          </div>
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}
