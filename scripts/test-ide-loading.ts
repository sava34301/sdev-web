import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { lintEditorFile } from '../src/components/ide/lintSdev';
import { lintSdev } from '../src/components/ide/IdeProblems';
import { BrowserRouter, HashRouter } from 'react-router-dom';
import { appRouterForProtocol } from '../src/lib/app-router';

// Follow real static dependencies, not comments or dynamic imports. A new
// indirect import of an engine should fail this gate too.
function staticDependencies(entry: string, visited = new Set<string>()): Set<string> {
  const absolute = path.resolve(entry);
  if (visited.has(absolute)) return visited;
  visited.add(absolute);
  const source = ts.createSourceFile(absolute, fs.readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest);
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    if (ts.isImportDeclaration(statement) && statement.importClause?.isTypeOnly) continue;
    if (ts.isExportDeclaration(statement) && statement.isTypeOnly) continue;
    const specifier = statement.moduleSpecifier;
    if (!specifier || !ts.isStringLiteral(specifier)) continue;
    const name = specifier.text;
    const base = name.startsWith('@/') ? path.resolve('src', name.slice(2))
      : name.startsWith('.') ? path.resolve(path.dirname(absolute), name) : null;
    if (!base) continue;
    const target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]
      .find(candidate => /\.(ts|tsx)$/.test(candidate) && fs.existsSync(candidate));
    if (target) staticDependencies(target, visited);
  }
  return visited;
}

const startup = new Set([...staticDependencies('src/App.tsx'), ...staticDependencies('src/pages/IDE.tsx')]);
for (const deferred of [
  'src/pages/Index.tsx', 'src/lang/runtime/interpreter.ts', 'src/lang/runtime/compiler.ts',
  'src/lang/stdlib/web.ts', 'src/lang/hardware/understand.ts',
  'src/components/ide/HardwarePanel.tsx', 'src/components/ide/IdeAssistantPanel.tsx',
  'src/components/ide/TimeTravelDebugger.tsx', 'src/components/ide/LiveScratchpadPanel.tsx',
  ...['PersonalPanel', 'IdeCommandPalette', 'IdeSearchPanel', 'IdeSettingsPanel',
    'IdeOutline', 'RuntimeExplorerPanel', 'LiveClassroomPanel', 'WasiComponentDialog',
    'GitHubPushDialog', 'AppPreviewPanel', 'WebPreviewPanel']
    .map(name => `src/components/ide/${name}.tsx`),
]) {
  assert.equal(startup.has(path.resolve(deferred)), false, `${deferred} must not block opening the editor`);
}
console.log('PASS: initial editor dependencies exclude homepage, engines and optional tools');

assert.equal(appRouterForProtocol('file:'), HashRouter);
assert.equal(appRouterForProtocol('https:'), BrowserRouter);
assert.equal(appRouterForProtocol('http:'), BrowserRouter);
console.log('PASS: offline desktop uses its #/ide entry; hosted URLs keep browser routing');

for (const source of [
  'forge value be 12\nspeak(value)',
  'forge unfinished be [1, 2',
  '!#ai\nv value = 12\nspeak(value)',
  'board "uno" {\n  pin 13 be output\n}\nforge unfinished',
  'board "uno" {\n  pin 13 be output',
  'board uno:\n  turn on the led\nforge value be 1',
]) {
  assert.deepEqual(await lintEditorFile(source), lintSdev(source));
}
console.log('PASS: deferred diagnostics match existing diagnostics, including unfinished hardware');