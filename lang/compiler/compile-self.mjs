// Self-hosted SDEV compiler shim — Milestone 5p.
//
// Exposes a `compile(source)` function with the same shape as the JS
// bootstrap (`lang/bootstrap/compile.mjs`), but drives the SDEV-authored
// codegen (`lang/compiler/codegen.sdev`) through the seed WASM VM.
//
// Milestone 5p removed the bootstrap from this path entirely. The driver
// program (codegen.sdev + inline lexer + drive block) no longer embeds the
// user source as a literal — it reads it with `read_file("<stdin>")`, which
// the host answers from memory. That makes the driver bytecode
// source-independent, so it is compiled ONCE by
// `scripts/build-driver.mjs` and checked in as `driver-artifact.mjs`.
// `scripts/test-driver-artifact.mjs` re-derives it from the bootstrap and
// fails if the checked-in bytes drift.
//
// The seed VM stores the string pool at memory offset 0 (below
// `code_base()`), so pool size is bounded by the seed's layout (0x2000).

import { DRIVER_BYTECODE_B64, DRIVER_POOL_B64 } from './driver-artifact.mjs';

const decoder = new TextDecoder();
// Node-only module resolution for the prelink pass; absent in the browser.
let nodeFs = null;
async function ensureNodeFs() {
  if (nodeFs) return nodeFs;
  if (typeof process !== 'undefined' && process.versions?.node) {
    nodeFs = (await import(/* @vite-ignore */ 'node:fs')).default;
  }
  return nodeFs;
}
const encoder = new TextEncoder();



// Inline lexer stub — same one the self-codegen test uses. Emits into
// tk_kind/tk_num/tk_txt/tk_count globals that codegen.sdev consumes.
const INLINE_LEX = `
set tk_kind to mklist(20000)
set tk_num  to mklist(20000)
set tk_num2 to mklist(20000)

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
            set _scale to 0
            set _isf to 0
            if _j < _srclen
              if ord(src, _j) is 46
                if _j + 1 < _srclen
                  if is_digit(ord(src, _j + 1))
                    set _isf to 1
                    set _j to _j + 1
                    set _going to 1
                    while _going
                      if _j >= _srclen
                        set _going to 0
                      else
                        if is_digit(ord(src, _j))
                          set _v to _v * 10 + ord(src, _j) - 48
                          set _scale to _scale + 1
                          set _j to _j + 1
                        else
                          set _going to 0
                        end
                      end
                    end
                  end
                end
              end
            end
            if _isf is 1
              set tk_kind[tk_count] to 6
            else
              set tk_kind[tk_count] to 1
            end
            set tk_num[tk_count] to _v
            set tk_num2[tk_count] to _scale
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
set lam_names to mklist(64)
set lam_names[0] to 0
set lam_caps to mklist(64)
set lam_caps[0] to 0
set lsav_names to mklist(256)
set lsav_names[0] to 0
set lsav_types to mklist(256)
set lsav_types[0] to 0
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
set brk_pos to mklist(256)
set brk_pos[0] to 0
set brk_dep to mklist(256)
set brk_dep[0] to 0
set cnt_pos to mklist(256)
set cnt_pos[0] to 0
set cnt_dep to mklist(256)
set cnt_dep[0] to 0
set loop_depth to mklist(2)
set loop_depth[0] to 0
set fe_depth to mklist(2)
set fe_depth[0] to 0
set cls_names to mklist(64)
set cls_names[0] to 0
set mth_cls to mklist(256)
set mth_cls[0] to 0
set mth_key to mklist(256)
set mth_key[0] to 0
set mth_fn to mklist(256)
set mth_fn[0] to 0
set last_id to mklist(2)
set last_id[0] to ""

desugar_kinds()

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

// The exact driver program whose bytecode is baked into
// `driver-artifact.mjs`. Source-independent: the user program arrives via
// `read_file("<stdin>")`, answered by the host below.
export function driverProgram(codegenSrc) {
  return 'set src to read_file("<stdin>")\n' +
    codegenSrc + '\n' +
    'set src to prelink_source(src)\n' +
    INLINE_LEX + '\n' +
    DRIVE_CODEGEN + '\n';
}

function b64ToBytes(b64) {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

let cached = null;
let seedLoader = null;

// Hosts can override how the seed VM binary is obtained (the browser
// bridge hands us a fetch-based loader).
export function setSeedLoader(fn) { seedLoader = fn; cached = null; }

// The seed binary is a static asset served from `public/wasm/`. It is never
// imported — the browser fetches it by URL, Node reads it off disk at
// runtime — so no bundler ever pulls the binary into a JS chunk.
const SEED_ASSET_PATH = '/wasm/sdev-seed' + '.wasm';

async function defaultSeedBytes() {
  if (typeof process !== 'undefined' && process.versions?.node) {
    const { readFile } = await import('node:fs/promises');
    const base = new URL('../../public', import.meta.url).href.replace(/\/$/, '');
    return readFile(new URL(base + SEED_ASSET_PATH));
  }
  const res = await fetch(SEED_ASSET_PATH);
  if (!res.ok) throw new Error(`fetch seed VM: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}


async function init() {
  if (cached) return cached;
  const wasmBytes = await (seedLoader ? seedLoader() : defaultSeedBytes());
  cached = {
    wasmModule: await WebAssembly.compile(wasmBytes),
    driverBc: b64ToBytes(DRIVER_BYTECODE_B64),
    driverPool: b64ToBytes(DRIVER_POOL_B64),
  };
  return cached;
}

// Compile any SDEV source through the self-hosted codegen. Returns
// `{ bytecode, stringPool }` — same shape as the JS bootstrap.
export async function compile(userSrc, modules = null) {
  await ensureNodeFs();
  const { wasmModule, driverBc, driverPool } = await init();
  const srcBytes = encoder.encode(userSrc);
  const dumped = [];
  let mem;
  let allocStr;
  const inst = await WebAssembly.instantiate(wasmModule, {
    env: {
      host_say_i32: (n) => dumped.push(String(n)),
      host_say_str: (ptr, len) => dumped.push(decoder.decode(new Uint8Array(mem.buffer, ptr, len))),
      host_say_f64: (x) => {},
      host_fmath: (op,a,b) => [Math.sin,Math.cos,Math.tan,Math.exp,Math.log,(x,y)=>Math.pow(x,y)][op](a,b),
      // Any read serves the program under compilation — the driver only
      // ever asks for "<stdin>".
      // "<stdin>" is the program under compilation; any other path is a
      // module requested by the prelink pass (Milestone 5z).
      host_read_file: (ptr, len) => {
        const path = decoder.decode(new Uint8Array(mem.buffer, ptr, len));
        let bytes = srcBytes;
        if (path !== '<stdin>') {
          let text = modules && Object.prototype.hasOwnProperty.call(modules, path)
            ? modules[path] : null;
          if (text == null && typeof process !== 'undefined' && process.versions?.node) {
            try { text = nodeFs.readFileSync(path, 'utf8'); } catch { text = ''; }
          }
          bytes = encoder.encode(text ?? '');
        }
        const dst = allocStr(bytes.length);
        new Uint8Array(mem.buffer, dst + 4, bytes.length).set(bytes);
        return dst;
      },
      host_write_file: () => -1,
      host_http_get: () => 0,
    },
  });
  mem = inst.exports.memory;
  allocStr = inst.exports.alloc_str;
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
