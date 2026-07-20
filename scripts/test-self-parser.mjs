// Runs the self-hosted expression parser through the seed WASM VM and
// diffs its streamed RPN against a JS reference.
//
// The harness composes one SDEV program:
//   1. `set src to "<escaped source>"`
//   2. globals: tk_kind / tk_num / tk_count as preallocated lists
//   3. inlined lexer loop (top-level, so it can write those globals)
//   4. lang/compiler/parser.sdev (helpers + parse_add / parse_mul / parse_atom)
//   5. `parse_add(0)` — the entry point
//
// The inlined lexer here is intentionally a subset of lang/compiler/lexer.sdev:
// it only emits NUM (kind=1) and PUNCT (kind=4). That's the surface the
// expression parser needs. Once parser + codegen for statements are done,
// the two will merge into a single lang/compiler/pipeline.sdev.
import { readFile } from 'node:fs/promises';
import { compile } from '../lang/bootstrap/compile.mjs';

const wasmBytes  = await readFile('./public/wasm/sdev-seed.wasm');
const parserSrc  = await readFile('./lang/compiler/parser.sdev', 'utf8');
const module     = await WebAssembly.compile(wasmBytes);
const decoder    = new TextDecoder();

const inlineLex = `
set tk_kind to mklist(1000)
set tk_num  to mklist(1000)
set tk_count to 0
set n to length(src)
set i to 0
while i < n
  set c to ord(src, i)
  if c is 32
    set i to i + 1
  else
    if c is 9
      set i to i + 1
    else
      if c is 10
        set i to i + 1
      else
        if c >= 48
          if c <= 57
            set j to i
            set going to 1
            while going
              if j >= n
                set going to 0
              else
                set d to ord(src, j)
                if d >= 48
                  if d <= 57
                    set j to j + 1
                  else
                    set going to 0
                  end
                else
                  set going to 0
                end
              end
            end
            set v to 0
            set k to i
            while k < j
              set v to v * 10 + ord(src, k) - 48
              set k to k + 1
            end
            set tk_kind[tk_count] to 1
            set tk_num[tk_count] to v
            set tk_count to tk_count + 1
            set i to j
          else
            set tk_kind[tk_count] to 4
            set tk_num[tk_count] to c
            set tk_count to tk_count + 1
            set i to i + 1
          end
        else
          set tk_kind[tk_count] to 4
          set tk_num[tk_count] to c
          set tk_count to tk_count + 1
          set i to i + 1
        end
      end
    end
  end
end
`;

function escapeForSdev(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

async function runParser(source) {
  const program =
    `set src to "${escapeForSdev(source)}"\n` +
    inlineLex + '\n' +
    parserSrc + '\n' +
    'parse_add(0)\n';
  const { bytecode, stringPool } = compile(program);
  const output = [];
  let mem;
  const inst = await WebAssembly.instantiate(module, {
    env: {
      host_say_i32: (n) => output.push(String(n)),
      host_say_str: (ptr, len) => output.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
      host_say_f64: (x) => {},
      host_fmath: (op,a,b) => [Math.sin,Math.cos,Math.tan,Math.exp,Math.log,(x,y)=>Math.pow(x,y)][op](a,b),
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

// JS reference: mirror parser.sdev exactly.
function refParse(src) {
  const toks = [];
  let i = 0;
  while (i < src.length) {
    const c = src.charCodeAt(i);
    if (c === 32 || c === 9 || c === 10) { i++; continue; }
    if (c >= 48 && c <= 57) {
      let j = i; while (j < src.length && src.charCodeAt(j) >= 48 && src.charCodeAt(j) <= 57) j++;
      toks.push({ k: 1, v: parseInt(src.slice(i, j), 10) });
      i = j;
    } else {
      toks.push({ k: 4, v: c });
      i++;
    }
  }
  const out = [];
  let pos = 0;
  const isOp = (p, c) => p < toks.length && toks[p].k === 4 && toks[p].v === c;
  function parseAtom() {
    if (toks[pos] && toks[pos].k === 1) { out.push('N=' + toks[pos].v); pos++; return; }
    if (isOp(pos, 40)) { pos++; parseAdd(); if (isOp(pos, 41)) pos++; return; }
  }
  function parseMul() {
    parseAtom();
    for (;;) {
      if (isOp(pos, 42)) { pos++; parseAtom(); out.push('OP=*'); }
      else if (isOp(pos, 47)) { pos++; parseAtom(); out.push('OP=/'); }
      else break;
    }
  }
  function parseAdd() {
    parseMul();
    for (;;) {
      if (isOp(pos, 43)) { pos++; parseMul(); out.push('OP=+'); }
      else if (isOp(pos, 45)) { pos++; parseMul(); out.push('OP=-'); }
      else break;
    }
  }
  parseAdd();
  return out;
}

const cases = [
  { name: 'single number',       src: '42' },
  { name: 'add',                 src: '1 + 2' },
  { name: 'precedence',          src: '1 + 2 * 3' },
  { name: 'parens override',     src: '(1 + 2) * 3' },
  { name: 'chained associativity', src: '1 - 2 - 3' },
  { name: 'nested',              src: '((1 + 2) * (3 - 4)) / 5' },
  { name: 'mixed',               src: '10 + 20 * 30 - 40 / 5 + (6 * 7)' },
];

let failed = 0;
for (const c of cases) {
  try {
    const got = await runParser(c.src);
    const expected = refParse(c.src);
    const ok = JSON.stringify(got) === JSON.stringify(expected);
    console.log(`${ok ? '✓' : '✗'} ${c.name}`);
    if (!ok) {
      failed++;
      console.log('   expected:', expected);
      console.log('   got:     ', got);
    }
  } catch (e) {
    failed++;
    console.log(`✗ ${c.name} — threw: ${e.message}`);
  }
}
process.exit(failed);
