import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execute } from '../../src/lang';
import { resolveLinks } from '../../src/lang/linker';
const ML='lang/stdlib/ml';
const files=readdirSync(ML).filter(f=>f.endsWith('.sdev')).map(f=>({name:f,content:readFileSync(join(ML,f),'utf8')}));
const prog=`link "data.sdev"
forge v be char_vocab("hey")
speak(str(v.size))
speak(str(tome_keys(v.stoi)))
speak(str(v.stoi["104"]))`;
console.log(JSON.stringify(execute(resolveLinks(prog,files,{entryName:'<t>'})),null,1));
