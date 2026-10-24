/**
 * Verification Suite for Workstream 4:
 *   - Canonical API Registry (`src/lang/registry/api-registry.ts`)
 *   - SDEV Static Linter & Quick Fixes (`src/lang/linter.ts`)
 *   - Studio Runner: Chrono, Live Lens, Prism (`src/studio/runner.ts`)
 *   - Studio Store & Supabase Cloud Sync (`src/studio/store.ts`)
 *
 * Run via:
 *   node scripts/run-ts.mjs scripts/test-registry.ts
 */

import {
  API_REGISTRY,
  API_MODULES,
  API_TARGETS,
  DIAGNOSTIC_CATALOGUE,
  DIAGNOSTIC_LIST,
  findApi,
  searchApis,
  suggestNearestApis,
  getApisForTarget,
  findDiagnostic,
  exportApiManifest,
  type ApiModule,
} from '@/lang/registry/api-registry';
import { lintSdevSource, applyQuickFix } from '@/lang/linter';
import { runStudioCode, runStudioCodeAsync } from '@/studio/runner';
import {
  getStudioState,
  createStudioFile,
  updateStudioFile,
  runActiveStudioFile,
  setChronoStep,
  getActiveChronoStep,
  setStudioSupabaseClient,
  syncStudioWithCloud,
  loadStudioFilesFromCloud,
  type StudioSupabaseLike,
} from '@/studio/store';

let passed = 0;
let failed = 0;

function assert(condition: unknown, message: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

async function runTests(): Promise<void> {
  console.log('=== 1. Canonical API Registry Completeness ===');
  assert(
    API_REGISTRY.length >= 180,
    `API_REGISTRY contains ${API_REGISTRY.length} canonical entries (>= 180)`
  );

  const expectedModules: ApiModule[] = [
    'core',
    'text',
    'list',
    'tome',
    'math',
    'matrix',
    'graphics',
    'turtle',
    'ui',
    'web',
    'hardware',
    'ml',
    'ffi',
    'webgpu',
    'leaflet',
  ];

  for (const mod of expectedModules) {
    const entries = searchApis('', { module: mod });
    assert(
      entries.length > 0,
      `Module '${mod}' has ${entries.length} registered APIs`
    );
  }

  const requiredApis = [
    ['speak', 'core'],
    ['whisper', 'core'],
    ['morph', 'core'],
    ['measure', 'core'],
    ['upper', 'text'],
    ['split', 'text'],
    ['gather', 'list'],
    ['sift', 'list'],
    ['fold', 'list'],
    ['keys', 'tome'],
    ['sqrt', 'math'],
    ['sin', 'math'],
    ['matmul', 'matrix'],
    ['det', 'matrix'],
    ['canvas', 'graphics'],
    ['rect', 'graphics'],
    ['forward', 'turtle'],
    ['window', 'ui'],
    ['button', 'ui'],
    ['page', 'web'],
    ['pinMode', 'hardware'],
    ['digitalWrite', 'hardware'],
    ['nn_dense', 'ml'],
    ['ffi_open', 'ffi'],
    ['gpu_init', 'webgpu'],
    ['map_view', 'leaflet'],
  ] as const;

  for (const [name, expectedMod] of requiredApis) {
    const entry = findApi(name);
    assert(
      Boolean(entry && entry.module === expectedMod),
      `findApi('${name}') resolves in module '${expectedMod}'`
    );
  }

  const nativeApis = getApisForTarget('native-x64');
  const browserApis = getApisForTarget('browser');
  assert(
    nativeApis.some((a) => a.name === 'speak') &&
      !nativeApis.some((a) => a.name === 'window'),
    `getApisForTarget('native-x64') includes 'speak' and excludes browser-only 'window'`
  );
  assert(
    browserApis.some((a) => a.name === 'window') &&
      browserApis.some((a) => a.name === 'canvas'),
    `getApisForTarget('browser') includes 'window' and 'canvas'`
  );

  const manifest = exportApiManifest();
  assert(
    manifest.totalApis === API_REGISTRY.length &&
      Object.keys(manifest.byModule).length >= 15 &&
      API_MODULES.length === 16 &&
      API_TARGETS.length === 6,
    `exportApiManifest() exports ${manifest.totalApis} APIs across ${Object.keys(manifest.byModule).length} modules`
  );

  console.log('\n=== 2. "Did You Mean?" Suggestions ===');
  const suggestionCases: Array<[string, string]> = [
    ['fillrect', 'rect'],
    ['println', 'speak'],
    ['pushe', 'gather'],
    ['console.log', 'speak'],
    ['len', 'measure'],
    ['filter', 'sift'],
    ['reduce', 'fold'],
  ];

  for (const [typo, expectedTop] of suggestionCases) {
    const suggestions = suggestNearestApis(typo, 3);
    assert(
      suggestions.some((s) => s.entry.name === expectedTop || s.matchedName === expectedTop),
      `suggestNearestApis('${typo}') suggests '${expectedTop}' (got: ${suggestions.map((s) => s.entry.name).join(', ')})`
    );
  }

  console.log('\n=== 3. Diagnostic Catalogue (SDEV001..SDEV015) ===');
  assert(
    DIAGNOSTIC_LIST.length === 15,
    `DIAGNOSTIC_CATALOGUE has all 15 diagnostic codes (SDEV001..SDEV015)`
  );
  for (let i = 1; i <= 15; i++) {
    const code = `SDEV${String(i).padStart(3, '0')}`;
    const entry = findDiagnostic(code);
    assert(
      Boolean(entry && entry.code === code && entry.explanation.length > 20),
      `${code} (${entry?.title}) is documented in DIAGNOSTIC_CATALOGUE`
    );
  }

  console.log('\n=== 4. Static Linter (SDEV001..SDEV015) & Quick Fixes ===');

  // SDEV001: Unclosed block
  const diag001 = lintSdevSource('ponder x > 0 ::\n  speak(x)\n');
  assert(
    diag001.some((d) => d.code === 'SDEV001'),
    'Linter detects SDEV001 (unclosed :: block)'
  );

  // SDEV003: Division by zero
  const diag003 = lintSdevSource('forge ratio be 100 / 0\nspeak(ratio)\n');
  assert(
    diag003.some((d) => d.code === 'SDEV003'),
    'Linter detects SDEV003 (division by zero)'
  );

  // SDEV004: Unreachable code after yield
  const diag004 = lintSdevSource(
    'conjure calc(x) ::\n  yield x * 2\n  speak("never reached")\n;;\ncalc(5)\n'
  );
  assert(
    diag004.some((d) => d.code === 'SDEV004' && d.line === 3),
    'Linter detects SDEV004 (unreachable code after yield)'
  );

  // SDEV005: Unused variable
  const diag005 = lintSdevSource('forge unusedCounter be 42\nspeak("hi")\n');
  assert(
    diag005.some((d) => d.code === 'SDEV005' && d.message.includes('unusedCounter')),
    'Linter detects SDEV005 (unused forge variable)'
  );

  // SDEV006: Unknown function `fillrect` -> `rect` + quickFix
  const badCallSrc = 'canvas(400, 300)\nfillrect(10, 10, 50, 50)\n';
  const diag006 = lintSdevSource(badCallSrc);
  const fillrectDiag = diag006.find((d) => d.code === 'SDEV006');
  assert(
    Boolean(
      fillrectDiag &&
        fillrectDiag.suggestion?.includes('rect') &&
        fillrectDiag.quickFix?.replacement === 'rect'
    ),
    `Linter detects SDEV006 on 'fillrect' and suggests 'rect'`
  );
  if (fillrectDiag?.quickFix) {
    const fixedSrc = applyQuickFix(badCallSrc, fillrectDiag.quickFix);
    assert(
      fixedSrc.includes('rect(10, 10, 50, 50)'),
      'applyQuickFix replaces fillrect with rect cleanly'
    );
  }

  // SDEV007: Target mismatch (`window()` / `canvas()` when target is `native-x64`)
  const diag007 = lintSdevSource('window("My App")\ncanvas(300, 200)\n', {
    target: 'native-x64',
  });
  assert(
    diag007.filter((d) => d.code === 'SDEV007').length >= 2,
    'Linter detects SDEV007 when browser-only window()/canvas() are used with target native-x64'
  );

  // SDEV008: Deprecated API `println` -> `speak`
  const diag008 = lintSdevSource('println("hello world")\n');
  assert(
    diag008.some(
      (d) => d.code === 'SDEV008' && d.quickFix?.replacement === 'speak'
    ),
    'Linter detects SDEV008 on deprecated println() and suggests speak()'
  );

  // SDEV009: `=` instead of `be`
  const diag009 = lintSdevSource('forge score = 10\nspeak(score)\n');
  assert(
    diag009.some((d) => d.code === 'SDEV009'),
    'Linter detects SDEV009 (forge x = 10 instead of forge x be 10)'
  );

  // SDEV010: Foreign keyword
  const diag010 = lintSdevSource('const count = 5\n');
  assert(
    diag010.some((d) => d.code === 'SDEV010'),
    'Linter detects SDEV010 (foreign keyword const)'
  );

  // SDEV011: Arity mismatch
  const diag011 = lintSdevSource('forge root be sqrt(9, 16, 25)\nspeak(root)\n');
  assert(
    diag011.some((d) => d.code === 'SDEV011'),
    'Linter detects SDEV011 (too many arguments to sqrt)'
  );

  // SDEV012: Builtin shadowing
  const diag012 = lintSdevSource('forge speak be 123\n');
  assert(
    diag012.some((d) => d.code === 'SDEV012'),
    'Linter detects SDEV012 (shadowing core builtin speak)'
  );

  // SDEV013: Constant condition
  const diag013 = lintSdevSource('ponder yep ::\n  speak("always")\n;;\n');
  assert(
    diag013.some((d) => d.code === 'SDEV013'),
    'Linter detects SDEV013 (constant condition ponder yep)'
  );

  // SDEV014: Self-assignment / comparison
  const diag014 = lintSdevSource('forge a be 1\na be a\n');
  assert(
    diag014.some((d) => d.code === 'SDEV014'),
    'Linter detects SDEV014 (self-assignment a be a)'
  );

  // SDEV015: Planned API usage
  const diag015 = lintSdevSource('map_view(51.5, -0.09, 13)\n');
  assert(
    diag015.some((d) => d.code === 'SDEV015'),
    'Linter detects SDEV015 (planned leaflet API map_view)'
  );

  console.log('\n=== 5. Studio Runner (Chrono, Live Lens, Prism) ===');
  const studioSample = `forge sum be 0
for each n through [2, 4, 6] ::
  sum be sum + n
;;
speak("Total=" + morph(sum, "text"))
`;
  const runRes = runStudioCode(studioSample);
  assert(
    runRes.success && runRes.output[0] === 'Total=12',
    `runStudioCode executes real SDEV engine and produces 'Total=12'`
  );
  assert(
    runRes.chrono.length >= 5,
    `Chrono trace recorded ${runRes.chrono.length} time-travel steps`
  );
  const lastStep = runRes.chrono[runRes.chrono.length - 1];
  assert(
    lastStep.variables.sum === '12',
    `Chrono final step variable snapshot has sum === '12'`
  );
  assert(
    runRes.liveLens[3]?.hits === 3 && runRes.liveLens[3]?.display.includes('sum = 12'),
    `Live Lens line 3 tracked 3 loop iterations ending with '${runRes.liveLens[3]?.display}'`
  );
  assert(
    Boolean(runRes.prism.tree && runRes.prism.statementCount === 3 && runRes.prism.nodeCount > 5),
    `Prism AST built tree with ${runRes.prism.nodeCount} nodes and ${runRes.prism.tokenCount} tokens`
  );

  const asyncRes = await runStudioCodeAsync(studioSample, { runtime: 'v1' });
  assert(
    asyncRes.success && asyncRes.output[0] === 'Total=12',
    'runStudioCodeAsync executes cleanly'
  );

  console.log('\n=== 6. Studio Store & Cloud Persistence Sync ===');
  const newFile = createStudioFile(
    'experiment.sdev',
    'forge x be 21\nforge y be x * 2\nspeak(y)\n'
  );
  updateStudioFile(newFile.id, 'forge x be 25\nforge y be x * 4\nspeak(y)\n');
  const storeRun = runActiveStudioFile();
  assert(
    storeRun.success && storeRun.output[0] === '100',
    `runActiveStudioFile ran updated file and produced '100'`
  );

  setChronoStep(0);
  const step0 = getActiveChronoStep();
  assert(
    Boolean(step0 && step0.variables.x === '25' && step0.variables.y === undefined),
    `Chrono time-travel scrubber at step 0 shows x=25 before y is defined`
  );

  // Test guest / signed-out fallback
  setStudioSupabaseClient(null);
  await loadStudioFilesFromCloud();
  assert(
    getStudioState().cloudStatus === 'local-only',
    `Store falls back cleanly to 'local-only' when no Supabase session is active`
  );

  // Test authenticated Supabase cloud sync with mock client
  const cloudDbRows: Array<{
    id: string;
    name: string;
    content: string;
    language: string;
    created_at: string;
    updated_at: string;
  }> = [];

  const mockSupabase: StudioSupabaseLike = {
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: 'user-test-123' } } },
      }),
    },
    from: () => ({
      select: () => ({
        order: async () => ({
          data: [...cloudDbRows],
          error: null,
        }),
      }),
      insert: (row) => ({
        select: () => ({
          single: async () => {
            const created = {
              id: `db-${cloudDbRows.length + 1}`,
              name: row.name,
              content: row.content,
              language: row.language,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            cloudDbRows.push(created);
            return { data: created, error: null };
          },
        }),
      }),
      update: (patch) => ({
        eq: async (_col, val) => {
          const found = cloudDbRows.find((r) => r.id === val);
          if (found) {
            if (patch.name) found.name = patch.name;
            if (patch.content) found.content = patch.content;
            if (patch.language) found.language = patch.language;
            found.updated_at = new Date().toISOString();
          }
          return { error: null };
        },
      }),
      delete: () => ({
        eq: async (_col, val) => {
          const idx = cloudDbRows.findIndex((r) => r.id === val);
          if (idx >= 0) cloudDbRows.splice(idx, 1);
          return { error: null };
        },
      }),
    }),
  };

  setStudioSupabaseClient(mockSupabase);
  const syncedState = await syncStudioWithCloud();
  assert(
    syncedState.cloudStatus === 'synced' &&
      syncedState.userId === 'user-test-123' &&
      cloudDbRows.length >= 2,
    `syncStudioWithCloud synced ${cloudDbRows.length} files to Supabase code_files with status '${syncedState.cloudStatus}'`
  );

  console.log(`\n========================================`);
  console.log(`Passed: ${passed} | Failed: ${failed}`);
  console.log(`========================================`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
