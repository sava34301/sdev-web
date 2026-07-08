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
set tk_kind to mklist(2000)
set tk_num  to mklist(2000)
set tk_txt  to mklist(2000)
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
            if _c is 34
              set _j to _i + 1
              set _collecting to 1
              while _collecting
                if _j >= _srclen
                  set _collecting to 0
                else
                  if ord(src, _j) is 34
                    set _collecting to 0
                  else
                    set _j to _j + 1
                  end
                end
              end
              set tk_kind[tk_count] to 3
              set tk_txt[tk_count] to slice(src, _i + 1, _j)
              set tk_count to tk_count + 1
              set _i to _j + 1
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
              set _tok to _c
              if _c is 60
                if _i + 1 < _srclen
                  if ord(src, _i + 1) is 61
                    set _tok to 300
                    set _i to _i + 1
                  end
                end
              end
              if _c is 62
                if _i + 1 < _srclen
                  if ord(src, _i + 1) is 61
                    set _tok to 301
                    set _i to _i + 1
                  end
                end
              end
              set tk_kind[tk_count] to 4
              set tk_num[tk_count] to _tok
              set tk_count to tk_count + 1
              set _i to _i + 1
            end
            end
          end
        end
      end
    end
  end
end
`;

const driveCodegen = `
set bc to mklist(8000)
set bc[0] to 0
set sym_names to mklist(256)
set sym_names[0] to 0
set sym_types to mklist(256)
set sym_types[0] to 0
set loc_names to mklist(256)
set loc_names[0] to 0
set loc_types to mklist(256)
set loc_types[0] to 0
set fn_names to mklist(256)
set fn_names[0] to 0
set fn_offsets to mklist(256)
set fn_offsets[0] to 0
set fn_arities to mklist(256)
set fn_arities[0] to 0
set in_func to mklist(2)
set in_func[0] to 0
set expr_type to mklist(2)
set expr_type[0] to 0
set scratch to mklist(4)
set scratch[0] to 0

set pos to 0
set going to 1
while going
  set new_pos to parse_stmt(pos)
  if new_pos is pos
    set going to 0
  else
    set pos to new_pos
  end
  if pos >= tk_count
    set going to 0
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
  { name: 'comparison is',           src: 'say 5 is 5\nsay 5 is 4' },
  { name: 'comparison is not',       src: 'say 5 is not 5\nsay 5 is not 4' },
  { name: 'comparison lt/gt',        src: 'say 3 < 5\nsay 3 > 5' },
  { name: 'comparison le/ge',        src: 'say 3 <= 3\nsay 3 >= 4' },
  { name: 'if then',                 src: 'set x to 10\nif x is 10\nsay 111\nend\nsay 999' },
  { name: 'if else true',            src: 'set x to 1\nif x is 1\nsay 100\nelse\nsay 200\nend' },
  { name: 'if else false',           src: 'set x to 2\nif x is 1\nsay 100\nelse\nsay 200\nend' },
  { name: 'while count up',          src: 'set i to 0\nwhile i < 5\nsay i\nset i to i + 1\nend\nsay 999' },
  { name: 'while sum',               src: 'set i to 1\nset s to 0\nwhile i <= 10\nset s to s + i\nset i to i + 1\nend\nsay s' },
  { name: 'nested if in while',      src: 'set i to 0\nwhile i < 6\nif i is 3\nsay 300\nelse\nsay i\nend\nset i to i + 1\nend' },
  { name: 'fizzbuzz-lite',           src: 'set i to 1\nwhile i <= 5\nif i is 3\nsay 30\nelse\nsay i\nend\nset i to i + 1\nend' },
  { name: 'zero-arg fn',             src: 'to answer\nreturn 42\nend\nsay answer()' },
  { name: 'one-arg fn',              src: 'to sq with x\nreturn x * x\nend\nsay sq(5)\nsay sq(9)' },
  { name: 'two-arg fn',              src: 'to add with a b\nreturn a + b\nend\nsay add(3, 4)\nsay add(10, 20)' },
  { name: 'fn using locals',         src: 'to hyp with a b\nset s to a * a + b * b\nreturn s\nend\nsay hyp(3, 4)' },
  { name: 'fn calls fn',             src: 'to sq with x\nreturn x * x\nend\nto sum_sq with a b\nreturn sq(a) + sq(b)\nend\nsay sum_sq(3, 4)' },
  { name: 'recursive factorial',     src: 'to fact with n\nif n < 2\nreturn 1\nend\nreturn n * fact(n - 1)\nend\nsay fact(6)' },
  { name: 'recursive fib',           src: 'to fib with n\nif n < 2\nreturn n\nend\nreturn fib(n - 1) + fib(n - 2)\nend\nsay fib(10)' },
  { name: 'fn with while',           src: 'to sum_to with n\nset i to 1\nset s to 0\nwhile i <= n\nset s to s + i\nset i to i + 1\nend\nreturn s\nend\nsay sum_to(10)\nsay sum_to(100)' },
  { name: 'global + fn together',    src: 'set base to 100\nto shift with x\nreturn x + base\nend\nsay shift(5)\nsay shift(7)' },
  { name: 'builtin mklist + len',    src: 'set xs to mklist(5)\nsay length(xs)' },
  { name: 'string literal',          src: 'say "hello"' },
  { name: 'string concat',           src: 'say "foo" + "bar"' },
  { name: 'string var + concat',     src: 'set a to "hi"\nset b to " there"\nsay a + b' },
  { name: 'str builtin',             src: 'say str(42) + str(58)' },
  { name: 'chr / ord',               src: 'say chr(65) + chr(90)\nsay ord("Z", 0)' },
  { name: 'list literal + index',    src: 'set xs to [10, 20, 30, 40]\nsay xs[0]\nsay xs[1]\nsay xs[3]' },
  { name: 'list literal length',     src: 'set xs to [7, 7, 7, 7, 7]\nsay length(xs)' },
  { name: 'index in expr',           src: 'set xs to [1, 2, 3, 4, 5]\nsay xs[2] * xs[4] + xs[0]' },
  { name: 'set xs[i] to v',          src: 'set xs to mklist(4)\nset xs[0] to 100\nset xs[1] to 200\nset xs[2] to xs[0] + xs[1]\nsay xs[2]' },
  { name: 'index in while',          src: 'set xs to [3, 1, 4, 1, 5, 9]\nset i to 0\nset s to 0\nwhile i < length(xs)\nset s to s + xs[i]\nset i to i + 1\nend\nsay s' },
  { name: 'empty string',            src: 'set s to ""\nsay length(s)' },
  { name: 'string in loop',          src: 'set i to 0\nwhile i < 3\nsay "tick"\nset i to i + 1\nend' },
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
