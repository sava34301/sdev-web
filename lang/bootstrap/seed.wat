;; SDEV bootstrap seed — Stage 0.
;;
;; This file will be hand-written WebAssembly Text (WAT) that executes a
;; minimal subset of SDEV called `sdev-min`. It is the ONLY file in the
;; language toolchain that is not itself SDEV.
;;
;; Once this seed is complete, the build pipeline is:
;;   seed.wasm  (from this file, via wat2wasm)
;;     compiles  ->  lang/compiler/*.sdev in sdev-min
;;                   producing bootstrap/stage1.wasm
;;   stage1.wasm
;;     compiles  ->  lang/compiler/*.sdev in full SDEV
;;                   producing dist/sdev-core.wasm
;;   dist/sdev-core.wasm recompiles itself, byte-identical.
;;
;; Milestone 1 (shipped): the JavaScript reference runtime at
;;   lang/runtime/v2.js executes v2 SDEV directly in the browser.
;; Milestone 2 (this file + the SDEV compiler sources) replaces it with
;;   a fully self-hosted WASM binary. Ship target: post-launch.
(module
  (memory (export "memory") 1)
  ;; TODO: sdev-min lexer, parser, evaluator.
  ;; Full opcode list and calling conventions live in
  ;; docs: public/SDEV_INTERNALS.md
  (func (export "sdev_version") (result i32) (i32.const 200))
)
