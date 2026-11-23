// Source-to-source `use "path"` module prelinker.
// Include-once per path; mirrored byte-for-byte by `prelink_source` in `lang/compiler/codegen.sdev`.

let moduleReader = null;
let nodeFs = null;

async function ensureNodeFs() {
  if (nodeFs) return nodeFs;
  if (typeof process !== 'undefined' && process.versions?.node) {
    nodeFs = (await import(/* @vite-ignore */ 'node:fs')).default;
  }
  return nodeFs;
}

ensureNodeFs();

export function setModuleReader(fn) {
  moduleReader = fn;
}

export function defaultReadModule(path) {
  if (moduleReader) return moduleReader(path) ?? '';
  // Synchronous fallback before lazy `import('node:fs')` settles on Node 22+.
  if (!nodeFs) {
    try { nodeFs = globalThis.process?.getBuiltinModule?.('fs') ?? null; } catch { /* browser */ }
  }
  if (nodeFs) {
    try { return nodeFs.readFileSync(path, 'utf8'); } catch { return ''; }
  }
  return '';
}

export function prelink(source, readModule = defaultReadModule, seen = new Set()) {
  let out = '';
  for (const line of source.split('\n')) {
    const t = line.trim();
    if (t.length > 5 && t.startsWith('use "') && t.endsWith('"')) {
      const path = t.slice(5, -1);
      if (!seen.has(path)) {
        seen.add(path);
        out += prelink(readModule(path) ?? '', readModule, seen);
      }
      out += '\n';
      continue;
    }
    out += line + '\n';
  }
  return out;
}
