import { translateSource } from '../src/lang/tools/translator';
import { execute } from '../src/lang/index';

const src = `направи съобщение да_бъде "Здравей Свят"
кажи(съобщение)`;

const t = translateSource(src, 'auto');
console.log('TRANSLATED:', JSON.stringify(t.translated));
console.log('LANG:', t.detectedLanguage);

const r = execute(src);
console.log('SUCCESS:', r.success);
console.log('OUTPUT:', r.output);
if (r.error) console.log('ERROR:', r.error);
