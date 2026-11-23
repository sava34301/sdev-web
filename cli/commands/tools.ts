import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import {
  API_REGISTRY,
  findApi,
  searchApis,
  suggestNearestApis,
  findDiagnostic,
  DIAGNOSTIC_LIST,
  type ApiTarget,
  type ApiModule,
} from '@/lang/registry/api-registry';
import { lintSdevSource } from '@/lang/tools/linter';
import { stripSignature } from '@/lang/dialect/signature';
import { die, value } from '../args';
import { SDEV_HOME, seedWasmPath } from '../env';
import { readSource } from '../pipeline';
import { VERSION } from '../version';

export function cmdDoctor(): void {
  console.log(`sdev doctor — toolchain & environment check (v${VERSION})\n`);

  const cliDir = dirname(resolve(process.argv[1] ?? '.'));
  const candidateRoot = resolve(cliDir, '..');
  const repoRoot = existsSync(resolve(process.cwd(), 'src/lang-bridge'))
    ? process.cwd()
    : existsSync(resolve(candidateRoot, 'src/lang-bridge'))
      ? candidateRoot
      : null;

  let wasmPath = '';
  try {
    wasmPath = seedWasmPath();
  } catch {
    wasmPath = repoRoot ? resolve(repoRoot, 'public/wasm/sdev-seed.wasm') : '';
  }
  const hasWasm = Boolean(wasmPath && existsSync(wasmPath));

  let pythonVersion = 'not found';
  for (const bin of ['python', 'python3']) {
    try {
      const res = spawnSync(bin, ['--version'], { encoding: 'utf8', timeout: 2500 });
      const out = ((res.stdout || '') + (res.stderr || '')).trim();
      if (res.status === 0 && /^Python\s+\d/i.test(out)) {
        pythonVersion = out.split(/\r?\n/)[0];
        break;
      }
    } catch {
      /* ignore */
    }
  }

  const checks: { label: string; ok: boolean; detail: string }[] = [
    { label: 'CLI Version', ok: true, detail: `sdev v${VERSION}` },
    { label: 'Node.js Runtime', ok: true, detail: `${process.version} (${process.platform}/${process.arch})` },
    { label: 'Python Runtime', ok: pythonVersion !== 'not found', detail: pythonVersion },
    { label: 'Self-Hosted WASM VM', ok: hasWasm, detail: hasWasm ? wasmPath : 'missing (sdev-seed.wasm)' },
    { label: 'Canonical API Registry', ok: API_REGISTRY.length > 0, detail: `${API_REGISTRY.length} canonical APIs · ${DIAGNOSTIC_LIST.length} diagnostic codes` },
    { label: 'Local SDEV Home', ok: existsSync(SDEV_HOME), detail: SDEV_HOME },
  ];

  const bundledRuntimeS = resolve(cliDir, 'runtime.s');
  if (repoRoot) {
    const codegenPath = resolve(repoRoot, 'src/lang-bridge/native/codegen-x64.mjs');
    const runtimeAsmPath = resolve(repoRoot, 'src/lang-bridge/native/runtime.s');
    const hasNative = existsSync(codegenPath) && existsSync(runtimeAsmPath);
    const arduinoIndexPath = resolve(repoRoot, 'public/arduino/library-index.json');
    const hasArduinoIndex = existsSync(arduinoIndexPath);
    checks.push(
      { label: 'Native x86-64 Codegen', ok: hasNative, detail: hasNative ? 'src/lang-bridge/native/codegen-x64.mjs + runtime.s' : 'missing' },
      { label: 'Arduino Library Index', ok: hasArduinoIndex, detail: hasArduinoIndex ? arduinoIndexPath : 'missing (public/arduino/library-index.json)' },
    );
  } else {
    checks.push({
      label: 'Native Runtime Assembly',
      ok: existsSync(bundledRuntimeS),
      detail: existsSync(bundledRuntimeS) ? bundledRuntimeS : 'bundled runtime.s unavailable in CWD',
    });
  }

  const width = Math.max(...checks.map((c) => c.label.length));
  for (const c of checks) {
    const badge = c.ok ? '[OK]  ' : '[WARN]';
    console.log(`  ${badge} ${c.label.padEnd(width)}  ${c.detail}`);
  }

  const failed = checks.filter((c) => !c.ok);
  console.log('');
  if (failed.length === 0) {
    console.log('All SDEV toolchain checks passed.');
  } else {
    console.log(`${checks.length - failed.length}/${checks.length} checks passed (${failed.length} warning${failed.length === 1 ? '' : 's'}).`);
  }
}

export function cmdExplain(codeOrName: string): void {
  const diag = findDiagnostic(codeOrName);
  if (diag) {
    console.log(`${diag.code} — ${diag.title} [${diag.severity.toUpperCase()} · ${diag.category}]`);
    console.log(`\nEXPLANATION\n  ${diag.explanation}`);
    console.log(`\nFIX HINT\n  ${diag.fixHint}`);
    console.log(`\nEXAMPLE FIX\n  ${diag.goodExample.split('\n').join('\n  ')}`);
    return;
  }

  const api = findApi(codeOrName);
  if (api) {
    console.log(`${api.name} (${api.module}) — [${api.status.toUpperCase()}]`);
    console.log(`\nSIGNATURE\n  ${api.signature}`);
    console.log(`\nDESCRIPTION\n  ${api.description}`);
    console.log(`\nTARGETS\n  ${api.targets.join(', ')}`);
    if (api.params.length > 0) {
      console.log('\nPARAMETERS');
      for (const p of api.params) {
        console.log(`  ${p.name}${p.optional ? '?' : ''}: ${p.type}${p.description ? ' — ' + p.description : ''}`);
      }
    }
    console.log(`\nRETURNS\n  ${api.returns}`);
    if (api.deprecated) {
      console.log(`\nDEPRECATED (since ${api.deprecated.since})\n  Replace with '${api.deprecated.replacement}': ${api.deprecated.reason}`);
    }
    console.log(`\nEXAMPLE\n  ${api.example.split('\n').join('\n  ')}`);
    return;
  }

  const suggestions = suggestNearestApis(codeOrName, 3);
  console.error(`No diagnostic code or API named '${codeOrName}' found.`);
  if (suggestions.length > 0) {
    console.error(`Did you mean: ${suggestions.map((s) => s.entry.name).join(', ')}?`);
  }
  console.error(`Try 'sdev api ${codeOrName}' or 'sdev explain SDEV001'.`);
  process.exit(1);
}

export function cmdLint(file: string): void {
  const raw = readSource(file);
  const body = stripSignature(raw);
  const targetFlag = value('--target') as ApiTarget | undefined;
  const diags = lintSdevSource(body, { target: targetFlag });

  if (diags.length === 0) {
    console.log(`✓ ${basename(file)} — no lint issues found${targetFlag ? ` (target: ${targetFlag})` : ''}`);
    return;
  }

  for (const d of diags) {
    const loc = `${basename(file)}:${d.line}${d.column ? ':' + d.column : ''}`;
    const sev = d.severity.toUpperCase().padEnd(7);
    console.log(`${loc}  ${sev} [${d.code}] ${d.message}`);
    if (d.suggestion) console.log(`          hint: ${d.suggestion}`);
  }

  const errors = diags.filter((d) => d.severity === 'error').length;
  const warnings = diags.filter((d) => d.severity === 'warning').length;
  const infos = diags.filter((d) => d.severity === 'info').length;
  console.log(`\n${diags.length} issue${diags.length === 1 ? '' : 's'} (${errors} error${errors === 1 ? '' : 's'}, ${warnings} warning${warnings === 1 ? '' : 's'}, ${infos} info)`);
  if (errors > 0) process.exit(1);
}

export function cmdApi(query?: string): void {
  const mod = value('--module') as ApiModule | undefined;
  const target = value('--target') as ApiTarget | undefined;
  const results = searchApis(query ?? '', { module: mod ?? 'all', target: target ?? 'all' });

  if (results.length === 0) {
    console.log(`No APIs matched '${query ?? ''}'${mod ? ` in module ${mod}` : ''}${target ? ` for target ${target}` : ''}.`);
    if (query) {
      const near = suggestNearestApis(query, 3);
      if (near.length > 0) console.log(`Did you mean: ${near.map((n) => n.entry.name).join(', ')}?`);
    }
    return;
  }

  console.log(`Canonical SDEV API Registry — ${results.length} matching API${results.length === 1 ? '' : 's'}\n`);
  for (const entry of results.slice(0, 60)) {
    const statusBadge = entry.status === 'implemented' ? '' : ` [${entry.status.toUpperCase()}]`;
    console.log(`  ${entry.signature.padEnd(36)} (${entry.module})${statusBadge}`);
    console.log(`    ${entry.description}`);
    console.log(`    targets: ${entry.targets.join(', ')}`);
  }
  if (results.length > 60) {
    console.log(`\n  ... and ${results.length - 60} more. Filter with --module <m> or --target <t>, or inspect with 'sdev explain <name>'.`);
  }
}

interface ProjectTemplate {
  runtime: 'v1' | 'v2';
  description: string;
  code: string;
}

const PROJECT_TEMPLATES: Record<string, ProjectTemplate> = {
  console: {
    runtime: 'v2',
    description: 'Standard SDEV console application',
    code: `# Standard SDEV console application
speak "Welcome to {name}!"

conjure greet(user) ::
  yield "Hello, " + user + "!"
;;

speak greet("developer")
`,
  },
  game: {
    runtime: 'v1',
    description: 'SDEV 2D canvas and game starter',
    code: `# SDEV 2D Canvas & Game starter
canvas(400, 300)
fill("darkblue")
rect(0, 0, 400, 300)

fill("gold")
circle(200, 150, 40)

fill("white")
text("SDEV Game Starter", 130, 155)
speak "Canvas initialized."
`,
  },
  hardware: {
    runtime: 'v1',
    description: 'SDEV Microcontroller and hardware starter',
    code: `# SDEV Hardware / Microcontroller starter
board "uno" {
  conjure setup() {
    pin 13 be output
    serial begin 9600
  }

  conjure loop() {
    pin 13 write high
    wait 500
    pin 13 write low
    wait 500
  }
}
`,
  },
  ml: {
    runtime: 'v2',
    description: 'SDEV Machine Learning and tensor starter',
    code: `# SDEV Machine Learning & Tensor starter
speak "Initializing SDEV ML model..."
forge x be randn([4, 8])
forge w be randn([8, 2])
forge y be matmul(x, w)

speak "Shape of output tensor:"
speak shape(y)
speak "ML pipeline ready."
`,
  },
  web: {
    runtime: 'v1',
    description: 'SDEV Full-Stack Website Builder (HTML5, CSS3, JavaScript)',
    code: `// SDEV Website Starter
page("{name}", { theme: "sdev-dark" })
  web_state({ count: 0 })

  navbar("{name}", ["Features", "Interactive"], [
    { label: "Get Started", href: "#interactive", variant: "primary" }
  ])

  hero_section({
    badge: "Built in sdev",
    title: "Welcome to {name}.",
    highlight: "HTML + CSS + JS in one language.",
    subtitle: "Write structure, styles, and reactive client-side logic directly in sdev.",
    primaryCta: { label: "Try Counter", href: "#interactive" }
  })

  section({ id: "interactive", class: "max-w-xl mx-auto px-6 py-20" }, () -> ::
    div({ class: "card text-center" }, () -> ::
      h2("Reactive Counter", { class: "text-2xl mb-4" })
      div("0", { bind: "count", class: "text-5xl font-display text-primary mb-6" })
      div({ class: "flex justify-center gap-3" }, () -> ::
        button("-1", () -> :: state_set("count", state_get("count") - 1) ;;, { class: "btn btn-outline" })
        button("+1", () -> :: state_set("count", state_get("count") + 1) ;;, { class: "btn btn-primary" })
      ;;)
    ;;)
  ;;)

  footer_section("{name}", ["Home", "Docs"])
  scroll_driver()
  scroll_reveal()
endpage()
speak("Website rendered.")
`,
  },
};

function createProjectFiles(targetDir: string, name: string, templateKey: string, isInit = false): void {
  const resolvedKey = templateKey in PROJECT_TEMPLATES ? templateKey : 'console';
  const tmpl = PROJECT_TEMPLATES[resolvedKey];
  if (!(templateKey in PROJECT_TEMPLATES)) {
    console.warn(`Template "${templateKey}" not found. Falling back to "console" (options: console, game, hardware, ml).`);
  }

  mkdirSync(targetDir, { recursive: true });
  const manifestPath = resolve(targetDir, 'sdev.json');
  if (existsSync(manifestPath)) die(`sdev.json already exists in ${targetDir}`);

  const manifest = {
    name,
    version: '0.1.0',
    description: tmpl.description,
    template: resolvedKey,
    runtime: tmpl.runtime,
    entry: 'main.sdev',
    libraries: [],
    dialects: [],
  };
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  const mainPath = resolve(targetDir, 'main.sdev');
  if (!existsSync(mainPath)) writeFileSync(mainPath, tmpl.code.replace(/\{name\}/g, name));

  const readmePath = resolve(targetDir, 'README.md');
  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, `# ${name}

${tmpl.description}

## Getting Started

Run the program:
\`\`\`bash
sdev run
\`\`\`

Or run the entry file directly:
\`\`\`bash
sdev run main.sdev
\`\`\`

Check syntax:
\`\`\`bash
sdev check main.sdev
\`\`\`

Static analysis and lint:
\`\`\`bash
sdev lint main.sdev
\`\`\`
`);
  }

  console.log(`✓ Initialized SDEV project "${name}" [template: ${resolvedKey}, runtime: ${tmpl.runtime}]`);
  console.log('  - sdev.json');
  console.log('  - main.sdev');
  console.log('  - README.md');
  console.log('\nTo get started:');
  if (!isInit) console.log(`  cd ${name}`);
  console.log('  sdev run');
}

export function cmdNew(name?: string): void {
  if (!name) die('sdev new <project-name> [--template console|game|hardware|ml]');
  const targetDir = resolve(process.cwd(), name);
  if (existsSync(targetDir)) die(`directory "${name}" already exists`);
  createProjectFiles(targetDir, name, value('--template', '-t') ?? 'console', false);
}

export function cmdInit(): void {
  const targetDir = process.cwd();
  createProjectFiles(targetDir, basename(targetDir), value('--template', '-t') ?? 'console', true);
}
