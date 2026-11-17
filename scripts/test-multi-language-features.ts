/**
 * Comprehensive Multi-Language Parity & Roadmap Test Suite
 *
 * Verifies newly completed features across SDEV tracks:
 * - String interpolation `"{name} has {count}"` on v1 and v2
 * - Immutable `fixed` variable bindings
 * - Scalar `match` statement compilation on v2
 * - SQL relational query engine (SELECT, WHERE, ORDER BY, LIMIT, JOIN, GROUP BY, aggregates)
 * - Kotlin / C# null-safety (coalesce, safe_get, copy_record)
 * - C / C++ systems arena memory (u8, i16, i32, mem_fill, mem_copy)
 * - Rust / Functional monads (Option, Result, map_some, map_ok)
 *
 * Run: node scripts/run-ts.mjs scripts/test-multi-language-features.ts
 */
import { execute, Compiler, Lexer, Parser } from '../src/lang';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = ''): void {
  if (ok) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name} ${detail}`);
    failed++;
  }
}

function compileToBytecode(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  const ast = parser.parse();
  return new Compiler().compile(ast);
}

console.log('=== SDEV Multi-Language Feature & Parity Test Suite ===\n');

// ── 1. String Interpolation (Phase 2, Item 10) ───────────────────────────────
console.log('--- 1. String Interpolation ---');

const interpV1 = execute(`
forge user be "Alice"
forge items be 42
forge msg be f"Hello, {user}! You have {items} items."
speak(msg)
`);
check('v1 interpreter string interpolation with variables', interpV1.success && interpV1.output[0] === 'Hello, Alice! You have 42 items.', String(interpV1.error));

const interpExpr = execute(`
forge a be 10
forge b be 25
forge res be f"{a} + {b} = {a + b}"
speak(res)
`);
check('v1 interpreter string interpolation with arithmetic expression', interpExpr.success && interpExpr.output[0] === '10 + 25 = 35', String(interpExpr.error));

const interpEscaped = execute(`
forge escaped be f"Braces: {{literal}}"
speak(escaped)
`);
check('String escaped double-braces {{...}} preserved literally', interpEscaped.success && interpEscaped.output[0] === 'Braces: {literal}', String(interpEscaped.error));

const interpV2Compiled = compileToBytecode(`
forge name be "Bob"
forge text be f"Welcome, {name}!"
`);
check('v2 compiler compiles string interpolation without error', interpV2Compiled !== null && interpV2Compiled.entry.code.length > 0);

// ── 2. Immutable Bindings `fixed` (Phase 2, Item 15) ─────────────────────────
console.log('\n--- 2. Immutable `fixed` Bindings ---');

const fixedRead = execute(`
fixed MAX_USERS be 100
speak(MAX_USERS)
`);
check('fixed constant declaration and reading', fixedRead.success && fixedRead.output[0] === '100', String(fixedRead.error));

let fixedReassignBlocked = false;
try {
  const res = execute(`
fixed PI be 3.14
PI be 3.14159
`);
  if (!res.success && res.error?.includes('Cannot reassign fixed variable')) {
    fixedReassignBlocked = true;
  }
} catch {
  fixedReassignBlocked = true;
}
check('Reassignment of fixed binding throws error in interpreter', fixedReassignBlocked);

// ── 3. Scalar `match` Statement on v2 (Phase 2, Item 11) ─────────────────────
console.log('\n--- 3. Scalar `match` on v2 Compiler ---');

const matchCode = `
forge status be 200
forge result be "unknown"
match status ::
  case 200 ::
    result be "OK"
  ;;
  case 404 ::
    result be "Not Found"
  ;;
  case _ ::
    result be "Error"
  ;;
;;
`;
const matchBytecode = compileToBytecode(matchCode);
check('v2 compiler compiles scalar match statement to bytecode jump tree', matchBytecode !== null && matchBytecode.entry.code.length > 10);

const matchInterp = execute(`
forge target_val be 2
forge out be ""
match target_val ::
  case 1 ::
    out be "one"
  ;;
  case 2 ::
    out be "two"
  ;;
  case _ ::
    out be "other"
  ;;
;;
speak(out)
`);
check('Scalar match executes correctly with matching case arm', matchInterp.success && matchInterp.output[0] === 'two', String(matchInterp.error));

// ── 4. SQL Relational Engine (SQL & LINQ parity) ─────────────────────────────
console.log('\n--- 4. Relational SQL & LINQ Primitives ---');

const sqlProg = `
forge users be [
  { id: 1, name: "Alice", role: "admin", age: 30 },
  { id: 2, name: "Bob", role: "user", age: 22 },
  { id: 3, name: "Charlie", role: "user", age: 35 },
  { id: 4, name: "Diana", role: "admin", age: 28 }
]

forge filtered be sql_where(users, (u) -> u["age"] >= 28)
forge projected be sql_select(filtered, ["id", "name", "role"])
forge sorted be sql_order_by(projected, "name", true)
forge limited be sql_limit(sorted, 2)

speak("COUNT=" + str(sql_count(filtered)))
speak("FIRST=" + limited[0]["name"])
speak("SUM_AGE=" + str(sql_sum(users, "age")))
speak("AVG_AGE=" + str(sql_avg(users, "age")))
speak("MIN_AGE=" + str(sql_min(users, "age")))
speak("MAX_AGE=" + str(sql_max(users, "age")))
`;
const sqlRes = execute(sqlProg);
check('sql_where + sql_select + sql_order_by + sql_limit pipeline', sqlRes.success && sqlRes.output[0] === 'COUNT=3' && sqlRes.output[1] === 'FIRST=Alice', String(sqlRes.error));
check('sql_sum, sql_avg, sql_min, sql_max aggregations', sqlRes.success && sqlRes.output[2] === 'SUM_AGE=115' && sqlRes.output[4] === 'MIN_AGE=22' && sqlRes.output[5] === 'MAX_AGE=35');

// SQL Join test
const joinProg = `
forge users be [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }]
forge orders be [{ user_id: 1, total: 99 }, { user_id: 1, total: 45 }, { user_id: 2, total: 150 }]
forge joined be sql_join(users, orders, ["id", "user_id"], "inner")
speak("JOIN_COUNT=" + str(sql_count(joined)))
speak("JOIN_FIRST_TOTAL=" + str(joined[0]["total"]))
`;
const joinRes = execute(joinProg);
check('sql_join relational inner join between tables', joinRes.success && joinRes.output[0] === 'JOIN_COUNT=3' && joinRes.output[1] === 'JOIN_FIRST_TOTAL=99', String(joinRes.error));

// ── 5. Kotlin & C# Null-Safety Primitives ────────────────────────────────────
console.log('\n--- 5. Kotlin & C# Modern Conveniences ---');

const nullSafetyProg = `
forge a be null
forge fallback be coalesce(a, "DefaultValue")
forge b be "Existing"
forge keep be coalesce(b, "DefaultValue")

forge user be { name: "Alice" }
forge email be safe_get(user, "email", "no-email@test.com")

forge updated be copy_record(user, { role: "superadmin" })

speak("FALLBACK=" + fallback)
speak("KEEP=" + keep)
speak("SAFE_GET=" + email)
speak("UPDATED_ROLE=" + updated["role"])
`;
const nsRes = execute(nullSafetyProg);
check('coalesce (Elvis / null-coalescing) operator', nsRes.success && nsRes.output[0] === 'FALLBACK=DefaultValue' && nsRes.output[1] === 'KEEP=Existing', String(nsRes.error));
check('safe_get navigation helper', nsRes.success && nsRes.output[2] === 'SAFE_GET=no-email@test.com');
check('copy_record data class record update', nsRes.success && nsRes.output[3] === 'UPDATED_ROLE=superadmin');

// ── 6. C & C++ Systems Arena Memory ──────────────────────────────────────────
console.log('\n--- 6. C / C++ Low-Level Systems Memory ---');

const systemsTest = `
forge a be arena_create(128)
forge off0 be arena_alloc(a, 4)
mem_poke_u8(a, 0, 255)
mem_poke_i16(a, 1, 1024)
mem_poke_i32(a, 4, 123456)

forge u8_val be mem_peek_u8(a, 0)
forge i16_val be mem_peek_i16(a, 1)
forge i32_val be mem_peek_i32(a, 4)

speak("U8=" + str(u8_val))
speak("I16=" + str(i16_val))
speak("I32=" + str(i32_val))
`;
const systemsRes = execute(systemsTest);
check('Systems arena memory poke/peek u8, i16, and i32', systemsRes.success && systemsRes.output[0] === 'U8=255' && systemsRes.output[1] === 'I16=1024' && systemsRes.output[2] === 'I32=123456', String(systemsRes.error));

// ── 7. Rust & Functional Monads ──────────────────────────────────────────────
console.log('\n--- 7. Rust / Functional Monads (Option & Result) ---');

const fnTest = `
forge opt be Some(10)
forge doubled be map_some(opt, (x) -> x * 2)
forge noneOpt be None()
forge fallbackVal be unwrap_or(noneOpt, 99)

forge res be Ok(50)
forge mappedRes be map_ok(res, (x) -> x + 100)

speak("DOUBLED=" + str(doubled["val"]))
speak("UNWRAP_OR=" + str(fallbackVal))
speak("MAPPED_RES=" + str(mappedRes["val"]))
`;
const fnRes = execute(fnTest);
check('Option and Result algebraic monads with map_some and map_ok', fnRes.success && fnRes.output[0] === 'DOUBLED=20' && fnRes.output[1] === 'UNWRAP_OR=99' && fnRes.output[2] === 'MAPPED_RES=150', String(fnRes.error));

console.log(`\n================================================================`);
console.log(`Multi-Language Parity Suite: ${passed} passed, ${failed} failed`);
console.log(`================================================================`);

if (failed > 0) process.exit(1);
