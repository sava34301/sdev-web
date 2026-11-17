# SDEV — The Complete Project Record (Expanded Edition, v6)

> Everything discussed, built, decided, rejected, planned and imagined for the SDEV Programming Language, from the first message to today — now updated with the Code Understander hardening, Universal Local Model Server integration (LM Studio, Ollama, llama.cpp), and IDE SDev Doctor integration engineered and verified in **Antigravity**.

| | |
|---|---|
| **Project** | SDEV Programming Language |
| **Creator** | Sava Milanov (handle `@sava-milanov`) |
| **Admin account** | barygeferson@gmail.com (owner of invite codes and the Admin tab) |
| **Main website** | https://web.sdev.codes (also https://administator.lovable.app) |
| **Email domain** | notify.sdev.codes |
| **Licence** | "SDEV Programming Language © 2026 by Sava Milanov is licensed under Creative Commons Attribution-ShareAlike 4.0 International" |
| **Public launch** | 12 July 2026, 14:00 Sofia time (UTC+3) |
| **Current tool version** | 5.1.0 (one version for IDE, CLI, VS Code extension and desktop app) |
| **Period covered** | 11 December 2025 → 1 November 2026 (790+ chat messages across Lovable and **Antigravity**) |
| **Edition** | v6 — expanded & updated in **Antigravity**. Supersedes `SDEV_Complete_Project_History.md` (v1 through v5). |

---

## How to read this document

Each item carries one of these labels:

- **Built** — made and checked at the time.
- **Built in Antigravity** — engineered, integrated and verified with automated test suites in **Google Antigravity** on 24 October 2026.
- **Partly built** — exists, with known gaps that are listed.
- **Planned** — agreed or proposed, not built yet.
- **Idea** — mentioned, never committed to.
- **Not verified** — built, but never tested in the real physical situation (for example on a physical Arduino board, a real NVIDIA GPU, or inside desktop VS Code).
- **Rejected / replaced** — tried, then dropped or superseded.

Where an earlier answer claimed more than was later true, this document gives the corrected state and says so.

Quotes in "double quotes" are your own words (lightly shortened). Bulgarian requests are given in English with the meaning kept.

---

## Table of contents

1. The project at a glance
2. The story in two pages
3. Full timeline, era by era
   - Era 1 — The beginning (Dec 2025)
   - Era 2 — Graphics, JavaScript, maps (Jan 2026)
   - Era 3 — Assistant and translator (Feb 2026)
   - Era 4 — Compiler, IDE, multilingual code (Mar 2026)
   - Era 5 — Translation in the language, operating system, VS Code (Apr 2026)
   - Era 6 — Accounts, UI toolkit, books, pro IDE (May 2026)
   - Era 7 — Pre-launch: installer, compiler, launch gate, invite codes (late May – Jun 2026)
   - Era 8 — Redesigns, web building, `.exe`, Arduino (Jun 2026)
   - Era 9 — SDEV v2 "Prism" and self-hosting (Jul 2026)
   - Era 10 — Launch (11–12 Jul 2026)
   - Era 11 — Machine learning, GPU, self-evolution (Jul–Aug 2026)
   - Era 12 — Full v1/v2 parity, ultimate docs, Python parity (Aug 2026)
   - Era 13 — Website refresh, Personal SDEV (Aug 2026)
   - Era 14 — New IDEs, CLI, JavaScript removal, Understanding Agent (Sep 2026)
   - Era 15 — Sharing, usernames, beginner projects, MCP (Sep 2026)
   - Era 16 — Everyday tasks, homepage 3D arc (Sep–Oct 2026)
   - Era 17 — Understander in SDEV, sdev:ai, local brain (Oct 2026)
   - Era 18 — Releases, platform plan, Arduino remake start, v1/v2 record (Oct 2026)
   - **Era 19 — The Antigravity Engineering Sprint (24 Oct 2026 — made in Antigravity)**
4. Feature encyclopedia (what exists today, in depth)
5. Design history
6. Your rules and preferences
7. Decisions, reversals and rejected directions
8. Notable bugs and how they were fixed
9. Open work — every checklist (updated after the Antigravity sprint)
10. Ideas backlog
11. Known limits and honest caveats
12. Appendices — glossary, file map, test suites, numbers

---

## 1. The project at a glance

SDEV is a programming language with its own personality, built entirely through conversation with AI over ten months and now expanded in **Antigravity**. Today it consists of:

- **Two language generations**
  - **v1** — the original, deliberately unusual language: `forge x be 10`, `conjure f(a) :: … ;;`, `ponder`, `cycle`, `yep`/`nope`/`void`.
  - **v2 "Prism"** — easy plain English: `set x to 10`, `say x`, `if x is 18 or more … end`.
- **A completely self-hosted, 100% pure SDEV language core (completed in Antigravity).** The entire `lang/` language source code contains **zero foreign programming language source files** (`.js`, `.mjs`, `.ts`, `.py`, `.wat`, `.s`) — every single file in `lang/` is pure `.sdev`. It comprises a standalone pure-SDEV compiler driver (`lang/compiler/driver.sdev`), seed VM and stage-0 bootstrap emitters (`lang/bootstrap/`), native x86-64 code generator and ELF linker (`lang/native/`), stack virtual machine and virtual OS kernel (`lang/runtime/`), 10 modular v2 standard library packages (`lang/stdlib/v2/`), 26-language keyword translator (`lang/translator/`), v1 frontend compatibility parser (`lang/legacy/`), multi-paradigm extensions (`lang/paradigms/`), and diagnostic linter (`lang/linter/`). Compiles itself to byte-identical bytecode across all stages (`bc=19214, pool=737`) and fixed-point test suites. All host-side test harnesses, differential oracles, and WebAssembly bootstrap seeds reside cleanly in `src/lang-bridge/`.
- **Three execution tracks**: the v1 TypeScript interpreter, the self-hosted v2 compiler on WebAssembly, and a native x86-64 assembly backend that produces real Linux programs. Parity across all three tracks is continuously validated by the pure SDEV parity agent with 0 required feature gaps across 209 features.
- **Code in any human language**: 26+ languages built into the language itself, with especially strong Bulgarian support, plus personal **dialects** anyone can create and share.
- **A Code Understander**: an AI layer inside the language that reads what you meant, so you can write freely. In **Antigravity**, it gained its own 100% SDEV-written lexer, recursive-descent AST parser, syntax validator and tree-walking interpreter (`lang/agent/parser_eval.sdev`), alongside its SDEV-written rules, project index and block-closing rules. Its AI can run inside the browser for free.
- **sdev:ai**: a compact dialect designed for AI to write.
- **A Canonical API Registry & Target-Aware Linter (made in Antigravity)**: 576 canonical APIs across 16 modules (`src/lang/registry/api-registry.ts`), 15 structured diagnostic codes (`SDEV001`–`SDEV015`), Damerau-Levenshtein `"Did you mean?"` suggestions, automatic quick-fixes (`src/lang/linter.ts`), an interactive IDE **Runtime & API Explorer** panel (`src/components/ide/RuntimeExplorerPanel.tsx`), and CLI `sdev doctor`, `sdev explain`, `sdev lint` and `sdev api` commands.
- **Large libraries**: graphics, turtle, sprites, Leaflet maps and GIS, a UI toolkit, a web-page language, a simulated operating-system kernel, machine learning and LLM training (now with Milestone M15 batched forward passes, accelerated `best_matmul` dispatch, and `SDEVML01` binary checkpoints built in **Antigravity**), GPU access (WebGPU, CUDA), and a complete hardware/Arduino subsystem (30 boards, full SDEV-to-C++ transpiler, 10,232-library index, zero-install cloud compilation for verified targets, and 7 browser upload protocols completed in **Antigravity**).
- **Tools**: browser IDEs (`/ide`, `/ide/classic`, and `/studio` — now wired to the real SDEV execution engine and Supabase cloud persistence in **Antigravity**), a CLI, a VS Code extension, a desktop app, a Windows installer, `.exe` packaging, one shared release system with automatic updates.
- **A website** with accounts, cloud files, sharing, dialect pages, docs, books in English and Bulgarian, and launch material.

---

## 2. The story in two pages

**December 2025.** You asked for "a new lightweight, beginner-friendly programming language" with a Python interpreter. Because the platform builds web apps, it began as a browser language in TypeScript. Almost immediately you asked to make it "a lot different from any other language", which created SDEV's mystical v1 vocabulary. Within days you asked for online libraries anyone could import, visuals, downloads, a Python version, a Windows installer, and the ability to be used "for anything — machine learning, game development".

**January–February 2026.** Graphics grew, a standalone JavaScript interpreter appeared, a big Leaflet map library was added, and the `js` keyword let SDEV run raw JavaScript. An AI translator turned other languages into SDEV, a chatbot learned the language, and both were taught to test their own code before answering.

**March–April 2026.** SDEV got its first bytecode compiler and VM, a VS Code-style IDE, and a full documentation audit under your strict rule: never change the documentation, make the language match it. You introduced the idea of writing SDEV in your own human language; translation moved inside the language itself. You revealed you were building an operating system in SDEV, which brought buffers, pointers, a kernel, system calls, a scheduler and a binary bytecode format. A complete VS Code extension followed.

**May–June 2026.** Accounts, cloud files, a real UI toolkit, a documentation site and a very large designed book (English and Bulgarian) arrived. The IDE became professional. The launch was set for 12 July 2026, with a worldwide countdown, invite codes and disabled sign-ups. Many redesigns happened. SDEV learned to build web pages, link files together, and compile to real `.exe` files with native windows. Arduino support began.

**July 2026.** You called the new version "the most important thing you'll ever make before the launch": detached from TypeScript, combining every kind of language — but very easy to read. This produced SDEV v2 "Prism" and a self-hosting chain: a hand-written WebAssembly machine, then a compiler written in SDEV that eventually compiled itself byte for byte. A native assembly backend and Electron desktop IDE were added. Launch day came with marketing material ready, and right after, a huge machine-learning and LLM stack, GPU bindings and gated self-evolution.

**August 2026.** You demanded that v1 and v2 have the same features, that v2 be fully self-hosted, and that "the IDE must run the self-hosted compiler, not JavaScript". A parity agent written in SDEV now checks every track. An ultimate documentation that explains every function was generated. You asked for 100% Python feature parity with two names for every keyword. The website was refreshed and "Personal SDEV" let anyone create their own syntax.

**September 2026.** Brand-new IDEs (Studio), a new CLI, the translator rebuilt inside the language, the start of replacing JavaScript files with SDEV, and the Understanding Agent ("write however you like") arrived, followed by sharing pages, real usernames, beginner-project training and MCP.

**October 2026.** The agent learned everyday tasks. The homepage went through a long 3D-scrolling redesign arc that ended in a professional Graphite & Blue look with a real scroll-driven 3D compiler scene. The Code Understander moved into SDEV; sdev:ai was born; the understander's AI moved into the browser so it costs nothing. All tools now share one version and update themselves. Then, on **24 October 2026 in Antigravity**, a major engineering sprint completed the full Arduino & hardware remake, the Understander's SDEV-written parser and interpreter, Milestone M15 of the ML stack, Self-Hosting Milestones A & B (`STREQ` string equality and all compiler gates ported to SDEV), the Canonical API Registry, static linter, Runtime Explorer panel, CLI `doctor`/`explain`/`lint`/`api` commands, and Studio's real compiler and cloud-sync wiring — followed by this v3 edition of the Complete Project Record.

---

## 3. Full timeline, era by era

### Era 1 — The beginning (December 2025)

**11 Dec 2025 — The original specification.**
You asked for "sdev — a new lightweight, beginner-friendly programming language with simple syntax, dynamic typing, and a Python-based interpreter". The specification listed:
- lexer, recursive-descent parser, AST evaluator, builtins (`print`, `len`, maths), REPL, running `.sdev` files, minimal stdlib, clean error messages with line and column, test suites;
- files `lexer.py`, `parser.py`, `ast_nodes.py`, `interpreter.py`, `builtins.py`, `repl.py`, `runner.py`, `errors.py`;
- syntax `let x = 10; func add(a, b) { return a + b; }`, `if`, `while`;
- types int, float, string, bool, null, list, dict; builtins `print`, `len`, `int`, `float`, `range`;
- nice-to-haves: string escapes, an import system, REPL command history.

**"I want you to build the entire language."** The platform builds web apps, so SDEV was built as a browser language: TypeScript lexer, parser, AST, environment, builtins, interpreter, plus a playground (code editor, output panel, examples, language reference). **Built.**

**"Can you make it a lot different from any other language."** This created the v1 identity:

| SDEV v1 | Meaning |
|---|---|
| `forge x be 10` | create a variable |
| `conjure name(a, b) :: … ;;` | define a function |
| `ponder` / `otherwise` | if / else |
| `cycle` | while |
| `yield` | return |
| `yep` / `nope` / `void` | true / false / null |
| `::` and `;;` | open and close a block |
| `also`, `either`, `isnt` | and, or, not |
| `equals`, `differs` | ==, != |
| `^` | power |
| `|>` | pipe |
| `(x) -> x * 2` | lambda |
| `speak`, `shout`, `gather`, `sift`, `fold`, `essence`, `morph` | expressive builtins |

**Three big requests (11 Dec).**
1. "Everything it now has must be in a library hosted online and anyone can import it" → GitHub Gists, with `summon "gist:abc123"`. **Built.**
2. "Make it that the language can make visual things" → 2D canvas **and** turtle graphics. **Built.**
3. "Make the language downloadable and runnable" → single HTML file **and** NPM CLI. **Built.**

**12 Dec — four more requests.**
1. A Python version → full interpreter + CLI + importable library (`public/sdev-interpreter.py`). **Built.**
2. Finish the graphics/gist wiring. **Built.**
3. "More stable, more professional, usable for anything like machine learning, game development" → arrays and matrices (`matrix`, `transpose`, `dot`, `matmul`…), file I/O, networking, JSON, trigonometry, sorting, set operations, `randint`, `pick`, `shuffle`, `etch`/`unetch`. **Built.**
4. "Make the download openable without npm — a window that installs the language and a code editor" → you chose **Windows only**: a batch installer to `C:\sdev` with PATH set up. **Built** (later rebuilt twice).

**13 Dec — "From now on the whole language will be on Python, not TS."** The Python interpreter was rewritten with 100+ builtins (matrices, file I/O, `fetch`, `attempt`/`rescue`, `each`/`sift`/`fold`/`seek`/`every`/`some`, dates, slicing). The first big `SDEV_DOCUMENTATION.md` tutorial was written. *(This later became the lasting rule that the Python and JavaScript runtimes must stay equal, rather than Python replacing TypeScript.)*

**14–15 Dec — "Add more features."** You picked all four categories:
- Object-oriented programming: `essence` classes, `extend`, `self`, `super`, `new`, `init`, methods.
- Async: `async conjure`, `await`, `spawn`, `delay()`.
- Data structures: `Set`, `Map`, `Queue`, `Stack`, `LinkedList`.
- Games: `Sprite` (position, velocity, collisions), `Vec2`, `rgb`/`rgba`/`hsl`/`hex`, `lerp`, `clamp`, `distance`, `collides`.
All were then added to the documentation. **Built.**

**15 Dec — "Make the interpreter more accurate and more working."** Ternary support, classes callable as constructors, static methods, inherited method lookup, list and string methods, optional parameters, clearer errors. **Built.**

### Era 2 — Graphics, JavaScript, maps (January 2026)

**10 Jan — "Add more visual things, and fix the added ones because they don't work."** New shapes (ellipse, arc, point, triangle, star, heart, rounded rect), drawing state (`noFill`, `noStroke`, `lineWidth`, `alpha`, `shadow`), text alignment and fonts, transforms (`translate`, `rotate`, `scale`, `save`, `restore`), paths and Bézier curves, linear and radial gradients, sprites, turtle extras (`home`, `setheading`, `dot`, `stamp`), colour and maths helpers. New examples: Turtle Flower, Shapes Gallery, Gradient Art, Starfield, Spirograph, Wave Pattern, Bezier Art. **Built.**

**17 Jan** — the same graphics added to the Python interpreter and documented with examples. **Built.**

**18 Jan — "Can you also make a JS interpreter."** `public/sdev-interpreter.js` — standalone, runs in Node (`node sdev-interpreter.js file.sdev`) and browsers (`new SdevInterpreter().run(code)`). **Built.**

**22 Jan — "Make a new sdev Leaflet working with the interpreter and a new documentation only for this."** 40 mapping functions, then (on "add the other functions") 70+ more: navigation (`panTo`, `flyTo`, zoom), popups/tooltips, layer styling, events, GIS maths (`bearing`, `midpoint`, `destination`, `area`, `length`, `centroid`, `isPointInPolygon`, `simplify`), geolocation, image/video overlays, feature groups, coordinate utilities. `SDEV_LEAFLET_DOCUMENTATION.md`. **Built.** Ideas left: Leaflet in the Python interpreter, a map demo, an HTML template.

**23–24 Jan — The `js` keyword.** "Make a function to call an external JS function like `js L.map("map")`." Built, then you (in Bulgarian) listed what was missing: object literals `{}`, arrays `[x, y]`, multi-line calls, nested brackets with objects, arrow functions `=>`, anonymous functions with `{}`. Fixed with `js { … }` and `js ( … )` blocks. You then gave detailed instructions to treat `js` as one raw token; that version accidentally removed multi-line support. You said: if anything was removed, bring it back immediately, because you needed the new parts too. **All three forms restored** (single line, `js { … }`, `js ( … )`), plus `forge x be js …`.

### Era 3 — Assistant and translator (February 2026)

**31 Jan — "An AI that lets you choose an interpreter, upload code of any programming language and translates it to sdev."** You chose Claude; the gateway offered Gemini, so `google/gemini-2.5-pro` was used. Paste **and** file upload, 14 languages, auto-detection. **Lovable Cloud was enabled** for the first time. **Built.**

**31 Jan — "Completely redesign the website."** You picked "Dark & Futuristic": neon cyan/magenta, glassmorphism, Orbitron font, cyber grid. **Built, later rejected** (see Design history).

**1 Feb — three asks.**
1. Replace all download buttons with one **"Downloadables & Tutorials"** button whose menu holds every download plus the JS interpreter and documentation. **Built.**
2. "Some visual example buttons don't work or look bad — make them prettier, make everything work, add something 3D." Categorised examples, 3D wireframe cube/pyramid/sphere. **Built.**
3. "Make a working normal compiler that doesn't require any other language." *(The first ask for a true compiler. Fulfilled much later by the self-hosted compiler and native backend.)*

**2 Feb** — "cannot call non-function" in examples fixed (`PI` became a constant); translator prompt hardened; an **X button** to close the canvas.

**2 Feb — "Add a chatbot that knows everything about this language and can write projects for you."** SDev Assistant: streaming chat, full language reference in its prompt, a "Use" button to drop code into the editor. **Built.**

**3 Feb — "Add more functionality because your AI tries to build good apps but the language doesn't support some functions."** 50+ builtins: strings, lists, type checks, maths/trig, tomes (dicts), constants, time. A Fibonacci program from the AI used `iterate`, which didn't exist → `iterate x through list :: … ;;` added. **Built.**

**14 Feb — "Make the translator better, and translate entire websites (HTML, CSS, JS in one .html file). It needs to be working."** "Website → canvas program" translation with every builtin in the prompt and 31 strict rules against leaking other languages' syntax. **Built.**

**14 Feb — "Make the AI test its code before it gives it" … "I meant also the translator."** Both the chatbot and the translator now run their code through the interpreter and send errors back to the AI up to 3 times, showing ✅ Verified or ⚠️ Review needed. **Built.**

**15 Feb — Your map project.** You uploaded `map.html` ("Историята около мен" — "The history around me"): Leaflet, layer groups, custom icons, geocoder, satellite/normal maps, geolocation. Translated to SDEV for the JS interpreter template; it showed a blank screen; finally a ready-to-download `public/map-sdev.html` was made. **Built.** Ideas left: `addMarkerIcon` on layer groups, a native geocoder.

### Era 4 — Compiler, IDE, multilingual code (March 2026)

**12 Mar — "Now can you make a full compiler."** You chose output **Bytecode/IR** and running **in the browser and as a CLI**. Built: `bytecode.ts` (~25 opcodes, disassembler), `compiler.ts`, `vm.ts` (stack VM with closures and a step limit), a Compiler panel, downloadable `.sdevc` (JSON bytecode) and `.sdevir` (readable). **Built.** Ideas then: interpreter-vs-VM diff view, optimiser, step debugger.

**12 Mar — "How do I use it locally?"** `node sdev-interpreter.js file.sdev` or `python sdev-interpreter.py file.sdev`; a standalone compiler CLI was offered.

**13 Mar — Hide the Lovable badge, and "a whole full working IDE program that installs on your computer, something like Visual Studio".** You chose **Electron** with multi-file tabs, syntax highlighting, file explorer and integrated terminal. Built: the `/ide` route (resizable panels, file tree, tabs, highlighter, terminal, canvas, interpreter/VM switch, status bar) and a downloadable Electron wrapper (`main.js`, `package.json`, README). **Built.**

**14 Mar — The documentation audit.** "Read the documentation entirely, check EVERY function, command or thing, test it; if it doesn't work fix it, if it doesn't exist add it. IN NO CIRCUMSTANCE CHANGE THE DOCUMENTATION. Then remove the Lovable badge." Added: `within item be list`, `yeet`/`skip`, `attempt … rescue`, `essence`/`extend`/`new`/`self`/`super`, ternary `cond ~ a : b`, `obj.prop be value`, `#` comments, scientific notation, lambda block bodies, ~45 builtins, constants `PI`, `TAU`, `E`, `INFINITY`. **Built.**

**15 Mar — "Work on the IDE and the documentation… make the documentation longer and more detailed, very long and very detailed… DO IT LIKE YOUR LIFE DEPENDS ON IT."** IDE: activity bar, Explorer/Search/Settings, `Ctrl+P` palette, cross-file search, saved state in local storage, auto-indent and bracket closing, status bar, three themes, font/tab settings, file upload, 5 starter files, fullscreen. Documentation: ~1,900 → ~3,500 lines, with recipes (quicksort, BFS, Caesar cipher, prime sieve, neural network layer, mandala). **Built.**

**16 Mar — "Test the compiler for everything, every function, and fix it."** Hex and scientific literals, `async`/`await` parsing, contextual `essence`, empty dict `::;;`, `[0] * 5`, `contains` on tomes, `len`, `gettype`, substring `snatch`, collection methods. **Built.** Open then: full bytecode parity with the interpreter, a REPL panel.

**17 Mar — The multilingual idea.** "Add the functionality for people to write in any language, not only English; on the first interpretation an AI translates the code back to English and stores it, so next time no translation is needed — but they can still write in their chosen language." 26 languages, a translation function, a hash-based cache, a language selector, a "Translated from … → English" banner and an eye toggle. **Built.**

### Era 5 — Translation in the language, operating system, VS Code (April 2026)

**1 Apr** — the preview failed (`vite: command not found`) and was repaired. **"Add Bulgarian."** **Built.**

**1 Apr — "Because I find many bugs in translating, go through everything in the documentation and test it in every added language."** Explicit keyword tables for every language (500+ mappings), a list of builtin names that must never be translated, fixes for class syntax in Japanese/Russian/Korean, multi-word phrases ("в противен случай" → `otherwise`). **Built.**

**6 Apr — "A complete redesign so it doesn't look made by AI. Search the web for professionally made sites and rebuild this, including the playground. Also add more playground features."** Inspired by Rust/Go/TypeScript sites: Space Grotesk/Inter/JetBrains Mono, hero with live code, "Why sdev?" cards, sticky nav, playground toolbar (Copy, Share link, Translate, Compiler, Run ⌘Enter), Output/Canvas tabs, timer. The Lovable badge was hidden through CSS. **Built.**

**7 Apr — "We don't even have simple functions like INPUT."** You asked to compare SDEV with the most-used languages and add what's missing — and revealed: **"I am building an operating system."** You listed 18 required areas:

1. Low-level memory: byte buffers (`forge mem be buffer(1024)`, `mem[0] be 255`), typed arrays `u8 u16 u32 i8 i16 i32 f32 f64`, `pointer(mem, index)`.
2. A complete bytecode instruction set: ADD SUB MUL DIV MOD, AND OR NOT, CMP_EQ/NEQ/LT/GT/LTE/GTE, JMP, JMP_IF_TRUE/FALSE, PUSH POP DUP SWAP, LOAD STORE, CALL RET.
3. A VM model: stack or register, program counter, registers, call stack, heap, frame pointers.
4. Tasks: `createTask(fn)`, `killTask(id)`, `yieldTask()`, `sleep(ms)`, a Process Control Block in SDEV, pre-emptive scheduling.
5. System calls: `syscall("write", "Hello")`, `kernel.syscalls` table.
6. Privilege levels: kernel/user mode, no raw memory/disk/hardware from apps except via syscalls.
7. A virtual filesystem with a virtual disk.
8. A module loader (`loadModule("shell.sdevb")`) for kernel modules, apps, drivers.
9. Kernel panic, crash screen, stack traces.
10. A hardware abstraction layer: keyboard, mouse, timer interrupts, display, virtual disk, virtual network.
11. Window manager API and an event loop (`onEvent("click", handler)`).
12. A boot sequence (`boot.sdev`, kernel init).
13. A binary bytecode format: magic header, version, constants, instructions, debug info.
14. Mark-and-sweep GC or manual memory.
15. Time and timer interrupts, kernel tick loop.
16. Threads (user, kernel, multiprocessing).
17. A bytecode debugger (disassembler, stack and variable inspectors).
18. Security: sandboxing, permissions, file isolation, resource limits.

You chose **"language basics first"**: 40+ functions (`input` via the browser prompt, `chr`/`ord`, `hex`/`oct`/`bin`, number formatting, string checks, regex `match`/`matchAll`/`replaceRegex`/`test`, bitwise, base64, `compose`/`pipe`/`curry`/`memoize`/`times`/`groupBy`/`chunk`, `buffer`/`pointer`, `exit`/`panic`/`throw`, aliases `print`/`range`/`typeof`/`sleep`/`keys`/`values`/`freeze`/`hash`). **Built.**

**8 Apr — "Now let's do the operating system. We are building it in the compiler VM, so everything must work. Then fix every bug in the compiler."** `src/lang/kernel.ts`: virtual filesystem with permissions, round-robin scheduler, syscall interface with kernel/user privilege, heap `alloc`/`free` with mark-and-sweep GC, hardware layer, window manager. 15+ new opcodes (SWAP, bitwise, SYSCALL, ALLOC/FREE, HEAP_LOAD/STORE, INTERRUPT, TASK_CREATE/YIELD/KILL, NOP, DEBUG_BREAK). Binary `.sdevc` with magic `0x53444556`. The compiler gained classes, try/catch, ternary, member assignment and pipe-to-lambda; 22 compiler tests. **Built.** Open then: OS documentation, a sample `boot.sdev`, translating OS keywords.

**18 Apr — "I want the language translation to be in the interpreter/compiler, not just some function in my IDE."** `src/lang/translator.ts` wired into the Lexer itself — offline, synchronous, for every entry point. **Built.**

**18 Apr — "A full Visual Studio Code extension, entirely working."** `/extension`: language ID for `.sdev`/`.sdv`, TextMate grammar, auto-pairing of `::`/`;;`, folding, 16 snippets, `sdev: Run File` (Ctrl+Enter), `Run Selection`, `Open Playground`, bundled JS and Python interpreters, settings; `sdev-language-1.0.0.vsix` and a zip in "Editor Tools". **Built.** Ideas: hover docs, diagnostics, Marketplace publishing, a JetBrains plugin.

**19 Apr — "But where is the translation?"** (in VS Code). The translator was ported into the bundled interpreter; letters from any alphabet allowed in names (`\p{L}`). **Built.**

**19 Apr — "I want it to write the commands like I feel and it translates — not specific words for every command, just write something and it translates to the closest English command."** You chose **Hybrid** (dictionary + typo matching first, AI second) and **everywhere** (web + VS Code + CLI). Expanded Bulgarian synonyms (`направи`, `дефинирай`, `нека`, `покажи`, `принтирай`…), Levenshtein typo matching, a `translate-fuzzy` AI fallback (web only). **Built.**

### Era 6 — Accounts, UI toolkit, books, pro IDE (May 2026)

**1 May — A Bulgarian Hello World failed.** `направи съобщение да_бъде "Здравей Свят"` / `кажи(съобщение)` gave "cannot call non-function", because the noun "съобщение" (message) was mapped to `speak`. Common nouns (стойност, променлива, резултат, грешка, тип, обект, класа, функцията…) were removed from the keyword table, and the typo matcher stopped touching words right after `forge`, `be`, `new`, `essence`, `conjure`, `extend`, `summon`, `within` or a dot. **Fixed.**

**1 May — "Add profiles, so everyone who logs in can keep their code, and add more functions for people who have an account."** Your choices: email/password + Google; extended profile (name, avatar, bio, website); cloud-saved files, public sharing (gists), run history, starred snippets; guests keep using local storage. Built: profiles, code files, gists, run history and stars in the database; `/auth`, `/account`, `/g/<slug>` with view counts and "Open in IDE"; a user menu in the IDE. **Built.**

**2 May — three asks.**
1. "Build an app with a UI my users can interact with — buttons, windows… add functions for making windows and everything." You chose the **richest** toolkit, including menus, tabs, tables and an App Preview panel.
2. "Accounts must access the IDE and all files stay like the user changed them — every folder, every file." You chose **auto-sync of the whole workspace** and **real nested folders**.
3. "Update the documentation to be much larger, like other languages' docs (like Python's), and make a very, very large book." You chose a **docs site plus a downloadable book**.

Built: `src/lang/ui.ts` — `window`, `row`, `column`, `group`, `tabs`/`tab`, `heading`, `label`, `paragraph`, `button` (with `onclick`), `input`, `textarea`, `checkbox`, `slider`, `select`, `image`, `divider`, `spacer`, `progress`, `table`, `menu`/`menuitem`, `alert`, `uiget`/`uiset`; the App Preview panel; the folder tree; full workspace sync. **Built** (docs and book continued later).

**3 May — "First, cloud save doesn't work. Second, window input won't work. Third, add customisation to every new function — like how large a window is (360 × 480), button URLs, and everything. Fourth, none of the new functions work — checkbox won't check, text won't type, buttons don't work. Fix everything cheaply, verify the build, add UI functions to the interpreters, then build the /docs site and the book — in Bulgarian and English."** Fixed the sync race and widget interactivity; built `/docs` (searchable), `sdev-book-en.md` and `sdev-book-bg.md`; added UI stubs to the standalone JS and Python interpreters (they print `[ui] window(...)` in a terminal). **Built.**

**3 May — The book saga.**
- "This book doesn't look like anything — I want it bigger than the first documentation." → 27 chapters, EN 61 KB.
- "The old one was almost 3,000 lines and it was a documentation. We are making a BOOK. Longer, and actually a book. And in PDF WITH DESIGN, not .md." → A5 PDF via reportlab: cover, title pages, running headers, page numbers, highlighted code, clickable table of contents, Cyrillic fonts. EN 165 pages, BG 62 pages.
- "The information is still nothing, you just made the font bigger. Use the old documentation, update it with the new features, add tutorials for window, button and everything. No less than 6,000 lines." → EN **6,011 lines**, BG **7,653 lines**: Part I original reference; Part II UI toolkit (7 chapters + widget cards); Part III **15 tutorials** (Hello Window, Tip Calculator, To-Do List, Notes, Drawing Pad, Pomodoro, Markdown, Weather Dashboard, Map Explorer, Spreadsheet, Chat, File Manager, Calculator, Bouncing Ball, Your First Library); appendices: Leaflet reference, glossary, tutorial index, FAQ, quick reference card, style guide. **Built.**

**4 May — "Now do the same for the documentation site, but even longer and larger."** `/docs` now renders the books, the reference and Leaflet docs with a table of contents, scroll tracking, search and PDF buttons. You replied: "you didn't do absolutely anything" — and asked first to fix profiles and cloud saving.

**4–6 May — Cloud saving bugs.** "Save to cloud says success, but Open from cloud shows nothing, and after refresh no file opens." Causes and fixes over three rounds: two sync systems fighting (one deleted rows the other saved), stale cloud IDs showing "Update in cloud" for files that didn't exist, the open dialog rendering before data arrived, and a 406 error on update. **Fixed.**

**6 May — "Make the IDE more professional like every other IDE. Don't stop until you are ready. Take inspiration from the web."** IntelliSense-style autocomplete with hover docs, find & replace (regex, case, whole word), bracket matching, current-line highlight, minimap, outline, live Problems list, breadcrumbs, go-to-line (`Ctrl+G`), an interactive REPL in the terminal (`:help`, `:clear`, `:reset`, history), Zen mode, a real formatter, comment/duplicate/move-line shortcuts. **Built.**

**6 May — "Add an AI assistant that fixes your code and also tells you how the thing works and how it fixed it."** **SDev Doctor**: diagnoses the active file and current errors, lists changes, explains how the code works, "Apply fix". **Built.**

**6 May — "The window function is not dynamic."** Text widgets now bind to values with `@key` (`label("@count")`, `heading("@n", 1)`), and `uiset` updates them live. Explained `input("username", "placeholder")` with `uiget`/`uiset`. **Built.**

**16 May — SEO round 1.** Google Search Console connected (verification tag, sitemap, robots), unique titles and descriptions for every page, `llms.txt`, `<main>` landmarks, contrast, a branded share image, structured data (Organization, WebSite, SoftwareApplication, TechArticle). Semrush showed **9 referring domains** (Authority 2/100), with suggestions: language directories, Awesome lists, Rosetta Code, Show HN, r/ProgrammingLanguages, a link from a GitHub README. **Built** (suggestions remain ideas).

**24 May — "sdev Academy" prompt.** "Build me a prompt for a mobile sdev learning app — videos, presentations, custom lessons, tests personalised for every user; feature the new books and documentation; prebuilt lessons, videos, tests and presentations for every chapter; and everything else you can think of." Then: "make it larger — as big as you can possibly make it." The final prompt covered: vision, brand, content ingestion (Track → Chapter → Concept) from the docs and books, 16 tracks, personalisation engine and onboarding quiz, spaced repetition, adaptive tests, AI tutor with citations, voice tutor, in-app SDEV runtime with a mobile keyword-chip editor, video and slide generation, gamification (XP, levels, streaks, certificates), Author Studio publishing lessons as `summon` packages, classrooms and teacher mode, community feed and weekly challenges, EN + BG and all 26 keyword languages, accessibility, PWA + Capacitor, data model and acceptance criteria, and a 4-phase rollout. You then said: "forget the prompt and let's move on." **Idea only.**

### Era 7 — Pre-launch: installer, compiler, launch gate, invite codes (late May – June 2026)

**24 May — "Add the feature so the user can upload his code to GitHub."** File → Push to GitHub…: personal access token (kept only in the browser), repo, branch, commit message, all files in one commit, repo auto-created. **Built.**

**25 May — Bulgarian class program bug** (worked in English, failed in Bulgarian). Added `есенция` → `essence`, `forge name(` → `conjure name(` after translation, and `инит`/`конструктор` → `init`. **Fixed.**

**25 May — "Change the Windows installer to include all new features like the integrated translator (also update the interpreters so they use the translators). Add everything you can."** Python interpreter: 25-language translator, `--lang`, `--translate-only`, `--languages`, `--version`, `--help`. Installer v2.0:
1. creates `C:\sdev\{bin,docs,examples}`;
2. detects Python and Node;
3. downloads both interpreters;
4. downloads the docs and books for offline use;
5. adds examples `hello.sdev`, `hello.bg.sdev`, `hello.es.sdev`, `hello.fr.sdev`, `fizzbuzz.sdev`;
6. creates commands `sdev`, `sdev-py`, `sdev-js`, `sdev-repl`, `sdev-translate`, `sdev-languages`;
7. registers the `.sdev` file association;
8. adds itself to PATH;
9. installs the VS Code extension if `code` exists. **Built.**

**25 May — "A real working downloadable ABSOLUTELY 100% WORKING compiler that has everything."** `sdev-compiler.mjs` v3 (run, exec, compile, run-bc, disasm, translate, repl, languages). You: "I want it to work exactly like the interpreters… completely start over." → **v4 "interpreter-first"**: every path runs through the full interpreter; `.sdevc` became a container (magic `SDEVC4`, source + AST + language + version); `--vm` optional with automatic fallback; `check` and `ast` commands. **Built.**

**25 May — SEO round 2** (headings, aria labels, sitemap routes, single `h1` on docs pages, Account section headings) and Search Console domain verification with sitemap submission. **Built.**

**29 May — The launch decision (written in Bulgarian).** "I'm planning the official opening of this project on 12 July 2026. Move the current homepage elsewhere and put a timer counting down to 12 July 2026 at 14:00. It must work for every time zone and everyone in the world, and be translated into the browser's language. Keep a sign-in option so I and people I give permission can access the site early; until the opening, disable registrations. I want to keep changing the site without breaking anything like the timer or the IDE. Make the whole site and all pages inaccessible until the timer ends unless the user is signed in — and the timer must not stop you editing pages or showing them in the preview." Built: `launchGate.ts` (launch at `2026-07-12T14:00:00+03:00`), a countdown page in 13 languages, the old homepage moved to `/home`, a gate on `/home`, `/ide`, `/account`, `/docs`, `/g/…`, sign-ups disabled, preview hosts bypassed. **Built.**

**2 Jun — "Add a button to add the date to the user's Google Calendar. Add invite codes. Give the account barygeferson@gmail.com permission to make invite codes."** Google Calendar link + `.ics` file; roles table with an admin role for your account; invite codes with max uses, expiry and notes; atomic redemption; an Admin tab on `/account`. "IT DOESN'T LET ME CREATE A CODE" → a permission was too strict; fixed. "When someone enters with an invite code, unlock registration for that user; when they register and log out, deactivate it again." **Built.**

**2 Jun — "Everywhere I try to log in — with Google, or the docs page — it shows the Lovable logo and name. I want it to be SDEV."** All Lovable branding hidden; Google sign-in moved to the project's own setup (the consent screen name needs your own Google OAuth client). **Built** *(later, in September, Google sign-in was moved back to the managed helper because it broke)*.

**2 Jun — "Invent and make me a Privacy Policy and Terms of Service, with pages."** `/privacy` (11 sections: data collected, cookies, GDPR rights…) and `/terms` (15 sections: acceptable use, IP, cloud storage, liability…), public outside the gate, in the sitemap. **Built.**

### Era 8 — Redesigns, web building, `.exe`, Arduino (June 2026)

**5 Jun — "A redesign of the WHOLE WEBSITE using the uploaded colours. Also add colour modes to the IDE and redesign it too!!!"** Sky blue / cyan / orange from your cover art; five IDE themes (Sky Dark, Midnight, Open Sky, Sunset, Cloud/Light). "NONE OF THE IDE SETTINGS WORK" → theme values now applied directly; verified. "Remove the gradients of the Run button and AI assistant buttons." "Why does a button turn orange when I hover?" → neutral hover. **Built.**

**5 Jun — "A COMPLETE REDESIGN OF THE IDE, it looks very bad and ugly. Modern. Add a liquid glass option in settings. Remove the arrow button to the website; just add a button or option for visiting the website."** Then: "I SAID A COMPLETE REDESIGN OF EVERYTHING IN THE IDE. EVERYTHING, INCLUDING BUTTON WIDGETS. ALSO ADD MORE FUNCTIONS TO BE EXACTLY 1:1 LIKE A NORMAL MODERN IDE!" and "YOU DIDN'T MAKE ANY REDESIGN, MAKE IT NOW." Results: rounded tabs with file icons, segmented status bar, refined file tree, activity bar with active pill and problem badges, Zen mode, Globe "Website" button, glass title bar. Controls then "lifted up out of the viewing area"; you found **liquid glass** was the cause → removed; tab font fixed to JetBrains Mono. "I told you to remove ALL gradients in the IDE" → the IDE is now flat. **Built.**

**6 Jun — Interpreter vs compiler.** "Look what happens when I run my code in the interpreter, and in the compiler. The IDE must use the new rebuilt compiler, and it must have every function the interpreters have." The VM lacked classes, so the IDE's compiler mode was routed through the full interpreter; numeric text is converted automatically. "I AM TALKING ABOUT THE CODE ERROR IN THE FEATURES!!!!" → the real cause was the UI toolkit's `input()` hiding the language's `input()`, which made `self.radius` empty. **Fixed.**

**6 Jun — Installer bugs.** "It doesn't download anything, it just makes files with the interpreter names and writes nonsense" → curl downloads with checks rejecting HTML pages; "the installer can't access the website" → always downloads from https://web.sdev.codes; a batch label error → Windows line endings. **Fixed.**

**10 Jun** — the **official logo** replaced the placeholder icon, then was bundled into the site so it works on every domain. Security pass (input limits on AI services, invite codes readable only by admins, internal functions locked, gist ID checks). The hero button became **"View Docs"** opening https://web.sdev.codes/docs. The **Creative Commons notice** was added. "The avatar and website do nothing — what's the point if no one can see other users' info?" → avatars and websites shown on `/account`, gist author cards and the IDE user menu. Text edits: "SDEV — Code becomes poetry.", "v1.0.0". **Built.**

**14 Jun — Email.** Domain notify.sdev.codes; branded sign-in emails; three launch emails: **launch-reminder**, **launch-day** ("visit the site"), **post-launch-guide** (all documentation links and core syntax); `/unsubscribe`. Limitation: the system sends one email per person per event, not mass newsletters; a subscriber list plus scheduled sender was offered and **not built**. **Built.**

**23 Jun — "I want the language to have the functions of all languages including HTML, CSS and JavaScript — every function they have for web building and design. When run, it should open in the browser like a normal web file, not the terminal."** You chose **both** a high-level DSL and raw passthrough, and **both** a preview panel and "open in new tab". `src/lang/web.ts`: `page()`/`endpage()`, every HTML5 element as a function (`html_` prefix where names clash with the UI toolkit), `tag`, `open`/`close`, `style` (dict or text, `snake_case` → `kebab-case`), `keyframes`, `script`, `onclick`/`on`, `raw_html`/`raw_css`/`raw_js`; a WEB preview (reload, download `.html`, open in new tab). Then documented everywhere (main docs, book chapter "Building for the Browser", autocomplete, VS Code snippets, `llms.txt`). `{ key: value }` dictionaries added. **Built.**

**25 Jun — "Let the user write the design or anything in a separate file and connect them like real HTML or Python's import — not only for web building."** `link "design.sdev"`, `link "math.sdev" as math` (names become `math_add`…), `link add, sub from "math.sdev"`; case-insensitive lookup, nested links, cycle detection. **Built.**

**25 Jun — "The AIs must know every compiler, interpreter and everything, so I can ask very hard questions like 'How does sdev do the parsing?'"** A shared internals reference given to the chatbot and SDev Doctor. **Built.**

**26 Jun — `.exe` files.** "When a file is compiled it should end up as a .exe like a normal compiler, and you can download it." You chose a **standalone `.exe` bundling the full runtime**. After the first attempt you said: **"Before you do something stupid, first search the internet how other languages make .exe files and follow their way."** → the standard pattern (PyInstaller, Node SEA, pkg, Deno compile, Bun): a prebuilt runtime stub (~82–86 MB) plus your program appended at the end behind a `SDEVPACK` marker. "Compile to .exe" in the IDE. "It just opens the terminal for a split second" → pause on exit when double-clicked. **Built.**

**26–27 Jun — Windows for graphics.** "When I run canvas it says unknown command. Graphical programs must open a separate window — the canvas with the right size. Window commands similar. Web building commands must start in the browser, from an .exe or an .sdev file. And when two, three or more of these are used together, they must work together." You chose: **native window for canvas, browser for pages, and windows "exactly like real programs"**. Then: "sizes exactly as in the code (400 × 400, 560 × 670); a canvas app also opened a window screen — fix it; I wanted real applications, not Edge windows; Windows Defender pops up." → native Windows (WPF) windows through PowerShell, a local connection so buttons and inputs reach the running program, exact sizes, no extra windows, the canvas as its own fixed-size window, the GUI subsystem so no console flashes. The web `canvas` tag had overwritten the graphics `canvas()` → fixed. **Built.** One later report, "now when I run it, it doesn't do anything", could not be reproduced — details were requested. **Unresolved.**

**27 Jun — The certificate question.** The "unknown publisher" warning can only be removed with a code-signing certificate from a real authority (OV about $200/year, EV about $400/year). "But how does Python make .exe files without certificates?" → it doesn't: PyInstaller, Go, Rust and C++ unsigned programs get the same SmartScreen warning when downloaded; reputation builds slowly only if the same binary is downloaded many times, and every rebuild resets it. **Waiting on you** to buy a certificate (`.pfx`); signing would then be added to every build.

**30 Jun — Launch priority task 1: hardware.** "We need the functions to program electronic components, boards and microcontrollers like Arduino in sdev. First check every documentation and add everything to the bytecode compiler, checking each feature works. Then build board programming — search the internet, take ideas from Arduino IDE. Let people download the libraries Arduino IDE has — support every library, either translated to sdev or integrated in bytecode. Add every command needed for a board. Add a button that detects the board and a button that uploads the code." Built:
- compiler `break`/`continue` parity;
- `board-db.ts` (Uno, Nano, Mega, ESP32, ESP8266, RP2040… with board IDs and USB IDs);
- `transpile.ts`: `board "uno" { setup { … } loop { … } }` with statements like `pin 13 be output`, `wait 500` → Arduino C++ (`.ino`), plus `use "Library"` and a `cpp { … }` escape;
- `strip.ts` so board blocks don't break normal runs;
- `web-serial.ts`: browser upload to AVR Uno/Nano (STK500v1), Intel HEX parsing, serial monitor;
- the Hardware panel: Detect Board, Compile, Upload, Serial Monitor, Library Manager (Arduino's live library index);
- a cloud compile function that needs a build server (falls back to downloading the `.ino`);
- `blink.sdev` starter; `SDEV_HARDWARE_DOCUMENTATION.md`. **Built** (later completely remade and expanded in **Antigravity** — see Era 19).

**3 Jul** — version tag "v. ALPHA".

### Era 9 — SDEV v2 "Prism" and self-hosting (July 2026)

**3 Jul — "The most important thing you'll ever do before the launch."** "Make a completely new version of SDEV, completely detached from TypeScript and any other language. Professional. Change anything in the syntax if you want. Completely different from any other language. The language's main point is to **combine every type of language into one**. Add any function that's good for it. Detach from TypeScript in the whole language code (the website can stay TypeScript). Surf the internet for how languages are built. Then check that everything works."

Your answers:
- **Host language:** "Can you make a new type that doesn't need a host language?"
- **Scope:** everything, including the translator and UI helpers.
- **Syntax:** a full redesign, **plus a refine option** in case something doesn't go as planned.
- **Paradigms to combine:** systems (pointers, structs, manual memory, FFI), scripting (dynamic types, REPL, quick prototyping), functional (pattern matching, algebraic types, immutability, pipelines), data/query (query blocks, tables, joins).

The first plan proposed a heavy syntax (types, traits, effects, generics). You said: **"I don't want the new syntax to be that hard. The main point of the language is to be very easy to understand."** The revised design — **v2 "Prism"**:

| v2 | Meaning |
|---|---|
| `say "hello"` | print |
| `set name to "Ada"` | create or change a variable |
| `ask "Your name?"` | input |
| `if age is 18 or more` … `else` … `end` | conditions |
| `is`, `is not`, `or more`, `or less`, `and`, `or`, `not` | comparisons and logic |
| `for each item in list` … `end` | loop over a list |
| `while` … `end` | loop |
| `to greet with who` … `end` | define a function |
| `return` | return a value |
| `true`, `false`, `nothing` | values |
| `x |> f |> g` | pipelines |
| `match`, `type Result = ok x | error e`, `systems` blocks, `from … where … take` | advanced paradigms, opt-in |
| `#!sdev v1` | keep an old file on v1 |

**The self-hosting chain** (each step verified with regression tests):

| Milestone | What it added |
|---|---|
| M1 | `lang/runtime/v2.js`, a pure-JavaScript v2 runtime; IDE switch AUTO / V1 / V2; `SDEV_V2_DOCUMENTATION.md`, `SDEV_INTERNALS.md`, sample `welcome.v2.sdev`. "The sample doesn't work" → shebang detection fixed and the IDE routed to v2. |
| M2 | A **hand-written WebAssembly VM** (`lang/bootstrap/seed.wat`, 1,097 bytes, 20 opcodes); the bootstrap compiler `compile.mjs`; a V2-WASM runtime; verified in a real browser. |
| — | **"I don't want WebAssembly, I want normal asm."** Browsers can't run native machine code, so: the browser IDE stays on WebAssembly, and a **native x86-64 backend** (`lang/native/codegen-x64.mjs`, hand-written `runtime.s` with no C library, `link.mjs` using `as`+`ld`) produces static Linux programs; `fib(15)` → a 4 KB ELF printing 610. **"But I want a real working desktop IDE program"** → an **Electron desktop IDE** (`electron/main.cjs`, `preload.cjs`) with Build Native / Build & Run buttons that only appear on desktop. |
| M3 | Function calls with frames: CALL, RET, ENTER, LOAD_LOC, STORE_LOC; recursion (`fib(10)` = 55, `fact(6)` = 720). |
| M4 | A heap and lists: NEWLIST, LGET, LSET, LEN, STRCAT; list literals, indexing, `length`, `concat`, string-aware `+`. |
| 5a | `ord`, `chr`, `str` (SGET, CHR, I2S). |
| — | **"/docs doesn't include any of the new documentation"** → v2 Guide, Internals and Hardware added to `/docs`. **"Now let's make the whole language in ASM — the parser, lexer and everything in src/lang."** You chose **self-hosting** (SDEV written in SDEV, then compiled to asm), leaving graphics/hardware/web host-side. |
| 5b | **A lexer written in SDEV** (`lang/compiler/lexer.sdev`). |
| 5c | **A parser written in SDEV** (`parser.sdev`, precedence climbing). |
| 5d | **A code generator written in SDEV** (`codegen.sdev`) — the first self-hosted compile. |
| 5e | Global variables and a symbol table. |
| 5f | `if`/`else`, `while`, comparisons, jump patching. |
| 5g | Functions, `return`, locals, six builtins. ("Where is the self-hosted compiler?" → `lang/compiler/`.) |
| 5h | String and list literals, indexing, type tracking (43 tests). |
| 5i | Forward references, mutual recursion, return-type inference (50 tests). |
| 5j | Semantic fixed point: same output on 50/50 programs. |
| 5k | **Byte-identical fixed point**: 50/50 programs compile to exactly the same bytes as the reference compiler (two-pass, function hoisting, string pool, ENTER elision). |
| 5l | `compile-self.mjs` exposes the self-hosted compiler as a module. |
| 5m | `#` comments; the lexer and parser recompile themselves byte-identically. |
| 5n (16 Jul) | Larger memory (2 MiB) and string pool (64 KiB). |
| 5o (18 Jul) | **The compiler compiles itself byte-identically** (`codegen.sdev` needed `%` and expression statements). |

### Era 10 — Launch (11–12 July 2026)

**11 Jul — "Pause the milestones. Tomorrow is the launch of SDEV and we have no ideas what to do. Let's plan it."** Your answers: goals — maximise sign-ups, community activation, press & content, developer buzz on HN + Reddit; channel ready — Instagram; assets — "everything"; time budget — 12 hours.

The plan:
- **Timeline on launch day:** gate opens at 14:00 Sofia; T+5 min posts on HN (Show HN), Instagram, X/Twitter and LinkedIn; T+30 min answer HN comments; T+2 h r/webdev; T+4 h follow-up email; T+8 h wind-down; T+24 h retrospective and contest reminder.
- **Prep blocks:** A foundations and green tests; B one-page launch story; C content assets (blog post, demo video, Instagram carousel and Reel, HN copy, 3 Reddit posts, X thread, LinkedIn post, email); D launch-day gist gallery and a **"Build with sdev" contest**; E operations (rate limits, AI spending cap, rollback, security); F a dress rehearsal as a brand-new user.
- **Deliberately not doing:** paid ads, Product Hunt, a Discord server, new IDE features, pricing. The contest prize is a promise to be redeemed later.
- **Targets for the first 24 hours:** 1,000 sign-ups, 300 programs run, 25 public gists, HN front page for at least an hour.
- **Delivered:** `docs/launch/` with HN Show HN, three Reddit posts (r/ProgrammingLanguages, r/programming, r/webdev), an X thread, LinkedIn, an Instagram carousel and Reel, the launch email, an 800-word blog post and a playbook README. **Built.**

**12 Jul (launch day) — "Do we have any more ideas just before we launch? And turn the blog launch post into a carousel on the website, so it pops up when someone opens it."** A 6-slide first-visit carousel: "sdev is here", "Why sdev exists", "What shipped day one", "The compiler compiles itself", "What's next", "Build something. Get in the README." **Built.** Last-minute ideas offered and **not built**: an HN comment with a 20-second GIF of `codegen.sdev` compiling itself; a real gist pre-loaded as the landing demo (`snake.sdev` or a Sofia Leaflet map); a live "programs run since 14:00" counter; `?ref=hn` / `?ref=reddit` tracking; a `sdev-launch-2026` contest tag in the gist gallery; a thank-you post at T+8 h naming real people; a "How it's built" follow-up on 14 July; a 404 page built with the Web DSL.

### Era 11 — Machine learning, GPU, self-evolution (July–August 2026)

**19 Jul — The ML/LLM request.** "Add every function in sdev used for machine learning and LLM development, including fine-tuning and everything, so I can make an LLM and train it on any data, including direct internet access. One idea: an LLM that learns and trains completely by itself, or uses an already trained LLM like Gemini to train the model. Then the model must be able to rewrite itself or change its programming to add every feature it needs, connect to SDEV and add or change any feature in the code — see the demand for features in programming languages and add them — and change the documentation and everything. Add all of these to a new documentation. All COMPLETELY written in sdev and running on sdev."

The honest reply: SDEV first needed decimals, networking and file I/O; pure-SDEV maths is far too slow for big models; self-modification would be **gated** (an `allow_self_modify` switch, a log of every change, proposals only — never auto-merged).

**"BUT CAN WE ADD CUDA SUPPORT TO SDEV ALONG WITH EVERY OTHER FEATURE SO WE CAN BUILD LARGE MODELS?"** Yes — on desktop, as a thin connection (FFI) to NVIDIA's cuBLAS/cuDNN, not "CUDA written in SDEV"; in the browser, WebGPU instead. Realistic scale: a LoRA fine-tune of a 7B model on one RTX 4090 (24 GB); a 1B model from scratch in days; inference of existing GGUF models; 7B from scratch needs 8× A100 for weeks. **"OK, I APPROVE THE PLAN. FIRST ADD EVERY FEATURE, THEN WE WILL TALK ABOUT THE MODELS."**

| Milestone | Delivered |
|---|---|
| M6 | Decimals (boxed 64-bit floats), float maths opcodes, `sin`/`cos`/`exp`/`log`… |
| M7 | `read_file`, `write_file`, `http_get` (in the browser, files live in local storage; `http_get` is limited) |
| M8 | `lang/stdlib/ml/`: `tensor.sdev`, `autograd.sdev` (reverse-mode gradients), `nn.sdev` (`linear`, `sequential`, `fit`), `transformer.sdev` (embeddings, layer norm, attention, `gpt()`, `generate()`), `data.sdev` (tokenizer, web crawler, teacher-model distillation, checkpoints), `self_modify.sdev` (gated); `SDEV_ML_DOCUMENTATION.md` |
| M9 | `lang/stdlib/ffi.sdev`: call native libraries (`.so`/`.dylib`/`.dll`), typed buffers, `blas_matmul` (OpenBLAS with fallback), `open_cuda` cuBLAS bindings; `SDEV_FFI_DOCUMENTATION.md` |
| M10 | `lang/stdlib/webgpu.sdev`: GPU in the browser with CPU fallback, shader cache, matmul/add/relu kernels, custom WGSL; `SDEV_WEBGPU_DOCUMENTATION.md` |
| M11 | `lang/stdlib/ml/cuda.sdev`: device handles, device memory, `cuda_matmul`, `cuda_forward_linear`, `best_matmul` (CUDA → BLAS → pure SDEV); `SDEV_CUDA_DOCUMENTATION.md` |
| M12 | `lang/stdlib/ml/auto_evolve.sdev`: a whitelist of files it may touch, `draft_from_demand`, `evolve_weights` (distil from a teacher, then train), `evolve_tick`, `evolve_forever`; nothing changes without a review hook; `SDEV_AUTOEVOLVE_DOCUMENTATION.md` |
| M13 | The ML library runs on the v1 interpreter (parser accepts its `be x be v`, `set x to v`, `either … otherwise` forms; host bindings `rand`, `ln`, `tome_keys`, `read_file`, `write_file`, `http_get`); 11 → 15 end-to-end checks |
| M14 | `lang/stdlib/ml/train.sdev`: softmax cross-entropy with its gradient, Adam, gradient clipping, `lm_batches`, `lm_fit`, `lm_step`, `lm_loss`, perplexity, temperature + top-k sampling, `lm_generate`, `lm_complete`, checkpoint save/load |
| M15 | **Built in Antigravity (24 Oct):** batched forward passes (`linear_forward_batch`, `sequential_forward_batch`, `gpt_forward_batch`), accelerated matmul dispatch (`accel_matmul` → `best_matmul`), and IEEE-754 binary64 checkpoints (`save_checkpoint_bin` / `load_checkpoint_bin` with header `SDEVML01`); 20/20 ML checks passing |

None of the GPU paths were tested on a real NVIDIA GPU or with a real browser GPU here. **Not verified on physical GPU hardware.**

**25 Jul — The pitch video.** "Make an explanation video for the entire sdev project — a 2-minute pitch answering: What did I build? Why did I build it? How did I build it using AI and prompting? My name is Sava Milanov and I am the creator." → `sdev-pitch.mp4`, 111 seconds, 1080p kinetic typography (hook, what, why, how, features, call to action at web.sdev.codes). Voice-over was offered, **not done**.

**31 Jul — "Continue with what's left. After you're done, add everything we've done so far to a big full (Подробна — detailed) documentation that explains everything thoroughly."** `SDEV_FULL_DOCUMENTATION.md`, listed first in `/docs`: language, both runtimes, self-hosted compiler, native track, ML/LLM stack, FFI/WebGPU/CUDA, evolution loop, tooling, tests and milestone history. **Built.** "Update the SDEV internals plan to be up to date with every milestone" → `SDEV_INTERNALS.md` refreshed. **Built.**

**7 Aug — 5p: the JavaScript bootstrap compiler removed from the running app.** The self-hosted compiler driver now reads the program from the host and is baked into `driver-artifact.mjs`; the old bootstrap is kept only as a build-time "oracle" proving byte identity. **Built.**

### Era 12 — Full v1/v2 parity, ultimate docs, Python parity (August 2026)

**7 Aug — "Add everything sdev v1 has to sdev v2. Read every documentation. Both versions must have THE SAME FEATURES. You can make an sdev-written agent that changes the language and keeps full consistency between every version (including new ones) and makes, updates and expands documentation."** Then: **"All of the v2 features must be completely self-hosted."** Then: **"I WANT THE IDE TO RUN THE SELF-HOSTED COMPILER, NOT JAVASCRIPT!!!!"**

Built:
- v2 programs in the IDE, the chatbot and the translator run **only** on the self-hosted compiler; if it can't compile something yet, it says so instead of quietly using JavaScript.
- `lang/parity/features.json` — a registry of features with a required level (must / should / n/a) per track (v1, v2, native).
- `lang/parity/agent.sdev` — a parity agent **written in SDEV** that checks every track, writes `report.json` and rewrites the parity tables inside the docs between markers.
- `scripts/test-parity.ts` — fails if any "must" feature is missing.
- `SDEV_PARITY_DOCUMENTATION.md`.
- Planned layout for the rest: v1's portable library rewritten in SDEV under `lang/stdlib/v2/` (text, list, tome, math, bits, time, func, json, types, random); a single generic `SYSCALL` opcode plus a syscall table for graphics, UI, web, kernel, matrix, FFI and hardware.

Self-hosted milestones that followed (all byte-identical, with tests):

| Milestone | Added to v2 (self-hosted) |
|---|---|
| 5q | Decimals and file/web access in the self-hosted compiler; FBYTE opcode |
| 5r | `and`/`or`/`not` (short-circuit), unary minus, `true`/`false`/`nothing` |
| 5s | `for each … in`, `break`, `continue`, `else if` |
| 5t | Tomes (dictionaries) `{ "k": v, name: v2 }`, `keys`, `values`, `has` |
| 5u | 18 text and number functions: upper, lower, trim, substr, find, contains, split, join, replace, int, abs, min, max, range, sum, random, ceil, floor, round |
| 5v | `attempt … rescue … end`, `throw`, `num()` |
| 5w | Functions as values: `ref NAME`, `call f(args)` |
| 5x | Closures: `make [with params] [capture vars] … end` |
| 5y | Classes: `kind`, `new NAME`, `obj.field`, `obj.method(args)` with `self` |
| 5z | Modules: `use "path"` (include once, browser workspace lookup) |
| 6b | `kind Child extends Parent` and statically bound `super.m(...)` |

The **native x86-64 backend** caught up in parallel:

| Milestone | Added to native |
|---|---|
| 6c | Heap, text (`concat`, `chr`, `str`, typed `say`, `+`), lists, `length`, `ord`, `abs` |
| 6d | Full text library, tomes, `min`/`max`, `for each` |
| 6e | Real decimals (SSE2), maths (`sqrt`, `floor`, `ceil`, `round`, `sin`, `cos`, `exp`, `log`, `pow`, `random`, `num`, `int`) |
| 6f | Closures, functions as values, objects with inheritance and `super`, `attempt/rescue/throw`, `break`/`continue` |
| 6g | File I/O (`read_file`, `write_file`, `file_exists`, `input`) and `use` modules |
| 6h | `args()`, `env()`, `exit()`, `now_ms()`, `sleep_ms()`, `append_file()`, `say_err()` |
| 6i | `range`, `sum`, `tan`, `fabs`, `fneg`, `i2f`, `f2i`, `fbyte` |

At that point the parity agent reported **0 must and 0 should gaps on all three tracks** (81 native tests, 87 byte-identical cases — now 88 cases with Milestone A in **Antigravity**).

**8 Aug — "Make the ULTIMATE documentation with EXACTLY EVERYTHING, as big as possible."** Then: "every functionality properly explained — it must grow, not shrink." `SDEV_ULTIMATE_DOCUMENTATION.md`, generated by `scripts/build-ultimate-docs.mjs`: every guide, plus 441 v1 builtins each with signature, description, rules and source; the full opcode, keyword and memory tables; 169 SDEV-written functions; the parity matrix; repo map and toolchain — about 314 KB, ~48,800 words. **Built.**

**Mid-Aug — v2 documentation rewritten**, then rewritten again to look **exactly like the v1 documentation** (25 numbered sections, cheat sheet, reference card, "not yet in v2" table). **Built.**

**13 Aug — "Fix the hardware Upload (no build server configured) and update the VS Code extension with everything."** `tools/arduino-build-server/server.mjs` — a small local bridge to `arduino-cli` on port 8765, with Build-server settings in the Hardware panel; VS Code extension **1.2.0** (bundled self-hosted v2 runner, `Build Native Executable`, v2 grammar, 18 new snippets, `sdev.dialect` setting). **Built.**

**SEO rounds 3–4** (unsubscribe heading, canonical `/home`, gist structured data, aria labels, footer author link, static share-image fallbacks). **Built.**

**23 Aug — 100% Python parity.** "SDEV must now achieve 100% absolute feature parity with the latest version of Python. Port every single feature — decorators, generators (`yield`), `*args`, `**kwargs`, all comprehensions, context managers (`with`), lambdas, `match`/`case`, `async`/`await`, metaclasses, property decorators, type hints, every dunder method — leave no stone unturned. You are the lead architect: decide the syntax, elegant and consistent. Forward and backward compatible. Deliver an exhaustive Master Documentation with, for every feature, its name, the SDEV syntax rule, and a side-by-side Python vs SDEV comparison." Your choices: **spec and implement together, then turn leftovers into milestones**; **a new file plus parity tracking**; **dual naming** (every keyword in v1 mystical style *and* plain words).

Built: a shared keyword table with both spellings (`src/lang/keywords.ts`); f-strings, bytes, numeric separators, binary/octal/hex literals, augmented assignment, walrus, decorators, `**`, `//`, `@`; comprehensions (list/dict/set/generator); `match`; generators; `with`; exceptions; starred unpacking; a generator-based interpreter; sets, tuples and generators as runtime values; a large Python-style library (builtins, itertools, functools, collections, math, json, re, time…); dunder methods mapped to `on_…` names (`__add__` → `on_add`, `__str__`/`__repr__` hooks); method calls on plain values (`d.items()`). Some clashing v1 words were renamed (`weave` → `enfold`, `sift` → `discern`). 130 new registry entries; `SDEV_PYTHON_PARITY_DOCUMENTATION.md` at `/docs/python`. **Built for v1**; deeper v2/native support of these features remains **planned**.

### Era 13 — Website refresh, Personal SDEV (August 2026)

**24 Aug — "Update the whole website."** You chose content refresh + design + visual redesign + post-launch cleanup, every page, and **remove the launch gate**. `/` is the homepage again; the countdown moved to `/launch`. **Built.**

**24 Aug — "Make it modern. Redesign the whole IDE so it looks and works like a real IDE. A new design. Rewrite the homepage text, and do not talk about Python or anything that isn't SDEV, and don't mention features every language already has."** Midnight Indigo with Sora/Manrope → "you only changed the colours and did nothing else" → Slate & Electric Blue, Archivo Black + Hind, a bento homepage, and a real CodeMirror 6 editor (multi-cursor, folding, find/replace, autocomplete, hover, lint gutter, shortcuts). Hero text became **"This is SDEV."** with the example code beside it. Title "sdev — Self-Hosted Language, WebAssembly + Native". **Built** (design later replaced).

**24 Aug** — two security fixes (the email sender locked to the server; fixed search paths on four email functions); accessibility fixes on the launch page, logo and IDE. **Built.**

**25–28 Aug** — native milestones 6g, 6h, 6i (see Era 12).

**30 Aug — Personal SDEV, your big idea.** "Everyone can make their own syntax and version of SDEV — in English or their chosen language, even mixing languages. Two ways: manual and with AI help. For manual, a page with all the commands where the user can change any of them. For docs, an ultimate documentation template personalised by AI; dynamic, so when the main docs update, every other updates too. For compiling, a template SDEV parser, lexer and codegen written in SDEV v2 that we adapt to the user's commands. Link every user's version to their account, with a share code (maybe usernames), so users can share ideas, and an IDE option to open any version. Users can add new functions to SDEV that we don't have — private or public — and request that their project be added to SDEV. Users can make and share their own libraries, stored online, importable, and downloadable for offline use. And hidden metadata in every SDEV file — users won't see it, the IDE will — storing the SDEV version, the syntax used and the syntax's share code/username, so the IDE can find the right version and translate the file to normal SDEV or the user's chosen version."

Your answers: depth — "you decide; add options for the user"; custom functions — "in SDEV, but they can add their own functionalities, functions and operators"; metadata — "a unique design the IDE recognises"; sharing — "their own usernames, a random code, and `@username/dialect-name`".

Built:
- `src/lang/dialect/`: catalogue, spec, `canonicalize`/`dialectize` (two-way word mapping), the hidden signature line `#⟨sdev⟩ …`, addresses, registry, docs generator;
- three levels: renaming words, block/comment/assignment style, and new constructs (functions and operators that turn into function calls);
- **Dialect Studio** `/dialects` (manual table + AI draft), **libraries** `/libraries` (`use "@user/lib@1.2.0"`, offline bundles), **extensions** `/extensions` (with "propose for core");
- a dialect switcher in the IDE status bar; signed downloads; personalised dialect docs from one template, refreshed when the template version changes;
- database tables for usernames, dialects, dialect versions, extensions, core requests, libraries, library versions, dialect docs; dialect columns on code files.

Then: "Add everything left in the plan. Redesign the whole IDE and add some of your ideas" → a Personal panel in the IDE (switch dialect, translate the open file both ways, libraries, extensions), signature-aware import, palette entries. **Built.**

**31 Aug – 1 Sep** — monitoring fixes: Install from the library list used a fake address; downloaded files showed the signature as a junk first line; `myList.count(x)` ran an unrelated Python-style function. **Fixed.** "And what happened with the file metadata?" — explained. **"Where is the info page where the user can view all of the data?"** → an **Info** button in the IDE status bar showing runtime, dialect and version, checksum (valid/stale), size, stamp time, translation origin, cloud sync state and library pins. **Built.**

### Era 14 — New IDEs, CLI, JavaScript removal, Understanding Agent (September 2026)

**4 Sep — "Build a completely new working IDE that has EVERY function a normal IDE has, every SDEV function and everything. You can invent new functionalities. Do not take inspiration from the old IDE or the website. Completely new and modern."** You chose: **replace `/ide`**; looks — "add different variations"; priorities — all four (deep language tooling, AI copilot everywhere, workspace power, live output surfaces). **sdev Studio** at `/ide` (the old one at `/ide/classic`): explorer, search & replace, outline, problems, timeline snapshots, streaming copilot, language library, settings, split editors, ⌘K palette, dock (terminal/REPL, canvas, app preview, web preview, bytecode), six themes. **Built.**

**4 Sep — "The design looks terrible. Completely redesign it. Take inspiration from other IDEs — modern, professional, clean. I do not want it to look even the slightest like it was made by an AI."** Palette — "add it as an option in the IDE"; typography — Sora + Manrope; layout — "classic sidebar by default, every other layout as an option in settings". Six palettes (graphite, ink, slate, carbon, bone, parchment), layouts (sidebar, dashboard, split, inspector), density, runtime choice. **Built.**

**4 Sep — Two long IDE prompts.**
- A PyQt6 desktop IDE (main window, explorer, tabs, terminal, highlighter, completer, and three invented features: a Live Architecture Map, an AI Error Whisperer, and a Time-Lens of variable values). Scaffold started, **cancelled**.
- "A completely new, modern, fully functional IDE from scratch — your own tech stack — dark theme, dockable panels, customisable layout, SDEV editor with highlighting, autocomplete, bracket matching, linting, file explorer, integrated terminal and Run, and at least two invented features", with two reference screen designs. Built at `/studio`: its own virtual filesystem, store, runner and language service; **Chrono** (scrub through an execution timeline, each step highlighting the line that produced it) and **Live Lens** (values shown inline as you type); then the **Prism AST** live graph, an execution heat map with value bubbles, and a **Time Machine** step-by-step replay. "Make it exactly like this [reference]" → Geist font, ribbon bar, breadcrumb strip, insight cards, tabbed console. *Some ribbon/breadcrumb chips copied from the reference (for example a "Z3 prover" status and "Traps/Monads" chips) are decoration, not real systems.* **Built** (and in **Antigravity** on 24 Oct, `/studio` was wired to the real SDEV compiler/interpreter engine and Supabase cloud persistence — see Era 19).

**8 Sep — "Do all of the remaining planned things (including internals)."** Handle claiming on Account, signature stamping on cloud saves and downloads, extensions applied when running, dialect docs cache, a Personal SDEV internals chapter. **"I meant all of the milestones left on the language"** → the self-hosting fixed point re-proved after fixing two real bugs (names read before assignment inside functions were treated as global; reused variable slots kept the previous function's type, which turned number addition into text joining). **Built.**

**8 Sep — "Make a completely new working CLI that has every feature the IDE has, including dialects."** `bin/sdev.mjs` built with esbuild from the same language code, state in `~/.sdev/store.json`: `run`, `repl`, `watch`, `check`, `ast`, `fmt`, `compile`, `run-bc`, `disasm`, `native`, file info/signing, full dialect management (create, edit words, docs, translate, install, publish), extensions, libraries, `auth`, `cloud pull/push`. **Built.**

**9 Sep — Monitoring fixes**: installed extensions vanished on every IDE load; enabled extensions pushed `#!sdev v2` out of view so programs ran on the wrong engine; a cloud deep link showed the signature line; `set.union(...)` threw. Also internal email functions locked to the server. **Fixed.**

**9–11 Sep — Bugs from screenshots.**
- Nine duplicate `untitled11.sdev` tabs → unique file IDs and names. **Fixed.**
- `if age is 18 or more` never ran in compiler mode → `or more`/`or less` in the self-hosted compiler. **Fixed.**
- In interpreter mode, `set лее to "Здравей"` then `say лее` printed nothing → `set x to …` now declares, `say` without brackets works. **Fixed.**

**11 Sep — "Fix the translator. I want it updated and integrated in the language source code, and I want it to work with dialects."** The translator now targets v1 or v2 words (`forge`→`set`, `speak`→`say`, `ponder`→`if`, `cycle`→`while`, plus `end`, `each`, `with`, `more`, `less`), respects a dialect's own words (`translateForDialect`), knows when "is" means compare versus assign, and the self-hosted lexer accepts names in any alphabet (Cyrillic, Greek, Japanese). Works in the IDE, CLI and v2 engine. **Built.**

**11 Sep — "Now we need to start removing the JavaScript or .mjs files and replacing all of them with SDEV."** You chose: **literally everything**; approach — "whatever you judge best"; pace — **one big sweep first, the rest as milestones**. The honest limit: a tiny JavaScript host must stay (browsers, Node and Electron need it to start SDEV at all). Built: `bin/sdevhost.mjs` (the single host kernel that compiles and runs any `.sdev` program and gives it files, shell, compiler and exit codes); `lang/stdlib/testkit.sdev`; three scripts rewritten in SDEV (`test-self-toolchain.sdev`, `test-driver-artifact.sdev`, `probe-self-lexer.sdev`) with their `.mjs` versions deleted. A real bug was found: `is` on two separately built strings compares identity, not text (fixed in **Antigravity** as Milestone A — see Era 19). **Milestones A–J** were written into `roadmap.md` (with Milestones A and B completed in **Antigravity** — see section 9.3).

**11 Sep — "Update the CLI — I have a problem with logging in and everything; also add a code editor/IDE."** Saved sessions with refresh, sign-up, email one-time code, token login, password reset, `whoami`, `logout`; `sdev edit` / `sdev ide` — an in-terminal editor with highlighting, line numbers, save, run, find, go-to-line, cut, format, quit. **Built.**

**12 Sep — The Understanding Agent.** "Build an AI that understands the user's intention in the code so it runs without an error. The user can write code however they like and the AI will understand and run it. The AI trains from previous programs the user ran so it understands them better. If the user wants, the AI can turn all of this into a dialect. The user will not be stopped by the syntax, can use their own syntax without needing a dialect, and won't be held down by v1, v2 or anything else. I need this integrated in the language's code, not just the IDE — running before the code generation — and able to turn off with `!#agent:off`. Maybe connect the AI that runs on the website to the user's computer, used only when internet is available; when it isn't, the AI runs on the user's PC. The user can choose with `!#agent: local/online`." Clarified: "the user can write whatever they like — `output Hello; out Nothing; name1 will be Twenty; terminal name1` — the AI reads every line and makes logic of all of it."

Built (`src/lang/agent/`): directives (`!#agent:off`, `on`, `local`, `online`, `auto`, `strict`), multilingual vocabulary, a whole-file sense pass, rule-based repairs, per-user memory that learns your words (with decay), the AI "brain" (online function or a local model), `promoteToDialect` ("sdev agent promote "My way""), CLI flags `--agent` / `--no-agent`. Every rewrite is checked by the real parser; if the reading wouldn't work, your file as written runs instead. Example result: `output Hello` / `name1 will be Twenty` / `terminal name1` prints `Hello` then `20`. Google sign-in was fixed in the same round. **Built.**

**12 Sep — "But look at that"** (`I want function called 11 with variable named tuesday`, `i need wednesday to be tuesday + 1`, `say to terminal wednesday`, `call 11 with 2`) → filler words stripped, unsafe names renamed (`11` → `n11`), output targets understood, natural function definitions (`to name with params`), blocks auto-closed by indentation. It printed 3. **Fixed.**

**13–14 Sep — Monitoring fixes to the agent.**
- Working programs were being rewritten (a function named `result` became `return`; `nums |> sum` became text) → symbols left alone, known names kept.
- One AI fix could rewrite the same line in every other file → memory saved only when lines still match one-to-one.
- English sentences ending with "." or ":" broke programs → punctuation counts as code only when it joins two things without spaces (`user.name`).
- Cloud saves failed silently → errors now shown.
- The AI silently gave up on files it couldn't read → the brain is still asked, with a note.
**Fixed.**

### Era 15 — Sharing, usernames, beginner projects, MCP (September 2026)

**19 Sep** — a critical build break (two files with half-merged code) and record literals `{ theme: "dark" }` being flattened to text by the agent. **Fixed.** "Fix the errors" → nothing broken was found. A batch of type errors was fixed.

**19 Sep — A request that was partly answered later.** You asked for five things:
1. Replace the Studio interpreter with your real SDEV compiler, so runs and debug traces use the real backend. *(Completed in **Antigravity** on 24 Oct — see Era 19.)*
2. Publish the Studio IDE so it's reachable from your own domain, not just `/studio`.
3. Publish the Libraries page so real users can create accounts, publish their own `@username/library` and install them.
4. Wire Studio to the real files table so projects, files and libraries persist across sessions, not just the seeded workspace. *(Completed in **Antigravity** on 24 Oct — see Era 19.)*
5. Build a real SDEV website with tutorials, examples and a getting-started page that links to Studio.

Questions were asked (run engine: self-hosted v2, native, or v2 with fallback; Studio address: `/studio` as main, its own subdomain such as studio.sdev.codes, or replace `/ide`; who may publish libraries; order), and you moved on to Milestone B. Items 1 and 4 are now **Built in Antigravity**; the domain routing and public policy choices remain open (see section 9.6).

**19 Sep — Milestone B.** "The website page listing dialects, extensions and programs, so I can share dialects publicly. Create a real dialect from my own code and run it in the IDE. Wire the CLI to the real database so it can save dialects, programs and files. Build the IDE page listing my own dialects, extensions and programs." → `/explore` (public dialects, extensions and shared programs, with search and install), `/my` (your own, with activate/publish/remove), the ready-made Bulgarian dialect **"Сдев"** (`sdev-bg`) with a sample program that runs in the IDE and CLI, CLI commands `dialect preset/pull/sync`, `ext publish/pull/remove`, `cloud rm/share/shared`, and a more forgiving `for each`. Then: "Build the dialects page with a Create Dialect form, Install and Publish, and confirm a dialect I save runs in the IDE" → a real Create Dialect form (name, address, purpose, languages, visibility, start from a template), Publish per row, your extensions/programs/shared lists; a dialect created through the form printed `здравей, свят` and `10` in the IDE. **Built.**

**19 Sep — "Add real usernames, because the current usernames are the emails."** Unique lowercase handles derived from your username, display name or full name (never the email), existing accounts backfilled, a username required at sign-up, `@handle` on gists and the account page. Yours is **@sava-milanov**. **Built.**

**19 Sep — "There is a problem with the website loading"** → each page now loads only its own code (homepage ~1.94 MB → ~964 kB). "No, it still doesn't load" → the live domain was missing its backend connection settings at build time; a safe fallback was added and https://web.sdev.codes was confirmed working. **Fixed.**

**26 Sep — Training the agent on five beginner projects.**
- Hello World — no instructions, they figure it out.
- Personal greeting — ask for their name, print "Hello, [name]" (first taste of input).
- Make a decision — ask yes/no and respond differently, logic without the word "if".
- Simple calculator — two numbers, show the result ("feels like a real tool").
- Mini quiz — 3 questions, track the score, show the result ("something they can hand to a friend and say 'try it'").

"The quiz at the end is important. It's the first thing they've built that someone else can use, which is what makes them want to show it. Each step teaches one new concept without ever mentioning syntax rules." Built: `ask "…" as name`, `name = ask "…"`, numeric input conversion, automatic `+` between pieces, closing blocks on dedent, bare conditions (`hungry is yes:`), case-insensitive yes/no, `add 1 to score` / `increase score by 1`; `scripts/test-beginner.ts` with 20 first-timer programs. **Built.**

**26 Sep** — three security findings about public reading of gists, profiles and usernames were marked intentional (shared pages need them; no private fields exposed). **Done.**

**26 Sep — "Add agent integrations (MCP)."** Outside AI assistants can connect with your consent: six tools (list, read and save your files; list dialects; list and read public gists), an approval page and sign-in that returns to where you were. Available after publishing. **Built.**

**29 Sep — SEO**: the homepage heading gained the descriptor "The self-hosting programming language for WebAssembly and native x86-64". An optional new guide page (programming-language design, ~20 searches/month) is **waiting for your go-ahead**.

### Era 16 — Everyday tasks, homepage 3D arc (September–October 2026)

**30 Sep — "Continue expanding and make a real agent, because it [should] understand even a simple prompt like: calculate 23-21. Fix everything and make tests to be sure it ABSOLUTELY works."** A maths-intent layer (number words, percentages, averages, roots, powers, known variables), 35 tests. **"I'm talking about not only counting but everything."** → offline everyday tasks (count from/down, say hi 3 times, reverse, uppercase, letter counts, even/odd, dice, coin, sort, times tables, greet) and, for anything else, the AI writes the whole program, which is checked for undefined names before running and retried once with the real error if it fails. `for i in sequence(1, 4)` now works. Tests: 31 everyday requests, 35 calculations, 12 free-form online requests all correct (FizzBuzz, Celsius→Fahrenheit, palindromes, sorted shopping lists…). One gate reported 31 newer-compiler items missing and was **not investigated**. **Built.**

**2 Oct — "Do the things annotated"** (screenshot) → remove the small v2 badge; "no, you can keep or remake the full feature and stat card, I just want them after the playground" → hero → Playground → cards. **Built.**

**The homepage 3D arc (5–7 Oct).**
1. "I'm thinking to redesign the website with different kinds of animations and modern interactions, but I don't want it too complicated or time-taking for a person who already saw it and now just wants the IDE." → principle: **"ambient responsiveness rather than blocking theatrics"**. You chose the **Full Redesign Package**: ⌘I/Ctrl+I to the IDE, a "Continue editing <file>" chip, card spotlight, "Open in IDE" on the hero code, run pulse, transitions ≤250 ms, reduced motion respected. **Built.**
2. "No, I want you to redesign the page to have 3D scrolling animations with an entirely new design." → Precision Dark (#080B12, #3B82F6, #22D3EE, #A78BFA), Archivo Black + Hind, "add all three" layouts; three prototypes; you chose "Immersive spatial darkmode". **Built.**
3. "No, I meant a 3D scrolling animation like a modern site, with a COMPLETELY new design." → three more prototypes proposed.
4. **"NO, I WANT A 3D SCROLLING ANIMATION. RESEARCH MODERN WEBSITES WITH THIS ANIMATION AND DO IT LIKE THAT!!!"** → a lazy-loaded Three.js "compiler flight": the camera travels through six stages (Source, Tokens, Tree, Bytecode, WebAssembly/x86-64, Fixed Point), a pinned 3D feature ring rotated by scrolling, static layout for phones and reduced motion. **Built.**
5. "OK, continue" → ⌘I from the Playground now carries your edited code into the IDE; typing "i" in a box no longer jumps away. **Fixed.**
6. "Redesign the website with more of this animation and more interactive." → cursor glow, magnetic buttons, hover-lifting "SDEV." letters, a tilting Playground, count-up stats, a zooming final tunnel, a draggable spinning ring, a clickable chapter rail, tilting cards. **Built.**
7. **"I want the website to look modern and professional — completely redesign all of it. Do not make it childish. Professional and understandable by anyone."** → **Graphite & Blue** (#0B0D12, #151922, #2A3140, #3B82F6), **Space Grotesk + DM Sans** (+ JetBrains Mono), "combine all layouts", "new design and new animations": split hero with a typing/executing demo, sticky "How it works" (Write, Understand, Compile, Run), bento cards with spotlight, zigzag rows; playful effects and Three.js removed. **Built — this is the current design.**
8. "Add more scrolling animations and interactiveness." → reading-progress bar, scroll depth and tilt, tabbed demo with pause/resume and Open in IDE, selectable language buttons. **Built.**
9. "I said, add 3D scrolling animation." *(One reply wrongly refused.)* → "Research online what a 3D scrolling animation is and then make it. Modern and professional. Also research good designs." → a Codrops-style scroll-controlled Three.js scene: physical slabs carrying SDEV compiler text, a camera orbit driven by scrolling, lazy-loaded, desktop and tablet only. **Built.**
10. "Continue building a new one." → 36 code tiles explode, assemble into a processor, then split into WebAssembly and Native x86-64 targets; forward and reverse scrolling, tablet framing and reduced motion verified. **Built.**

### Era 17 — Understander in SDEV, sdev:ai, local brain (October 2026)

**7 Oct — The AI-only dialect idea.** "A new version/kind of dialect of SDEV built only for AI — perfect for AI, so it writes code with fewer bugs and better results, and in less time. We can keep the code understander there to understand small errors and optimise the code. But first we need to completely optimise the understander so it understands absolutely everything, is very fast, and works on larger input like a whole project. Large scale." The proposed blueprint:
- a project-wide symbol table (no false "unknown name" across files);
- a token-stream rewriter instead of chains of regular expressions (target: under 2 ms on 10,000 lines);
- differential repair (send only the broken part to the AI, never the whole project);
- an AI dialect with 30–50% fewer tokens, explicit block markers (no guessed indentation), statements whose first word says what they do (`fn`, `let`, `ret`, `emit`), two-way conversion with human SDEV, and a compiler that accepts both.

**"The code understander must be COMPLETELY written in SDEV. Expand the current one and start the SDEV version; use the non-SDEV version as fallback. When you need a function the language doesn't have — add it!"** Planned modules: `tokenizer.sdev`, `project_graph.sdev`, `intent_sensor.sdev`, `repair_rules.sdev`, `dense_dialect.sdev`; planned primitives: slicing, `char_at`, `find`, `find_last`, `replace_all`, regex match/replace, hash maps, sets, growable lists, workspace file queries.

**"OK, let's start building it."** Built step by step:
1. `lang/agent/understander.sdev` + the bridge `src/lang/agent/sdev-engine.ts`; 17 new text/regex functions in both the JavaScript and Python runtimes (`lines`, `unlines`, `regex_capture`, `regex_replace`, `regex_find_all`, `char_at`, `is_letter`, `is_digit`…); output, maths words, `set`/`let`/`add`/`increase`/`decrease`/`becomes`. The SDEV engine answers only when it is sure of every line; otherwise the TypeScript version takes over.
2. Questions (`ask … as name`, `ask for name`, `name = ask …`), `when`/`otherwise` → `if`/`else`, closing blocks by indentation, `say` with joined pieces, names from your other IDE files; a 4,000-line file in about 1 second.
3. **"Build all of it in a big batch, not one by one."** → yes/no answers, typed numbers, `[name]`/`{name}` placeholders, counted loops (`count from A to B`, `repeat N times`, `count to N`), dialect words; and **sdev:ai** itself: `lang/agent/ai-dialect.sdev` with `aiToSdev`/`sdevToAi`, the `!#ai` header, short prefixes (`v` variable, `p` print, `f` function, `r` return, `?` if, `w` while, `each`), `==`, `&&`, `{}` blocks. 35 checks.

**7 Oct — "After I've already run it, the second run does the thinking again. After the understander has understood the code, paste it secretly in the file so it doesn't have to think a second time."** Each file now carries a hidden copy of its understood version (keyed by source, dialect and project names), plus a shared cache of the last 100 readings; a second run takes under 1 ms. **Built.**

**7 Oct — "When I give it the prompt 'make a window that is a calculator' it does nothing. I said make it work for everything."** Plain requests (make/build/create + window/app/calculator…) now go straight to the AI, which writes the whole program using the window toolkit; a safe `evaluate()` was added in JavaScript and Python. "Now it just writes the word Calculator into the terminal." / "It still does the exact same thing — maybe a problem with saving the understood code." → stale saved answers from older agent versions were being replayed; versioned caches, failed runs clear their copy, requests are never stored in shared memory. The calculator window opened with working buttons (`9 - 4 = 5`). **Fixed.**

**8 Oct — "Continue with the next thing on the plan."** → **Edit → Open as sdev:ai** (both directions); the online AI now writes whole programs in sdev:ai by default; everyday tasks moved into `understander.sdev` (reverse, upper/lower, length, even/odd, sort with biggest/smallest, times tables, dice/coin, "say hello to …", countdowns). **Built.**

**8 Oct — "Continue, and if you're done go to the next phase."** → the project index in SDEV (`lang/agent/project.sdev`: every name defined across files), cached per file; identical results to the TypeScript version on real files. **"Make all of it in a big batch."** → large files are read in remembered top-level parts, so after a one-line edit in a 4,400-line file the next reading drops from about 1.4 s to 0.2 s (the very first reading is not faster). Tested in scripts only, **not verified in the editor UI**.

**10 Oct — "Now we need to make the code understander run on the user's PC and not drain Lovable credits."** → a local model server option (Ollama/LM Studio, default `qwen2.5-coder:7b`), a settings section (address, model, test connection, "Also use website AI (uses credits)" off by default), `!#agent:online` per file. **"I don't want the user to need to install Ollama just to use the understander. They should just open the website and it works on their computer, without downloading anything."** → a model that runs **inside the browser** (WebLLM, Qwen2.5-Coder-1.5B-Instruct on WebGPU). Nothing to install, but the browser downloads about 1 GB once and keeps it (then works offline); "Prepare now" fetches it early; the status bar shows progress; Ollama became an optional Advanced setting; website AI stays off by default. Needs a recent Chrome, Edge or Safari. The real model was **not tested** here (no GPU in the test browser).

**11 Oct — three asks.**
1. "Wire the IDE to actually open sdev:ai files, so the AI dialect runs inside the editor instead of just converting to plain SDEV." — **Partly**: sdev:ai files open and run in the editor without false warnings, but they still run by converting to canonical SDEV inside the agent, by design.
2. "Build the Code Understander itself in SDEV — its parser, interpreter and block-closing rules — so it reads and runs only SDEV." — Block-closing rules **done** (15 Oct); the understander's own full parser and interpreter **Built in Antigravity** (24 Oct — see Era 19).
3. "Write a real app in sdev:ai — a quiz game or a to-do list — and run it in the editor." — a capitals quiz and a to-do list, both in the Edit menu, both run. **Built.**

### Era 18 — Releases, platform plan, Arduino remake start, v1/v2 record (October 2026)

**11 Oct — "Now I want to work on the compiling feature, the CLI, the VS Code extension, the Electron app and everything. All up to date, and updating automatically."** Built:
- `release.json` — one version (**5.1.0**) for every tool; `npm run release -- --bump patch|minor|major` rebuilds the CLI from the language source, ships it inside the extension, writes the download files and `public/releases.json`.
- **CLI** — fixed so it rebuilds from current code; checks once a day; `sdev update` replaces itself (tested against a stand-in site).
- **VS Code extension** — now runs the same CLI as the website (dialects, understander, sdev:ai, v1/v2, native); installs updates itself daily (`sdev.autoUpdate`) or via "sdev: Check for Updates".
- **Desktop app** — opens the live editor (always newest), a built-in copy offline, and a notice when the desktop part itself needs updating.
- Not tested inside real VS Code, nor as a packaged desktop app. **Not verified.**

**11 Oct — VS Code packaging.** "The file '/extension/LICENSE' is declared in the manifest but was not found." → repackaged twice ("do it again", "do it again"); the third time the real cause was found: one manifest line still said `LICENSE` instead of `LICENSE.txt`. Fixed and every declared file verified. Upload not tested from here. **Fixed.**

**15 Oct — "Continue working on the plan and the AI version."** → block-closing rules in SDEV (`lang/agent/blocks.sdev`: indentation-based closing for SDEV and sdev:ai, a diagnostic for unclosed or extra closers); sdev:ai gained automatic `}` closing and `+=`, `-=`, `*=`, `/=`. 125 checks. **Built.**

**16 Oct — The 10-phase platform upgrade.** A long specification (see section 9.2 for all 58 points). Its goal: "Turn SDEV from a collection of powerful capabilities into a coherent, discoverable application-development platform… developers (and AI assistants) should never have to guess whether an API exists, what target it runs on, or how to call it." Design rules: don't rewrite working systems, keep backward compatibility (deprecate with warnings), no fake buttons or APIs, prefer one source of metadata, keep the self-hosting philosophy, React stays TypeScript, implement foundations honestly when too big. At the time, only the audit happened; in **Antigravity** on 24 Oct, Phase 1 (Canonical API Registry, Runtime Explorer, target-aware linter, diagnostics catalogue) and key Phase 5 CLI commands (`sdev doctor`, `sdev explain`, `sdev lint`, `sdev api`) were built and verified (see Era 19).

**21 Oct — The Arduino remake (initial foundations).** "Before we continue, remake all of the Arduino features. Add all of the commands that Arduino C++ has and every library they have, make documentation of everything, and make it so I can upload WORKING CODE to the Arduino using just the website. Make all Arduinos work — Arduino UNO / Q / R3 / R4 / …" Built initially: `src/lang/hardware/arduino-api.ts` (core functions, constants, types, Serial and String methods, 52 curated libraries), `scripts/build-arduino-library-index.py` → `public/arduino/library-index.json` (all **10,232** Library Manager libraries), and ESP32 bootloader/partition files in `public/firmware/`. The rest of the Arduino remake was completed in **Antigravity** on 24 Oct (see Era 19).

**23–24 Oct — "Make me a document that has everything we talked about in our ENTIRE chat, everything we've done so far, everything planned, and every idea."** → `SDEV_Complete_Project_History.md` (v1), then **"Expand the document to its fullest potential"** → v2.

### Era 19 — The Antigravity Engineering Sprint (24 October 2026 — made in Antigravity)

On **24 October 2026**, you moved the workspace into **Google Antigravity** and asked: *"continue the work that is needed to be done. Then update the document in a new version in and write that the work you have done was made in Antigravity."*

All of the following work was engineered, integrated and verified in **Antigravity**:

1. **The Complete Arduino & Hardware Remake (Built in Antigravity)**
   - **30-Board Catalogue (`src/lang/hardware/board-db.ts` & `src/lang/hardware/board-db.test.ts`)**: Expanded `BOARDS` to 30 boards across every requested family: `uno` (Uno R3), `uno-r4-minima` (DFU), `uno-r4-wifi` (SAM-BA), `uno-q` (`app-lab`, documented clearly that it uses Arduino App Lab over its Linux side), `nano`, `nano-old` (57600 baud), `nano-every`, `nano-33-iot`, `nano-33-ble`, `nano-rp2040` (UF2), `nano-esp32`, `mega` (STK500v2), `leonardo` (AVR109), `micro` (AVR109), `mkr-wifi-1010`, `mkr-zero`, `mkr-wan-1310`, `zero`, `due`, `giga` (DFU), `portenta-h7` (DFU), `esp32`, `esp32-c3`, `esp32-s2`, `esp32-s3`, `esp8266`, `pico` (UF2), `pico-w` (UF2), `attiny85`, and `teensy41` (`arduino-cli`). Added `canFlashInBrowser(board)` and `canCompileInCloud(board)` helpers (with `wokwiBoard` set strictly only on verified Wokwi targets). Verified with **41/41 passing checks** in `board-db.test.ts`.
   - **Full SDEV → Arduino C++ Transpiler (`src/lang/hardware/transpile.ts` & `src/lang/hardware/strip.ts`)**: Added support for both `board "<id>" { … }` and `board "<id>" :: … ;;` blocks (while preserving C++ `Class::member` scope operators inside `:: … ;;`), multi-header `use "<Name>"` resolution via `findLibrary(name)` (`Ethernet` → `SPI.h` + `Ethernet.h`, `LiquidCrystal I2C` → `LiquidCrystal_I2C.h`, `DHT sensor library` → `DHT.h`, `Adafruit SSD1306`, `DallasTemperature`, `MFRC522`), `device <name> be <Class>[(<args>)]`, raw `cpp { … }` blocks, `conjure` / `to` functions (with automatic `Serial.begin(9600);` injection in `setup()` when `speak`/`say` is used), typed/array/qualified `forge` (`fixed` → `const`, `keep` → `static`, `volatile`), `ponder` / `otherwise ponder` / `otherwise`, `within <v> be sequence(a[, b[, step]])`, `cycle`, `yeet`, `skip`, `yield`, and all hardware statements and expressions (`pin … on/off/toggle/read/pwm/analog`, `analog … read/reference`, `wait … seconds/us`, `speak`, `say`, `tone`/`notone`, `shiftout`, `attach`/`detach`, `pulsein`, `now()`, `nowus()`, `randint`, `equals`, `differs`, `also`, `either`, `isnt`, `yep`, `nope`). Fixed a temporal-dead-zone initialization bug in `src/lang/hardware/arduino-api.ts`.
   - **All 7 Browser Upload Protocols (`src/lang/hardware/web-serial.ts`)**: Implemented `flashAvr` (STK500v1), `flashStk500v2` (STK500v2 with `0x1B` packet framing and XOR checksum for Mega 2560), `flashAvr109` (Caterina with 1200-baud touch reset for Leonardo/Micro), `flashSamba` (SAM-BA / BOSSA over Web Serial for Uno R4 WiFi, Zero, Due, MKR, Nano 33), `flashDfuWebUsb` (WebUSB DFU 1.1 for Uno R4 Minima, Giga R1, Portenta H7), `flashEsp` (SLIP framing + ROM bootloader commands for ESP32 / C3 / S2 / S3 / ESP8266), `buildUf2FromHexOrBin` & `flashUf2` (512-byte RP2040 UF2 blocks with magic `0x0A324655`/`0x9E5D5157`/`0x0AB16F30` and family `0xE48BFF56` + File System Access API / `.uf2` download), bidirectional `sendSerialText`, and the unified `flashBoard(board, port, firmware, onProgress)` dispatcher.
   - **Zero-Install Cloud Compilation & Rebuilt Hardware Panel (`src/lang/hardware/cloud-compile.ts`, `supabase/functions/compile-firmware/index.ts`, `src/components/ide/HardwarePanel.tsx`)**: Compiles verified boards in the browser with zero install via Wokwi Hexi (`https://hexi.wokwi.com/build`), supports local/self-hosted `arduino-cli` servers for all 30 boards, loads all 10,232 libraries from `/arduino/library-index.json` + 52 curated libraries with one-click SDEV examples (inserting directly into the active IDE file), shows a live C++ `.ino` preview, and adds a Send Line input to the Serial Monitor.
   - **Generated Hardware Documentation & Protocol Simulator Tests (`scripts/gen-hardware-docs.ts`, `public/SDEV_HARDWARE_DOCUMENTATION.md`, `scripts/test-transpile.ts`)**: Generated the 1,597-line `public/SDEV_HARDWARE_DOCUMENTATION.md` from the catalogue and verified **97/97 passing checks** in `test-transpile.ts` (including transpiling every curated library example with 0 warnings and balanced C++ braces, UF2 block validation, SLIP framing, and protocol state-machine simulators for STK500v1, STK500v2, AVR109, and SAM-BA).

2. **Self-Hosted Understander Parser & Interpreter in SDEV (`lang/agent/parser_eval.sdev` — Built in Antigravity)**
   - Built a 100% SDEV-written lexer, recursive-descent AST parser (`sdev_parse_program`), syntax validator (`sdev_validate_syntax`), and tree-walking interpreter (`sdev_eval_program`) supporting both v2 canonical SDEV (`say`, `set … to`, `if … else … end`, `while … end`, `for each … in … end`, `to … with … end`, `return`, `break`, `continue`, `ask`) and v1 canonical SDEV (`speak`, `forge … be`, `be … be`, `ponder`/`either … otherwise`, `cycle`, `iterate … through`, `conjure … :: … ;;`, `yield`, `yeet`, `skip`).
   - Wired into `src/lang/agent/sdev-engine.ts` (`sdevParseProgram`, `sdevValidateSyntax`, `sdevEvalProgram`) and verified with **86/86 passing checks** in `scripts/test-sdev-engine.ts`.

3. **Milestone M15: Machine Learning Standard Library (`lang/stdlib/ml/` — Built in Antigravity)**
   - **Batched Forward Passes**: Added `linear_forward_batch(layer, batch_x)` and `sequential_forward_batch(model, batch_x)` in `lang/stdlib/ml/nn.sdev`, and `gpt_forward_batch(model, batch_token_seqs)` in `lang/stdlib/ml/transformer.sdev`.
   - **Accelerated Matmul Dispatch**: Added `accel_matmul` and `d_accel_matmul` routing through `best_matmul` (CUDA → BLAS → WebGPU → pure-SDEV `t_matmul` fallback).
   - **Binary Checkpoints**: Added `save_checkpoint_bin(path, model, step, loss)` and `load_checkpoint_bin(path, model)` in `lang/stdlib/ml/train.sdev` using the `"SDEVML01"` magic header and IEEE-754 binary64 hex-framed parameter tensors for bit-exact round-trip restoration.
   - Verified with **20/20 passing checks** in `scripts/test-ml-stdlib.ts`.

4. **Self-Hosted Toolchain Milestones A & B (Built in Antigravity)**
   - **Milestone A — Byte-wise String Equality (`STREQ`, `0x90`)**: Added opcode `0x90` (`STREQ`) to `lang/bootstrap/seed.wat`, taught `lang/compiler/codegen.sdev` and `lang/bootstrap/compile.mjs` to emit `0x90` (`STREQ`) for `is` and `0x90` + `0x30` (`NOT`) for `is not` whenever either operand is string-typed, rebuilt `public/wasm/sdev-seed.wasm` and `lang/compiler/driver-artifact.mjs`, simplified `str_same` in `lang/stdlib/testkit.sdev` to use `is`, and verified 100% byte-identical fixed point across 88 cases.
   - **Milestone B — Remaining Probes and Gates Ported to SDEV**: Created `scripts/probe-self-codegen.sdev` (2/2), `scripts/test-self-lexer.sdev` (7/7), `scripts/test-self-parser.sdev` (8/8), `scripts/test-self-codegen.sdev` (52/52), and `scripts/test-shim-fixed-point.sdev` (88/88 cases, 6/6 checks), all running natively on `bin/sdevhost.mjs`.

5. **Canonical API Registry, Target-Aware Linter, Runtime Explorer, CLI Doctor/Explain & Studio Integration (Built in Antigravity)**
   - **Canonical API Registry (`src/lang/registry/api-registry.ts`)**: Harvests **576 canonical SDEV APIs** across 16 modules (`core`, `text`, `list`, `tome`, `math`, `matrix`, `graphics`, `turtle`, `ui`, `web`, `leaflet`, `kernel`, `hardware`, `ml`, `ffi`, `webgpu`) with target/capability metadata, Damerau-Levenshtein + cross-language alias `"Did you mean?"` suggestions (`fillrect` → `rect`, `println` → `speak`, `console.log` → `speak`, `len` → `measure`, `filter` → `sift`, `reduce` → `fold`), and `DIAGNOSTIC_CATALOGUE` (`SDEV001`–`SDEV015`).
   - **Static Linter & Quick Fixes (`src/lang/linter.ts`)**: Implements `lintSdevSource` and `applyQuickFix` covering all 15 diagnostic codes (`SDEV001` unbalanced blocks, `SDEV002` syntax errors, `SDEV003` division by zero, `SDEV004` unreachable code, `SDEV005` unused variables, `SDEV006` unknown function with `"Did you mean?"`, `SDEV007` target mismatch, `SDEV008` deprecated API, `SDEV009` `=` vs `be`, `SDEV010` foreign keywords, `SDEV011` arity mismatch, `SDEV012` builtin shadowing, `SDEV013` constant condition, `SDEV014` self-assignment/tautology, `SDEV015` planned API).
   - **IDE Runtime & API Explorer (`src/components/ide/RuntimeExplorerPanel.tsx` & `src/pages/IDE.tsx`)**: Interactive sidebar panel in the IDE with search, module/target/status filters, target badges, parameter docs, one-click "Insert Example", and a Diagnostics Catalogue tab.
   - **CLI Platform Commands (`cli/index.ts`)**: Added `sdev doctor`, `sdev explain <CODE|name>`, `sdev lint <file.sdev>`, and `sdev api [query]`, and rebuilt `bin/sdev.mjs`.
   - **Studio Real Compiler & Cloud Persistence (`src/studio/runner.ts` & `src/studio/store.ts`)**: Wired `/studio` to execute SDEV code through the real SDEV engine (`Lexer`, `Parser`, `Interpreter`, `execute`, `executeAsync`, `executeV2`) while recording **Chrono** time-travel steps, **Live Lens** inline values, and **Prism** AST trees, and syncing files bidirectionally with Supabase `code_files` when signed in.
   - **Windows Build & Node 25 Fixes**: Resolved the Windows NTFS case-insensitive collision between `CompilerScene.tsx` and `compilerScene.ts` in `src/pages/Index.tsx`, added `scripts/run-ts.mjs` (esbuild-backed TypeScript test runner so all `npm run test:*` scripts run under Node without requiring `bun`), and fixed Node 25's `localStorage` stub in `cli/env.ts`. Verified with **93/93 passing checks** in `scripts/test-registry.ts` and a clean `vite build`.

6. **The 100% Self-Hosted SDEV Language Milestone (Built in Antigravity)**
   Following your directive — *"make the language completely self hosted (no other programming language to be seen in the language source code), work in all already developed features and build then to the end perfectly and proffessionaly"* — the entire language core under `lang/` was purified and elevated to complete 100% self-hosted status:
   - **Zero Foreign Language Files in `lang/`**: Every single `.js`, `.mjs`, `.ts`, `.py`, `.wat`, and `.s` file was removed from the `lang/` source tree. The language sources are authored **strictly and exclusively in pure `.sdev` files** (alongside markdown documentation and JSON manifests). All host-side bridges, test harnesses, build-time differential oracles, and the 8KB WebAssembly bootstrap seed were relocated cleanly into `src/lang-bridge/` (`src/lang-bridge/seed/seed.wat`, `src/lang-bridge/oracle/compile.mjs`, `src/lang-bridge/oracle/v2.js`, `src/lang-bridge/native/codegen-x64.mjs`, `src/lang-bridge/native/link.mjs`, `src/lang-bridge/native/runtime.s`, `src/lang-bridge/compile-self.mjs`, `src/lang-bridge/driver-artifact.mjs`).
   - **Self-Hosted Compiler Driver (`lang/compiler/driver.sdev`)**: Authored the complete standalone compiler driver in pure SDEV (396 lines). It embeds the tokenizer, connects to `lang/compiler/codegen.sdev`, and executes the full self-compilation drive loop. Compiles itself to byte-identical bytecode (`bc=19214, pool=737`) matching the reference compiler down to the exact byte.
   - **Bootstrap & Seed VM in SDEV (`lang/bootstrap/seed_vm.sdev` & `lang/bootstrap/bootstrap.sdev`)**: Authored the full specification of bytecode opcodes, LEB128 variable-length integer encoding, WebAssembly binary generation, and stage-0 AST compilation in pure SDEV.
   - **Native x86-64 Backend in SDEV (`lang/native/codegen_x64.sdev`, `lang/native/runtime_x64.sdev`, & `lang/native/link.sdev`)**: Complete System V AMD64 instruction emitter, native assembly runtime generator (handling `_start`, memory allocations, Linux system calls `write`, `exit`, `clock_gettime`), and ELF linker driver authored entirely in SDEV.
   - **Bytecode Virtual Machine & Virtual OS Kernel in SDEV (`lang/runtime/vm.sdev` & `lang/runtime/kernel.sdev`)**: Built a full stack-based bytecode virtual machine capable of disassembling, stepping, and executing SDEV bytecode with full call-frame management; paired with a virtual operating system kernel featuring an in-memory Virtual File System (VFS), process table, round-robin scheduler, inter-process pipes, environment variables, and POSIX-style syscall dispatcher (`sys_read`, `sys_write`, `sys_spawn`, `sys_open`).
   - **Modular Standard Library v2 (`lang/stdlib/v2/`)**: 10 comprehensive standard library modules written in pure SDEV:
     - `text.sdev`: String utilities, padding, reversal, character analysis, and legacy v1 aliases (`etch`, `shatter`, `weave`).
     - `list.sdev`: List operations, deep clone, element append, concat, reverse, sum, min, max, and v1 aliases (`gather`, `pluck`, `invert`).
     - `tome.sdev`: Key-value dictionaries, key extraction, value iteration, map merge, pick, and v1 aliases (`inscribe`, `unscroll`).
     - `math.sdev`: GCD, LCM, factorials, Fibonacci sequences, primality testing, clamp, sign, and statistical mean.
     - `bits.sdev`: Bitwise shifts, bitmask tests, popcount, and bidirectional hexadecimal conversions.
     - `time.sdev`: Gregorian leap year calculations, days-in-month lookup, and `HH:MM:SS` duration formatting.
     - `func.sdev`: Higher-order combinators, take, drop, and pipeline helpers.
     - `json.sdev`: JSON string escaping, integer, and list serialization.
     - `types.sdev`: Dynamic type checking, null coalescing, and string-to-int conversion.
     - `random.sdev`: Linear Congruential PRNG (`rng_make`, `rng_next`, `rng_int_range`, `rng_choice`).
   - **26-Language Keyword Translator (`lang/translator/translator.sdev`)**: Natural language code translator covering 26 world languages with Unicode script detection (Cyrillic, Greek, Arabic, Hebrew, CJK, Latin) and keyword canonicalization to SDEV v2.
   - **SDEV v1 Compatibility Frontend (`lang/legacy/v1_frontend.sdev`)**: Full source-to-source transpiler parsing legacy v1 mystical syntax (`forge`, `conjure`, `::`, `;;`, `ponder`, `cycle`) into canonical SDEV v2.
   - **Multi-Paradigm Extensions in SDEV (`lang/paradigms/`)**:
     - `functional.sdev`: Algebraic Data Types (`Option` with `Some`/`None`, `Result` with `Ok`/`Err`), unwrap, and pattern matching dispatch.
     - `systems.sdev`: Linear memory byte arena, `arena_alloc`, `arena_reset`, i32 poke/peek, and C-like struct layout definition.
     - `data.sdev`: Tabular DataFrame engine, row insertions, column counting, CSV formatting, and Markdown table serialization.
     - `hardware.sdev`: Hardware DSL transpiler generating Arduino C++ `.ino` code from SDEV pin, wait, and speak statements.
   - **Self-Hosted Diagnostic Linter (`lang/linter/linter.sdev`)**: Implements Damerau-Levenshtein distance calculation, builtin suggestion ranking, and detection of foreign keywords (`function`, `const`, `console.log`) directly in SDEV.
   - **Multi-Track Parity Gate (209 Features)**: Validated using the pure SDEV parity agent (`lang/parity/agent.sdev`) across all 3 tracks (v1 TypeScript, v2 Self-Hosted WASM, and Native x86-64), confirming **0 missing required features** and regenerating `public/SDEV_PARITY_DOCUMENTATION.md` and `public/SDEV_INTERNALS.md`.
   - **Comprehensive Automated Test Suites**:
     - Unified automated runner `scripts/test-all.mjs` running all 10 core self-hosted test suites sequentially with **0 failures**: `test:toolchain` (3/3), `test:driver` (5/5), `test:self-lexer` (7/7), `test:self-parser` (8/8), `test:self-codegen` (52/52), `test:self-stdlib` (14/14), `test:self-subsystems` (21/21), `test:fixed-point` (88/88 cases, 6/6 checks), `test:parity` (209 features, 0 gaps), `test:wasm-runtime` (73/73).
     - Native bare-metal x86-64 Linux suite verified with **81/81 passing checks** via WSL.
     - Full production build (`npm run build` / `vite build`) verified cleanly with zero errors.

---

## 4. Feature encyclopedia — what exists today

### 4.1 Language v1 (the original SDEV)

**Core syntax**

```sdev
forge greeting be "Hello"
conjure greet(name) ::
  ponder name equals "" ::
    yield "Hello, stranger"
  ;; otherwise ::
    yield greeting + ", " + name
  ;;
;;
speak(greet("Sava"))

iterate n through [1, 2, 3] ::
  ponder n equals 2 :: skip ;;
  speak(n)
;;

attempt ::
  panic("boom")
;; rescue err ::
  speak("caught: " + err)
;;
```

**Keywords and forms:** `forge`/`be`, `conjure`, `ponder`/`otherwise`, `cycle`, `iterate … through`, `within … be`, `yield`, `yeet` (break), `skip` (continue), `attempt`/`rescue`, `essence`/`extend`/`new`/`self`/`super`/`init`, `async conjure`/`await`/`spawn`, `summon "gist:…"`, `js …` / `js { … }` / `js ( … )`, `link "file"` / `link … as …` / `link a, b from …`, `yep`/`nope`/`void`, `also`/`either`/`isnt`, `equals`/`differs`, `^`, `|>`, `(x) -> …`, `cond ~ a : b`, `# comments` and `// comments`, `::;;` empty dict and `{ key: value }` dicts, hex and scientific numbers. With the Python-parity layer, every keyword also has a plain-word spelling (`let`, `fn`, `if`, `import`…).

**Builtins (≈441, plus 576 total API entries in the Canonical API Registry).** Grouped:
- **Text:** `measure`/`len`, `replace`, `startswith`, `endswith`, `repeat`, `padleft`/`padright`, `charAt`, `indexOf`, `capitalize`, `title`, `center`, `trim…`, `is…` checks, `format`, `chars`, `split`, `join`, regex (`match`, `matchAll`, `replaceRegex`, `test`, `regex_capture`, `regex_replace`, `regex_find_all`), base64, `chr`/`ord`, `hex`/`oct`/`bin`.
- **Lists:** `gather`, `pluck`, `insert`, `remove`, `concat`, `flatten`, `zip`/`unzip`, `first`/`last`/`rest`, `take`/`drop`, `sum`, `product`, `average`/`mean`, `sort`/`sortDesc`, `unique`, `count`, `all`/`any`, `find`, `each`, `sift`, `fold`, `seek`, `every`, `some`, `enumerate`, `chunk`, `groupBy`, `[0] * 5`.
- **Tomes (dicts):** `has`, `get`, `set`, `del`/`erase`, `merge`, `entries`, `fromEntries`, `inscriptions`/`keys`, `values`.
- **Maths:** trig and hyperbolic, `log`/`log10`/`log2`/`exp`, `pow`, `sqrt`, `abs`, `floor`/`ceil`/`round` (and `ground`/`elevate`), `clamp`/`constrain`, `lerp`, `mapRange`, `sign`, `randint`, `random`, `pick`, `shuffle`, constants `PI`, `TAU`, `E`, `INFINITY`; bitwise operations.
- **Matrices:** `matrix`, `transpose`, `dot`, `matmul`, `matadd`, `matsub`, `reshape`, `flatten`, `identity`.
- **Functional:** `compose`, `pipe`, `curry`, `memoize`, `tap`, `times`.
- **System:** `input`, `delay`/`sleep`, `now`, `timestamp`, `exit`, `panic`, `throw`, `typeof`/`gettype`, `freeze`, `hash`, file I/O (`decipher`/`inscribe`, `appendFile`, `fileExists`, `deleteFile`, `listDir`), networking `fetch`, JSON.
- **Collections:** `Set`, `Map`, `Queue`, `Stack`, `LinkedList`, `Vec2`, `Sprite`.
- **Memory:** `buffer(n)`, `pointer(buf, i)` with typed reads/writes.
- **Graphics, UI, web, maps, kernel, hardware, ML host bindings** — see below.

**Runtimes for v1:** the TypeScript interpreter used by the IDE; the bytecode compiler + VM (`bytecode.ts`, `compiler.ts`, `vm.ts`); the standalone JavaScript interpreter (`public/sdev-interpreter.js`); the Python interpreter (`public/sdev-interpreter.py`); and the SDEV-written tree-walking interpreter (`lang/agent/parser_eval.sdev`, built in **Antigravity**).

**Python-parity layer (v1):** f-strings, bytes, numeric separators, binary/octal/hex, augmented assignment, walrus, decorators, `**`, `//`, `@`, list/dict/set/generator comprehensions, `match`, generators (`emit`/`yield`), `with`, exceptions with classes, starred unpacking, sets/tuples, a Python-style library (builtins, itertools, functools, collections, math, json, re, time…), dunder methods as `on_add`, `on_str`, `on_repr`…, method calls on plain values (`"x".upper()`, `d.items()`), and two spellings for every keyword.

### 4.2 Language v2 "Prism"

**A small program**

```sdev
#!sdev v2
say "What's your name?"
set name to ask "Name:"
say "Hello, " + name

set score to 0
for each answer in ["4", "Paris", "blue"]
  if answer is "Paris"
    set score to score + 1
  end
end
say "Score: " + str(score)

to fib with n
  if n < 2
    return n
  end
  return fib(n - 1) + fib(n - 2)
end
say fib(15)
```

**Everything v2 supports (self-hosted):** `say`, `set … to`, `set xs[i] to v`, `ask`, `if`/`else if`/`else`/`end`, `while`, `for each … in`, `break`, `continue`, `to name with params … end`, `return`, integers and decimals, text (including byte-wise `is` and `is not` via `STREQ` `0x90`, added in **Antigravity**), lists, tomes `{k: v}` with `keys`/`values`/`has`, `and`/`or`/`not` (short-circuit), `is`/`is not`/`or more`/`or less`/`<`/`>`/`<=`/`>=`/`%`, `true`/`false`/`nothing`, `attempt … rescue … end`, `throw`, `num()`, `ref` and `call` (functions as values), `make … capture … end` (closures), `kind`/`new`/fields/methods with `self`, `extends`/`super`, `use "path"` modules, text and number functions (`upper`, `lower`, `trim`, `substr`, `find`, `contains`, `split`, `join`, `replace`, `int`, `abs`, `min`, `max`, `range`, `sum`, `random`, `ceil`, `floor`, `round`, `length`, `concat`, `ord`, `chr`, `str`, `mklist`), maths (`i2f`, `f2i`, `fsqrt`, trig, log, pow…), `read_file`, `write_file`, `http_get`.

**How it runs.**
1. Your file is read by the self-hosted compiler: `lang/compiler/lexer.sdev` → `parser.sdev` → `codegen.sdev`.
2. That compiler itself was compiled once into `lang/compiler/driver-artifact.mjs` and runs on the seed VM `public/wasm/sdev-seed.wasm`, built from the hand-written `lang/bootstrap/seed.wat`.
3. The resulting bytecode runs on the same seed VM.
4. The old JavaScript bootstrap compiler (`lang/bootstrap/compile.mjs`) is used only at build time to prove the bytes are identical.

**Native track:** `lang/native/codegen-x64.mjs` + `runtime.s` + `link.mjs` produce static Linux ELF programs with no C library; `scripts/sdev-native.mjs file.sdev -o prog`. Supports text, lists, tomes, decimals and maths, closures, objects, inheritance, exceptions, loops with `break`/`continue`, file I/O, modules, program arguments, environment, timing, stderr.

**Parity:** `lang/parity/features.json`, the SDEV-written `lang/parity/agent.sdev`, `report.json`, `scripts/test-parity.ts`, `SDEV_PARITY_DOCUMENTATION.md`. At the last full run: 0 must / 0 should gaps on v1, v2 and native (the newer Python-style features are tracked separately).

### 4.3 Human languages and the translator

- 26+ human languages including Bulgarian, Spanish, French, German, Portuguese, Italian, Russian, Ukrainian, Polish, Turkish, Greek, Arabic, Chinese, Japanese, Korean…
- Lives **inside the Lexer** (`src/lang/translator.ts`, plus copies in the standalone interpreters): offline, deterministic, used by every runtime.
- Explicit keyword tables (500+ entries), multi-word phrases, protected builtin names, typo-tolerant matching that never touches names you declare, an AI fallback for unusual phrasing (web only).
- Targets v1 or v2 words (`translator-v2.ts`), distinguishes "is" as assign versus compare, respects dialect words (`translateForDialect`), and the self-hosted lexer accepts names in any alphabet.
- Python interpreter flags: `--lang <Name>`, `--translate-only`, `--languages`.

### 4.4 Personal SDEV — dialects, extensions, libraries, file metadata

- **Dialects** (`src/lang/dialect/`): rename any keyword or builtin, change block style (`end` words or braces), comment marker, assignment form, add new operators/functions; two-way conversion; addresses `@user/name` or a random 8-character code; versions; private / unlisted / public.
- **Pages:** `/dialects` (Create Dialect form, Use, Edit, Publish, Delete, Install by address or code, your extensions/programs/shared), `/explore` (public shelf), `/my` (your dashboard), `/libraries`, `/extensions`.
- **Ready-made dialect:** "Сдев" (`sdev-bg`), in Bulgarian, with a sample program.
- **Extensions:** SDEV-written functions and operators, private or public, auto-applied when enabled, "propose for core SDEV" review queue.
- **Libraries:** publish, version, `use "@user/lib@1.2.0"`, offline bundles, local cache.
- **Living docs:** each dialect's documentation is generated from one template in its own words and refreshed when the template changes.
- **Hidden file metadata:** the first line `#⟨sdev⟩ <encoded data>` carries runtime version, dialect and version, library pins, translation origin and a checksum. The IDE hides it, re-stamps on save, and shows it in the **Info** popover.
- **CLI:** `dialect …`, `ext …`, `lib …`, `cloud …` commands.

### 4.5 The Code Understander (Understanding Agent)

**Purpose:** let anyone write however they like; the agent works out what was meant before code generation.

**Directives** (first lines of a file):

| Directive | Effect |
|---|---|
| `!#agent:off` | strict SDEV, no understanding |
| `!#agent:on` | default |
| `!#agent:local` | only offline rules and the local/browser model |
| `!#agent:online` | allow the website AI for this file |
| `!#agent:auto` | online when reachable, local otherwise |
| `!#agent:strict` | no guessing |
| `!#ai` | the file is written in sdev:ai |

**Pipeline:**
1. Dialect and sdev:ai conversion.
2. The **SDEV-written engine** (`lang/agent/understander.sdev`, `project.sdev`, `blocks.sdev`, `ai-dialect.sdev`, and `parser_eval.sdev` added in **Antigravity**) — answers only when sure of every line, and can parse, validate syntax (`sdev_validate_syntax`) and execute canonical SDEV (`sdev_eval_program`) entirely in SDEV.
3. The TypeScript rules (`sense.ts`, `repair.ts`, `math.ts`, `tasks.ts`, `vocabulary.ts`) as fallback.
4. Learned memory (your words; versioned).
5. The AI brain — browser model first (`browser-brain.ts`, WebLLM), then your own model server, then the website AI only if allowed (`brain.ts`, `brain-prompt.ts` kept in sync with the `sdev-agent` function).
6. Every result is checked by the real parser; if it would not work, your original file runs.

**What it understands offline:** output in many phrasings (`output`, `out`, `print`, `show`, `terminal x`, `say to terminal x`), `name1 will be Twenty`, number words, maths phrases (`calculate 23-21`, percentages, averages, roots, powers), `ask … as name`, yes/no decisions, `when … otherwise`, `add 1 to score`, counted loops, placeholders `[name]`, joined `say` pieces, everyday tasks (reverse, case, length, even/odd, sort, dice, coin, times tables, greetings, countdowns), function sentences (`I want function called 11 with variable named tuesday`), closing blocks by indentation, dialect words.

**What goes to the AI:** whole-program requests such as "make a window that is a calculator", "FizzBuzz up to 15", "convert 100 celsius to fahrenheit". The AI writes the program (in sdev:ai by default), it is checked for undefined names, and if it fails at run time the AI gets one retry with the real error.

**Speed:** hidden understood copy per file (second run <1 ms); shared cache of 100 readings; chunk memory (one-line edit in 4,400 lines: 1.4 s → 0.07–0.2 s).

**Tests:** `test-agent.ts`, `test-beginner.ts` (20), `test-math.ts` (35), `test-tasks.ts` (31), `test-brain.ts`, `test-sdev-engine.ts` (86 checks in `test-sdev-engine.ts` alone, 166+ total across engine suites).

### 4.6 sdev:ai — the AI-first dialect

```sdev
!#ai
v score = 0
f add_point(n) { score += n }
each q in ["a", "b", "c"] {
  ? q == "b" { add_point(1) }
}
p "Score: " + str(score)
```

Prefixes: `v` (variable), `p` (print), `f` (function), `r` (return), `?` (if), `w` (while), `each`. Symbols: `==`, `!=`, `&&`, `||`, `{ }` blocks, `+= -= *= /=`. Missing `}` are closed by indentation. Two-way conversion (`ai-dialect.sdev`); IDE **Edit → Open as sdev:ai** (both ways); examples: a capitals quiz and a to-do list in the Edit menu.

### 4.7 AI helpers on the site

| Helper | What it does |
|---|---|
| SDev Assistant (chat) | Knows the language and internals, writes projects, tests its own code (3 auto-fix attempts), "Use" button |
| SDev Doctor | Fixes the open file, lists changes, explains how it works, "Apply fix" |
| Code translator | Any of 14 languages, or a whole HTML/CSS/JS website, → SDEV, self-testing |
| Free-form translator | AI fallback for unusual human-language phrasing |
| Understanding Agent brain | Writes or repairs programs (see 4.5) |
| MCP server | Lets outside AI assistants list/read/save your files and browse dialects and gists, with your consent |

All AI services have input-size limits to prevent abuse.

### 4.8 Machine learning, GPU and self-evolution

`lang/stdlib/ml/` — `tensor`, `autograd`, `nn` (with `linear_forward_batch`, `sequential_forward_batch`, and `accel_matmul` added in **Antigravity**), `transformer` (`gpt`, `generate`, and `gpt_forward_batch` added in **Antigravity**), `train` (Adam, clipping, perplexity, sampling, JSON checkpoints, and `SDEVML01` IEEE-754 binary64 checkpoints `save_checkpoint_bin` / `load_checkpoint_bin` added in **Antigravity**), `data` (tokenizer, crawler, distillation), `cuda`, `self_modify`, `auto_evolve`; `lang/stdlib/ffi.sdev`, `lang/stdlib/webgpu.sdev`. Everything above the native/GPU boundary is written in SDEV. Self-modification is limited to a whitelist and requires a review hook. Tests: `scripts/test-ml-stdlib.ts` (20 checks). Docs: ML, FFI, WebGPU, CUDA, Auto-Evolve.

### 4.9 Hardware and Arduino (remade in Antigravity)

- `board "<id>" { … }` and `board "<id>" :: … ;;` → Arduino C++ (`.ino`); statements and expressions including `pin 13 be output|input|input_pullup|input_pulldown`, `pin 13 write high|low`, `pin 13 on|off|toggle`, `pin 2 read`, `analog 0 read`, `pin 9 pwm 128`, `analog reference internal`, `wait 500`, `wait 2 seconds`, `wait 50 us`, `now()`, `nowus()`, `randint(a, b)`, `speak(...)`, `say ...`, `device name be Class(...)`, `within i be sequence(...)`, `ponder ... otherwise`, `use "Library"` (multi-header resolution), and `cpp { … }`.
- **30-board catalogue (`src/lang/hardware/board-db.ts`)**: Uno R3, Uno R4 Minima, Uno R4 WiFi, Uno Q (`app-lab`), Nano, Nano Old (57600 baud), Nano Every, Nano 33 IoT, Nano 33 BLE, Nano RP2040 Connect, Nano ESP32, Mega 2560, Leonardo, Micro, MKR WiFi 1010, MKR Zero, MKR WAN 1310, Zero, Due, Giga R1 WiFi, Portenta H7, ESP32, ESP32-C3, ESP32-S2, ESP32-S3, ESP8266, Raspberry Pi Pico, Pico W, ATtiny85, Teensy 4.1.
- **7 Browser Upload Protocols (`src/lang/hardware/web-serial.ts`)**: `STK500v1`, `STK500v2` (Mega 2560), `AVR109` (Leonardo/Micro), `SAM-BA` (Uno R4 WiFi, Zero, Due, MKR, Nano 33), `DFU WebUSB` (Uno R4 Minima, Giga R1, Portenta H7), `esptool` SLIP (ESP32/C3/S2/S3/ESP8266), and `UF2` 512-byte block generator + File System Access API (Pico/Pico W/Nano RP2040).
- **Zero-install Cloud Compilation (`src/lang/hardware/cloud-compile.ts`)**: Wokwi Hexi builder for verified boards + local/self-hosted `arduino-cli` bridge (`tools/arduino-build-server/server.mjs`) for all 30 boards.
- **Library Manager (`public/arduino/library-index.json` + `arduino-api.ts`)**: All **10,232** Arduino libraries searchable offline + 52 curated libraries with one-click SDEV examples.
- **Docs & Tests**: 1,597-line `public/SDEV_HARDWARE_DOCUMENTATION.md` generated by `scripts/gen-hardware-docs.ts`; 97 transpiler/protocol tests in `scripts/test-transpile.ts` and 41 board tests in `src/lang/hardware/board-db.test.ts`.

### 4.10 UI toolkit, graphics, web, maps, kernel

- **UI toolkit** (`src/lang/ui.ts`): `window(title, w, h)` … `endwindow`, layout (`row`, `column`, `group`, `tabs`/`tab`, `spacer`, `divider`), text (`heading`, `label`, `paragraph`, with `@key` live binding), inputs (`input`, `textarea`, `checkbox`, `slider`, `select`), `button(label, handler, variant)`, `image`, `progress`, `table`, `menu`/`menuitem`, `alert`, `uiget`/`uiset`. Renders in the App Preview; in `.exe` files as native Windows windows.
- **Graphics:** canvas setup, shapes, state, text, gradients, transforms, paths, sprites, turtle, colours, maths helpers; 3D wireframe examples.
- **Web DSL** (`src/lang/web.ts`): `page`/`endpage`, every HTML5 element, `tag`, `open`/`close`, `style`, `keyframes`, `script`, `onclick`/`on`, `raw_html`/`raw_css`/`raw_js`; WEB preview.
- **Leaflet & GIS:** 110+ functions (maps, markers, shapes, layers, events, geolocation, overlays, GIS maths).
- **Kernel simulation** (`src/lang/kernel.ts`): virtual filesystem, scheduler, syscalls with privilege levels, heap + GC, hardware layer, window manager.

### 4.11 IDEs & Canonical Registry

| IDE | Where | Highlights |
|---|---|---|
| sdev Studio | `/ide` | Explorer, search & replace, outline, problems, timeline snapshots, copilot, library, **Runtime & API Explorer** (added in **Antigravity**), Hardware panel, Personal panel, settings, split editors, ⌘K, dock (terminal/REPL, canvas, app, web, bytecode) |
| Classic IDE | `/ide/classic` | CodeMirror 6, autocomplete + hover, Problems, outline, breadcrumbs, REPL, App/Web/Canvas previews, Hardware panel, Runtime Explorer, Personal panel, understander settings, Info popover, Push to GitHub, Compile to .exe, Open as sdev:ai, cloud folders sync |
| Studio (Chrono/Prism) | `/studio` | Real SDEV v1 & self-hosted v2 execution + Supabase cloud persistence (wired in **Antigravity**), **Chrono** time-travel step scrubber, **Live Lens** inline values, **Prism AST** live graph, execution heat map, **Time Machine** replay |
| Desktop IDE | Electron app | Live editor + offline copy, Build Native / Build & Run, update notices |
| Terminal editor | `sdev edit` / `sdev ide` | Highlighting, line numbers, save, run, find, go-to-line, format |

### 4.12 Command-line tool `sdev`

`run`, `repl`, `watch`, `check`, `ast`, `fmt`, `lint` (added in **Antigravity**), `doctor` (added in **Antigravity**), `explain` (added in **Antigravity**), `api` (added in **Antigravity**), `compile` (`.sdevc`), `run-bc`, `disasm`, `native`, `info`/signing, `translate`, `dialect` (list/new/set/docs/install/publish/preset/pull/sync), `ext` (add/publish/pull/remove), `lib`, `cloud` (pull/push/rm/share/shared), `auth` / login / signup / OTP / reset / `whoami` / `logout`, `agent` (promote, options `--agent`, `--no-agent`), `edit`/`ide`, `update`. State lives in `~/.sdev`. Built from the same language code by `scripts/build-cli.mjs`.

### 4.13 Other distribution

- **VS Code extension** (now 5.1.0): grammar for v1/v2/`js{}`/`board`/ML, snippets, Run File/Selection, v2 runner, Build Native, `sdev.dialect`, runs the shared CLI, auto-updates.
- **Windows installer v2.0** (batch): installs, downloads, wrappers, file association, PATH, extension.
- **`.exe` packaging:** runtime stub + payload (`SDEVPACK`), native windows for UI and canvas, browser for pages.
- **Release system:** `release.json` → `scripts/release.mjs` → `public/downloads/*`, `public/releases.json`.
- **Downloads menu:** `.sdev` file, HTML app, Python and JS interpreters, Windows installer, compiler `.mjs`, CLI, VS Code `.vsix` and source zip, Electron app, books (PDF), documentation.

### 4.14 Website, accounts, backend

**Pages:**

| Path | Page |
|---|---|
| `/` | Homepage (Graphite & Blue, 3D scroll scene, Playground with share links, feature cards) |
| `/home` | Homepage alias |
| `/launch` | Archived countdown |
| `/ide`, `/ide/classic`, `/studio` | IDEs |
| `/docs` (+ `/docs/<source>`) | Documentation viewer |
| `/explore`, `/my`, `/dialects`, `/libraries`, `/extensions` | Sharing and Personal SDEV |
| `/auth`, `/account` | Sign-in and account (profile, handle, files, gists, stars, history, admin) |
| `/g/<slug>` | Public gist |
| `/privacy`, `/terms`, `/unsubscribe` | Legal and email |
| `/.lovable/oauth/consent` | MCP approval page |

**Accounts:** email + Google sign-in; unique usernames (`@sava-milanov`); profiles (name, avatar, bio, website); admin role; invite codes.

**Data stored:** profiles, user roles, usernames, code files (with folders, dialect, runtime and library pins), folders, gists, run history, starred snippets, invite codes, dialects and versions, extensions, core requests, libraries and versions, dialect docs, email queue tables.

**Email:** notify.sdev.codes, branded sign-in emails, launch-reminder / launch-day / post-launch-guide templates, unsubscribe and suppression handling.

**SEO:** per-page titles and descriptions, sitemap, robots, `llms.txt`, share image, structured data, Search Console verified.

### 4.15 Documentation and books

| File | Contents |
|---|---|
| `SDEV_DOCUMENTATION.md` | Original v1 reference (~3,000+ lines), plus web building, hardware, text tooling |
| `SDEV_V2_DOCUMENTATION.md` | v2 Prism guide in the same shape as v1 (25 sections) |
| `SDEV_ULTIMATE_DOCUMENTATION.md` | Generated: every guide + every function explained (~314 KB) |
| `SDEV_FULL_DOCUMENTATION.md` | The detailed overall guide and milestone history |
| `SDEV_INTERNALS.md` | Compiler, VM, milestones, roadmap |
| `SDEV_PARITY_DOCUMENTATION.md` | Track parity matrix |
| `SDEV_PYTHON_PARITY_DOCUMENTATION.md` | Python vs SDEV side by side |
| `SDEV_HARDWARE_DOCUMENTATION.md` | 1,597-line hardware reference generated in **Antigravity**: 30 boards, core API, 52 curated libraries, 10,232 Library Manager index, 7 upload protocols |
| `SDEV_LEAFLET_DOCUMENTATION.md` | Maps and GIS |
| `SDEV_ML_DOCUMENTATION.md`, `SDEV_FFI_DOCUMENTATION.md`, `SDEV_WEBGPU_DOCUMENTATION.md`, `SDEV_CUDA_DOCUMENTATION.md`, `SDEV_AUTOEVOLVE_DOCUMENTATION.md` | ML and acceleration |
| `sdev-book-en.md` / `.pdf`, `sdev-book-bg.md` / `.pdf` | The sdev Book (EN 6,011 lines, BG 7,653 lines, designed A5 PDF) |
| `docs/launch/*` | Launch posts and playbook |
| `sdev-pitch.mp4` | 2-minute pitch video |
| `SDEV_Complete_Project_History.md` | This Complete Project Record (v3, updated in **Antigravity**) |

---

## 5. Design history

| When | Look | Fonts | What happened |
|---|---|---|---|
| Dec 2025 | Default playground | — | First version |
| 31 Jan 2026 | "Dark & Futuristic" neon cyberpunk, glassmorphism | Orbitron, JetBrains Mono, Inter | Later rejected for good |
| 6 Apr 2026 | Rust/Go/TypeScript-inspired dark developer look | Space Grotesk, Inter, JetBrains Mono | "So it doesn't look AI-made" |
| 5 Jun 2026 | Sky blue / cyan / orange from your cover art; 5 IDE themes | — | "Remove gradients", "no orange hover" |
| 5–6 Jun 2026 | IDE redesign; liquid glass option | JetBrains Mono for tabs | Liquid glass removed (broke layout); IDE made flat |
| 24 Aug 2026 | Midnight Indigo | Sora + Manrope | "You only changed the colours" |
| 24 Aug 2026 | Slate & Electric Blue, bento homepage | Archivo Black + Hind | Real CodeMirror editor; "This is SDEV." |
| 4 Sep 2026 | Studio IDE palettes (graphite, ink, slate, carbon, bone, parchment) | Sora + Manrope; Geist in `/studio` | "Must not look AI-made" |
| 5 Oct 2026 | Precision Dark, "Immersive spatial darkmode" | Archivo Black + Hind | 3D CSS hero |
| 5–6 Oct 2026 | Three.js "compiler flight", playful interactions | — | "Not childish" |
| 6 Oct 2026 → now | **Graphite & Blue** (#0B0D12 / #151922 / #2A3140 / #3B82F6) | **Space Grotesk + DM Sans + JetBrains Mono** | **Current.** Plus a professional scroll-driven Three.js compiler scene (slabs → exploding tiles → processor → WebAssembly and native targets) |

Homepage structure today: split hero with a live typing demo and "Continue editing" chip → 3D "How it works" scene → Playground → feature and stat cards → learn/ship rows → get-started paths → footer with the CC BY-SA notice.

---

## 6. Your rules and preferences

| Rule | Where it came from |
|---|---|
| The syntax must be radically different from Python/JS/Go | "Make it a lot different from any other language" (Dec 2025) |
| …but v2 must be **very easy to understand** | "I don't want the new syntax to be that hard" (Jul 2026) |
| Python and JavaScript runtimes must have the same features; new primitives go into both at once | "From now on the whole language will be on Python" → dual runtime rule |
| The documentation defines the language: never change it to hide a gap | "IN NO CIRCUMSTANCE CHANGE THE DOCUMENTATION" (Mar 2026) |
| Documentation must only grow, and explain every function | Ultimate documentation (Aug 2026) |
| v2 must be fully self-hosted; the IDE runs the self-hosted compiler, never JavaScript | Aug 2026 |
| Move language logic into SDEV wherever possible (the understander too); add missing functions to the language | Sep–Oct 2026 |
| The understander must not spend Lovable credits by default; nothing to install | Oct 2026 |
| Show SDEV branding, never Lovable; hide the badge | Mar and Jun 2026 |
| The site must look professional, modern, understandable by anyone; never childish; no neon/cyberpunk; must not look AI-made | Apr, Sep, Oct 2026 |
| No gradients in the IDE; no orange hover; IDE settings must really work | Jun 2026 |
| Homepage copy: talk only about SDEV; don't mention features every language has | Aug 2026 |
| Returning visitors must reach the IDE instantly; animations must never block | Oct 2026 |
| Prefer big batches over one-by-one steps | Oct 2026 ("build all of it in a big batch") |
| Research how others do it before building (e.g. `.exe`, 3D scroll) | Jun and Oct 2026 |
| Keep the multi-line `js { }` support you asked for — never remove features silently | Jan 2026 |

---

## 7. Decisions, reversals and rejected directions

| Topic | Decision / outcome |
|---|---|
| Python-only language (Dec 2025) | Became dual-runtime parity instead |
| Python interpreter vs browser | The language started in the browser because the platform builds web apps |
| AI model for the translator | You chose Claude; Gemini was used because of the gateway |
| Library hosting | GitHub Gists (`summon`) over a built-in database; later also the SDEV library registry |
| Graphics | Both canvas and turtle |
| Distribution | Both single HTML and NPM; Windows-only installer |
| Compiler target (Mar 2026) | Bytecode/IR, browser + CLI |
| IDE (Mar 2026) | Electron desktop + web IDE |
| OS work priority | "Language basics first", then the kernel |
| Freeform translation | Hybrid (dictionary first, AI fallback), everywhere |
| Accounts | Email + Google, extended profile, all four account features, guests kept |
| UI toolkit scope | The richest option |
| Docs format | Site + downloadable book; later a designed PDF of 6,000+ lines |
| `.exe` approach | Standalone with bundled runtime, following PyInstaller/Node SEA |
| Graphics windows in `.exe` | Native windows for canvas and UI, browser for pages |
| v2 syntax | Full redesign with refine fallback → then made easy English |
| WebAssembly vs asm | Both: WASM in the browser, x86-64 native for desktop |
| "Whole language in ASM" | Via self-hosting (SDEV written in SDEV) |
| CUDA | Thin FFI to cuBLAS/cuDNN, not CUDA in SDEV |
| Self-modification | Gated, proposals only, review hook required |
| Python parity | Spec + implement together; new doc + tracking; dual naming |
| Launch gate | Removed after launch; countdown archived at `/launch` |
| Personal SDEV depth | "You decide; give users options" → three levels |
| New IDE | Replace `/ide`; classic kept |
| JavaScript removal | Literally everything except the irreducible host; one sweep, then milestones A–J (A & B completed in **Antigravity**) |
| Local AI | Ollama rejected (no installs) → in-browser model |
| Liquid glass | Removed |
| Three.js | Removed for the professional redesign, then brought back as a professional scroll scene |
| sdev Academy | Prompt written, then "forget the prompt" |
| PyQt6 desktop IDE | Cancelled |
| Early "fully self-hosted" claim (Jul) | Later bugs found and fixed; fixed point re-proved (Sep) and expanded with `STREQ` in **Antigravity** (Oct) |
| Early "full feature parity" claims for the VM (spring) | Not true at the time; real parity came in Aug with the parity agent |

---

## 8. Notable bugs and how they were fixed

| Symptom | Real cause | Fix |
|---|---|---|
| "cannot call non-function" in examples (Feb) | `PI()` called while `PI` was a number | `PI` used as a constant |
| AI Fibonacci used `iterate` (Feb) | Keyword didn't exist | `iterate … through` added |
| Leaflet map showed a blank page (Feb) | JS interop/data loading issues | Ready-made `map-sdev.html` |
| `js { }` multi-line support vanished (Jan) | A simplification removed it | Restored all three forms |
| Bulgarian Hello World failed (May) | Nouns mapped to keywords | Nouns removed; names protected |
| Bulgarian class program failed (May) | Missing `есенция`, `инит`; `създай` used for both variables and methods | Mappings + `forge name(` → `conjure` |
| Cloud save "success" but nothing saved (May) | Two sync systems fighting; stale IDs; dialog opened early; 406 on update | Tracked IDs, awaited lists, insert fallback, query fix |
| UI widgets didn't respond (May) | UI state not connected to the runtime | Reactive UI state |
| IDE settings did nothing (Jun) | Theme values overridden by other styles | Applied directly on the IDE root |
| IDE controls floated out of view (Jun) | Liquid glass effect | Removed |
| `self.radius` empty in classes (Jun) | UI toolkit `input()` hid the language `input()` | Context-aware `input` |
| Installer wrote nonsense files (Jun) | Downloads returned HTML; preview host blocked; Unix line endings | curl + checks, public domain, CRLF |
| `.exe` closed instantly (Jun) | Console closes after the program ends | Pause when double-clicked |
| Canvas `.exe` opened a white browser page (Jun) | Web `canvas` tag replaced graphics `canvas()` | Name clash fixed |
| v2 sample didn't run (Jul) | IDE's `// filename` header hid the shebang | Scan the first lines; route to v2 |
| `codegen.sdev` couldn't compile itself (Jul) | Missing `%` and expression statements | Added both |
| Library Install used "@?/name" (Aug) | Owner username not fetched | Real addresses |
| Downloaded files had a junk first line (Aug) | Signature not stripped on import | Stripped everywhere |
| `myList.count(x)` froze (Aug) | Python-style `count` chosen over v1 | v1 builtin wins (except on sets) |
| Installed extensions disappeared (Sep) | Sync overwrote the cache | Merge instead of overwrite |
| Programs ran on the wrong engine (Sep) | Extensions pushed `#!sdev v2` down | Detect from the user's own file |
| Nine `untitled11.sdev` tabs (Sep) | Counter reset on reload | Unique IDs and names |
| `if age is 18 or more` never ran (Sep) | Compiler ignored "or more" | Added `or more` / `or less` |
| `set лее to "Здравей"` printed nothing (Sep) | `set` didn't declare; `say` needed brackets | Both fixed |
| `is` on equal strings said "different" (Sep → Oct) | VM compared string handle identity | **Fixed in Antigravity (Milestone A):** added `STREQ` (`0x90`) to `seed.wat`, `codegen.sdev`, and `compile.mjs` |
| Agent rewrote working programs (Sep) | Over-eager rules | Leave symbols and known names alone; author's version wins |
| One AI fix leaked into all files (Sep) | Memory keyed only by line text, misaligned indexes | Save only when lines match one-to-one |
| Sentences with "." broke programs (Sep) | Over-broad punctuation check | Code punctuation only without spaces |
| `{ theme: "dark" }` became text (Sep) | Record literals not recognised | Literals left alone |
| Whole app failed to build (Sep) | Half-merged code in two files | Repaired |
| Live site didn't load (Sep) | Huge bundle; then missing backend settings at build | Code splitting; safe build fallback |
| "Calculator" printed instead of a window (Oct) | Stale saved answers from older agent versions | Versioned caches; requests never stored |
| VS Code "LICENSE not found" (Oct) | Manifest said `LICENSE`, file was `LICENSE.txt` | Manifest fixed |
| `CompilerScene` build failure on Windows NTFS (Oct) | `CompilerScene.tsx` vs `compilerScene.ts` case-insensitive extension resolution | **Fixed in Antigravity:** explicit `.tsx`/`.ts` import specifiers in `Index.tsx` and `CompilerScene.tsx` |
| `STRING_SUMMARY` TDZ crash in `arduino-api.ts` (Oct) | `STRING_METHODS.map(...)` ran before `STRING_SUMMARY` was assigned | **Fixed in Antigravity:** guarded `STRING_SUMMARY?.[...]` during initialization |
| Node 25 `localStorage.getItem is not a function` in CLI/tests (Oct) | Node 25 defines an uninitialized `globalThis.localStorage` stub | **Fixed in Antigravity:** unconditional `Object.defineProperty` in `cli/env.ts` and `scripts/run-ts.mjs` |

---

## 9. Open work — every checklist

### 9.1 Active now — the Arduino remake (Completed in Antigravity on 24 Oct 2026)

- [x] **Every board** in the catalogue (`src/lang/hardware/board-db.ts`): Uno R3, Uno R4 Minima, Uno R4 WiFi, Uno Q, Nano family (Nano, Nano Old, Nano Every, Nano 33 IoT, Nano 33 BLE, Nano RP2040 Connect, Nano ESP32), Mega 2560, Leonardo, Micro, MKR family, Zero, Due, Giga, Portenta, ESP32 / ESP32-C3 / ESP32-S2 / ESP32-S3 / ESP8266, Raspberry Pi Pico / Pico W, ATtiny85, Teensy 4.1. (**Built in Antigravity**, 41/41 tests passing.)
- [x] **Every Arduino core command** available in the `board` block as SDEV words and raw C++, with both `::`/`;;` and `{}` blocks (`src/lang/hardware/transpile.ts` & `strip.ts`). (**Built in Antigravity**.)
- [x] **Every Library Manager library** usable with `use "Name"` (connected the 10,232-library index and 52 curated multi-header libraries to the transpiler, IDE and builds). (**Built in Antigravity**.)
- [x] **Rewrite the SDEV → Arduino translator** so every documented example really works. (**Built in Antigravity**, 0 warnings across all curated library examples.)
- [x] **Compile on the website with nothing to install:** the hosted builder (`src/lang/hardware/cloud-compile.ts`) strictly gated to verified Wokwi boards; local/self-hosted `arduino-cli` build server for all 30 boards. (**Built in Antigravity**.)
- [x] **Browser upload per board family (`src/lang/hardware/web-serial.ts`):** STK500v1 (Uno/Nano), STK500v2 (Mega), AVR109 (Leonardo/Micro), SAM-BA (R4 WiFi/MKR/Zero/Due/Nano 33), DFU over WebUSB (R4 Minima/Giga/Portenta), esptool SLIP (ESP32/ESP8266), UF2 (Pico/RP2040). (**Built in Antigravity**.)
- [x] **Rebuild the Hardware screen** in the editor (`src/components/ide/HardwarePanel.tsx`). (**Built in Antigravity**.)
- [x] **Full hardware documentation** generated from the command catalogue (`scripts/gen-hardware-docs.ts` → `public/SDEV_HARDWARE_DOCUMENTATION.md`, 1,597 lines). (**Built in Antigravity**.)
- [x] **Tests:** translator, protocol simulators, real compiles of every example (`scripts/test-transpile.ts`, 97/97 passing). (**Built in Antigravity**.)
- [x] **Uno Q:** documented that it uses Arduino App Lab (no browser flashing). (**Built in Antigravity**.)
- [ ] **Real-board physical testing** — protocol state machines are verified in simulator tests; physical USB flashing awaits plugging in each physical board.

### 9.2 The 10-phase platform upgrade (Phase 1 & key Phase 5 items Built in Antigravity; remainder Planned)

**Phase 1 — Canonical API/runtime contract (Built in Antigravity)**
- [x] 1. One canonical API registry (`src/lang/registry/api-registry.ts`) used by tooling, Runtime Explorer, linter, CLI and diagnostics (576 APIs across 16 modules). (**Built in Antigravity**.)
- [x] 2. Seeded only from real builtins (builtins, graphics, ui, web, hardware, collections, ML…); planned APIs marked `planned`. (**Built in Antigravity**.)
- [x] 3. Runtime/target model (`v1`, `v2-wasm`, `native-x64`, `browser`, `cli`, `hardware`). (**Built in Antigravity**.)
- [x] 4. A Runtime/API Explorer panel (`src/components/ide/RuntimeExplorerPanel.tsx`) with search, signatures, examples, targets and Insert Example, wired into the IDE sidebar. (**Built in Antigravity**.)
- [x] 5. Target-aware API lookup and badges for unsupported APIs. (**Built in Antigravity**.)
- [x] 6. Better unknown-name diagnostics (`src/lang/linter.ts`): `"Did you mean?"` Damerau-Levenshtein + alias suggestions, target hints, quick fixes (`applyQuickFix`, e.g. `fillrect` → `rect`), stable codes (`SDEV001`–`SDEV015`). (**Built in Antigravity**.)
- [x] 7. F1 help keybinding for the symbol under the cursor in CodeMirror. (**Built in Antigravity**.)
- [x] 8. Machine-readable API manifest (`exportApiManifest()`). (**Built in Antigravity**.)

**Phase 2 — Consistency and language quality**
- [x] 9. Support for both `::`/`;;` and `{}` blocks in hardware and `sdevCheckBlocks` diagnostics. (**Built in Antigravity**.)
- [x] 10. String interpolation `"{name} has {count}"` with expression evaluation and `{{...}}` literal escaping across tracks. (**Built in Antigravity**.)
- [x] 11. Scalar `match` statement on v2 compiler with jump test tree, wildcards `_`, and condition guards. (**Built in Antigravity**.)
- [ ] 12–14. Optional type annotations in v2.
- [x] 15. Immutable variable bindings (`fixed` / `const` / `val`) across v1/v2 with compile-time & runtime reassignment rejection. (**Built in Antigravity**.)

**Phase 3 — First-class UI and events**
- [ ] 16–23. Unified event model for UI and canvas, keyboard/pointer helpers, preview error overlays, conformance Calculator and Todo apps with automated UI tests.

**Phase 4 — Graphics and games**
- [ ] 24–27. Turtle vs general graphics namespace separation, multi-canvas support, game template.

**Phase 5 — Project, CLI, tooling (Core CLI & Linter Built in Antigravity)**
- [x] 28–29. Standard `sdev.json` project file, `sdev new`, and `sdev init` templates (`console`, `game`, `hardware`, `ml`). (**Built in Antigravity**.)
- [x] 30. CLI commands `lint`, `doctor`, `explain`, `api`. (**Built in Antigravity**.)
- [x] 31. `sdev doctor` (checks CLI version, Node & Python, WASM seed VM, native x86-64 codegen, Arduino library index, and API registry). (**Built in Antigravity**.)
- [x] 32. `sdev explain <code>` backed by `DIAGNOSTIC_CATALOGUE` (`SDEV001`–`SDEV015`) and the API registry. (**Built in Antigravity**.)
- [x] 33. Formal formatter test suite (`scripts/test-formatter.ts`, 8/8 test cases verifying indentation, idempotency, blank line normalization, and comment/string safety). (**Built in Antigravity**.)
- [x] 34. Static linter (`src/lang/linter.ts`): unused variables, unreachable code, builtin shadowing, division by zero, unknown APIs, target mismatch, arity mismatch, constant conditions, self-assignment. (**Built in Antigravity**, 93/93 checks passing in `scripts/test-registry.ts`.)
- [ ] 35–36. Unified test runner and profiler scaffolding.

**Phases 6–10 — Executable docs, AI manifest loop, education views, conformance suite**
- [ ] 37–58. Remaining cookbook/CI docs runner, AST/stack visualisers in Classic IDE, and full conformance suite.

### 9.3 Replace JavaScript with SDEV — milestones A–J

- [x] **A.** String equality: added `STREQ` (`0x90`) in `seed.wat`, taught `codegen.sdev` and `compile.mjs` to emit it when either side is typed as a string, rebuilt `sdev-seed.wasm` and `driver-artifact.mjs`, and simplified `str_same` in `testkit.sdev`. (**Built in Antigravity**.)
- [x] **B.** Moved remaining probes and gates to SDEV (`probe-self-codegen.sdev`, `test-self-lexer.sdev`, `test-self-parser.sdev`, `test-self-codegen.sdev`, `test-shim-fixed-point.sdev`). (**Built in Antigravity**.)
- [ ] **C.** Move the WASM and native test suites to SDEV (needs run-bytecode, assembler and linker host calls).
- [ ] **D.** Move the build scripts (`build-seed-wasm`, `build-cli`, `build-ultimate-docs`, `build-driver`).
- [ ] **E.** Move the TypeScript test scripts (`test-dialect`, `test-translator`, `test-parity`, `test-ml-stdlib`, `test-bg`).
- [ ] **F.** Port the native backend (`codegen-x64`, `link`) to SDEV.
- [ ] **G.** Replace the JavaScript reference interpreters with a compiled SDEV interpreter.
- [ ] **H.** Write the CLI in SDEV, run by the host kernel.
- [ ] **I.** Move website language logic (`src/lang/**`) into SDEV modules; React stays as the shell.
- [ ] **J.** Retire the bootstrap compiler once B–D pass.

What will always stay JavaScript: `bin/sdevhost.mjs`, the generated bridge files, Electron entry files and build configs required by their hosts.

### 9.4 Code Understander and sdev:ai

- [x] The understander's **own full parser and interpreter in SDEV** (`lang/agent/parser_eval.sdev`, wired into `src/lang/agent/sdev-engine.ts` as `sdevParseProgram`, `sdevValidateSyntax`, `sdevEvalProgram`). (**Built in Antigravity**, 86/86 checks passing.)
- [ ] Faster first reads at project scale (today ~1.0–1.3 s for 4,000 lines; the token-stream rewriter and differential repair from the blueprint are not built).
- [ ] Verify the chunk memory in the real editor UI, not only in scripts.
- [ ] Test the in-browser AI model on a real machine with WebGPU.
- [ ] Decide whether sdev:ai should run natively in the compiler rather than through conversion.
- [ ] Grow sdev:ai into the full "AI-first" language from the blueprint (token-dense grammar, first-token intent everywhere, compiler accepting both forms).

### 9.5 Language and compiler

- [x] **M15:** batched forward passes (`linear_forward_batch`, `sequential_forward_batch`, `gpt_forward_batch`), matmul through WebGPU/CUDA (`accel_matmul` → `best_matmul`), binary checkpoints (`save_checkpoint_bin` / `load_checkpoint_bin` with header `SDEVML01`). (**Built in Antigravity**, 20/20 ML checks passing.)
- [ ] Python-parity features on v2 and native (they exist in v1).
- [ ] Re-run the older v2 parity checklist; look at the 31 items the gate listed on 30 Sep.
- [ ] Native backend for Windows and macOS (only Linux ELF today).
- [ ] The v1 portable library rewritten in SDEV under `lang/stdlib/v2/` and the generic `SYSCALL` boundary for graphics/UI/web/kernel/matrix/FFI/hardware (from the parity plan).
- [ ] A real OS built on the SDEV kernel: `boot.sdev`, shell window, crash screen (only the kernel simulation exists).

### 9.6 Studio and the website (the 19 September request — partly completed in Antigravity)

- [x] Studio runs and records Chrono/Live Lens/Prism debug traces on the real SDEV execution engine (`src/studio/runner.ts`). (**Built in Antigravity**.)
- [ ] Publish Studio on your own domain (choose: `/studio` as main, its own subdomain like studio.sdev.codes, or replace `/ide`).
- [ ] Open the library registry to real users (choose: anyone with an account, or invite code).
- [x] Studio projects and files saved to the real Supabase `code_files` table when signed in, with guest `localStorage` fallback (`src/studio/store.ts`). (**Built in Antigravity**.)
- [ ] Build a dedicated getting-started tutorial page linking directly to Studio.
- [ ] Decide which of the three browser IDEs is the main one.

### 9.7 Distribution

- [ ] **Buy a code-signing certificate** (OV ~$200/yr or EV ~$400/yr, as a `.pfx`) — then automatic signing of every `.exe`.
- [ ] Test the VS Code extension inside VS Code and the packaged desktop app on real machines.
- [ ] Re-upload the fixed `.vsix` after publishing (the upload was never tested from here).
- [ ] Publish to the VS Code Marketplace (idea).
- [ ] A JetBrains plugin (idea).
- [ ] Re-check the "it doesn't do anything" `.exe` report with details.

### 9.8 Website, community, launch follow-ups

- [ ] A subscriber list and scheduled sender for the launch emails.
- [ ] **Redeem the "Build with sdev" contest prize** promised at launch.
- [ ] Launch ideas not built: HN GIF of the compiler compiling itself; a real gist as the landing demo (`snake.sdev`, a Sofia map); a live "programs run" counter; `?ref=` tracking; a `sdev-launch-2026` gist tag; a thank-you post naming people; a "How it's built" follow-up post; a 404 page built with the Web DSL.
- [ ] Backlinks: language directories, Awesome lists, Rosetta Code, Show HN, r/ProgrammingLanguages, a GitHub README link.
- [ ] The optional SEO guide page (waiting for your yes).
- [ ] Voice-over for the pitch video (offered).
- [ ] ⌘K command palette on the homepage (proposed in the animation plan, not confirmed built).

---

## 10. Ideas backlog (never committed to)

| Idea | Origin |
|---|---|
| **sdev Academy** mobile learning app — prebuilt and personalised lessons, videos, slides and tests for every chapter, AI tutor, voice tutor, gamification, Author Studio, classrooms, EN/BG and 26 keyword languages, offline PWA/Capacitor | May 2026 prompt |
| An LLM that trains itself or learns from Gemini, rewrites itself and SDEV following feature demand | Jul 2026 (safe, review-only part built) |
| Training real models with the CUDA path (LoRA on 7B, 1B from scratch) | Jul 2026 |
| AI-personalised documentation for each dialect (beyond the template) | Aug 2026 |
| Dialect docs that rewrite themselves in each user's style | Aug 2026 |
| A JetBrains plugin; VS Code Marketplace | Apr 2026 |
| VS Code: hover docs, inline diagnostics, detected-language status, foreign-keyword highlighting | Apr 2026 |
| A split view: original language on one side, English on the other; a keyword cheat-sheet panel per language; native-language starter files | Mar–Apr 2026 |
| Translation diff view; more Balkan languages (Serbian, Croatian, Macedonian) | Apr 2026 |
| Interpreter-vs-VM diff view, optimiser (constant folding, dead code), VM step debugger with breakpoints | Mar 2026 |
| Leaflet: `addMarkerIcon` on layer groups, built-in geocoder, map demo, Leaflet in Python | Jan–Feb 2026 |
| Keyboard, mouse and game-loop helpers (`gameloop(fps, fn)`) | Feb 2026 |
| Theme switcher between cyberpunk and minimal; sound effects | Jan 2026 |
| Translation history; preview button in the translator | Jan–Feb 2026 |
| Live Architecture Map, AI Error Whisperer, Time-Lens (PyQt6 IDE concept) | Sep 2026 |
| Studio "Z3 prover", "hot-swap" and "Traps/Monads" chips as real features | Sep 2026 (currently decoration) |

---

## 11. Known limits and honest caveats

- **Browsers can't run native machine code.** That's why the browser uses WebAssembly and desktop uses x86-64.
- **Native output is Linux ELF only** for now.
- **CUDA** needs an NVIDIA GPU and toolkit on the user's machine; in the browser the best option is WebGPU. None of the GPU paths have been tested on real GPUs here.
- **Pure-SDEV machine learning is slow**; large models need the FFI/GPU paths.
- **`http_get` in the browser v2 runtime** is limited because the VM can't wait for network requests.
- **The in-browser AI model** needs WebGPU and a one-time ~1 GB download; untested on real hardware here.
- **`.exe` files** show "unknown publisher" until signed with a purchased certificate.
- **Web Serial / WebUSB uploads** work in desktop Chromium browsers (Chrome, Edge, Opera, Brave). All 7 upload protocols (`STK500v1`, `STK500v2`, `AVR109`, `SAM-BA`, `DFU WebUSB`, `esptool`, `UF2`) are implemented and verified against protocol simulators in **Antigravity**, but have not yet been tested against physical boards attached over USB. The Uno Q uses Arduino App Lab over its Linux side rather than browser flashing.
- **The unofficial online Arduino builder** (Wokwi Hexi) is strictly gated to its 10 verified board targets; the remaining 20 boards compile through a local or self-hosted `arduino-cli` build server (`tools/arduino-build-server/server.mjs`).
- **Email** is one message per person per event, not bulk newsletters.
- **Some Studio ribbon items** copied from the reference design are decoration.
- **Self-modification** never applies changes without a review hook, by design.
- **This document**: messages 1–749 from Lovable were read directly or from their saved summaries, and Era 19 records the work built and verified directly in **Antigravity** on 24 October 2026.

---

## 12. Appendices

### 12.1 Glossary (plain language)

| Term | Meaning |
|---|---|
| Interpreter | A program that reads your code and runs it step by step |
| Compiler | A program that turns your code into another form (bytecode or machine code) before running |
| Bytecode / VM | A compact instruction list and the small "virtual machine" that runs it |
| WebAssembly (WASM) | A low-level format browsers can run very fast |
| x86-64 / native / ELF | The machine code real PCs run; ELF is the Linux program format |
| Self-hosted | The compiler is written in the same language it compiles |
| Fixed point / byte-identical | Compiling the compiler with itself gives exactly the same bytes each time |
| Bootstrap / oracle | The first compiler used to start the chain; later only used to double-check |
| Parity | Two versions having the same features |
| Dialect | Your own words and style for SDEV that convert to normal SDEV |
| Shebang | The first-line marker like `#!sdev v2` that picks the version |
| Tome | SDEV's name for a dictionary (key → value) |
| FFI | A way for SDEV to call libraries written in other languages |
| WebGPU / CUDA | Ways to use the graphics card for fast maths (browser / NVIDIA) |
| MCP | A standard that lets outside AI assistants use your app's tools |
| Web Serial / WebUSB | Browser features for talking to USB devices like Arduino |
| Code signing | A purchased certificate that tells Windows who made a program |

### 12.2 Where things live

| Folder / file | Contents |
|---|---|
| `src/lang/` | v1 language (lexer, parser, interpreter, builtins, compiler, VM, kernel, translator, ui, web, graphics, hardware, dialect, agent, registry, linter) |
| `src/lang/registry/api-registry.ts` | Canonical API registry (576 APIs across 16 modules) & `DIAGNOSTIC_CATALOGUE` (`SDEV001`–`SDEV015`) — **made in Antigravity** |
| `src/lang/linter.ts` | Target-aware static linter & `applyQuickFix` — **made in Antigravity** |
| `src/lang/hardware/` | 30-board `board-db.ts`, `arduino-api.ts`, `transpile.ts`, `strip.ts`, 7-protocol `web-serial.ts`, `cloud-compile.ts` — **remade in Antigravity** |
| `lang/` | **100% self-hosted pure SDEV language core** (0 foreign language files). Subdirectories: `compiler/` (`lexer.sdev`, `parser.sdev`, `codegen.sdev`, `driver.sdev`), `bootstrap/` (`seed_vm.sdev`, `bootstrap.sdev`), `native/` (`codegen_x64.sdev`, `runtime_x64.sdev`, `link.sdev`), `runtime/` (`vm.sdev`, `kernel.sdev`), `stdlib/v2/` (10 modules: `text.sdev`, `list.sdev`, `tome.sdev`, `math.sdev`, `bits.sdev`, `time.sdev`, `func.sdev`, `json.sdev`, `types.sdev`, `random.sdev`), `translator/` (`translator.sdev`), `legacy/` (`v1_frontend.sdev`), `paradigms/` (`functional.sdev`, `systems.sdev`, `data.sdev`, `hardware.sdev`), `linter/` (`linter.sdev`), `agent/` (`understander.sdev`, `project.sdev`, `blocks.sdev`, `ai-dialect.sdev`, `parser_eval.sdev`), `parity/` (`agent.sdev`, `features.json`, `report.json`) — **completed in Antigravity** |
| `src/lang-bridge/` | Host-side bridges, test harnesses, `seed/seed.wat`, `oracle/compile.mjs`, `oracle/v2.js`, `native/` (`codegen-x64.mjs`, `link.mjs`, `runtime.s`), `compile-self.mjs`, `driver-artifact.mjs` — **relocated cleanly in Antigravity** |
| `src/pages/`, `src/components/`, `src/studio/` | website, IDEs, `RuntimeExplorerPanel.tsx`, `HardwarePanel.tsx`, Studio runner & cloud store |
| `cli/`, `bin/` | CLI source (with `doctor`, `explain`, `lint`, `api`), built CLI, host kernel (`sdevhost.mjs`) |
| `extension/`, `electron/` | VS Code extension, desktop app |
| `tools/arduino-build-server/` | local Arduino build bridge |
| `public/` | docs, books, interpreters, WASM, downloads, samples, Arduino index, firmware |
| `docs/` | `SDEV_Complete_Project_History.md` (v4) and `docs/launch/` |
| `scripts/` | build, release, `run-ts.mjs`, `test-all.mjs`, `gen-hardware-docs.ts`, and test scripts (`.sdev` and `.ts`) |
| `release.json`, `roadmap.md`, `AGENTS.md` | version, roadmap, architecture rules |

### 12.3 Test suites and gates

| Suite | Checks |
|---|---|
| `scripts/test-all.mjs` | Unified automated runner executing all 10 core self-hosted test suites in sequence (~4s, 0 failures) — **built in Antigravity** |
| `test-wasm-runtime.mjs` | seed VM programs (all self-hosted, 73 checks) |
| `test-self-lexer.sdev` (7), `test-self-parser.sdev` (8), `test-self-codegen.sdev` (52), `test-shim-fixed-point.sdev` (88 cases), `test-self-toolchain.sdev` (3), `test-driver-artifact.sdev` (5) | byte-identical self-hosting (88 cases, all gates in pure SDEV — **completed in Antigravity**) |
| `scripts/test-selfhosted-stdlib.sdev` (14) | Self-hosted stdlib v2 suite (VM, Kernel, Text, List, Math, Bits, Time, Random — **built in Antigravity**) |
| `scripts/test-selfhosted-subsystems.sdev` (21) | Self-hosted subsystems suite (Translator, Frontend, Paradigms, Linter — **built in Antigravity**) |
| `test-native.mjs` | native ELF programs (81 checks via WSL) |
| `test-parity.ts` | no missing "must" features (209 features across 3 tracks, 0 missing gaps) |
| `test-ml-stdlib.ts` | 20 ML checks (including M15 batched forward, `accel_matmul`, and `SDEVML01` binary checkpoints — **expanded in Antigravity**) |
| `test-translator.ts`, `test-bg.ts`, `test-dialect.ts`, `test-preset-dialect.ts` | languages and dialects |
| `test-agent.ts`, `test-beginner.ts` (20), `test-math.ts` (35), `test-tasks.ts` (31), `test-brain.ts`, `test-sdev-engine.ts` (86) | understander & SDEV-written parser/interpreter (166+ checks — **expanded in Antigravity**) |
| `test-transpile.ts` (97), `board-db.test.ts` (41), `test-strip.ts` (6) | hardware transpiler, all 30 boards, curated library examples, UF2/SLIP/STK500v1/STK500v2/AVR109/SAM-BA protocol simulators (**built in Antigravity**) |
| `test-registry.ts` (93) | Canonical API Registry (576 APIs), `"Did you mean?"` suggestions, static linter (`SDEV001`–`SDEV015`), quick fixes, and Studio runner/cloud sync (**built in Antigravity**) |
| `vm.test.ts`, `launchGate.test.ts`, `sense.test.ts` | unit tests |

### 12.4 Numbers worth remembering

| Measure | Value |
|---|---|
| Foreign programming language source files in `lang/` | **0** (100% pure SDEV language core) — **achieved in Antigravity** |
| Pure `.sdev` source files in `lang/` | **47** files |
| Core self-hosted test suites | **10** suites (all passing in `scripts/test-all.mjs`) |
| Canonical API Registry entries | 576 across 16 modules |
| v1 builtins | ≈441 |
| SDEV-written stdlib & agent functions | 210+ |
| Human languages | 26+ |
| Keyword mappings | 500+ |
| Leaflet/GIS functions | 110+ |
| Seed VM first size | 1,097 bytes (current `sdev-seed.wasm`: 7,880 bytes) |
| Byte-identical self-host cases | 50 → 87 → 88 (with `STREQ` in Antigravity) |
| Native tests | 81 |
| Python-parity registry entries | 130 |
| Supported microcontroller boards | 30 |
| Browser hardware upload protocols | 7 (`STK500v1`, `STK500v2`, `AVR109`, `SAM-BA`, `DFU WebUSB`, `esptool`, `UF2`) |
| Arduino libraries indexed | 10,232 (+ 52 curated with SDEV examples) |
| Hardware documentation length | 1,597 lines |
| Book length | EN 6,011 lines · BG 7,653 lines |
| Ultimate documentation | ~314 KB, ~48,800 words |
| Understander & engine checks | 166+ |
| Linter diagnostic codes | 15 (`SDEV001`–`SDEV015`) |
| Tool version | 5.1.0 |
| Launch | 12 July 2026, 14:00 Sofia |
| First-day targets | 1,000 sign-ups · 300 programs · 25 gists |
| Pitch video | 111 seconds |

### 12.5 Comprehensive Code Review, Dead Code Elimination, and Tooling Completion (Built in Antigravity)

In October 2026, a comprehensive repository audit, dead code elimination, and feature completion campaign was carried out in **Antigravity**:

1. **Dead Code Elimination (13 Obsolete / Orphaned Files Safely Removed)**:
   - Prototype & obsolete benchmark scripts: `bench.mjs`, `scripts/benchmark-sync.mjs`, `scripts/test-uuid-upsert.mjs`.
   - Superseded TypeScript test harnesses: `scripts/test-selfhosted-stdlib.ts` (replaced by pure `scripts/test-selfhosted-stdlib.sdev`).
   - One-time migration scripts: `scripts/strip-comments-final-safe.mjs`.
   - Deprecated & dead frontend components: `src/App.css`, `src/components/NavLink.tsx`, `src/components/ide/SyntaxHighlighter.tsx`, `src/components/ide/IdeMinimap.tsx`, `src/components/ide/IdeFindReplace.tsx`.
   - Obsolete runtime bridges & prototypes: `src/lang-bridge/bridge.ts`, `src/lang-bridge/v2.d.ts`, `src/lang/gist.ts`.

2. **TypeScript & Static Quality Excellence (0 Errors Across Repo)**:
   - Corrected all type definitions and AST node property accesses in `src/studio/runner.ts` and `src/studio/store.ts`.
   - Fixed OAuthConsent, Dialects, Explore, and IDE typing, achieving **0 TypeScript compilation errors** (`npx tsc --noEmit` across both `tsconfig.app.json` and `tsconfig.node.json`).
   - Resolved all ESLint rule violations, resulting in **0 ESLint errors** across the entire codebase (`npx eslint .`).

3. **F1 Symbol Help Keybinding (Roadmap Phase 1, Item 7)**:
   - Added `getWordAtCursor()` to `IdeEditorHandle` in `src/components/ide/CodeMirrorEditor.tsx` to extract the identifier or active text selection under the cursor.
   - Wired the `F1` keybinding in `src/pages/IDE.tsx`: when pressed, it queries `API_REGISTRY` (`findApi` / `searchApis`). If a matching symbol is found, it opens the `RuntimeExplorerPanel` directly focused on that API, showing its signature, target support, documentation, and example snippets. If no API is under the cursor, it gracefully opens the Command Palette.

4. **Project Scaffolding & Standard `sdev.json` Manifest (Roadmap Phase 5, Items 28–29)**:
   - Added `sdev new <project-name> [--template <console|game|hardware|ml>]` and `sdev init [--template <console|game|hardware|ml>]` to `cli/index.ts`.
   - Scaffolded with clean canonical SDEV starter code and standard `sdev.json` metadata (`name`, `version`, `description`, `template`, `runtime`, `entry`, `libraries`, `dialects`).
   - Enhanced `sdev run` to automatically locate and execute project entry files defined in `sdev.json` (or `main.sdev`) when run in a project root.
   - Made `scripts/release.mjs` cross-platform for Windows and POSIX using `tmpdir()` and platform-appropriate python executables.
   - All 4 starter templates pass both `sdev check` and `sdev lint` with 0 errors.

5. **Test Suite Modernization & Parity**:
   - Added missing test scripts to `package.json` (`test:bg`, `test:dialect`, `test:preset-dialect`, `test:translator`).
   - All 28 test suites passing cleanly with 100% pass rate.
   - Full production build (`npm run build`) passing cleanly in 7.5s.

*All enhancements, refactoring, dead code elimination, and feature completions documented above were designed, implemented, and verified in **Antigravity**.*


---

## 10. Universal Multi-Language Feature Parity & Roadmap Completion (Built in Antigravity)

On 31 October 2026, the SDEV language achieved comprehensive multi-language parity spanning modern systems, scripting, and functional paradigms in **Antigravity**:

1. **String Interpolation `"{name} has {count}"` (Roadmap Phase 2, Item 10 — Built in Antigravity)**:
   - Added `hasInterpolation` in `src/lang/parser.ts` to detect expressions embedded within string literals while preserving literal escaped braces `{{...}}` and `}}`.
   - Wired `FStringExpr` desugaring into `parsePrimary` for both classic string tokens and f-string tokens.
   - Implemented bytecode emission for `FStringExpr` in `src/lang/compiler.ts`, compiling expressions, applying string conversion (`LOAD 'str'`), and emitting `OpCode.ADD` for seamless v2 bytecode execution.
   - Verified on both v1 interpreter and v2 compiler.

2. **Immutable Variable Bindings `fixed` / `const` / `val` (Roadmap Phase 2, Item 15 — Built in Antigravity)**:
   - Added `FIXED` token to `src/lang/tokens.ts` and keyword definitions in `src/lang/keywords.ts` (`mystic: 'fixed'`, `plain: 'const'`, `alias: 'val'`).
   - Extended `LetStatement` in `src/lang/ast.ts` with `isFixed?: boolean`.
   - Updated `parseForgeStatement` in `src/lang/parser.ts` to parse `fixed <name> be <val>`.
   - Added immutability enforcement in `Environment` (`defineFixed`, `isFixed`, throwing `Cannot reassign fixed variable '<name>'`).
   - Added immutable binding compile-time checking in `Compiler` rejecting reassignments.
   - Added static analysis diagnostic in `src/lang/linter.ts` (`SDEV014`).

3. **Scalar `match` Statement on v2 Bytecode Compiler (Roadmap Phase 2, Item 11 — Built in Antigravity)**:
   - Implemented `compileMatch` and `compileMatchPattern` in `src/lang/compiler.ts`.
   - Generates jump test tree supporting literal patterns (`PatLiteral`), value expressions (`PatValue`), wildcards `_` (`PatWildcard`), variable capture (`PatCapture`), or-patterns (`PatOr`), and condition guards (`when` / `also`), jumping to block end after matched arm execution.

4. **Relational SQL & LINQ Engine (SQL Parity — Built in Antigravity)**:
   - Implemented relational query builtins in `src/lang/builtins/sql.ts`: `sql_select`, `sql_where`, `sql_order_by`, `sql_limit`, `sql_distinct`, `sql_join` (inner, left, right), `sql_group_by`, `sql_count`, `sql_sum`, `sql_avg`, `sql_min`, `sql_max`.
   - Created pure self-hosted SDEV counterpart in `lang/stdlib/v2/sql.sdev` for seed VM execution.
   - Registered canonical signatures and documentation in `src/lang/registry/api-registry.ts`.

5. **Modern Language Conveniences (Kotlin, C#, Python Parity — Built in Antigravity)**:
   - Null-coalescing / Elvis operator: `coalesce(val, fallback)` in `builtins` and stdlib.
   - Safe navigation: `safe_get(record, key, default)` for nested safely traversing maps/records.
   - Record copy/clone: `copy_record(record, overrides)` for immutably updating data records.

6. **Systems Low-Level Arena Memory (C / C++ Parity — Built in Antigravity)**:
   - Added low-level memory arena management and byte manipulation in `src/lang/builtins/buffer.ts` and `lang/paradigms/systems.sdev`: `arena_create`, `arena_alloc`, `arena_reset`, `mem_poke_u8`, `mem_peek_u8`, `mem_poke_i16`, `mem_peek_i16`, `mem_poke_i32`, `mem_peek_i32`, `mem_fill`, `mem_copy`.

7. **Monadic Algebraic Types (Rust & Functional Parity — Built in Antigravity)**:
   - Added Option and Result monads in `src/lang/builtins/functional.ts` and `lang/paradigms/functional.sdev`: `Some`, `None`, `is_some`, `is_none`, `unwrap_or`, `map_some`, `flat_map_some`, `Ok`, `Err`, `is_ok`, `is_err`, `result_unwrap_or`, `map_ok`, `flat_map_ok`.

8. **Formal Formatter Test Suite (Roadmap Phase 5, Item 33 — Built in Antigravity)**:
   - Added `scripts/test-formatter.ts` with 8 comprehensive test cases verifying indentation, nested blocks, custom indent sizes, idempotence, string and comment colon safety, and whitespace normalization.

9. **Dual-Runtime Parity & Comprehensive Test Suite (Built in Antigravity)**:
   - Added `scripts/test-multi-language-features.ts` testing all categories across v1 and v2 tracks (16/16 passed).
   - Expanded `scripts/test-selfhosted-subsystems.sdev` to test systems memory arenas, monads, and SQL on the self-hosted seed VM (25/25 passed).
   - Added `"test:formatter"` and `"test:features"` to `package.json` scripts and integrated both into `scripts/test-all.mjs`.
   - All 12 SDEV test suites pass cleanly with 100% pass rate.
   - All release artifacts rebuilt via `scripts/release.mjs`.
   - Production Vite bundle builds with 0 errors.

*All enhancements, refactoring, and multi-language feature completions documented above were designed, implemented, and verified in **Antigravity**.*
