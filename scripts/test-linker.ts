import { resolveLinks, type LinkableFile } from '../src/lang/linker';

let pass = 0;
const failures: string[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  if (JSON.stringify(actual) === JSON.stringify(expected)) pass++;
  else failures.push(`${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
}

console.log('linker test suite');

// Test data
const files: LinkableFile[] = [
  { name: 'math.sdev', content: 'forge PI be 3.14\nconjure add with a, b\n  return a + b\nend' },
  { name: 'util.sdev', content: 'link "math.sdev";\nforge TWO_PI be PI * 2' },
  { name: 'cycle-a.sdev', content: 'link "cycle-b.sdev"\nforge A be 1' },
  { name: 'cycle-b.sdev', content: 'link "cycle-a.sdev"\nforge B be 2' },
  { name: 'main.sdev', content: 'link "util.sdev"\nlink "math.sdev"\nforge MAIN be 0' },
];

check('standard linking', resolveLinks('link "math.sdev"', files).includes('forge PI be 3.14'), true);

check('unknown file error', resolveLinks('link "unknown.sdev"', files).includes('// [link] file not found: unknown.sdev'), true);

check('unknown file sets error variable', resolveLinks('link "unknown.sdev"', files).includes('forge __link_error be "Cannot link \\"unknown.sdev\\" — file not found"'), true);

const cycleOut = resolveLinks('link "cycle-a.sdev"', files);
check('cycle detected', cycleOut.includes('// [link] cyclic import skipped: cycle-a.sdev'), true);

const mainOut = resolveLinks(files[4].content, files, { entryName: 'main.sdev' });
check('already linked skipping', mainOut.includes('// [link] already linked: math.sdev'), true);

const aliasOut = resolveLinks('link "math.sdev" as m', files);
check('alias applied prefix to forge', aliasOut.includes('forge m_PI be 3.14'), true);
check('alias applied prefix to conjure', aliasOut.includes('conjure m_add with a, b'), true);

if (failures.length) {
  console.error(`\n${failures.length} FAILED:\n` + failures.join('\n\n'));
  process.exit(1);
}
console.log(`linker suite: ${pass}/${pass} passed`);
