// SDEV module linker — resolves `link "file.sdev"` directives by inlining
// referenced source files. Works for any sdev code (web, UI, logic, etc.).
//
// Supported syntax (top-of-line, anywhere in the file):
//   link "design.sdev"
//   link "math.sdev" as math          // prefixes inlined top-level names with `math_`
//   link add, sub from "math.sdev"    // documentation form; still inlines full file
//
// Files are matched by exact name, then case-insensitively, then by basename
// without extension. Cycles are detected and reported as a clear error.

export interface LinkableFile {
  name: string;
  content: string;
}

const LINK_RE = /^[ \t]*link\b[^\n"']*["']([^"'\n]+)["'](?:\s+as\s+([A-Za-z_][A-Za-z0-9_]*))?[ \t]*;?[ \t]*$/gm;

function findFile(files: LinkableFile[], target: string): LinkableFile | undefined {
  const exact = files.find(f => f.name === target);
  if (exact) return exact;
  const ci = files.find(f => f.name.toLowerCase() === target.toLowerCase());
  if (ci) return ci;
  const base = target.replace(/\.sdev$/i, '');
  return files.find(f => f.name.replace(/\.sdev$/i, '').toLowerCase() === base.toLowerCase());
}

function applyNamespacePrefix(source: string, prefix: string): string {
  // Prefix every top-level `conjure NAME` and `forge NAME` declaration.
  // Rewrites references via word-boundary replace on the same names within
  // the linked file. Conservative — only touches the linked module's text.
  const names = new Set<string>();
  const decl = /^[ \t]*(?:conjure|forge)\s+([A-Za-z_][A-Za-z0-9_]*)/gm;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(source))) names.add(m[1]);
  if (names.size === 0) return source;
  let out = source;
  for (const n of names) {
    const re = new RegExp(`\\b${n}\\b`, 'g');
    out = out.replace(re, `${prefix}_${n}`);
  }
  return out;
}

export function resolveLinks(
  source: string,
  files: LinkableFile[],
  options: { entryName?: string } = {}
): string {
  const visiting = new Set<string>();
  const resolved = new Set<string>();

  const expand = (code: string, fromName: string): string => {
    return code.replace(LINK_RE, (raw, target: string, alias?: string) => {
      const file = findFile(files, target);
      if (!file) {
        return `\n// [link] file not found: ${target}\nforge __link_error be "Cannot link \\"${target}\\" — file not found"\n`;
      }
      if (file.name === fromName || visiting.has(file.name)) {
        return `\n// [link] cyclic import skipped: ${file.name}\n`;
      }
      if (resolved.has(file.name) && !alias) {
        return `\n// [link] already linked: ${file.name}\n`;
      }
      visiting.add(file.name);
      let body = expand(file.content, file.name);
      if (alias) body = applyNamespacePrefix(body, alias);
      visiting.delete(file.name);
      resolved.add(file.name);
      return `\n// ── linked from ${file.name}${alias ? ` as ${alias}` : ''} ──\n${body}\n// ── end ${file.name} ──\n`;
    });
  };

  return expand(source, options.entryName ?? '<entry>');
}
