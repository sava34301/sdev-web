# WASI 0.2 Component Model & Polyglot WIT Export

SDEV programs authored in either **v1** (`conjure`) or **v2 "Prism"** (`to ... with ... end`) can be compiled directly into portable **WebAssembly Modules (`.wasm`)** with standard **WIT (WebAssembly Interface Types) 0.2** interface definitions (`.wit`) and ready-to-use host glue for **TypeScript, Python, Rust, and Go**.

---

## 1. Architecture (`src/lang/wasi-component.ts` & `lang/runtime/wasi.sdev`)

`buildWasiComponentBundle(source, fileName)` orchestrates export in four steps:

1. **Understand & Parse:** Normalizes the source through `understand(source)` and parses top-level function declarations (`Lexer` → `Parser`), extracting parameter types and inferring return types (`f64`, `s32`, `bool`, `string`, `list<f64>`).
2. **WIT Interface Generation (`lang/runtime/wasi.sdev`):** Converts identifiers to kebab-case (`wasi_to_kebab`) and emits a valid `wasi` world & interface block (`package sdev:<pkg>@0.1.0;`).
3. **WebAssembly Binary Emission:** Compiles exported numeric/boolean SDEV functions directly into a valid `.wasm` binary module with an embedded `component-type` custom section.
4. **Polyglot Host Bindings:** Generates copy-ready wrapper code for:
   - **TypeScript / Node.js** (`WebAssembly.instantiate`)
   - **Python** (`wasmtime`)
   - **Rust** (`wasmtime::component` / `bindgen!`)
   - **Go** (`wazero`)

---

## 2. Exporting from the Web IDE (`WasiComponentDialog.tsx`)

1. Open your SDEV program in `/ide`.
2. Open **Downloads → WASI 0.2 Component (.wasm)**.
3. Inspect or copy the generated **`.wit`**, **TypeScript**, **Python**, **Rust**, or **Go** tabs.
4. Click **Verify Live in Browser** to instantiate the generated `.wasm` binary directly via `WebAssembly.instantiate` and run a smoke invocation of the first exported function.
5. Download `<world>.wasm` and `<world>.wit`.

---

## 3. Example

Given:

```sdev
#!sdev v2
to add_numbers with a b
  return a + b
end
```

The exporter generates:

```wit
package sdev:app@0.1.0;

interface exports {
  add-numbers: func(a: f64, b: f64) -> f64;
}

world app {
  export exports;
}
```

along with a runnable `.wasm` module exporting `add_numbers` and host glue for all four ecosystems.
