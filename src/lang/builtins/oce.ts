// ============================================================
// sdev v1 / sdev:ai built-ins: bit logic, byte memory, ring buffers and the
// Ontological Causal Engine (OCE).
// ------------------------------------------------------------
// A line-for-line port of lang/stdlib/v2/bits.sdev, mem.sdev and oce.sdev so
// that classic (forge/be) and `!#ai` files can call the same functions with
// the same results as SDEV v2. The Python interpreter (public/sdev-interpreter.py)
// carries the identical port — keep the three in step.
//
// Integer semantics follow SDEV v2: `/` truncates toward zero and `%` keeps
// the sign of the dividend. An arena is a plain list of 0..255 numbers.
// ============================================================
import type { SdevFunction } from './utils';
import { SdevError } from '../errors';

type Arena = number[];
type Row = number[];

const NONE = 65535;
const OSG = 49152;
const FIRED = 4096;
const LOG = 63488;
const SANDBOX = 57344;

const tdiv = (a: number, b: number): number => {
  if (b === 0) throw new Error('division by zero');
  return Math.trunc(a / b);
};
const tmod = (a: number, b: number): number => {
  if (b === 0) throw new Error('modulo by zero');
  return a % b;
};
const int = (v: unknown): number => {
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

// ---------------- bits ----------------
export function bits_shl(val: number, shift: number): number { let v = val; for (let s = shift; s > 0; s--) v *= 2; return v; }
export function bits_shr(val: number, shift: number): number { let v = val; for (let s = shift; s > 0; s--) v = tdiv(v, 2); return v; }
export function bits_test(val: number, pos: number): number { return tmod(tdiv(val, bits_shl(1, pos)), 2); }
export function bits_popcount(val: number): number { let v = val, c = 0; while (v > 0) { c += tmod(v, 2); v = tdiv(v, 2); } return c; }
export function bits_to_hex(val: number): string {
  if (val === 0) return '0';
  const hx = '0123456789abcdef'; let out = ''; let v = val;
  while (v > 0) { out = hx[tmod(v, 16)] + out; v = tdiv(v, 16); }
  return out;
}
export function bits_from_hex(s: string): number {
  let v = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i); let d = 0;
    if (c >= 48 && c <= 57) d = c - 48;
    if (c >= 97 && c <= 102) d = c - 87;
    if (c >= 65 && c <= 70) d = c - 55;
    v = v * 16 + d;
  }
  return v;
}
function bitLoop(a: number, b: number, mode: 'and' | 'or' | 'xor'): number {
  let x = a, y = b, out = 0, place = 1;
  const go = () => (mode === 'and' ? x > 0 && y > 0 : x > 0 || y > 0);
  while (go()) {
    const bx = tmod(x, 2), by = tmod(y, 2);
    const hit = mode === 'and' ? bx === 1 && by === 1 : mode === 'or' ? bx === 1 || by === 1 : bx !== by;
    if (hit) out += place;
    x = tdiv(x, 2); y = tdiv(y, 2); place *= 2;
  }
  return out;
}
export const bits_and = (a: number, b: number) => bitLoop(a, b, 'and');
export const bits_or = (a: number, b: number) => bitLoop(a, b, 'or');
export const bits_xor = (a: number, b: number) => bitLoop(a, b, 'xor');
export function bits_not_n(val: number, width: number): number {
  const full = bits_shl(1, width) - 1;
  return full - bits_and(val, full);
}
export function floor_div(a: number, b: number): number {
  let q = tdiv(a, b);
  if (q * b !== a && (a < 0) !== (b < 0)) q -= 1;
  return q;
}
export const floor_mod = (a: number, b: number) => a - floor_div(a, b) * b;
export const wrap_u8 = (v: number) => floor_mod(v, 256);
export const wrap_u16 = (v: number) => floor_mod(v, 65536);
export function wrap_i16(v: number): number { const u = floor_mod(v, 65536); return u >= 32768 ? u - 65536 : u; }

// ---------------- mem ----------------
export const mem_arena = (size: number): Arena => new Array(size).fill(0);
export function mem_put_u8(m: Arena, a: number, v: number): number { m[a] = wrap_u8(v); return 0; }
export const mem_get_u8 = (m: Arena, a: number) => m[a];
export function mem_put_u16(m: Arena, a: number, v: number): number { const u = wrap_u16(v); m[a] = u % 256; m[a + 1] = tdiv(u, 256); return 0; }
export const mem_get_u16 = (m: Arena, a: number) => m[a] + m[a + 1] * 256;
export const mem_put_i16 = (m: Arena, a: number, v: number) => mem_put_u16(m, a, wrap_i16(v));
export function mem_get_i16(m: Arena, a: number): number { const u = m[a] + m[a + 1] * 256; return u >= 32768 ? u - 65536 : u; }
export function mem_fill_list(m: Arena, a: number, count: number, v: number): number { for (let i = 0; i < count; i++) m[a + i] = wrap_u8(v); return 0; }
export function mem_copy_list(dst: Arena, da: number, src: Arena, sa: number, count: number): number {
  if (da > sa) for (let i = count - 1; i >= 0; i--) dst[da + i] = src[sa + i];
  else for (let i = 0; i < count; i++) dst[da + i] = src[sa + i];
  return 0;
}
export function mem_equal(a: Arena, aa: number, b: Arena, ba: number, count: number): number {
  for (let i = 0; i < count; i++) if (a[aa + i] !== b[ba + i]) return 0;
  return 1;
}
export const mem_clone = (m: Arena): Arena => m.slice();
export function mem_hex(m: Arena, a: number, count: number): string {
  const hx = '0123456789abcdef'; let out = '';
  for (let i = 0; i < count; i++) { const b = m[a + i]; out += hx[tdiv(b, 16)] + hx[b % 16]; if (i < count - 1) out += ' '; }
  return out;
}
export function ring_create(cap: number): number[] { const r = new Array(cap + 3).fill(0); r[0] = cap; return r; }
export function ring_push(r: number[], v: number): number {
  const cap = r[0]; const slot = tmod(r[1] + r[2], cap);
  if (r[2] < cap) r[2] += 1; else r[1] = tmod(r[1] + 1, cap);
  r[slot + 3] = v; return 0;
}
export const ring_len = (r: number[]) => r[2];
export const ring_get = (r: number[], i: number) => r[tmod(r[1] + i, r[0]) + 3];
export function ring_pop_oldest(r: number[]): number { const v = r[r[1] + 3]; r[1] = tmod(r[1] + 1, r[0]); r[2] -= 1; return v; }

// ---------------- OCE ----------------
const OP_NAMES = ['NOP_FREE', 'PROP_EQ', 'PROP_GT', 'PROP_LT', 'BIT_AND', 'LOGIC_XOR', 'TEMPORAL_SEQ', 'MUTATE_ADD', 'MUTATE_SET', 'MUTATE_MUL_SHIFT', 'CAUSAL_IMPLIES', 'EXCEPTION_UNLESS', 'SANDBOX_FORK', 'DIFF_INTERRUPT', 'SPAWN_LATENT', 'EXT_QUERY_PTR'];
export const oce_op_name = (op: number) => (op < 0 || op > 15 ? '?' : OP_NAMES[op]);
export function oce_create(): Arena {
  const m = mem_arena(65536);
  mem_put_u16(m, 0, 3297); mem_put_u16(m, 2, 0); mem_put_u16(m, 4, 1); mem_put_u16(m, 10, 0);
  mem_put_u8(m, 12, 8); mem_put_u8(m, 14, 8);
  return m;
}
export const oce_node_count = (m: Arena) => mem_get_u16(m, 2);
export const oce_entity_count = (m: Arena) => mem_get_u16(m, 4);
export const oce_tick = (m: Arena) => mem_get_u16(m, 10);
export const oce_contradictions = (m: Arena) => mem_get_u16(m, 18);
export const oce_repairs = (m: Arena) => mem_get_u16(m, 20);
export const oce_osg_base = () => OSG;
export const oce_slot_base = (slot: number) => SANDBOX + slot * 1024;
export const oce_prop_addr = (base: number, e: number, p: number) => base + e * 32 + p * 2;
export const oce_get = (m: Arena, e: number, p: number) => mem_get_i16(m, oce_prop_addr(OSG, e, p));
export const oce_set = (m: Arena, e: number, p: number, v: number) => mem_put_i16(m, oce_prop_addr(OSG, e, p), v);
export function oce_entity(m: Arena): number { const n = mem_get_u16(m, 4); if (n >= 32) return -1; mem_put_u16(m, 4, n + 1); return n; }
export const oce_medium = (m: Arena, p: number, v: number) => oce_set(m, 0, p, v);
export const oce_node_addr = (i: number) => 16384 + i * 12;
const nOp = (m: Arena, i: number) => m[16384 + i * 12 + 2];
const nConf = (m: Arena, i: number) => m[16384 + i * 12 + 3];
const nA = (m: Arena, i: number) => mem_get_u16(m, 16384 + i * 12 + 4);
const nB = (m: Arena, i: number) => mem_get_u16(m, 16384 + i * 12 + 6);
const nOut = (m: Arena, i: number) => mem_get_u16(m, 16384 + i * 12 + 8);
const nDelta = (m: Arena, i: number) => mem_get_i16(m, 16384 + i * 12 + 10);
export { nOp as oce_n_op, nConf as oce_n_conf, nA as oce_n_a, nB as oce_n_b, nOut as oce_n_out, nDelta as oce_n_delta };
export function oce_set_conf(m: Arena, i: number, c: number): number { const v = Math.max(0, Math.min(255, c)); m[16384 + i * 12 + 3] = v; return v; }
export function oce_alloc(m: Arena, op: number, conf: number, a: number, b: number, out: number, delta: number): number {
  const n = mem_get_u16(m, 2); let found = -1;
  for (let i = 0; i < n && found < 0; i++) if (m[16384 + i * 12 + 2] === 0) found = i;
  if (found < 0) { if (n >= 2730) return -1; found = n; mem_put_u16(m, 2, n + 1); }
  const at = 16384 + found * 12;
  mem_put_u16(m, at, at); m[at + 2] = op; m[at + 3] = conf;
  mem_put_u16(m, at + 4, a); mem_put_u16(m, at + 6, b); mem_put_u16(m, at + 8, out); mem_put_i16(m, at + 10, delta);
  return found;
}
export function oce_free(m: Arena, i: number): number { mem_fill_list(m, 16384 + i * 12, 12, 0); return 0; }
export function oce_live_nodes(m: Arena): number { const n = mem_get_u16(m, 2); let c = 0; for (let i = 0; i < n; i++) if (m[16384 + i * 12 + 2] !== 0) c++; return c; }
export const oce_mdl_bits = (m: Arena) => oce_live_nodes(m) * 96;
export function oce_add_axiom(m: Arena, guard: number[], target: number, a: number, b: number, delta: number, specialized: number, conf: number): number {
  let g = NONE;
  if (guard.length > 0) g = oce_alloc(m, guard[0], 255, guard[1], guard[2], NONE, guard[3]);
  const mu = oce_alloc(m, 7, 255, a, b, target, delta);
  return oce_alloc(m, 10, conf, g, specialized, mu, target);
}
export function oce_add_exception(m: Arena, parent: number, guard: number[], special: number): number {
  const g = oce_alloc(m, guard[0], 255, guard[1], guard[2], NONE, guard[3]);
  return oce_alloc(m, 11, 255, parent, g, special, 0);
}
const rhsOf = (m: Arena, base: number, b: number) => (b === NONE ? 0 : mem_get_i16(m, base + b * 2));
export function oce_guard_holds(m: Arena, base: number, e: number, g: number): number {
  let cur = g;
  while (cur !== NONE) {
    const op = nOp(m, cur);
    const lhs = mem_get_i16(m, base + e * 32 + nA(m, cur) * 2);
    const rhs = rhsOf(m, base, nB(m, cur)) + nDelta(m, cur);
    if (op === 1 && lhs !== rhs) return 0;
    if (op === 2 && !(lhs > rhs)) return 0;
    if (op === 3 && !(lhs < rhs)) return 0;
    if (op === 4 && bits_and(wrap_u16(lhs), wrap_u16(rhs)) === 0) return 0;
    if (op === 5 && lhs === rhs) return 0;
    cur = nOut(m, cur);
  }
  return 1;
}
function contribution(m: Arena, base: number, e: number, h: number): number {
  const mu = nOut(m, h); const row = base + e * 32; const tgt = nOut(m, mu);
  let v = mem_get_i16(m, row + nA(m, mu) * 2) + nDelta(m, mu);
  if (nB(m, mu) !== NONE) v += mem_get_i16(m, row + nB(m, mu) * 2);
  return v - mem_get_i16(m, row + tgt * 2);
}
function resolve(m: Arena, base: number, e: number, h: number): number {
  const n = mem_get_u16(m, 2);
  for (let i = 0; i < n; i++) if (nOp(m, i) === 11 && nA(m, i) === h && oce_guard_holds(m, base, e, nB(m, i))) return nOut(m, i);
  return h;
}
export function oce_step(m: Arena, src: number, dst: number, record: number): number {
  const ents = mem_get_u16(m, 4);
  mem_copy_list(m, dst, m, src, ents * 32);
  if (record) mem_fill_list(m, FIRED, 1024, 0);
  const n = mem_get_u16(m, 2);
  for (let e = 1; e < ents; e++) {
    for (let h = 0; h < n; h++) {
      if (nOp(m, h) === 10 && nB(m, h) === 0 && oce_guard_holds(m, src, e, nA(m, h))) {
        const use = resolve(m, src, e, h);
        const tgt = nDelta(m, use);
        const at = dst + e * 32 + tgt * 2;
        mem_put_i16(m, at, mem_get_i16(m, at) + contribution(m, src, e, use));
        if (record) mem_put_u16(m, FIRED + e * 32 + tgt * 2, use + 1);
      }
    }
  }
  return dst;
}
export const oce_predict = (m: Arena) => oce_step(m, OSG, SANDBOX, 1);
export const oce_predicted = (m: Arena, e: number, p: number) => mem_get_i16(m, oce_prop_addr(SANDBOX, e, p));
function log(m: Arena, kind: number, p: number, h: number, e: number, residual: number, src: number): number {
  const head = mem_get_u16(m, 6); const at = LOG + head * 64;
  m[at] = kind; m[at + 1] = p;
  mem_put_u16(m, at + 2, h); mem_put_u16(m, at + 4, e); mem_put_i16(m, at + 6, residual);
  mem_copy_list(m, at + 8, m, src + e * 32, 32);
  mem_put_u16(m, 6, (head + 1) % 32);
  if (mem_get_u16(m, 8) < 32) mem_put_u16(m, 8, mem_get_u16(m, 8) + 1);
  return at;
}
export const oce_log_count = (m: Arena) => mem_get_u16(m, 8);
function findGuard(m: Arena, pos: number[], neg: number[], medium: number): number[] {
  for (let s = 0; s < 16; s++) {
    const mv = mem_get_i16(m, medium + s * 2);
    for (let op = 3; op >= 2; op--) {
      let ok = true;
      for (let i = 0; i < pos.length && ok; i++) { const v = mem_get_i16(m, pos[i] + s * 2); if (op === 3 && !(v < mv)) ok = false; if (op === 2 && !(v > mv)) ok = false; }
      for (let i = 0; i < neg.length && ok; i++) { const v = mem_get_i16(m, neg[i] + s * 2); if (op === 3 && v < mv) ok = false; if (op === 2 && v > mv) ok = false; }
      if (ok && mv !== 0) return [op, s, s, 0];
    }
  }
  for (let s = 0; s < 16; s++) {
    const want = mem_get_i16(m, pos[0] + s * 2); let ok = true;
    for (let i = 0; i < pos.length && ok; i++) if (mem_get_i16(m, pos[i] + s * 2) !== want) ok = false;
    for (let i = 0; i < neg.length && ok; i++) if (mem_get_i16(m, neg[i] + s * 2) === want) ok = false;
    if (ok) return [1, s, NONE, want];
  }
  return [];
}
function spawnLatent(m: Arena, posE: number[]): number[] {
  const slot = m[12]; if (slot > 15) return [];
  m[12] = slot + 1;
  oce_alloc(m, 14, 255, slot, NONE, NONE, 0);
  for (const e of posE) oce_set(m, e, slot, 1);
  return [1, slot, NONE, 1];
}
function candidates(m: Arena, row: number, p: number, d: number): number[][] {
  const out: number[][] = [];
  for (let q = 0; q < 16; q++) if (q !== p && d !== 0 && mem_get_i16(m, row + q * 2) === d) out.push([p, q, 0]);
  out.push([p, NONE, d]);
  return out;
}
function candValue(m: Arena, row: number, c: number[]): number {
  let v = mem_get_i16(m, row + c[0] * 2) + c[2];
  if (c[1] !== NONE) v += mem_get_i16(m, row + c[1] * 2);
  return v - mem_get_i16(m, row + c[0] * 2);
}
function logSuccesses(m: Arena, h: number, neg: number[]): number[] {
  const out = neg.slice();
  for (let k = 0; k < mem_get_u16(m, 8); k++) { const at = LOG + k * 64; if (m[at] === 1 && mem_get_u16(m, at + 2) === h) out.push(at + 8); }
  return out;
}
function repairFired(m: Arena, obs: Row[], e: number, p: number, h: number, residual: number): number {
  const src = OSG; const ents = mem_get_u16(m, 4);
  const change = obs[e][p] - oce_get(m, e, p);
  log(m, 2, p, h, e, residual, src);
  if (nB(m, h) === 1) { oce_set_conf(m, h, nConf(m, h) - 4); return 0; }
  const pos = [src + e * 32]; const posE = [e]; let neg: number[] = [];
  for (let f = 1; f < ents; f++) {
    if (f !== e && mem_get_u16(m, FIRED + f * 32 + p * 2) === h + 1) {
      const right = obs[f][p] === oce_predicted(m, f, p);
      if (right) neg.push(src + f * 32);
      if (!right && obs[f][p] - oce_get(m, f, p) === change) { pos.push(src + f * 32); posE.push(f); }
    }
  }
  neg = logSuccesses(m, h, neg);
  let guard = findGuard(m, pos, neg, src);
  if (guard.length === 0) guard = spawnLatent(m, posE);
  if (guard.length === 0) { oce_set_conf(m, h, nConf(m, h) - 4); return 0; }
  const c = candidates(m, src + e * 32, p, change)[0];
  const sp = oce_add_axiom(m, [], p, c[0], c[1], c[2], 1, 8);
  oce_add_exception(m, h, guard, sp);
  mem_put_u16(m, 20, mem_get_u16(m, 20) + 1);
  return 1;
}
function split(m: Arena, obs: Row[], p: number, c: number[], wantPos: boolean): number[] {
  const ents = mem_get_u16(m, 4); const out: number[] = [];
  for (let f = 1; f < ents; f++) {
    const need = obs[f][p] - oce_predicted(m, f, p);
    if ((candValue(m, OSG + f * 32, c) === need) === wantPos) out.push(OSG + f * 32);
  }
  return out;
}
function repairNew(m: Arena, obs: Row[], e: number, p: number, residual: number): number {
  const src = OSG; const ents = mem_get_u16(m, 4);
  log(m, 2, p, NONE, e, residual, src);
  const cands = candidates(m, src + e * 32, p, residual);
  let found = false; let bestGuard: number[] = []; let best = cands[cands.length - 1];
  for (let ci = 0; ci < cands.length && !found; ci++) {
    const c = cands[ci];
    const pos = split(m, obs, p, c, true); const neg = split(m, obs, p, c, false);
    if (neg.length === 0) { found = true; bestGuard = []; best = c; }
    else { const g = findGuard(m, pos, neg, src); if (g.length > 0) { found = true; bestGuard = g; best = c; } }
  }
  if (!found) {
    const posE = [e];
    for (let f = 1; f < ents; f++) {
      const need = obs[f][p] - oce_predicted(m, f, p);
      if (f !== e && need !== 0 && candValue(m, src + f * 32, best) === need) posE.push(f);
    }
    bestGuard = spawnLatent(m, posE);
    if (bestGuard.length > 0) found = true;
  }
  if (!found) return 0;
  oce_add_axiom(m, bestGuard, p, best[0], best[1], best[2], 0, 8);
  mem_put_u16(m, 20, mem_get_u16(m, 20) + 1);
  return 1;
}
export function oce_repair(m: Arena, obs: Row[], e: number, p: number): number {
  const residual = obs[e][p] - oce_predicted(m, e, p);
  const fired = mem_get_u16(m, FIRED + e * 32 + p * 2);
  mem_put_u16(m, 18, mem_get_u16(m, 18) + 1);
  if (fired === 0) return repairNew(m, obs, e, p, residual);
  return repairFired(m, obs, e, p, fired - 1, residual);
}
export function oce_prune(m: Arena): number {
  const n = mem_get_u16(m, 2); let freed = 0;
  for (let h = 0; h < n; h++) {
    if (nOp(m, h) === 10 && nConf(m, h) === 0) {
      let g = nA(m, h);
      while (g !== NONE) { const nxt = nOut(m, g); oce_free(m, g); freed++; g = nxt; }
      oce_free(m, nOut(m, h)); oce_free(m, h); freed += 2;
      for (let i = 0; i < n; i++) if (nOp(m, i) === 11 && (nA(m, i) === h || nOut(m, i) === h)) { oce_free(m, nB(m, i)); oce_free(m, i); freed += 2; }
    }
  }
  return freed;
}
export function oce_observe(m: Arena, obs: Row[]): number {
  const ents = mem_get_u16(m, 4); const vis = m[14]; let errors = 0;
  if (mem_get_u16(m, 10) > 0) {
    let rounds = 0; let again = true;
    while (again && rounds < 12) {
      again = false; oce_predict(m);
      for (let e = 1; e < ents && !again; e++) {
        for (let p = 0; p < vis && !again; p++) {
          if (obs[e][p] !== oce_predicted(m, e, p)) { errors++; oce_repair(m, obs, e, p); again = true; }
        }
      }
      rounds++;
    }
    for (let e = 1; e < ents; e++) {
      for (let p = 0; p < vis; p++) {
        const fired = mem_get_u16(m, FIRED + e * 32 + p * 2);
        if (fired !== 0 && obs[e][p] === oce_predicted(m, e, p)) {
          oce_set_conf(m, fired - 1, nConf(m, fired - 1) + 1);
          if (mem_get_u16(m, 10) % 4 === 0) log(m, 1, p, fired - 1, e, 0, OSG);
        }
      }
    }
    oce_prune(m);
  }
  for (let e = 1; e < ents; e++) for (let p = 0; p < vis; p++) oce_set(m, e, p, obs[e][p]);
  mem_put_u16(m, 10, mem_get_u16(m, 10) + 1);
  mem_put_u16(m, 16, errors);
  oce_predict(m);
  return errors;
}
export function oce_intervene(m: Arena, e: number, p: number, v: number): number { oce_set(m, e, p, v); oce_predict(m); return v; }
export function oce_imagine(m: Arena, e: number, p: number, v: number, ticks: number): number {
  const ents = mem_get_u16(m, 4); const a = oce_slot_base(1); const b = oce_slot_base(2);
  mem_copy_list(m, a, m, OSG, ents * 32);
  mem_put_i16(m, oce_prop_addr(a, e, p), v);
  for (let t = 0; t < ticks; t++) { oce_step(m, a, b, 0); mem_copy_list(m, a, m, b, ents * 32); }
  return a;
}
export const oce_imagined = (m: Arena, e: number, p: number) => mem_get_i16(m, oce_prop_addr(SANDBOX + 1024, e, p));
export const oce_ext_create = (): Record<string, unknown> => ({});
export function oce_ext_store(ext: Record<string, unknown>, sector: number, offset: number, v: unknown): unknown { ext[`${sector}:${offset}`] = v; return v; }
export function oce_ext_query(ext: Record<string, unknown>, sector: number, offset: number, fallback: unknown): unknown {
  const k = `${sector}:${offset}`; return Object.prototype.hasOwnProperty.call(ext, k) ? ext[k] : fallback;
}
export function oce_ext_load(m: Arena, ext: Record<string, unknown>, sector: number, offset: number, e: number, p: number): number {
  const v = int(oce_ext_query(ext, sector, offset, 0));
  oce_alloc(m, 15, 1, sector, offset, e * 16 + p, 0);
  oce_set(m, e, p, v);
  return v;
}
const pname = (names: string[], p: number) => (p === NONE ? '0' : p < names.length ? String(names[p]) : `latent_${p - 7}`);
function guardText(m: Arena, names: string[], g: number): string {
  if (g === NONE) return 'always';
  let out = ''; let cur = g;
  while (cur !== NONE) {
    const op = nOp(m, cur);
    const sym = op === 2 ? ' > ' : op === 3 ? ' < ' : ' == ';
    let rhs = String(nDelta(m, cur));
    if (nB(m, cur) !== NONE) rhs = 'medium.' + pname(names, nB(m, cur));
    if (out.length > 0) out += ' and ';
    out += pname(names, nA(m, cur)) + sym + rhs;
    cur = nOut(m, cur);
  }
  return out;
}
function mutText(m: Arena, names: string[], h: number): string {
  const mu = nOut(m, h); const t = pname(names, nOut(m, mu));
  if (nB(m, mu) !== NONE) return t + ' += ' + pname(names, nB(m, mu));
  return t + ' += ' + String(nDelta(m, mu));
}
export function oce_describe(m: Arena, names: string[]): string {
  let out = ''; const n = mem_get_u16(m, 2);
  for (let h = 0; h < n; h++) {
    if (nOp(m, h) === 10 && nB(m, h) === 0) {
      out += `law ${h} [confidence ${nConf(m, h)}]: if ${guardText(m, names, nA(m, h))} then ${mutText(m, names, h)}\n`;
      for (let i = 0; i < n; i++) if (nOp(m, i) === 11 && nA(m, i) === h) out += `  unless ${guardText(m, names, nB(m, i))} then ${mutText(m, names, nOut(m, i))}\n`;
    }
  }
  return out;
}
export function oce_motifs(text: string, threshold: number): [number[], number[]] {
  const bytes = new TextEncoder().encode(text);
  let seq: number[] = Array.from(bytes); const rules: number[] = []; let next = 256;
  for (;;) {
    const counts = new Map<string, number>(); let bestN = 0; let ba = 0; let bb = 0;
    for (let i = 0; i < seq.length - 1; i++) {
      const k = `${seq[i]},${seq[i + 1]}`; const c = (counts.get(k) ?? 0) + 1; counts.set(k, c);
      if (c > bestN) { bestN = c; ba = seq[i]; bb = seq[i + 1]; }
    }
    if (bestN < threshold) break;
    const out: number[] = [];
    for (let i = 0; i < seq.length;) {
      if (i < seq.length - 1 && seq[i] === ba && seq[i + 1] === bb) { out.push(next); i += 2; } else { out.push(seq[i]); i += 1; }
    }
    rules.push(next, ba, bb); seq = out; next++;
  }
  return [seq, rules];
}
export function oce_motif_expand(rules: number[], sym: number): string {
  if (sym < 256) return String.fromCharCode(sym);
  for (let i = 0; i < rules.length; i += 3) if (rules[i] === sym) return oce_motif_expand(rules, rules[i + 1]) + oce_motif_expand(rules, rules[i + 2]);
  return '';
}
export function oce_sequence_rule(xs: number[]): unknown[] {
  const n = xs.length;
  if (n < 2) return ['none'];
  if (xs.every((x) => x === xs[0])) return ['const', xs[0]];
  const d = xs[1] - xs[0];
  let ok = true; for (let i = 2; i < n; i++) if (xs[i] - xs[i - 1] !== d) ok = false;
  if (ok) return ['add', d];
  if (xs[0] !== 0) {
    const r = tdiv(xs[1], xs[0]);
    ok = true; for (let i = 1; i < n; i++) if (xs[i] !== xs[i - 1] * r) ok = false;
    if (ok) return ['mul', r];
  }
  if (n >= 3) { ok = true; for (let i = 2; i < n; i++) if (xs[i] !== xs[i - 1] + xs[i - 2]) ok = false; if (ok) return ['fib']; }
  return ['none'];
}
export function oce_sequence_next(xs: number[], rule: unknown[]): number {
  const n = xs.length;
  if (rule[0] === 'const') return int(rule[1]);
  if (rule[0] === 'add') return xs[n - 1] + int(rule[1]);
  if (rule[0] === 'mul') return xs[n - 1] * int(rule[1]);
  if (rule[0] === 'fib') return xs[n - 1] + xs[n - 2];
  return 0;
}
export function oce_ca_rule(rows: number[][]): number {
  const table = [-1, -1, -1, -1, -1, -1, -1, -1];
  for (let r = 0; r < rows.length - 1; r++) {
    const a = rows[r]; const b = rows[r + 1]; const w = a.length;
    for (let i = 0; i < w; i++) {
      const k = a[(i + w - 1) % w] * 4 + a[i] * 2 + a[(i + 1) % w];
      if (table[k] >= 0 && table[k] !== b[i]) return -1;
      table[k] = b[i];
    }
  }
  let rule = 0; for (let k = 7; k >= 0; k--) rule = rule * 2 + Math.max(0, table[k]);
  return rule;
}
export function oce_ca_step(row: number[], rule: number): number[] {
  const w = row.length; const out = new Array(w).fill(0);
  for (let i = 0; i < w; i++) out[i] = bits_test(rule, row[(i + w - 1) % w] * 4 + row[i] * 2 + row[(i + 1) % w]);
  return out;
}

// ---------------- registration ----------------
// [name, implementation, arity]. Numbers are truncated to integers on entry,
// lists/text/tomes are passed through.
type Impl = (...a: never[]) => unknown;
const TABLE: [string, Impl, number][] = [
  ['bits_shl', bits_shl, 2], ['bits_shr', bits_shr, 2], ['bits_test', bits_test, 2], ['bits_popcount', bits_popcount, 1],
  ['bits_to_hex', bits_to_hex, 1], ['bits_from_hex', bits_from_hex, 1], ['bits_and', bits_and, 2], ['bits_or', bits_or, 2],
  ['bits_xor', bits_xor, 2], ['bits_not_n', bits_not_n, 2], ['floor_div', floor_div, 2], ['floor_mod', floor_mod, 2],
  ['wrap_u8', wrap_u8, 1], ['wrap_u16', wrap_u16, 1], ['wrap_i16', wrap_i16, 1],
  ['mem_arena', mem_arena, 1], ['mem_put_u8', mem_put_u8, 3], ['mem_get_u8', mem_get_u8, 2], ['mem_put_u16', mem_put_u16, 3],
  ['mem_get_u16', mem_get_u16, 2], ['mem_put_i16', mem_put_i16, 3], ['mem_get_i16', mem_get_i16, 2], ['mem_equal', mem_equal, 5],
  ['mem_clone', mem_clone, 1], ['mem_hex', mem_hex, 3],
  ['ring_create', ring_create, 1], ['ring_push', ring_push, 2], ['ring_len', ring_len, 1], ['ring_get', ring_get, 2], ['ring_pop_oldest', ring_pop_oldest, 1],
  ['oce_op_name', oce_op_name, 1], ['oce_create', oce_create, 0], ['oce_node_count', oce_node_count, 1], ['oce_entity_count', oce_entity_count, 1],
  ['oce_tick', oce_tick, 1], ['oce_contradictions', oce_contradictions, 1], ['oce_repairs', oce_repairs, 1], ['oce_osg_base', oce_osg_base, 0],
  ['oce_slot_base', oce_slot_base, 1], ['oce_prop_addr', oce_prop_addr, 3], ['oce_get', oce_get, 3], ['oce_set', oce_set, 4],
  ['oce_entity', oce_entity, 1], ['oce_medium', oce_medium, 3], ['oce_node_addr', oce_node_addr, 1],
  ['oce_n_op', nOp, 2], ['oce_n_conf', nConf, 2], ['oce_n_a', nA, 2], ['oce_n_b', nB, 2], ['oce_n_out', nOut, 2], ['oce_n_delta', nDelta, 2],
  ['oce_set_conf', oce_set_conf, 3], ['oce_alloc', oce_alloc, 7], ['oce_free', oce_free, 2], ['oce_live_nodes', oce_live_nodes, 1],
  ['oce_mdl_bits', oce_mdl_bits, 1], ['oce_add_axiom', oce_add_axiom, 8], ['oce_add_exception', oce_add_exception, 4],
  ['oce_guard_holds', oce_guard_holds, 4], ['oce_step', oce_step, 4], ['oce_predict', oce_predict, 1], ['oce_predicted', oce_predicted, 3],
  ['oce_log_count', oce_log_count, 1], ['oce_repair', oce_repair, 4], ['oce_prune', oce_prune, 1], ['oce_observe', oce_observe, 2],
  ['oce_intervene', oce_intervene, 4], ['oce_imagine', oce_imagine, 5], ['oce_imagined', oce_imagined, 3],
  ['oce_ext_create', oce_ext_create, 0], ['oce_ext_store', oce_ext_store, 4], ['oce_ext_query', oce_ext_query, 4], ['oce_ext_load', oce_ext_load, 6],
  ['oce_describe', oce_describe, 2], ['oce_motifs', oce_motifs, 2], ['oce_motif_expand', oce_motif_expand, 2],
  ['oce_sequence_rule', oce_sequence_rule, 1], ['oce_sequence_next', oce_sequence_next, 2], ['oce_ca_rule', oce_ca_rule, 1], ['oce_ca_step', oce_ca_step, 2],
];

/** Every name this module registers (used by the parity test). */
export const OCE_BUILTIN_NAMES = [...TABLE.map(([n]) => n), 'mem_fill', 'mem_copy'];

const norm = (v: unknown): unknown => (typeof v === 'number' || typeof v === 'boolean' ? int(v) : v);

export function registerOce(builtins: Map<string, SdevFunction>): void {
  for (const [name, impl, arity] of TABLE) {
    builtins.set(name, {
      type: 'builtin',
      call: (args: unknown[], line: number) => {
        if (args.length !== arity) throw new SdevError(`${name}() takes ${arity} argument${arity === 1 ? '' : 's'}, got ${args.length}`, line);
        try {
          return (impl as (...a: unknown[]) => unknown)(...args.map(norm));
        } catch (e) {
          if (e instanceof SdevError) throw e;
          throw new SdevError(`${name}(): ${(e as Error).message}`, line);
        }
      },
    } as SdevFunction);
  }
  // mem_fill / mem_copy already exist for `arena()` records; accept byte
  // lists too (and the 5-argument list form of mem_copy).
  const oldFill = builtins.get('mem_fill');
  const oldCopy = builtins.get('mem_copy');
  builtins.set('mem_fill', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (Array.isArray(args[0])) return mem_fill_list(args[0] as Arena, int(args[1]), int(args[2]), int(args[3]));
      if (oldFill) return oldFill.call(args, line);
      throw new SdevError('mem_fill() needs a byte list', line);
    },
  } as SdevFunction);
  builtins.set('mem_copy', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length === 5 && Array.isArray(args[0]) && Array.isArray(args[2])) {
        return mem_copy_list(args[0] as Arena, int(args[1]), args[2] as Arena, int(args[3]), int(args[4]));
      }
      if (oldCopy) return oldCopy.call(args, line);
      throw new SdevError('mem_copy() takes (dst, dst_addr, src, src_addr, count)', line);
    },
  } as SdevFunction);
}
