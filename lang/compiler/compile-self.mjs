// Self-hosted SDEV compiler shim — Milestone 5l.
//
// Exposes a `compile(source)` function with the same shape as the JS
// bootstrap (`lang/bootstrap/compile.mjs`), but drives the SDEV-authored
// codegen (`lang/compiler/codegen.sdev`) through the seed WASM VM.
//
// One-time init: the seed VM + codegen driver program are compiled with
// the JS bootstrap and cached. Subsequent `compile(src)` calls only pay
// for a fresh WASM instantiation per source. When the self-hosted
// pipeline can compile itself in-tree (Milestone 5m — "delete the
// oracle"), this shim will drop the bootstrap dependency entirely.
//
// The seed VM stores the string pool at memory offset 0 (below
// `code_base()`), so pool size is bounded by the seed's layout (0x2000).

import { readFile } from 'node:fs/promises';
import { compile as bootstrapCompile } from '../bootstrap/compile.mjs';

const decoder = new TextDecoder();

// Inline lexer stub — same one the self-codegen test uses. Emits into
// tk_kind/tk_num/tk_txt/tk_count globals that codegen.sdev consumes.
const INLINE_LEX = `
set tk_kind to mklist(20000)
set tk_num  to mklist(20000)
set tk_txt  to mklist(20000)
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
          if _c is 35
            set _going to 1
            while _going
              if _i >= _srclen
                set _going to 0
              else
                if ord(src, _i) is 10
                  set _going to 0
                else
                  set _i to _i + 1
                end
              end
            end
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
end
`;

const DRIVE_CODEGEN = `
set bc to mklist(65536)
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
set fn_ret_types to mklist(256)
set fn_ret_types[0] to 0
set fn_extras to mklist(256)
set fn_extras[0] to 0
set fn_body_start to mklist(256)
set fn_body_start[0] to 0
set cur_fn to mklist(2)
set cur_fn[0] to 0
set pend_names to mklist(512)
set pend_names[0] to 0
set pend_pos to mklist(512)
set pend_pos[0] to 0
set in_func to mklist(2)
set in_func[0] to 0
set expr_type to mklist(2)
set expr_type[0] to 0
set scratch to mklist(4)
set scratch[0] to 0
set emit_enabled to mklist(2)
set emit_enabled[0] to 0
set skip_fn_defs to mklist(2)
set skip_fn_defs[0] to 0
set pool_bytes to mklist(32768)
set pool_bytes[0] to 0
set pool_keys to mklist(256)
set pool_keys[0] to 0
set pool_offs to mklist(256)
set pool_offs[0] to 0

set emit_enabled[0] to 0
set skip_fn_defs[0] to 0
set _iter to 0
while _iter < 2
  set pos to 0
  set sym_names[0] to 0
  set sym_types[0] to 0
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
  set _iter to _iter + 1
end

set sym_names[0] to 0
set sym_types[0] to 0
set pend_names[0] to 0
set pend_pos[0] to 0
set bc[0] to 0
set emit_enabled[0] to 1

emit_byte(64)
set _jmp_main to placeholder16()

set _i to 1
set _fstop to fn_names[0] + 1
while _i < _fstop
  set fn_offsets[_i] to bc[0]
  set loc_names[0] to 0
  set loc_types[0] to 0
  set pos to fn_body_start[_i]
  set pos to parse_params(pos)
  set _extras to fn_extras[_i]
  if _extras > 0
    emit_byte(98)
    emit_byte(_extras)
  end
  set in_func[0] to 1
  set cur_fn[0] to _i
  set pos to parse_block(pos)
  emit_byte(1)
  emit_i32(0)
  emit_byte(97)
  set in_func[0] to 0
  set cur_fn[0] to 0
  set _i to _i + 1
end

patch_i16(_jmp_main, bc[0])

set skip_fn_defs[0] to 1
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
resolve_pending_calls()

say bc[0]
set k to 1
set stop to bc[0] + 1
while k < stop
  say bc[k]
  set k to k + 1
end
say pool_bytes[0]
set k to 1
set stop to pool_bytes[0] + 1
while k < stop
  say pool_bytes[k]
  set k to k + 1
end
`;

function escapeForSdev(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
}

let cached = null;

async function init() {
  if (cached) return cached;
  const [wasmBytes, codegenSrc] = await Promise.all([
    readFile(new URL('../../public/wasm/sdev-seed.wasm', import.meta.url)),
    readFile(new URL('./codegen.sdev', import.meta.url), 'utf8'),
  ]);
  const wasmModule = await WebAssembly.compile(wasmBytes);
  cached = { wasmModule, codegenSrc };
  return cached;
}

// Compile any SDEV source through the self-hosted codegen. Returns
// `{ bytecode, stringPool }` — same shape as the JS bootstrap.
export async function compile(userSrc) {
  const { wasmModule, codegenSrc } = await init();
  const driverProgram =
    `set src to "${escapeForSdev(userSrc)}"\n` +
    codegenSrc + '\n' +
    INLINE_LEX + '\n' +
    DRIVE_CODEGEN + '\n';

  // Bootstrap once to run the driver on the seed VM.
  const { bytecode: driverBc, stringPool: driverPool } = bootstrapCompile(driverProgram);
  const dumped = [];
  let mem;
  const inst = await WebAssembly.instantiate(wasmModule, {
    env: {
      host_say_i32: (n) => dumped.push(String(n)),
      host_say_str: (ptr, len) => dumped.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
      host_say_f64: (x) => {},
      host_fmath: (op,a,b) => [Math.sin,Math.cos,Math.tan,Math.exp,Math.log,(x,y)=>Math.pow(x,y)][op](a,b),
      host_read_file: () => 0,
      host_write_file: () => -1,
      host_http_get: () => 0,
    },
  });
  mem = inst.exports.memory;
  new Uint8Array(mem.buffer).set(driverPool, 0);
  const codeBase = inst.exports.code_base();
  new Uint8Array(mem.buffer).set(driverBc, codeBase);
  inst.exports.set_prog_len(driverBc.length);
  inst.exports.run();

  let cursor = 0;
  const bcCount = parseInt(dumped[cursor++], 10);
  const bytecode = new Uint8Array(bcCount);
  for (let i = 0; i < bcCount; i++) bytecode[i] = parseInt(dumped[cursor++], 10) & 0xff;
  const poolCount = parseInt(dumped[cursor++], 10);
  const stringPool = new Uint8Array(poolCount);
  for (let i = 0; i < poolCount; i++) stringPool[i] = parseInt(dumped[cursor++], 10) & 0xff;
  return { bytecode, stringPool };
}

// Sync-shape alias for callers that already `await` the result.
export default { compile };
