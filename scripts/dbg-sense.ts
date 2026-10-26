import { repair } from '../src/lang/agent/repair';
import { sdevUnderstand } from '../src/lang/agent/sdev-engine';
for (const s of ['set p to int(s)\nsay p', 'to add with a b\n  return a + b\nend\nsay add(1, 2', 'set c to new Counter()\nc.start(5)']) {
  console.log('REPAIR', JSON.stringify(repair(s).source));
  console.log('SDEV  ', JSON.stringify(sdevUnderstand(s, new Set(), [])));
}
