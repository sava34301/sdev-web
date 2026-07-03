;; ============================================================================
;; SDEV bootstrap seed — Stage 0 stack VM
;;
;; Hand-written WebAssembly Text. Zero TypeScript, zero JavaScript, zero
;; other high-level languages in this file. This is the ONLY non-SDEV file
;; in the language toolchain.
;;
;; Executes a compact bytecode that a bootstrap-only compiler emits from
;; SDEV v2 source. Once the stage-2 compiler (written in SDEV, see
;; lang/compiler/*.sdev) is complete, the bootstrap compiler is discarded
;; and SDEV compiles SDEV all the way down.
;;
;; Memory layout (linear memory, 1 page = 64 KiB):
;;   0x0000..0x1FFF  string pool  (utf-8 blobs, length-prefixed u32)
;;   0x2000..0x3FFF  global variable slots (256 slots × 4 bytes)
;;   0x4000..0x5FFF  operand stack (u32 cells; sp grows up)
;;   0x6000..0x7FFF  call stack (frames of ret_ip, saved_fp, locals…)
;;   0x8000..0xFFFF  bytecode program (u8 stream)
;;
;; Opcodes (single byte, may be followed by inline operands):
;;   0x01 PUSH_I32 <i32 LE>         push signed 32-bit constant
;;   0x02 PUSH_STR <u16 idx LE>     push interned string handle (pool offset)
;;   0x03 LOAD    <u8 slot>         push global variable value
;;   0x04 STORE   <u8 slot>         pop into global variable
;;   0x10 ADD  0x11 SUB  0x12 MUL  0x13 DIV  0x14 MOD
;;   0x20 EQ   0x21 NE   0x22 LT   0x23 GT   0x24 LE   0x25 GE
;;   0x30 NOT
;;   0x40 JMP  <i16 off LE>         unconditional relative jump
;;   0x41 JZ   <i16 off LE>         pop; jump if zero
;;   0x50 SAY_I32                   pop int; host prints it
;;   0x51 SAY_STR                   pop string handle; host prints pool[handle]
;;   0x60 CALL <u16 target> <u8 n_args>   allocate frame, copy args, jump
;;   0x61 RET                             pop retval, restore ip+fp, push retval
;;   0x62 ENTER <u8 n_locals>             reserve additional local slots
;;   0x63 LOAD_LOC <u8 slot>              push local (0..n_args-1 = args)
;;   0x64 STORE_LOC <u8 slot>             pop into local
;;   0xFF HALT
;;
;; The host provides two imports:
;;   env.host_say_i32(i32)
;;   env.host_say_str(offset:i32, length:i32)
;; ============================================================================

(module
  (import "env" "host_say_i32" (func $say_i32 (param i32)))
  (import "env" "host_say_str" (func $say_str (param i32 i32)))
  (memory (export "memory") 1)


  ;; ---- constants ---------------------------------------------------------
  (global $VAR_BASE   i32 (i32.const 0x2000))
  (global $STACK_BASE i32 (i32.const 0x4000))
  (global $CALL_BASE  i32 (i32.const 0x6000))
  (global $CODE_BASE  i32 (i32.const 0x8000))

  ;; ---- call-frame registers ---------------------------------------------
  (global $fp  (mut i32) (i32.const 0x6000))  ;; current frame base
  (global $csp (mut i32) (i32.const 0x6000))  ;; call-stack tip

  ;; ---- program length (set by host before calling run) -------------------
  (global $prog_len (mut i32) (i32.const 0))
  (func (export "set_prog_len") (param $n i32) (global.set $prog_len (local.get $n)))
  (func (export "code_base")  (result i32) (global.get $CODE_BASE))
  (func (export "sdev_version") (result i32) (i32.const 300))

  ;; ---- helpers -----------------------------------------------------------
  (func $read_u8 (param $ip i32) (result i32)
    (i32.load8_u (i32.add (global.get $CODE_BASE) (local.get $ip))))

  (func $read_i32 (param $ip i32) (result i32)
    (i32.load (i32.add (global.get $CODE_BASE) (local.get $ip))))

  (func $read_i16 (param $ip i32) (result i32)
    ;; sign-extend a little-endian 16-bit value
    (i32.shr_s
      (i32.shl (i32.load16_u (i32.add (global.get $CODE_BASE) (local.get $ip)))
               (i32.const 16))
      (i32.const 16)))

  ;; ---- main interpreter loop --------------------------------------------
  (func (export "run") (result i32)
    (local $ip i32)         ;; instruction pointer (relative to CODE_BASE)
    (local $sp i32)         ;; stack pointer (absolute address)
    (local $op i32)
    (local $a  i32)
    (local $b  i32)
    (local $addr i32)

    (local.set $ip (i32.const 0))
    (local.set $sp (global.get $STACK_BASE))

    (block $exit
      (loop $dispatch
        ;; halt if past program end
        (br_if $exit (i32.ge_s (local.get $ip) (global.get $prog_len)))

        (local.set $op (call $read_u8 (local.get $ip)))
        (local.set $ip (i32.add (local.get $ip) (i32.const 1)))

        ;; --- HALT (0xFF) ---
        (if (i32.eq (local.get $op) (i32.const 0xFF))
          (then (br $exit)))

        ;; --- PUSH_I32 (0x01) ---
        (if (i32.eq (local.get $op) (i32.const 0x01))
          (then
            (i32.store (local.get $sp) (call $read_i32 (local.get $ip)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 4)))
            (br $dispatch)))

        ;; --- PUSH_STR (0x02) — push a 16-bit string-pool offset as handle ---
        (if (i32.eq (local.get $op) (i32.const 0x02))
          (then
            (i32.store (local.get $sp) (i32.load16_u (i32.add (global.get $CODE_BASE) (local.get $ip))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 2)))
            (br $dispatch)))

        ;; --- LOAD (0x03) <u8 slot> ---
        (if (i32.eq (local.get $op) (i32.const 0x03))
          (then
            (local.set $addr (i32.add (global.get $VAR_BASE)
              (i32.mul (call $read_u8 (local.get $ip)) (i32.const 4))))
            (i32.store (local.get $sp) (i32.load (local.get $addr)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 1)))
            (br $dispatch)))

        ;; --- STORE (0x04) <u8 slot> ---
        (if (i32.eq (local.get $op) (i32.const 0x04))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (local.set $addr (i32.add (global.get $VAR_BASE)
              (i32.mul (call $read_u8 (local.get $ip)) (i32.const 4))))
            (i32.store (local.get $addr) (local.get $a))
            (local.set $ip (i32.add (local.get $ip) (i32.const 1)))
            (br $dispatch)))

        ;; --- ADD..MOD (0x10..0x14) ---
        (if (i32.and (i32.ge_u (local.get $op) (i32.const 0x10))
                     (i32.le_u (local.get $op) (i32.const 0x14)))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (if (i32.eq (local.get $op) (i32.const 0x10)) (then (i32.store (local.get $sp) (i32.add (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x11)) (then (i32.store (local.get $sp) (i32.sub (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x12)) (then (i32.store (local.get $sp) (i32.mul (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x13)) (then (i32.store (local.get $sp) (i32.div_s (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x14)) (then (i32.store (local.get $sp) (i32.rem_s (local.get $a) (local.get $b)))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- EQ..GE (0x20..0x25) ---
        (if (i32.and (i32.ge_u (local.get $op) (i32.const 0x20))
                     (i32.le_u (local.get $op) (i32.const 0x25)))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (if (i32.eq (local.get $op) (i32.const 0x20)) (then (i32.store (local.get $sp) (i32.eq   (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x21)) (then (i32.store (local.get $sp) (i32.ne   (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x22)) (then (i32.store (local.get $sp) (i32.lt_s (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x23)) (then (i32.store (local.get $sp) (i32.gt_s (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x24)) (then (i32.store (local.get $sp) (i32.le_s (local.get $a) (local.get $b)))))
            (if (i32.eq (local.get $op) (i32.const 0x25)) (then (i32.store (local.get $sp) (i32.ge_s (local.get $a) (local.get $b)))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- NOT (0x30) ---
        (if (i32.eq (local.get $op) (i32.const 0x30))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (i32.store (local.get $sp) (i32.eqz (i32.load (local.get $sp))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- JMP (0x40) <i16 off> ---
        (if (i32.eq (local.get $op) (i32.const 0x40))
          (then
            (local.set $ip (i32.add (local.get $ip) (i32.const 2)))
            (local.set $ip (i32.add (local.get $ip) (call $read_i16 (i32.sub (local.get $ip) (i32.const 2)))))
            (br $dispatch)))

        ;; --- JZ (0x41) <i16 off> ---
        (if (i32.eq (local.get $op) (i32.const 0x41))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 2)))
            (if (i32.eqz (local.get $a))
              (then (local.set $ip (i32.add (local.get $ip)
                                            (call $read_i16 (i32.sub (local.get $ip) (i32.const 2)))))))
            (br $dispatch)))

        ;; --- SAY_I32 (0x50) ---
        (if (i32.eq (local.get $op) (i32.const 0x50))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (call $say_i32 (i32.load (local.get $sp)))
            (br $dispatch)))

        ;; --- SAY_STR (0x51) ---
        (if (i32.eq (local.get $op) (i32.const 0x51))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $addr (i32.load (local.get $sp)))
            ;; pool layout at $addr: u32 length, then utf-8 bytes
            (call $say_str
              (i32.add (local.get $addr) (i32.const 4))
              (i32.load (local.get $addr)))
            (br $dispatch)))

        ;; --- CALL (0x60) <u16 target> <u8 n_args> ---
        ;; Frame layout at $csp: ret_ip @+0, saved_fp @+4, locals @+8...
        ;; Args are on operand stack in order; copy into locals[0..n_args-1].
        (if (i32.eq (local.get $op) (i32.const 0x60))
          (then
            ;; read operands
            (local.set $a (i32.load16_u (i32.add (global.get $CODE_BASE) (local.get $ip)))) ;; target
            (local.set $b (call $read_u8 (i32.add (local.get $ip) (i32.const 2))))          ;; n_args
            (local.set $ip (i32.add (local.get $ip) (i32.const 3)))
            ;; allocate frame at csp
            (i32.store (global.get $csp) (local.get $ip))                                   ;; ret_ip
            (i32.store (i32.add (global.get $csp) (i32.const 4)) (global.get $fp))          ;; saved_fp
            (global.set $fp (global.get $csp))
            (global.set $csp (i32.add (global.get $csp) (i32.const 8)))
            ;; copy n_args from operand stack into locals (in order)
            (local.set $addr (i32.sub (local.get $sp) (i32.mul (local.get $b) (i32.const 4))))
            (block $done
              (loop $copy
                (br_if $done (i32.eqz (local.get $b)))
                (i32.store (global.get $csp) (i32.load (local.get $addr)))
                (global.set $csp (i32.add (global.get $csp) (i32.const 4)))
                (local.set $addr (i32.add (local.get $addr) (i32.const 4)))
                (local.set $b    (i32.sub (local.get $b)    (i32.const 1)))
                (br $copy)
              )
            )
            ;; pop original args from operand stack
            (local.set $sp (i32.sub (local.get $sp)
                                    (i32.mul (call $read_u8 (i32.sub (local.get $ip) (i32.const 1)))
                                             (i32.const 4))))
            ;; jump to target (absolute code offset)
            (local.set $ip (local.get $a))
            (br $dispatch)))

        ;; --- RET (0x61) ---
        (if (i32.eq (local.get $op) (i32.const 0x61))
          (then
            ;; pop return value
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            ;; restore ip and fp from current frame
            (local.set $ip (i32.load (global.get $fp)))
            (local.set $addr (i32.load (i32.add (global.get $fp) (i32.const 4))))
            (global.set $csp (global.get $fp))
            (global.set $fp (local.get $addr))
            ;; push return value
            (i32.store (local.get $sp) (local.get $a))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- ENTER (0x62) <u8 n_locals> --- reserve extra locals beyond args
        (if (i32.eq (local.get $op) (i32.const 0x62))
          (then
            (global.set $csp
              (i32.add (global.get $csp)
                       (i32.mul (call $read_u8 (local.get $ip)) (i32.const 4))))
            (local.set $ip (i32.add (local.get $ip) (i32.const 1)))
            (br $dispatch)))

        ;; --- LOAD_LOC (0x63) <u8 slot> ---
        (if (i32.eq (local.get $op) (i32.const 0x63))
          (then
            (i32.store (local.get $sp)
              (i32.load
                (i32.add (global.get $fp)
                         (i32.add (i32.const 8)
                                  (i32.mul (call $read_u8 (local.get $ip)) (i32.const 4))))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 1)))
            (br $dispatch)))

        ;; --- STORE_LOC (0x64) <u8 slot> ---
        (if (i32.eq (local.get $op) (i32.const 0x64))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (i32.store
              (i32.add (global.get $fp)
                       (i32.add (i32.const 8)
                                (i32.mul (call $read_u8 (local.get $ip)) (i32.const 4))))
              (i32.load (local.get $sp)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 1)))
            (br $dispatch)))


        ;; unknown opcode → halt
        (br $exit)
      )
    )
    (local.get $sp)
  )
)
