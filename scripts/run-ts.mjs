#!/usr/bin/env node
/**
 * Bundle and run a TypeScript script using esbuild + Node.
 * Supports `@/` alias and Vite `?raw` imports so all scripts/test-*.ts run natively.
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = process.argv[2];
if (!entry) {
  console.error('Usage: node scripts/run-ts.mjs <script.ts> [args...]');
  process.exit(1);
}

const rawPlugin = {
  name: 'raw',
  setup(b) {
    b.onResolve({ filter: /\?raw$/ }, (a) => ({
      path: resolve(a.resolveDir, a.path.replace(/\?raw$/, '')),
      namespace: 'raw',
    }));
    b.onLoad({ filter: /.*/, namespace: 'raw' }, (a) => ({
      contents: readFileSync(a.path, 'utf8'),
      loader: 'text',
    }));
  },
};

const tmpFile = resolve(root, `node_modules/.cache-run-${process.pid}-${Date.now()}.mjs`);

try {
  await build({
    plugins: [rawPlugin],
    external: ['@mlc-ai/web-llm', 'typescript'],
    entryPoints: [resolve(root, entry)],
    outfile: tmpFile,
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    banner: {
      js: [
        'import { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
        '{ const __s = new Map(); Object.defineProperty(globalThis, "localStorage", { value: { getItem: (k) => __s.has(k) ? __s.get(k) : null, setItem: (k, v) => __s.set(k, String(v)), removeItem: (k) => __s.delete(k), clear: () => __s.clear() }, configurable: true }); }',
      ].join('\n'),
    },
    alias: { '@': resolve(root, 'src') },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': '"https://ygzqjekxzvsrkhuqhqbp.supabase.co"',
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': '"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnenFqZWt4enZzcmtodXFocWJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzU1NDEsImV4cCI6MjA4NTQ1MTU0MX0.--CgBH0g9CJsHC_pRoaNp1nDDQ8cQ5m-gQ0w7zlnjiY"',
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': '"ygzqjekxzvsrkhuqhqbp"',
      'import.meta.env.MODE': '"test"',
      'import.meta.env.DEV': 'true',
      'import.meta.env.PROD': 'false',
    },
    logLevel: 'silent',
  });

  const res = spawnSync(process.execPath, [tmpFile, ...process.argv.slice(3)], {
    stdio: 'inherit',
    cwd: root,
  });
  process.exitCode = res.status ?? 1;
} finally {
  try { unlinkSync(tmpFile); } catch { /* ignore */ }
}
