import { SiteNav } from '@/components/site/SiteNav';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, BookOpen, Terminal } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';

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
    a: 'No. The browser IDE uses the WebAssembly seed VM, and a separate native backend emits x86-64 GAS assembly that is assembled and linked into an ELF executable on Linux.',
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="my-5 overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-[13px] leading-relaxed text-foreground/90">
      <code>{children}</code>
    </pre>
  );
}

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 font-display text-2xl md:text-3xl font-semibold tracking-tight text-foreground mt-16 mb-5 pt-2 border-t border-border/60 first:mt-0 first:border-t-0">
      {children}
    </h2>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="my-4 leading-relaxed text-foreground/85">{children}</p>;
}

function C({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary">{children}</code>;
}

export default function SelfHostingGuide() {
  const navigate = useNavigate();
  const [active, setActive] = useState('why');

  useEffect(() => {
    const els = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const obs = new IntersectionObserver(
      entries => {
        const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' },
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const openInIde = () => {
    sessionStorage.setItem('sdev:imported_code', FACT_SOURCE);
    sessionStorage.setItem('sdev:imported_name', 'factorial');
    navigate('/ide');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
        })}</script>
      </Helmet>

      <SiteNav />
      <header className="sticky top-16 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center gap-4 px-6 py-3.5">
          <Link to="/docs" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Documentation
          </Link>
          <span className="hidden text-sm text-muted-foreground sm:inline">/ Language design guide</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/docs"><Button size="sm" variant="outline" className="gap-2"><BookOpen className="h-4 w-4" />All docs</Button></Link>
            <Link to="/ide"><Button size="sm" className="gap-2"><Terminal className="h-4 w-4" />Open IDE</Button></Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1240px] grid-cols-12 gap-10 px-6 py-12">
        <aside className="col-span-12 hidden lg:col-span-3 lg:block">
          <nav aria-label="On this page" className="sticky top-24 space-y-1 text-sm">
            <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">On this page</p>
            {SECTIONS.map(s => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className={`block rounded-md px-3 py-1.5 transition ${active === s.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}
              >
                {s.title}
              </a>
            ))}
          </nav>
        </aside>

        <main className="col-span-12 lg:col-span-9 max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-wider text-primary">Technical guide · Compiler internals</p>
          <h1 className="mt-3 font-display text-4xl md:text-5xl font-semibold leading-tight tracking-tight">
            Programming language design: building a compiler that compiles itself
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            This guide walks through how the sdev compiler is designed: a lexer, parser and code generator written in sdev,
            running on a small hand-written WebAssembly virtual machine, and compiling its own source to exactly the same bytes
            as the reference compiler. Every number and byte below comes from the real toolchain in the repository.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              ['3 / 3', 'toolchain files compile themselves byte-identically'],
              ['~1,700', 'lines of hand-written WebAssembly Text in the seed VM'],
              ['2', 'backends: WebAssembly in the browser, x86-64 native'],
            ].map(([n, l]) => (
              <div key={l} className="rounded-lg border border-border bg-card/60 p-4">
                <div className="font-display text-2xl font-semibold text-foreground">{n}</div>
                <div className="mt-1 text-sm text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>

          <H2 id="why">Why self-host a language</H2>
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

          <H2 id="architecture">Compiler architecture</H2>
          <P>The pipeline has four stages. Only the bottom one is not written in sdev.</P>
          <Code>{`  your program (.sdev text)
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
  seed.wat → sdev-seed.wasm    stack VM that executes the bytecode`}</Code>
          <P>
            The compiler itself is ordinary sdev source: <C>lang/compiler/lexer.sdev</C>, <C>parser.sdev</C> and{' '}
            <C>codegen.sdev</C> (the code generator is the largest, at roughly 2,300 lines). A small driver program feeds source
            text in through the host, runs the compiler on the seed VM, and collects the emitted bytecode and string pool.
          </P>

          <H2 id="seed">The seed VM</H2>
          <P>
            The seed is a stack machine written directly in WebAssembly Text, with no compiler-generated code. Its design goal is
            to be small enough to audit by reading. Instructions are one byte, sometimes followed by inline operands:
          </P>
          <div className="my-5 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left">
                <tr><th className="px-4 py-2 font-semibold">Range</th><th className="px-4 py-2 font-semibold">Group</th><th className="px-4 py-2 font-semibold">Examples</th></tr>
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
                ].map(r => (
                  <tr key={r[0]}><td className="px-4 py-2 text-primary">{r[0]}</td><td className="px-4 py-2 font-sans text-foreground/85">{r[1]}</td><td className="px-4 py-2 text-foreground/80">{r[2]}</td></tr>
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

          <H2 id="bytecode">Reading real bytecode</H2>
          <P>
            Here is the exact output of the self-hosted compiler for <C>say 2 + 3</C>:
          </P>
          <Code>{`40 00 00          JMP +0        (jump over function bodies; there are none)
01 02 00 00 00    PUSH_I32 2
01 03 00 00 00    PUSH_I32 3
10                ADD
50                SAY_I32
ff                HALT`}</Code>
          <P>And for a recursive factorial:</P>
          <Code>{FACT_SOURCE.replace('#!sdev v2\n', '')}</Code>
          <Code>{`40 27 00                JMP +39        skip the body, land on main
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
50 ff                   SAY_I32, HALT`}</Code>
          <P>
            Function bodies are hoisted ahead of the main program, guarded by a leading jump. Because the function has no locals
            beyond its parameter, no <C>ENTER</C> instruction is emitted at all.
          </P>
          <div className="my-6">
            <Button onClick={openInIde} className="gap-2">Run the factorial in the IDE <ArrowRight className="h-4 w-4" /></Button>
          </div>

          <H2 id="growing">Growing the subset</H2>
          <P>
            A self-hosting compiler cannot be written in one step: the first version has to be compiled by something else.
            sdev used a JavaScript bootstrap compiler for that, and then grew the sdev-written compiler one capability at a time.
            Each step had its own differential test comparing the sdev-written pass against the reference:
          </P>
          <ol className="my-5 list-decimal space-y-2 pl-6 text-foreground/85">
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

          <H2 id="fixed-point">The byte-identical fixed point</H2>
          <P>
            There are two levels of agreement between a self-hosted compiler and its reference. <strong className="text-foreground">Semantic</strong>{' '}
            agreement means programs compiled by both print the same thing. <strong className="text-foreground">Byte identity</strong> means the
            compiled bytes are exactly the same. sdev reached the first on all 50 test cases before the second — at that point only
            2 of 50 cases matched byte-for-byte, for two reasons:
          </P>
          <ul className="my-5 list-disc space-y-2 pl-6 text-foreground/85">
            <li><strong className="text-foreground">String encoding.</strong> The reference put literals in a shared string pool; the sdev compiler built them at run time one character at a time.</li>
            <li><strong className="text-foreground">Function placement.</strong> The reference lifted all function definitions to the front; the sdev compiler emitted them where they appeared.</li>
          </ul>
          <P>Closing the gap took four changes, landed together:</P>
          <ol className="my-5 list-decimal space-y-2 pl-6 text-foreground/85">
            <li><strong className="text-foreground">Two-pass compilation.</strong> Pass one walks the program with emission switched off, recording each function's name, arity, body start and local count, and iterating return types to a fixed point. Pass two emits for real.</li>
            <li><strong className="text-foreground">Function hoisting.</strong> Pass two writes a placeholder jump, lays down every function body, back-patches the jump, then emits the main program.</li>
            <li><strong className="text-foreground">ENTER elision.</strong> Functions with no extra locals skip the frame-reservation instruction, matching the reference's shortcut.</li>
            <li><strong className="text-foreground">A shared string pool</strong> using the same length-prefixed record format, so literals compile to a single <C>PUSH_STR</C>.</li>
          </ol>
          <P>
            Calls between mutually recursive functions can reach a callee whose address is not known yet; those sites are recorded
            and patched once every body is in place. After that, all 50 cases matched on both the bytecode and the string pool.
          </P>
          <P>
            The final test is the compiler itself. Feeding <C>lexer.sdev</C>, <C>parser.sdev</C> and <C>codegen.sdev</C> through the
            self-hosted compiler first exposed two missing features — the <C>%</C> operator and bare call statements such as{' '}
            <C>emit_byte(x)</C>, which the compiler uses hundreds of times. Once those were added, all three files compiled
            byte-identically.
          </P>

          <H2 id="retiring">Retiring the bootstrap</H2>
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

          <H2 id="rules">Design rules we learned</H2>
          <P>A few rules turned out to matter more than expected. They are useful for anyone designing a bootstrapped language:</P>
          <ul className="my-5 list-disc space-y-3 pl-6 text-foreground/85">
            <li><strong className="text-foreground">Decide local-vs-global by assignment, not by order.</strong> Every name a function assigns is local, even if it is read first and a global with the same name exists. A silent pre-walk of the body registers these names in source order.</li>
            <li><strong className="text-foreground">Reset slot types when reusing slots.</strong> Slot tables are shared across functions; a fresh slot must forget the previous occupant's type, or <C>+</C> picks string concatenation instead of addition.</li>
            <li><strong className="text-foreground">Only make strict-superset changes.</strong> Each new feature in the self-hosted compiler had to leave every existing case byte-identical.</li>
            <li><strong className="text-foreground">Keep a bisect tool.</strong> A probe script that reports the first differing byte offset turns "something is wrong" into a one-line fix.</li>
            <li><strong className="text-foreground">Add a VM primitive rather than a workaround.</strong> To emit a float constant without bitwise operators in the language, the VM gained a single instruction that returns one byte of a float's IEEE-754 encoding.</li>
          </ul>

          <H2 id="backends">Two backends, one language</H2>
          <P>
            The WebAssembly seed VM is what runs in the browser IDE. For programs you want as a real executable, a separate native
            backend emits x86-64 GAS assembly, which is assembled and linked into an ELF binary you can inspect with{' '}
            <C>objdump</C> or trace with <C>strace</C>. Both backends follow the same language semantics and are tracked in the{' '}
            <Link to="/docs" className="text-primary hover:underline">parity matrix</Link>.
          </P>

          <H2 id="tradeoffs">Trade-offs and limits</H2>
          <P>Being honest about the constraints is part of the design:</P>
          <ul className="my-5 list-disc space-y-2 pl-6 text-foreground/85">
            <li>The seed heap is a bump allocator with no reclamation — fine for compile runs and short programs, not for long-running ones.</li>
            <li>Global and local slots use one-byte indexes, jumps use signed 16-bit offsets and string-pool offsets are 16-bit, which bounds program size.</li>
            <li>Values are typed statically as integer, text or float; mixing integers and floats needs an explicit conversion in the self-hosted path.</li>
            <li>The WebAssembly module itself is still hand-written. The "everything in sdev" claim covers the compiler, not the virtual machine underneath it.</li>
          </ul>

          <H2 id="verify">Verify it yourself</H2>
          <P>The repository ships the gates used throughout this guide:</P>
          <Code>{`node bin/sdevhost.mjs scripts/test-self-toolchain.sdev   # lexer, parser, codegen compile themselves byte-identically
node scripts/test-shim-fixed-point.mjs                   # self-hosted compiler vs reference, byte for byte
node scripts/test-wasm-runtime.mjs                       # seed VM instruction suite
node bin/sdevhost.mjs scripts/test-driver-artifact.sdev  # checked-in driver has not drifted
node scripts/test-native.mjs                             # x86-64 backend`}</Code>
          <P>
            For the full milestone-by-milestone log, read{' '}
            <Link to="/docs/internals" className="text-primary hover:underline">Compiler &amp; VM Internals</Link> in the{' '}
            <Link to="/docs" className="text-primary hover:underline">documentation</Link>.
          </P>

          <H2 id="faq">FAQ</H2>
          <div className="space-y-6">
            {FAQ.map(f => (
              <div key={f.q}>
                <h3 className="font-display text-lg font-semibold text-foreground">{f.q}</h3>
                <p className="mt-2 leading-relaxed text-foreground/85">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-xl border border-border bg-card/60 p-6">
            <h2 className="font-display text-xl font-semibold">Try the language the compiler is written in</h2>
            <p className="mt-2 text-muted-foreground">Open the browser IDE — no install needed — and run the same compiler described above.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/ide"><Button className="gap-2"><Terminal className="h-4 w-4" />Open the IDE</Button></Link>
              <Link to="/docs"><Button variant="outline" className="gap-2"><BookOpen className="h-4 w-4" />Read the docs</Button></Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
