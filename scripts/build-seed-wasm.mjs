// Build the seed VM: lang/bootstrap/seed.wat → public/wasm/sdev-seed.wasm
//
// Uses the `wabt` npm package so the toolchain needs no system binaries.
import { readFile, writeFile } from 'node:fs/promises';
import wabtInit from 'wabt';

const wabt = await wabtInit();
const wat = await readFile('./lang/bootstrap/seed.wat', 'utf8');
const mod = wabt.parseWat('seed.wat', wat, { mutable_globals: true });
mod.validate();
const { buffer } = mod.toBinary({ log: false, write_debug_names: false });
await writeFile('./public/wasm/sdev-seed.wasm', Buffer.from(buffer));
console.log(`✓ seed VM built: ${buffer.length} bytes`);
