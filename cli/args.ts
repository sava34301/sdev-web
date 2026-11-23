import { writeFileSync } from 'node:fs';
import { VERSION } from './version';
import type { PrepareOptions } from './pipeline';

export const SDEVC_MAGIC = 'SDEVC4';

const argv = process.argv.slice(2);

export function flag(name: string, short?: string): boolean {
  return argv.some((a) => a === name || (short && a === short));
}

export function value(name: string, short?: string): string | undefined {
  const i = argv.findIndex((a) => a === name || (short && a === short));
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}

const FLAGS_WITH_VALUES = new Set([
  '--dialect', '--lang', '--to', '--from', '-o', '--out', '--as', '--ld',
  '--runtime', '--name', '--about', '--agent', '--brain', '--target',
  '--module', '--template', '-t', '--password', '--symbol',
]);

/** Positional arguments, in order, skipping flags and their values. */
export function positionals(): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-')) {
      if (FLAGS_WITH_VALUES.has(a)) i++;
      continue;
    }
    if (i > 0 && FLAGS_WITH_VALUES.has(argv[i - 1])) continue;
    out.push(a);
  }
  return out;
}

export function runOptions(): PrepareOptions {
  const rt = value('--runtime');
  const agentFlag = value('--agent');
  const brainFlag = value('--brain');
  const agent = flag('--no-agent')
    ? 'off'
    : agentFlag === 'off' || agentFlag === 'on' || agentFlag === 'auto' || agentFlag === 'strict'
      ? agentFlag
      : undefined;
  const brain =
    brainFlag === 'local' || brainFlag === 'online' || brainFlag === 'auto' || brainFlag === 'none'
      ? brainFlag
      : agentFlag === 'local' || agentFlag === 'online'
        ? agentFlag
        : undefined;
  return {
    dialect: value('--dialect'),
    noExt: flag('--no-ext'),
    lang: value('--lang'),
    runtime: rt === 'v1' || rt === 'v2' ? rt : undefined,
    agent,
    brain,
    explain: flag('--explain'),
  };
}

export function die(msg: string): never {
  console.error('error: ' + msg);
  process.exit(1);
}

export function emit(text: string): void {
  const out = value('-o', '--out');
  if (out) { writeFileSync(out, text); console.log('wrote', out); }
  else process.stdout.write(text.endsWith('\n') ? text : text + '\n');
}

export function help(): void {
  console.log(`sdev v${VERSION} — the sdev language toolchain

USAGE
  sdev <command> [options]

PROJECT
  new <name> [-t <tmpl>]  Create an SDEV project (templates: console, web, game, hardware, ml)
  init [-t <tmpl>]        Initialize sdev.json in the current directory

RUNNING
  run [file]              Run a program (or project entry from sdev.json)
  edit <file>             Full-screen editor: ^S save, ^R run, ^F find, ^Q quit
  repl                    Interactive session
  check <file>            Parse only, report syntax errors
  lint <file>             Lint source (--target v1|v2-wasm|native-x64|arduino-cpp|web)
  api [query]             Search canonical API registry (--module <m>, --target <t>)
  explain <CODE|name>     Explain a diagnostic code (SDEV001..SDEV015) or API
  doctor                  Check SDEV toolchain, runtimes, and API registry health
  ast <file>              Print the syntax tree as JSON
  fmt <file> [-w]         Format source (-w writes in place)
  watch <file>            Re-run on every save

BUILDING
  compile <file> [-o]     Build a .sdevc container
  run-bc <file.sdevc>     Run a container
  disasm <file>           Disassemble to bytecode text
  native <file> [-o]      Compile to a native x86-64 binary (--emit-asm for .s)

FILES
  info <file>             Show everything recorded about a file
  sign show|stamp|verify|strip <file>

DIALECTS
  dialect list                        Your dialects
  dialect preset [slug] [-o file]     Install a ready-made dialect (+ its sample)
  dialect new <slug> --name "Name"    Create one
  dialect use <slug|none>             Choose the active dialect
  dialect show <slug>                 Inspect words and style
  dialect source <slug> [-o file]     Emit the dialect as a pure .sdev file
  dialect validate <slug>             Check it is publishable
  dialect docs <slug> [-o file]       Generate its documentation
  dialect canon <file> [--from slug]  Dialect source -> canonical sdev
  dialect surface <file> --to <slug>  Canonical sdev -> dialect source
  dialect xlate <file> --from a --to b
  dialect words                       The catalog of changeable words
  dialect install <@user/slug|code>   Install someone else's dialect
  dialect publish <slug>              Publish yours
  dialect pull | dialect sync         Fetch / two-way sync with your account
  dialect export [slug] [-o file]     Export dialect(s) as a .sdev file
  dialect import <file.sdev>          Import dialect(s) from a .sdev file
  dialect remove <slug>

EXTENSIONS
  ext list | enable <id> | disable <id> | add <file> --name N [--about T]
  ext publish <id|name> [--as public|unlisted|private] | ext pull | ext remove <id>
  ext sync | ext prelude

LIBRARIES
  lib list | add <@user/slug[@ver]> | remove <@user/slug> | pins <file>
  lib export <file> | lib import <file>

CLOUD
  auth login <email>      Email + password (--password, or $SDEV_PASSWORD)
  auth code <email> [code] One-time code by email (no password needed)
  auth signup <email>     Create an account
  auth reset <email>      Send a password reset link
  auth token <a> <r>      Sign in with an access + refresh token pair
  auth status | whoami | refresh | logout
  cloud list | cloud pull [name] | cloud push <file> | cloud rm <name>
  cloud share <file> [--name T] [--about T] | cloud shared

AGENT (understands however you write)
  agent status            What the agent has learned from your programs
  agent explain <file>    Show what it understood, line by line
  agent understand <file> Print the canonical sdev for a file [-o out]
  agent promote <name>    Turn what it learned into a dialect [--rename]
  agent forget            Clear the agent's memory

SETTINGS
  runtime [v1|v2]         Show or set the default runtime
  languages               Natural languages the lexer understands
  translate <file> --to <Language> [-o out]
  home                    Where the CLI keeps local state
  version
  update [--force]        Update sdev to the newest version (checked daily)

OPTIONS
  --dialect <slug|file.sdev|none>   Override the dialect for this run (slug or .sdev file)
  --runtime <v1|v2>       Override the runtime
  --no-ext                Ignore enabled extensions
  --lang <Language>       Source language for the lexer
  --agent <mode>          off | auto | on | strict (or local / online)
  --brain <where>         auto (this computer's AI, free) | local | online (website AI, uses credits) | none
                          SDEV_AGENT_LOCAL_URL / SDEV_AGENT_LOCAL_MODEL pick the local model (default Ollama, qwen2.5-coder:7b)
  --no-agent              Run the file exactly as written
  --explain               Show what the agent understood
  -o, --out <file>        Output path
`);
}
