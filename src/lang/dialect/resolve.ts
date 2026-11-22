import { canonicalize } from './canonicalize';
import { extractDialectDirective, isDialectSdevFile, parseDialectFromSdev } from './sdev-format';
import { validateDialect, type DialectSpec } from './spec';

/** Explicit file directives take priority; never silently run a different dialect. */
export function resolveDialectSource(
  source: string,
  active: DialectSpec | null,
  files: Array<{ name: string; content: string }>,
  findLocal: (slug: string) => DialectSpec | null,
): { source: string; dialect: DialectSpec | null } {
  const directive = extractDialectDirective(source);
  if (directive) {
    source = directive.stripped;
    const target = directive.target.replace(/^\.\//, '');
    const file = files.find(f => f.name.replace(/^\.\//, '') === target);
    if (file) {
      if (!isDialectSdevFile(file.content)) throw new Error(`"${directive.target}" is not a dialect definition.`);
      active = parseDialectFromSdev(file.content);
    } else {
      active = findLocal(directive.target);
      if (!active) throw new Error(`Dialect "${directive.target}" was not found. Add its .sdev file or install it first.`);
    }
  }
  if (!active) return { source, dialect: null };
  const errors = validateDialect(active).filter(issue => issue.level === 'error');
  if (errors.length) throw new Error(`Invalid dialect "${active.meta.name}": ${errors.map(issue => issue.message).join(' ')}`);
  return { source: canonicalize(source, active).source, dialect: active };
}