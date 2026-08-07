/**
 * Parity gate — runs the sdev-written parity agent.
 *
 * The agent itself (lang/parity/agent.sdev) is written in sdev and executes on
 * sdev. This harness only supplies the Node host bindings the agent needs
 * (read_file / write_file) and turns "a `must` feature is missing on some
 * track" into a non-zero exit code.
 *
 *   bun run scripts/test-parity.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { execute } from '../src/lang';
import { resolveLinks, type LinkableFile } from '../src/lang/linker';

(globalThis as unknown as { __sdevHost: unknown }).__sdevHost = {
  readFile: (p: string) => readFileSync(p, 'utf8'),
  writeFile: (p: string, c: string) => writeFileSync(p, c),
  httpGet: () => {
    throw new Error('network disabled in the parity gate');
  },
};

const REGISTRY = 'lang/parity/features.json';
const DOCS = ['public/SDEV_PARITY_DOCUMENTATION.md', 'public/SDEV_INTERNALS.md'];

// The agent parses the registry line-by-line. Validate the same file with a
// real JSON parser so a malformed or reshaped registry fails loudly here.
const raw = JSON.parse(readFileSync(REGISTRY, 'utf8')) as {
  tracks: { id: string; label: string; sources: string }[];
  features: Record<string, string>[];
};

const files: LinkableFile[] = [
  { name: 'agent.sdev', content: readFileSync('lang/parity/agent.sdev', 'utf8') },
];

const program = `link "agent.sdev"
forge docs be [${DOCS.map((d) => JSON.stringify(d)).join(', ')}]
forge missing be run_parity_agent(${JSON.stringify(REGISTRY)}, docs)
speak("MUST_MISSING=" + str(missing))
`;

const result = execute(resolveLinks(program, files, { entryName: '<parity>' }));
for (const line of result.output) console.log(line);

if (!result.success) {
  console.log(`✗ parity agent failed: ${result.error}`);
  process.exit(1);
}

const featureLine = result.output.find((l) => l.trim().startsWith('features:'));
const seen = Number((featureLine ?? '').split(':')[1]);
if (seen !== raw.features.length) {
  console.log(`✗ agent parsed ${seen} features, registry has ${raw.features.length}`);
  process.exit(1);
}

const mustLine = result.output.find((l) => l.startsWith('MUST_MISSING='));
const must = Number((mustLine ?? 'MUST_MISSING=1').split('=')[1]);
if (must > 0) {
  console.log(`✗ ${must} required feature(s) missing — see lang/parity/report.json`);
  process.exit(1);
}
console.log('✓ parity: every required feature is present on every track');
