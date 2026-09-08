#!/usr/bin/env node
/**
 * Bundle the sdev CLI into bin/sdev.mjs.
 *
 * The CLI imports the very same modules the web IDE runs, so we bundle with
 * the `@/` alias pointing at src/ and inline the publishable backend config
 * (import.meta.env is a Vite construct that does not exist in Node).
 */
import { build } from 'esbuild';
import { mkdirSync, copyFileSync, readFileSync, chmodSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'bin');
mkdirSync(outDir, { recursive: true });

/** Read VITE_* values from .env so the bundle can talk to the backend. */
function envValue(name) {
  if (process.env[name]) return process.env[name];
  try {
    const text = readFileSync(resolve(root, '.env'), 'utf8');
    const line = text.split('\n').find((l) => l.trim().startsWith(name + '='));
    return line ? line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '') : '';
  } catch {
    return '';
  }
}

await build({
  entryPoints: [resolve(root, 'cli/index.ts')],
  outfile: resolve(outDir, 'sdev.mjs'),
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  banner: { js: '#!/usr/bin/env node\nimport { createRequire as __cr } from "node:module";\nconst require = __cr(import.meta.url);' },
  alias: { '@': resolve(root, 'src') },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(envValue('VITE_SUPABASE_URL')),
    'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(envValue('VITE_SUPABASE_PUBLISHABLE_KEY')),
    'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(envValue('VITE_SUPABASE_PROJECT_ID')),
    'import.meta.env.MODE': '"production"',
    'import.meta.env.DEV': 'false',
    'import.meta.env.PROD': 'true',
  },
  logLevel: 'info',
});

chmodSync(resolve(outDir, 'sdev.mjs'), 0o755);

// Ship the seed VM and the native runtime next to the bundle.
for (const [from, to] of [
  ['public/wasm/sdev-seed.wasm', 'sdev-seed.wasm'],
  ['lang/native/runtime.s', 'runtime.s'],
]) {
  const src = resolve(root, from);
  if (existsSync(src)) copyFileSync(src, resolve(outDir, to));
}

console.log('built bin/sdev.mjs');
