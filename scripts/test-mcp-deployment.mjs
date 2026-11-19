import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

test('the generated MCP deployment bundles the app entry and has only portable package imports', () => {
  const file = new URL('../supabase/functions/mcp/index.ts', import.meta.url);
  const source = ts.createSourceFile(file.pathname, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest);
  const imports = source.statements.filter(ts.isImportDeclaration).map((node) => node.moduleSpecifier.text);

  assert.ok(imports.some((specifier) => /^npm:@lovable\.dev\/mcp-js@[^/]+\/stacks\/supabase$/.test(specifier)));
  for (const specifier of imports) {
    assert.match(specifier, /^npm:(?:@[^/\\:]+\/)?[a-z0-9][a-z0-9._-]*(?:@[^/\\:]+)?(?:\/[^\\:]+)?$/i);
  }
  assert.ok(source.statements.some((statement) => ts.isVariableStatement(statement) &&
    statement.declarationList.declarations.some(({ initializer }) =>
      initializer && ts.isCallExpression(initializer) && initializer.expression.getText(source) === 'defineMcp')));
});