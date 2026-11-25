import assert from 'node:assert/strict';
import { translateSource } from '../src/lang/tools/translator';
import { execute } from '../src/lang/index';

const src = `направи съобщение да_бъде "Здравей Свят"
кажи(съобщение)`;

const t = translateSource(src, 'auto');
assert.equal(t.detectedLanguage, 'Bulgarian', 'Detects Bulgarian source language');
assert.equal(t.translated, 'forge съобщение be "Здравей Свят"\nspeak(съобщение)');

const r = execute(src);
assert.equal(r.success, true, r.error ?? 'Execution failed');
assert.deepEqual(r.output, ['Здравей Свят']);
console.log('✓ Bulgarian translation & execution verified');
