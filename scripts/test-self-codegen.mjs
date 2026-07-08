// Self-hosted codegen end-to-end test.
//
// Feeds a source program through the SDEV-written codegen
// (lang/compiler/codegen.sdev), running on the seed WASM VM. The codegen
// emits bytecode into a global `bc` buffer and prints its bytes via `say`.
// This driver reconstructs those bytes as a Uint8Array, executes the
// bytecode in a *fresh* seed WASM instance, and diffs stdout against the
// JS bootstrap compiler's output for the same source.
//
// If both agree, the SDEV-written compiler produces bytecode
// indistinguishable from the JS bootstrap for this subset — the first
// end-to-end self-hosted compile.

import { readFile } from 'node:fs/promises';
import { compile } from '../lang/bootstrap/compile.mjs';

const wasmBytes  = await readFile('./public/wasm/sdev-seed.wasm');
const codegenSrc = await readFile('./lang/compiler/codegen.sdev', 'utf8');
const module     = await WebAssembly.compile(wasmBytes);
const decoder    = new TextDecoder();

const inlineLex = `
set tk_kind to mklist(1000)
set tk_num  to mklist(1000)
set tk_txt  to mklist(1000)
set tk_count to 0
set _srclen to length(src)
set _i to 0
while _i < _srclen
  set _c to ord(src, _i)
  if _c is 32
    set _i to _i + 1
  else
    if _c is 9
      set _i to _i + 1
    else
      if _c is 13
        set _i to _i + 1
      else
        if _c is 10
          set tk_kind[tk_count] to 5
          set tk_count to tk_count + 1
          set _i to _i + 1
        else
          if is_digit(_c)
            set _j to _i
            set _going to 1
            while _going
              if _j >= _srclen
                set _going to 0
              else
                if is_digit(ord(src, _j))
                  set _j to _j + 1
                else
                  set _going to 0
                end
              end
            end
            set _v to 0
            set _k to _i
            while _k < _j
              set _v to _v * 10 + ord(src, _k) - 48
              set _k to _k + 1
            end
            set tk_kind[tk_count] to 1
            set tk_num[tk_count] to _v
            set tk_count to tk_count + 1
            set _i to _j
          else
            if is_alpha(_c)
              set _j to _i
              set _going to 1
              while _going
                if _j >= _srclen
                  set _going to 0
                else
                  if is_alnum(ord(src, _j))
                    set _j to _j + 1
                  else
                    set _going to 0
                  end
                end
              end
              set tk_kind[tk_count] to 2
              set tk_txt[tk_count] to slice(src, _i, _j)
              set tk_count to tk_count + 1
              set _i to _j
            else
              set tk_kind[tk_count] to 4
              set tk_num[tk_count] to _c
              set tk_count to tk_count + 1
              set _i to _i + 1
            end
          end
        end
      end
    end
  end
end
`;

const driveCodegen = `
set bc to mklist(4000)
set bc[0] to 0
set sym_names to mklist(256)
set sym_count to 0

set pos to 0
set going to 1
while going
  set sk to 1
  while sk
    if pos >= tk_count
      set sk to 0
    else
      if tk_kind[pos] is 5
        set pos to pos + 1
      else
        set sk to 0
      end
    end
  end
  if pos >= tk_count
    set going to 0
  else
    if tk_kind[pos] is 2
      if str_eq(tk_txt[pos], "say")
        set pos to parse_add(pos + 1)
        emit_byte(80)
      else
        if str_eq(tk_txt[pos], "set")
          set pos to pos + 1
          set target_slot to intern_name(tk_txt[pos])
          set pos to pos + 1
          set pos to pos + 1
          set pos to parse_add(pos)
          emit_byte(4)
          emit_byte(target_slot)
        else
          set going to 0
        end
      end
    else
      set going to 0
    end
  end
end
emit_byte(255)

say bc[0]
set k to 1
set stop to bc[0] + 1
while k < stop
  say bc[k]
  set k to k + 1
end
`;

function escapeForSdev(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

async function runOne(programSrc) {
  const { bytecode, stringPool } = compile(programSrc);
  const output = [];
  let mem;
  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => output.push(String(n)),
      host_say_str: (ptr, len) => output.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
    },
  });
  mem = inst.exports.memory;
  new Uint8Array(mem.buffer).set(stringPool, 0);
  const codeBase = inst.exports.code_base();
  new Uint8Array(mem.buffer).set(bytecode, codeBase);
  inst.exports.set_prog_len(bytecode.length);
  inst.exports.run();
  return output;
}

// Run the SDEV self-hosted compiler on `userSrc` and get the emitted
// bytecode back as a Uint8Array.
async function selfCompile(userSrc) {
  const program =
    `set src to "${escapeForSdev(userSrc)}"\n` +
    codegenSrc + '\n' +
    inlineLex + '\n' +
    driveCodegen + '\n';
  const dumped = await runOne(program);
  const count = parseInt(dumped[0], 10);
  const bytes = new Uint8Array(count);
  for (let i = 0; i < count; i++) bytes[i] = parseInt(dumped[i + 1], 10) & 0xff;
  return bytes;
}

// Execute a raw bytecode buffer in a fresh seed WASM instance.
async function execBytecode(bytecode, stringPool = new Uint8Array(0x2000)) {
  const output = [];
  let mem;
  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => output.push(String(n)),
      host_say_str: (ptr, len) => output.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
    },
  });
  mem = inst.exports.memory;
  new Uint8Array(mem.buffer).set(stringPool, 0);
  const codeBase = inst.exports.code_base();
  new Uint8Array(mem.buffer).set(bytecode, codeBase);
  inst.exports.set_prog_len(bytecode.length);
  inst.exports.run();
  return output;
}

// Reference: what does the JS bootstrap compiler produce for the same src?
async function jsCompileAndRun(userSrc) {
  return runOne(userSrc);
}

const cases = [
  { name: 'single say',              src: 'say 42' },
  { name: 'arithmetic',              src: 'say 1 + 2 * 3' },
  { name: 'parens override',         src: 'say (1 + 2) * 3' },
  { name: 'multiple says',           src: 'say 1\nsay 2\nsay 3' },
  { name: 'nested + mixed',          src: 'say ((10 + 20) * (30 - 4)) / 5' },
  { name: 'left associativity',      src: 'say 100 - 1 - 2 - 3' },
  { name: 'set + read',              src: 'set x to 7\nsay x' },
  { name: 'set expr + reuse',        src: 'set a to 3 + 4\nset b to a * 2\nsay a\nsay b' },
  { name: 'accumulator',             src: 'set s to 0\nset s to s + 10\nset s to s + 20\nset s to s + 30\nsay s' },
  { name: 'read in expr',            src: 'set x to 5\nset y to 6\nsay x * y + x' },
];

let failed = 0;
for (const c of cases) {
  try {
    const bytes = await selfCompile(c.src);
    const selfOut = await execBytecode(bytes);
    const refOut  = await jsCompileAndRun(c.src);
    const ok = JSON.stringify(selfOut) === JSON.stringify(refOut);
    console.log(`${ok ? '✓' : '✗'} ${c.name}  (${bytes.length} bytes)`);
    if (!ok) {
      failed++;
      console.log('   ref (js-bootstrap):', refOut);
      console.log('   got (sdev-compiler):', selfOut);
    }
  } catch (e) {
    failed++;
    console.log(`✗ ${c.name} — threw: ${e.message}`);
  }
}
process.exit(failed);
