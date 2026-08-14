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
;; Memory layout (linear memory, 8 pages = 512 KiB — widened in Milestone 5n):
;;   0x00000..0x0FFFF  string pool  (utf-8 blobs, length-prefixed u32; 64 KiB)
;;   0x10000..0x13FFF  global variable slots (256 slots × 4 bytes → rounded)
;;   0x14000..0x17FFF  operand stack (u32 cells; sp grows up)
;;   0x18000..0x1BFFF  call stack (frames of ret_ip, saved_fp, locals…)
;;   0x1C000..0x2FFFF  bytecode program (u8 stream, up to 80 KiB)
;;   0x30000..0x7FFFF  bump-pointer heap  (lists, dynamic strings; 320 KiB)
;;
;; Opcodes (single byte, may be followed by inline operands):
;;   0x01 PUSH_I32 <i32 LE>         push signed 32-bit constant
;;   0x02 PUSH_STR <u16 idx LE>     push interned string handle (pool offset)
;;   0x03 LOAD    <u8 slot>         push global variable value
;;   0x04 STORE   <u8 slot>         pop into global variable
;;   0x05 POP                       drop top of stack
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
;;   ; --- Milestone 4: heap, lists, string manipulation ---
;;   0x70 ALLOC                     pop size, bump HP by (size+3 & ~3), push old HP
;;   0x80 NEWLIST <u16 n>           pop n items (right→left in memory), push arr addr
;;   0x81 LGET                      pop idx, pop arr, push arr[idx]
;;   0x82 LSET                      pop val, pop idx, pop arr, arr[idx]=val
;;   0x83 LEN                       pop addr, push u32 at addr (length header)
;;   0x84 SGET                      pop idx, pop str, push byte at bytes[idx]
;;   0x87 I2S                       pop int, push decimal-string blob
;;   0x88 CHR                       pop byte, push new 1-char string blob
;;   0x89 LNEW                      pop n, alloc zeroed list [n | n cells]
;;   ; --- Milestone 5t: tomes (string-keyed dictionaries) ---
;;   ;; layout: [MAGIC | count | cap | entriesPtr]; entries = cap * (key, val)
;;   ;; The leading magic word lets LGET / LSET / LEN dispatch on the value's
;;   ;; shape at run time, so a tome behaves like a tome even when the
;;   ;; compiler only knows it as an opaque parameter.
;;   0x8A TNEW <u16 cap>            allocate an empty tome with room for cap pairs
;;   0x8B TSET                      pop val, pop key, peek tome; store; leaves tome
;;   0x8C TGET                      pop key, pop tome, push value (0 when absent)
;;   0x8D THAS                      pop key, pop tome, push 1/0
;;   0x8E TKEYS                     pop tome, push list of key handles
;;   0x8F TVALS                     pop tome, push list of values
;;   0x91 STRCAT                    pop b, pop a, allocate new pool-shaped blob, push handle

;;   ; --- Milestone 6: floats (boxed f64 on the heap; stack cell holds addr) ---
;;   0xA0 PUSH_F64 <f64 LE>         alloc 8-byte cell, store f64, push addr
;;   0xA1 FADD  0xA2 FSUB  0xA3 FMUL  0xA4 FDIV
;;   0xA5 FLT   0xA6 FGT   0xA7 FEQ   (result is i32 boolean)
;;   0xA8 I2F                       pop int; box as f64 and push
;;   0xA9 F2I                       pop float; push i32 truncation
;;   0xAA FNEG  0xAB FABS  0xAC FSQRT
;;   0xAD SAY_F64                   pop float addr; host prints it
;;   0xAE FMATH <u8 op>             pop f64; call host_fmath(op,x); push new boxed result
;;                                  ops: 0=sin 1=cos 2=tan 3=exp 4=log 5=pow(a,b: pops two)
;;   ; --- Milestone 7: file I/O + networking (host-mediated) ---
;;   0xB0 READFILE                  pop path handle; push content handle (0 on error)
;;   0xB1 WRITEFILE                 pop data, pop path; push i32 status (0 ok, -1 err)
;;   0xB2 HTTPGET                   pop url handle; push response body handle (0 err)
;;   ; --- Milestone 5q: float bit inspection (self-hosted codegen needs it) ---
;;   0xB4 FBYTE                     pop idx (0..7), pop float; push IEEE-754 LE byte
;;   0xFF HALT

;;
;; The host provides these imports:
;;   env.host_say_i32(i32)
;;   env.host_say_str(offset:i32, length:i32)
;;   env.host_say_f64(f64)
;;   env.host_fmath(op:i32, a:f64, b:f64) -> f64
;;   env.host_read_file(path_ptr:i32, path_len:i32) -> i32   (blob handle or 0)
;;   env.host_write_file(path_ptr, path_len, data_ptr, data_len) -> i32
;;   env.host_http_get(url_ptr:i32, url_len:i32) -> i32       (blob handle or 0)
;;
;; The VM exports `alloc_str(n) -> ptr` so hosts can materialise a fresh
;; length-prefixed string blob and write bytes into ptr+4 before returning
;; ptr as a handle.
;; ============================================================================

(module
  (import "env" "host_say_i32" (func $say_i32 (param i32)))
  (import "env" "host_say_str" (func $say_str (param i32 i32)))
  (import "env" "host_say_f64" (func $say_f64 (param f64)))
  (import "env" "host_fmath"   (func $fmath (param i32 f64 f64) (result f64)))
  (import "env" "host_read_file"  (func $host_read_file  (param i32 i32) (result i32)))
  (import "env" "host_write_file" (func $host_write_file (param i32 i32 i32 i32) (result i32)))
  (import "env" "host_http_get"   (func $host_http_get   (param i32 i32) (result i32)))
  (memory (export "memory") 32)


  ;; ---- constants ---------------------------------------------------------
  ;; Milestone 5n: pool widened from 8 KiB to 64 KiB so the self-hosted
  ;; driver can embed codegen.sdev (~21 KiB) as a `set src to "..."`
  ;; literal without overflowing. u16 PUSH_STR offsets still fit
  ;; (max 0xFFFF), and everything downstream is bumped in lockstep.
  (global $VAR_BASE   i32 (i32.const 0x10000))
  (global $STACK_BASE i32 (i32.const 0x14000))
  (global $CALL_BASE  i32 (i32.const 0x18000))
  (global $CODE_BASE  i32 (i32.const 0x1C000))
  (global $HEAP_BASE  i32 (i32.const 0x30000))

  ;; ---- call-frame registers ---------------------------------------------
  (global $fp  (mut i32) (i32.const 0x18000))  ;; current frame base
  (global $csp (mut i32) (i32.const 0x18000))  ;; call-stack tip
  (global $hp  (mut i32) (i32.const 0x30000))  ;; heap bump pointer

  ;; ---- program length (set by host before calling run) -------------------
  (global $prog_len (mut i32) (i32.const 0))
  (func (export "set_prog_len") (param $n i32) (global.set $prog_len (local.get $n)))
  (func (export "code_base")  (result i32) (global.get $CODE_BASE))
  (func (export "sdev_version") (result i32) (i32.const 400))

  ;; Milestone 7: exported allocator so hosts can materialise a fresh
  ;; length-prefixed string blob and write bytes into ptr+4.
  (func (export "alloc_str") (param $n i32) (result i32) (local $p i32)
    (local.set $p (call $alloc (i32.add (local.get $n) (i32.const 4))))
    (i32.store (local.get $p) (local.get $n))
    (local.get $p))

  ;; ---- heap: bump-pointer allocator (returns 4-byte aligned addr) --------
  (func $alloc (param $n i32) (result i32) (local $ret i32)
    (local.set $ret (global.get $hp))
    ;; round n up to multiple of 4
    (global.set $hp
      (i32.add (global.get $hp)
               (i32.and (i32.add (local.get $n) (i32.const 3))
                        (i32.const -4))))
    (local.get $ret))

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

  (func $read_f64 (param $ip i32) (result f64)
    (f64.load (i32.add (global.get $CODE_BASE) (local.get $ip))))

  ;; Box an f64 onto the heap; returns the pointer.
  (func $box_f (param $x f64) (result i32) (local $p i32)
    (local.set $p (call $alloc (i32.const 8)))
    (f64.store (local.get $p) (local.get $x))
    (local.get $p))

  ;; ---- Milestone 5t: tomes (string-keyed dictionaries) -------------------
  ;; A tome is a 12-byte header [count | cap | entriesPtr]. The entries block
  ;; holds `cap` (keyPtr, value) i32 pairs; keys are string blobs [len|bytes].
  ;; Lookup is a linear scan with byte-wise key comparison — small, obvious
  ;; and enough for the compiler-sized tomes the language uses today.

  ;; Byte-wise string blob equality.
  (func $streq (param $a i32) (param $b i32) (result i32) (local $n i32)
    ;; NB: address 0 is a legal string handle (the pool starts at offset 0),
    ;; so a zero pointer must NOT be treated as "no string".
    (if (i32.eq (local.get $a) (local.get $b)) (then (return (i32.const 1))))
    (local.set $n (i32.load (local.get $a)))
    (if (i32.ne (local.get $n) (i32.load (local.get $b)))
      (then (return (i32.const 0))))
    (local.set $a (i32.add (local.get $a) (i32.const 4)))
    (local.set $b (i32.add (local.get $b) (i32.const 4)))
    (block $done (loop $cmp
      (br_if $done (i32.eqz (local.get $n)))
      (if (i32.ne (i32.load8_u (local.get $a)) (i32.load8_u (local.get $b)))
        (then (return (i32.const 0))))
      (local.set $a (i32.add (local.get $a) (i32.const 1)))
      (local.set $b (i32.add (local.get $b) (i32.const 1)))
      (local.set $n (i32.sub (local.get $n) (i32.const 1)))
      (br $cmp)))
    (i32.const 1))

  ;; Sentinel stored in word 0 of every tome. No list can legitimately have
  ;; this length (it would need 8 GiB), so the check is unambiguous.
  (global $TOME_MAGIC i32 (i32.const 0x7FED10E5))

  (func $is_tome (param $p i32) (result i32)
    (i32.eq (i32.load (local.get $p)) (global.get $TOME_MAGIC)))

  (func $tnew (param $cap i32) (result i32) (local $t i32)
    (if (i32.lt_s (local.get $cap) (i32.const 4))
      (then (local.set $cap (i32.const 4))))
    (local.set $t (call $alloc (i32.const 16)))
    (i32.store          (local.get $t) (global.get $TOME_MAGIC))
    (i32.store offset=4 (local.get $t) (i32.const 0))
    (i32.store offset=8 (local.get $t) (local.get $cap))
    (i32.store offset=12 (local.get $t)
      (call $alloc (i32.mul (local.get $cap) (i32.const 8))))
    (local.get $t))

  ;; Index of key in tome, or -1.
  (func $tfind (param $t i32) (param $k i32) (result i32)
    (local $i i32) (local $n i32) (local $e i32)
    (local.set $n (i32.load offset=4 (local.get $t)))
    (local.set $e (i32.load offset=12 (local.get $t)))
    (local.set $i (i32.const 0))
    (block $done (loop $scan
      (br_if $done (i32.ge_s (local.get $i) (local.get $n)))
      (if (call $streq
            (i32.load (i32.add (local.get $e) (i32.mul (local.get $i) (i32.const 8))))
            (local.get $k))
        (then (return (local.get $i))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $scan)))
    (i32.const -1))

  (func $tset (param $t i32) (param $k i32) (param $v i32)
    (local $i i32) (local $n i32) (local $cap i32)
    (local $e i32) (local $ne i32) (local $j i32)
    (local.set $i (call $tfind (local.get $t) (local.get $k)))
    (if (i32.ge_s (local.get $i) (i32.const 0))
      (then
        (i32.store offset=4
          (i32.add (i32.load offset=12 (local.get $t))
                   (i32.mul (local.get $i) (i32.const 8)))
          (local.get $v))
        (return)))
    (local.set $n   (i32.load offset=4 (local.get $t)))
    (local.set $cap (i32.load offset=8 (local.get $t)))
    (if (i32.ge_s (local.get $n) (local.get $cap))
      (then
        ;; grow: fresh entries block of double the capacity, copy pairs over
        (local.set $e  (i32.load offset=12 (local.get $t)))
        (local.set $ne (call $alloc (i32.mul (local.get $cap) (i32.const 16))))
        (local.set $j (i32.const 0))
        (block $dc (loop $cp
          (br_if $dc (i32.ge_s (local.get $j) (i32.mul (local.get $n) (i32.const 2))))
          (i32.store (i32.add (local.get $ne) (i32.mul (local.get $j) (i32.const 4)))
                     (i32.load (i32.add (local.get $e) (i32.mul (local.get $j) (i32.const 4)))))
          (local.set $j (i32.add (local.get $j) (i32.const 1)))
          (br $cp)))
        (i32.store offset=8  (local.get $t) (i32.mul (local.get $cap) (i32.const 2)))
        (i32.store offset=12 (local.get $t) (local.get $ne))))
    (local.set $e (i32.load offset=12 (local.get $t)))
    (i32.store          (i32.add (local.get $e) (i32.mul (local.get $n) (i32.const 8))) (local.get $k))
    (i32.store offset=4 (i32.add (local.get $e) (i32.mul (local.get $n) (i32.const 8))) (local.get $v))
    (i32.store offset=4 (local.get $t) (i32.add (local.get $n) (i32.const 1))))

  ;; Materialise the keys (which=0) or values (which=4) of a tome as a list.
  (func $tcollect (param $t i32) (param $which i32) (result i32)
    (local $i i32) (local $n i32) (local $e i32) (local $out i32)
    (local.set $n (i32.load offset=4 (local.get $t)))
    (local.set $e (i32.load offset=12 (local.get $t)))
    (local.set $out (call $alloc (i32.add (i32.const 4) (i32.mul (local.get $n) (i32.const 4)))))
    (i32.store (local.get $out) (local.get $n))
    (local.set $i (i32.const 0))
    (block $done (loop $cp
      (br_if $done (i32.ge_s (local.get $i) (local.get $n)))
      (i32.store
        (i32.add (local.get $out) (i32.add (i32.const 4) (i32.mul (local.get $i) (i32.const 4))))
        (i32.load (i32.add (local.get $e)
                    (i32.add (local.get $which) (i32.mul (local.get $i) (i32.const 8))))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $cp)))
    (local.get $out))


  ;; ---- Milestone 5u: string + numeric library helpers --------------------
  ;; All string results are freshly allocated [len|bytes] blobs on the heap,
  ;; the same shape the pool uses, so they are interchangeable with literals.

  ;; substring, with clamping: bytes [start, start+len) of s.
  (func $substr (param $s i32) (param $start i32) (param $len i32) (result i32)
    (local $n i32) (local $dst i32) (local $i i32)
    (local.set $n (i32.load (local.get $s)))
    (if (i32.lt_s (local.get $start) (i32.const 0)) (then (local.set $start (i32.const 0))))
    (if (i32.gt_s (local.get $start) (local.get $n)) (then (local.set $start (local.get $n))))
    (if (i32.lt_s (local.get $len) (i32.const 0)) (then (local.set $len (i32.const 0))))
    (if (i32.gt_s (i32.add (local.get $start) (local.get $len)) (local.get $n))
      (then (local.set $len (i32.sub (local.get $n) (local.get $start)))))
    (local.set $dst (call $alloc (i32.add (local.get $len) (i32.const 4))))
    (i32.store (local.get $dst) (local.get $len))
    (local.set $i (i32.const 0))
    (block $done (loop $cp
      (br_if $done (i32.ge_s (local.get $i) (local.get $len)))
      (i32.store8
        (i32.add (local.get $dst) (i32.add (i32.const 4) (local.get $i)))
        (i32.load8_u (i32.add (local.get $s)
          (i32.add (i32.const 4) (i32.add (local.get $start) (local.get $i))))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $cp)))
    (local.get $dst))

  ;; byte index of `needle` inside `hay`, or -1. Empty needle → 0.
  (func $find (param $hay i32) (param $needle i32) (result i32)
    (local $hn i32) (local $nn i32) (local $i i32) (local $j i32)
    (local.set $hn (i32.load (local.get $hay)))
    (local.set $nn (i32.load (local.get $needle)))
    (if (i32.eqz (local.get $nn)) (then (return (i32.const 0))))
    (local.set $i (i32.const 0))
    (block $outer (loop $scan
      (br_if $outer (i32.gt_s (i32.add (local.get $i) (local.get $nn)) (local.get $hn)))
      (local.set $j (i32.const 0))
      (block $mismatch
        (block $matched (loop $cmp
          (br_if $matched (i32.ge_s (local.get $j) (local.get $nn)))
          (br_if $mismatch (i32.ne
            (i32.load8_u (i32.add (local.get $hay)
              (i32.add (i32.const 4) (i32.add (local.get $i) (local.get $j)))))
            (i32.load8_u (i32.add (local.get $needle)
              (i32.add (i32.const 4) (local.get $j))))))
          (local.set $j (i32.add (local.get $j) (i32.const 1)))
          (br $cmp)))
        (return (local.get $i)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $scan)))
    (i32.const -1))

  ;; ASCII case fold. up=1 → upper, up=0 → lower.
  (func $case_fold (param $s i32) (param $up i32) (result i32)
    (local $n i32) (local $dst i32) (local $i i32) (local $c i32)
    (local.set $n (i32.load (local.get $s)))
    (local.set $dst (call $alloc (i32.add (local.get $n) (i32.const 4))))
    (i32.store (local.get $dst) (local.get $n))
    (local.set $i (i32.const 0))
    (block $done (loop $cp
      (br_if $done (i32.ge_s (local.get $i) (local.get $n)))
      (local.set $c (i32.load8_u
        (i32.add (local.get $s) (i32.add (i32.const 4) (local.get $i)))))
      (if (local.get $up)
        (then (if (i32.and (i32.ge_u (local.get $c) (i32.const 97))
                           (i32.le_u (local.get $c) (i32.const 122)))
                (then (local.set $c (i32.sub (local.get $c) (i32.const 32))))))
        (else (if (i32.and (i32.ge_u (local.get $c) (i32.const 65))
                           (i32.le_u (local.get $c) (i32.const 90)))
                (then (local.set $c (i32.add (local.get $c) (i32.const 32)))))))
      (i32.store8 (i32.add (local.get $dst) (i32.add (i32.const 4) (local.get $i)))
                  (local.get $c))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $cp)))
    (local.get $dst))

  (func $is_space (param $c i32) (result i32)
    (i32.or (i32.eq (local.get $c) (i32.const 32))
      (i32.or (i32.eq (local.get $c) (i32.const 9))
        (i32.or (i32.eq (local.get $c) (i32.const 10))
                (i32.eq (local.get $c) (i32.const 13))))))

  (func $trim (param $s i32) (result i32)
    (local $n i32) (local $a i32) (local $b i32)
    (local.set $n (i32.load (local.get $s)))
    (local.set $a (i32.const 0))
    (local.set $b (local.get $n))
    (block $d1 (loop $l1
      (br_if $d1 (i32.ge_s (local.get $a) (local.get $b)))
      (br_if $d1 (i32.eqz (call $is_space (i32.load8_u
        (i32.add (local.get $s) (i32.add (i32.const 4) (local.get $a)))))))
      (local.set $a (i32.add (local.get $a) (i32.const 1)))
      (br $l1)))
    (block $d2 (loop $l2
      (br_if $d2 (i32.ge_s (local.get $a) (local.get $b)))
      (br_if $d2 (i32.eqz (call $is_space (i32.load8_u
        (i32.add (local.get $s) (i32.add (i32.const 3) (local.get $b)))))))
      (local.set $b (i32.sub (local.get $b) (i32.const 1)))
      (br $l2)))
    (call $substr (local.get $s) (local.get $a) (i32.sub (local.get $b) (local.get $a))))

  ;; split s by sep → list of blobs. Empty sep splits into single bytes.
  (func $split (param $s i32) (param $sep i32) (result i32)
    (local $n i32) (local $sn i32) (local $count i32) (local $i i32)
    (local $start i32) (local $hit i32) (local $out i32) (local $rest i32)
    (local.set $n  (i32.load (local.get $s)))
    (local.set $sn (i32.load (local.get $sep)))
    (if (i32.eqz (local.get $sn))
      (then
        (local.set $out (call $alloc (i32.add (i32.const 4) (i32.mul (local.get $n) (i32.const 4)))))
        (i32.store (local.get $out) (local.get $n))
        (local.set $i (i32.const 0))
        (block $d (loop $l
          (br_if $d (i32.ge_s (local.get $i) (local.get $n)))
          (i32.store (i32.add (local.get $out) (i32.add (i32.const 4) (i32.mul (local.get $i) (i32.const 4))))
                     (call $substr (local.get $s) (local.get $i) (i32.const 1)))
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $l)))
        (return (local.get $out))))
    ;; pass 1: count pieces
    (local.set $count (i32.const 1))
    (local.set $i (i32.const 0))
    (block $dc (loop $lc
      (br_if $dc (i32.gt_s (i32.add (local.get $i) (local.get $sn)) (local.get $n)))
      (local.set $rest (call $substr (local.get $s) (local.get $i) (local.get $sn)))
      (if (call $streq (local.get $rest) (local.get $sep))
        (then
          (local.set $count (i32.add (local.get $count) (i32.const 1)))
          (local.set $i (i32.add (local.get $i) (local.get $sn))))
        (else (local.set $i (i32.add (local.get $i) (i32.const 1)))))
      (br $lc)))
    ;; pass 2: materialise
    (local.set $out (call $alloc (i32.add (i32.const 4) (i32.mul (local.get $count) (i32.const 4)))))
    (i32.store (local.get $out) (local.get $count))
    (local.set $hit (i32.const 0))
    (local.set $start (i32.const 0))
    (local.set $i (i32.const 0))
    (block $dp (loop $lp
      (if (i32.gt_s (i32.add (local.get $i) (local.get $sn)) (local.get $n))
        (then
          (i32.store (i32.add (local.get $out) (i32.add (i32.const 4) (i32.mul (local.get $hit) (i32.const 4))))
            (call $substr (local.get $s) (local.get $start) (i32.sub (local.get $n) (local.get $start))))
          (br $dp)))
      (local.set $rest (call $substr (local.get $s) (local.get $i) (local.get $sn)))
      (if (call $streq (local.get $rest) (local.get $sep))
        (then
          (i32.store (i32.add (local.get $out) (i32.add (i32.const 4) (i32.mul (local.get $hit) (i32.const 4))))
            (call $substr (local.get $s) (local.get $start) (i32.sub (local.get $i) (local.get $start))))
          (local.set $hit (i32.add (local.get $hit) (i32.const 1)))
          (local.set $i (i32.add (local.get $i) (local.get $sn)))
          (local.set $start (local.get $i)))
        (else (local.set $i (i32.add (local.get $i) (i32.const 1)))))
      (br $lp)))
    (local.get $out))

  ;; join a list of string blobs with sep.
  (func $join (param $list i32) (param $sep i32) (result i32)
    (local $n i32) (local $i i32) (local $total i32) (local $dst i32)
    (local $p i32) (local $src i32) (local $len i32) (local $k i32)
    (local.set $n (i32.load (local.get $list)))
    (local.set $total (i32.const 0))
    (local.set $i (i32.const 0))
    (block $d (loop $l
      (br_if $d (i32.ge_s (local.get $i) (local.get $n)))
      (local.set $total (i32.add (local.get $total)
        (i32.load (i32.load (i32.add (local.get $list)
          (i32.add (i32.const 4) (i32.mul (local.get $i) (i32.const 4))))))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l)))
    (if (i32.gt_s (local.get $n) (i32.const 0))
      (then (local.set $total (i32.add (local.get $total)
        (i32.mul (i32.sub (local.get $n) (i32.const 1)) (i32.load (local.get $sep)))))))
    (local.set $dst (call $alloc (i32.add (local.get $total) (i32.const 4))))
    (i32.store (local.get $dst) (local.get $total))
    (local.set $p (i32.add (local.get $dst) (i32.const 4)))
    (local.set $i (i32.const 0))
    (block $d2 (loop $l2
      (br_if $d2 (i32.ge_s (local.get $i) (local.get $n)))
      (if (i32.gt_s (local.get $i) (i32.const 0))
        (then
          (local.set $src (i32.add (local.get $sep) (i32.const 4)))
          (local.set $len (i32.load (local.get $sep)))
          (local.set $k (i32.const 0))
          (block $ds (loop $ls
            (br_if $ds (i32.ge_s (local.get $k) (local.get $len)))
            (i32.store8 (local.get $p) (i32.load8_u (i32.add (local.get $src) (local.get $k))))
            (local.set $p (i32.add (local.get $p) (i32.const 1)))
            (local.set $k (i32.add (local.get $k) (i32.const 1)))
            (br $ls)))))
      (local.set $src (i32.load (i32.add (local.get $list)
        (i32.add (i32.const 4) (i32.mul (local.get $i) (i32.const 4))))))
      (local.set $len (i32.load (local.get $src)))
      (local.set $src (i32.add (local.get $src) (i32.const 4)))
      (local.set $k (i32.const 0))
      (block $de (loop $le
        (br_if $de (i32.ge_s (local.get $k) (local.get $len)))
        (i32.store8 (local.get $p) (i32.load8_u (i32.add (local.get $src) (local.get $k))))
        (local.set $p (i32.add (local.get $p) (i32.const 1)))
        (local.set $k (i32.add (local.get $k) (i32.const 1)))
        (br $le)))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l2)))
    (local.get $dst))

  ;; replace every occurrence of `old` in s with `new`. Empty old → s.
  (func $replace (param $s i32) (param $old i32) (param $new i32) (result i32)
    (if (i32.eqz (i32.load (local.get $old))) (then (return (local.get $s))))
    (call $join (call $split (local.get $s) (local.get $old)) (local.get $new)))

  ;; decimal string → int (leading '-' allowed, non-digits stop the scan).
  (func $s2i (param $s i32) (result i32)
    (local $n i32) (local $i i32) (local $c i32) (local $sign i32) (local $acc i32)
    (local.set $n (i32.load (local.get $s)))
    (local.set $i (i32.const 0))
    (local.set $sign (i32.const 1))
    (local.set $acc (i32.const 0))
    (block $d (loop $l
      (br_if $d (i32.ge_s (local.get $i) (local.get $n)))
      (br_if $d (i32.eqz (call $is_space (i32.load8_u
        (i32.add (local.get $s) (i32.add (i32.const 4) (local.get $i)))))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l)))
    (if (i32.and (i32.lt_s (local.get $i) (local.get $n))
          (i32.eq (i32.load8_u (i32.add (local.get $s) (i32.add (i32.const 4) (local.get $i))))
                  (i32.const 45)))
      (then
        (local.set $sign (i32.const -1))
        (local.set $i (i32.add (local.get $i) (i32.const 1)))))
    (block $d2 (loop $l2
      (br_if $d2 (i32.ge_s (local.get $i) (local.get $n)))
      (local.set $c (i32.load8_u (i32.add (local.get $s) (i32.add (i32.const 4) (local.get $i)))))
      (br_if $d2 (i32.or (i32.lt_u (local.get $c) (i32.const 48))
                         (i32.gt_u (local.get $c) (i32.const 57))))
      (local.set $acc (i32.add (i32.mul (local.get $acc) (i32.const 10))
                               (i32.sub (local.get $c) (i32.const 48))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l2)))
    (i32.mul (local.get $acc) (local.get $sign)))

  ;; range(n) → list [0, 1, … n-1]
  (func $range (param $n i32) (result i32)
    (local $out i32) (local $i i32)
    (if (i32.lt_s (local.get $n) (i32.const 0)) (then (local.set $n (i32.const 0))))
    (local.set $out (call $alloc (i32.add (i32.const 4) (i32.mul (local.get $n) (i32.const 4)))))
    (i32.store (local.get $out) (local.get $n))
    (local.set $i (i32.const 0))
    (block $d (loop $l
      (br_if $d (i32.ge_s (local.get $i) (local.get $n)))
      (i32.store (i32.add (local.get $out) (i32.add (i32.const 4) (i32.mul (local.get $i) (i32.const 4))))
                 (local.get $i))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l)))
    (local.get $out))

  (func $sum (param $list i32) (result i32)
    (local $n i32) (local $i i32) (local $acc i32)
    (local.set $n (i32.load (local.get $list)))
    (local.set $i (i32.const 0))
    (block $d (loop $l
      (br_if $d (i32.ge_s (local.get $i) (local.get $n)))
      (local.set $acc (i32.add (local.get $acc)
        (i32.load (i32.add (local.get $list)
          (i32.add (i32.const 4) (i32.mul (local.get $i) (i32.const 4)))))))
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br $l)))
    (local.get $acc))

  ;; Deterministic xorshift32 PRNG — no host import, so every runtime agrees.
  (global $rng (mut i32) (i32.const 0x2545F491))
  (func $rand_next (result i32)
    (global.set $rng (i32.xor (global.get $rng) (i32.shl (global.get $rng) (i32.const 13))))
    (global.set $rng (i32.xor (global.get $rng) (i32.shr_u (global.get $rng) (i32.const 17))))
    (global.set $rng (i32.xor (global.get $rng) (i32.shl (global.get $rng) (i32.const 5))))
    (i32.and (global.get $rng) (i32.const 0x7fffffff)))

  ;; ---- main interpreter loop --------------------------------------------

  (func (export "run") (result i32)
    (local $ip i32)         ;; instruction pointer (relative to CODE_BASE)
    (local $sp i32)         ;; stack pointer (absolute address)
    (local $op i32)
    (local $a  i32)
    (local $b  i32)
    (local $addr i32)
    (local $n  i32)
    (local $dst i32)
    (local $tmp i32)
    (local $fa f64)
    (local $fb f64)

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


        ;; --- POP (0x05) ---
        (if (i32.eq (local.get $op) (i32.const 0x05))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- ALLOC (0x70) --- pop size, push heap addr
        (if (i32.eq (local.get $op) (i32.const 0x70))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (i32.store (local.get $sp) (call $alloc (local.get $a)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- NEWLIST (0x80) <u16 n> --- pop n items, alloc [len|items...]
        (if (i32.eq (local.get $op) (i32.const 0x80))
          (then
            (local.set $n (i32.load16_u (i32.add (global.get $CODE_BASE) (local.get $ip))))
            (local.set $ip (i32.add (local.get $ip) (i32.const 2)))
            (local.set $addr (call $alloc (i32.add (i32.const 4) (i32.mul (local.get $n) (i32.const 4)))))
            (i32.store (local.get $addr) (local.get $n))
            ;; items are on the stack; bottom-of-batch first
            (local.set $dst (i32.add (local.get $addr) (i32.const 4)))
            (local.set $b (i32.sub (local.get $sp) (i32.mul (local.get $n) (i32.const 4))))
            (block $done_nl
              (loop $copy_nl
                (br_if $done_nl (i32.eqz (local.get $n)))
                (i32.store (local.get $dst) (i32.load (local.get $b)))
                (local.set $dst (i32.add (local.get $dst) (i32.const 4)))
                (local.set $b   (i32.add (local.get $b)   (i32.const 4)))
                (local.set $n   (i32.sub (local.get $n)   (i32.const 1)))
                (br $copy_nl)))
            ;; drop the n items and push the list address
            (local.set $sp (i32.sub (local.get $sp)
                                    (i32.mul (i32.load16_u (i32.sub
                                              (i32.add (global.get $CODE_BASE) (local.get $ip))
                                              (i32.const 2))) (i32.const 4))))
            (i32.store (local.get $sp) (local.get $addr))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- LGET (0x81) --- pop idx, pop arr, push arr[idx]
        (if (i32.eq (local.get $op) (i32.const 0x81))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))                ;; idx
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))                ;; arr addr
            ;; Milestone 5t: a tome indexed with LGET behaves as a key read.
            (if (call $is_tome (local.get $a))
              (then
                (local.set $tmp (call $tfind (local.get $a) (local.get $b)))
                (i32.store (local.get $sp)
                  (select
                    (i32.load offset=4
                      (i32.add (i32.load offset=12 (local.get $a))
                               (i32.mul (local.get $tmp) (i32.const 8))))
                    (i32.const 0)
                    (i32.ge_s (local.get $tmp) (i32.const 0))))
                (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
                (br $dispatch)))
            (i32.store (local.get $sp)
              (i32.load (i32.add (local.get $a)
                (i32.add (i32.const 4) (i32.mul (local.get $b) (i32.const 4))))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- LSET (0x82) --- pop val, pop idx, pop arr, arr[idx]=val
        (if (i32.eq (local.get $op) (i32.const 0x82))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $n (i32.load (local.get $sp)))               ;; val
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))               ;; idx
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))               ;; arr
            ;; Milestone 5t: LSET on a tome is a key write.
            (if (call $is_tome (local.get $a))
              (then
                (call $tset (local.get $a) (local.get $b) (local.get $n))
                (br $dispatch)))
            (i32.store (i32.add (local.get $a)
              (i32.add (i32.const 4) (i32.mul (local.get $b) (i32.const 4))))
              (local.get $n))
            (br $dispatch)))

        ;; --- LEN (0x83) --- pop addr, push u32 at addr
        (if (i32.eq (local.get $op) (i32.const 0x83))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            ;; Milestone 5t: a tome reports its entry count, not its magic.
            (i32.store (local.get $sp)
              (select (i32.load offset=4 (local.get $a))
                      (i32.load (local.get $a))
                      (call $is_tome (local.get $a))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- STRCAT (0x91) --- pop b, pop a, alloc [len|bytes], push handle
        (if (i32.eq (local.get $op) (i32.const 0x91))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (local.set $n (i32.add (i32.load (local.get $a)) (i32.load (local.get $b))))
            (local.set $dst (call $alloc (i32.add (local.get $n) (i32.const 4))))
            (i32.store (local.get $dst) (local.get $n))
            ;; copy A bytes
            (local.set $addr (i32.add (local.get $dst) (i32.const 4)))
            (local.set $n (i32.load (local.get $a)))
            (local.set $a (i32.add (local.get $a) (i32.const 4)))
            (block $da (loop $ca
              (br_if $da (i32.eqz (local.get $n)))
              (i32.store8 (local.get $addr) (i32.load8_u (local.get $a)))
              (local.set $addr (i32.add (local.get $addr) (i32.const 1)))
              (local.set $a    (i32.add (local.get $a)    (i32.const 1)))
              (local.set $n    (i32.sub (local.get $n)    (i32.const 1)))
              (br $ca)))
            ;; copy B bytes
            (local.set $n (i32.load (local.get $b)))
            (local.set $b (i32.add (local.get $b) (i32.const 4)))
            (block $db (loop $cb
              (br_if $db (i32.eqz (local.get $n)))
              (i32.store8 (local.get $addr) (i32.load8_u (local.get $b)))
              (local.set $addr (i32.add (local.get $addr) (i32.const 1)))
              (local.set $b    (i32.add (local.get $b)    (i32.const 1)))
              (local.set $n    (i32.sub (local.get $n)    (i32.const 1)))
              (br $cb)))
            (i32.store (local.get $sp) (local.get $dst))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- SGET (0x84) --- pop idx, pop str, push byte at bytes[idx]
        (if (i32.eq (local.get $op) (i32.const 0x84))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (i32.store (local.get $sp)
              (i32.load8_u (i32.add (local.get $a)
                (i32.add (i32.const 4) (local.get $b)))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- CHR (0x88) --- pop n, alloc 1-char string [1|byte], push addr
        (if (i32.eq (local.get $op) (i32.const 0x88))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (local.set $dst (call $alloc (i32.const 5)))
            (i32.store (local.get $dst) (i32.const 1))
            (i32.store8 (i32.add (local.get $dst) (i32.const 4)) (local.get $a))
            (i32.store (local.get $sp) (local.get $dst))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- LNEW (0x89) --- pop n, alloc zeroed list [n | n*4 zero bytes]
        (if (i32.eq (local.get $op) (i32.const 0x89))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $n (i32.load (local.get $sp)))
            (local.set $dst (call $alloc
              (i32.add (i32.const 4) (i32.mul (local.get $n) (i32.const 4)))))
            (i32.store (local.get $dst) (local.get $n))
            ;; zero the cells (heap is not pre-zeroed after first bump reuse
            ;; would matter, but WebAssembly linear memory IS zero-initialized
            ;; on first touch; the bump allocator never revisits, so writes
            ;; here are only needed if the program has already used those
            ;; bytes as a longer temp allocation. Zero defensively for safety.)
            (local.set $addr (i32.add (local.get $dst) (i32.const 4)))
            (block $dz (loop $lz
              (br_if $dz (i32.eqz (local.get $n)))
              (i32.store (local.get $addr) (i32.const 0))
              (local.set $addr (i32.add (local.get $addr) (i32.const 4)))
              (local.set $n    (i32.sub (local.get $n)    (i32.const 1)))
              (br $lz)))
            (i32.store (local.get $sp) (local.get $dst))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- TNEW (0x8A) <u16 cap> --- push a fresh empty tome
        (if (i32.eq (local.get $op) (i32.const 0x8A))
          (then
            (local.set $n (i32.load16_u (i32.add (global.get $CODE_BASE) (local.get $ip))))
            (local.set $ip (i32.add (local.get $ip) (i32.const 2)))
            (i32.store (local.get $sp) (call $tnew (local.get $n)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- TSET (0x8B) --- pop val, pop key; tome stays on the stack
        (if (i32.eq (local.get $op) (i32.const 0x8B))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $n (i32.load (local.get $sp)))          ;; value
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))          ;; key
            (local.set $a (i32.load (i32.sub (local.get $sp) (i32.const 4))))
            (call $tset (local.get $a) (local.get $b) (local.get $n))
            (br $dispatch)))

        ;; --- TGET (0x8C) --- pop key, pop tome, push value (0 if absent)
        (if (i32.eq (local.get $op) (i32.const 0x8C))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (local.set $tmp (call $tfind (local.get $a) (local.get $b)))
            (i32.store (local.get $sp)
              (select
                (i32.load offset=4
                  (i32.add (i32.load offset=12 (local.get $a))
                           (i32.mul (local.get $tmp) (i32.const 8))))
                (i32.const 0)
                (i32.ge_s (local.get $tmp) (i32.const 0))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- THAS (0x8D) --- pop key, pop tome, push 1/0
        (if (i32.eq (local.get $op) (i32.const 0x8D))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (i32.store (local.get $sp)
              (i32.ge_s (call $tfind (local.get $a) (local.get $b)) (i32.const 0)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- TKEYS (0x8E) / TVALS (0x8F) --- pop tome, push a list
        (if (i32.eq (local.get $op) (i32.const 0x8E))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (i32.store (local.get $sp)
              (call $tcollect (i32.load (local.get $sp)) (i32.const 0)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))
        (if (i32.eq (local.get $op) (i32.const 0x8F))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (i32.store (local.get $sp)
              (call $tcollect (i32.load (local.get $sp)) (i32.const 4)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))


        ;; --- I2S (0x87) --- pop int, push decimal-string blob [len|utf-8]
        (if (i32.eq (local.get $op) (i32.const 0x87))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            ;; $b = negative flag (0 or 1)
            (local.set $b (i32.const 0))
            (if (i32.lt_s (local.get $a) (i32.const 0))
              (then
                (local.set $a (i32.sub (i32.const 0) (local.get $a)))
                (local.set $b (i32.const 1))))
            ;; $n = digit count (>=1 even for zero)
            (local.set $n (i32.const 0))
            (local.set $tmp (local.get $a))
            (block $dc (loop $lc
              (local.set $n (i32.add (local.get $n) (i32.const 1)))
              (local.set $tmp (i32.div_u (local.get $tmp) (i32.const 10)))
              (br_if $dc (i32.eqz (local.get $tmp)))
              (br $lc)))
            ;; total length = digits + sign
            (local.set $dst (call $alloc
              (i32.add (i32.const 4)
                (i32.add (local.get $n) (local.get $b)))))
            (i32.store (local.get $dst)
              (i32.add (local.get $n) (local.get $b)))
            ;; write digits backward from end
            (local.set $addr (i32.add (local.get $dst)
              (i32.add (i32.const 4)
                (i32.add (local.get $n) (local.get $b)))))
            (local.set $tmp (local.get $a))
            (block $dw (loop $lw
              (local.set $addr (i32.sub (local.get $addr) (i32.const 1)))
              (i32.store8 (local.get $addr)
                (i32.add (i32.const 48)
                  (i32.rem_u (local.get $tmp) (i32.const 10))))
              (local.set $tmp (i32.div_u (local.get $tmp) (i32.const 10)))
              (br_if $dw (i32.eqz (local.get $tmp)))
              (br $lw)))
            ;; optional minus sign at position 4
            (if (local.get $b)
              (then
                (i32.store8 (i32.add (local.get $dst) (i32.const 4))
                  (i32.const 45))))
            (i32.store (local.get $sp) (local.get $dst))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))


        ;; ============================================================
        ;; --- Milestone 6: floats ------------------------------------
        ;; ============================================================

        ;; --- PUSH_F64 (0xA0) <f64 LE> --- box literal, push addr
        (if (i32.eq (local.get $op) (i32.const 0xA0))
          (then
            (i32.store (local.get $sp) (call $box_f (call $read_f64 (local.get $ip))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 8)))
            (br $dispatch)))

        ;; --- FADD..FDIV (0xA1..0xA4) ---
        (if (i32.and (i32.ge_u (local.get $op) (i32.const 0xA1))
                     (i32.le_u (local.get $op) (i32.const 0xA4)))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $fb (f64.load (i32.load (local.get $sp))))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $fa (f64.load (i32.load (local.get $sp))))
            (if (i32.eq (local.get $op) (i32.const 0xA1))
              (then (i32.store (local.get $sp) (call $box_f (f64.add (local.get $fa) (local.get $fb))))))
            (if (i32.eq (local.get $op) (i32.const 0xA2))
              (then (i32.store (local.get $sp) (call $box_f (f64.sub (local.get $fa) (local.get $fb))))))
            (if (i32.eq (local.get $op) (i32.const 0xA3))
              (then (i32.store (local.get $sp) (call $box_f (f64.mul (local.get $fa) (local.get $fb))))))
            (if (i32.eq (local.get $op) (i32.const 0xA4))
              (then (i32.store (local.get $sp) (call $box_f (f64.div (local.get $fa) (local.get $fb))))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- FLT/FGT/FEQ (0xA5..0xA7) --- result is i32 boolean
        (if (i32.and (i32.ge_u (local.get $op) (i32.const 0xA5))
                     (i32.le_u (local.get $op) (i32.const 0xA7)))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $fb (f64.load (i32.load (local.get $sp))))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $fa (f64.load (i32.load (local.get $sp))))
            (if (i32.eq (local.get $op) (i32.const 0xA5))
              (then (i32.store (local.get $sp) (f64.lt (local.get $fa) (local.get $fb)))))
            (if (i32.eq (local.get $op) (i32.const 0xA6))
              (then (i32.store (local.get $sp) (f64.gt (local.get $fa) (local.get $fb)))))
            (if (i32.eq (local.get $op) (i32.const 0xA7))
              (then (i32.store (local.get $sp) (f64.eq (local.get $fa) (local.get $fb)))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- I2F (0xA8) --- pop int, push boxed float
        (if (i32.eq (local.get $op) (i32.const 0xA8))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (i32.store (local.get $sp)
              (call $box_f (f64.convert_i32_s (i32.load (local.get $sp)))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- F2I (0xA9) --- pop float addr, push i32 truncation
        (if (i32.eq (local.get $op) (i32.const 0xA9))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (i32.store (local.get $sp)
              (i32.trunc_f64_s (f64.load (i32.load (local.get $sp)))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- FNEG/FABS/FSQRT (0xAA..0xAC) ---
        (if (i32.and (i32.ge_u (local.get $op) (i32.const 0xAA))
                     (i32.le_u (local.get $op) (i32.const 0xAC)))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $fa (f64.load (i32.load (local.get $sp))))
            (if (i32.eq (local.get $op) (i32.const 0xAA))
              (then (i32.store (local.get $sp) (call $box_f (f64.neg (local.get $fa))))))
            (if (i32.eq (local.get $op) (i32.const 0xAB))
              (then (i32.store (local.get $sp) (call $box_f (f64.abs (local.get $fa))))))
            (if (i32.eq (local.get $op) (i32.const 0xAC))
              (then (i32.store (local.get $sp) (call $box_f (f64.sqrt (local.get $fa))))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- SAY_F64 (0xAD) ---
        (if (i32.eq (local.get $op) (i32.const 0xAD))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (call $say_f64 (f64.load (i32.load (local.get $sp))))
            (br $dispatch)))

        ;; --- FMATH (0xAE) <u8 op> --- transcendentals via host
        ;; op: 0 sin, 1 cos, 2 tan, 3 exp, 4 log (all unary; b unused=0)
        ;;     5 pow (binary; pops two)
        (if (i32.eq (local.get $op) (i32.const 0xAE))
          (then
            (local.set $a (call $read_u8 (local.get $ip)))
            (local.set $ip (i32.add (local.get $ip) (i32.const 1)))
            (if (i32.eq (local.get $a) (i32.const 5))
              (then
                (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
                (local.set $fb (f64.load (i32.load (local.get $sp))))
                (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
                (local.set $fa (f64.load (i32.load (local.get $sp))))
                (i32.store (local.get $sp)
                  (call $box_f (call $fmath (local.get $a) (local.get $fa) (local.get $fb))))
                (local.set $sp (i32.add (local.get $sp) (i32.const 4))))
              (else
                (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
                (local.set $fa (f64.load (i32.load (local.get $sp))))
                (i32.store (local.get $sp)
                  (call $box_f (call $fmath (local.get $a) (local.get $fa) (f64.const 0))))
                (local.set $sp (i32.add (local.get $sp) (i32.const 4)))))
            (br $dispatch)))

        ;; --- READFILE (0xB0) --- pop path handle, push content handle
        (if (i32.eq (local.get $op) (i32.const 0xB0))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (i32.store (local.get $sp)
              (call $host_read_file
                (i32.add (local.get $a) (i32.const 4))
                (i32.load (local.get $a))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- WRITEFILE (0xB1) --- pop data, pop path, push status
        (if (i32.eq (local.get $op) (i32.const 0xB1))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (i32.store (local.get $sp)
              (call $host_write_file
                (i32.add (local.get $a) (i32.const 4)) (i32.load (local.get $a))
                (i32.add (local.get $b) (i32.const 4)) (i32.load (local.get $b))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- HTTPGET (0xB2) --- pop URL handle, push body handle
        (if (i32.eq (local.get $op) (i32.const 0xB2))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (i32.store (local.get $sp)
              (call $host_http_get
                (i32.add (local.get $a) (i32.const 4))
                (i32.load (local.get $a))))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; --- FBYTE (0xB4) --- pop idx, pop float addr, push IEEE-754 LE byte
        ;; Lets the self-hosted codegen materialise PUSH_F64 operands without
        ;; needing bitwise integer ops in the source language.
        (if (i32.eq (local.get $op) (i32.const 0xB4))
          (then
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $b (i32.load (local.get $sp)))
            (local.set $sp (i32.sub (local.get $sp) (i32.const 4)))
            (local.set $a (i32.load (local.get $sp)))
            (i32.store (local.get $sp)
              (i32.and
                (i32.wrap_i64
                  (i64.shr_u
                    (i64.reinterpret_f64 (f64.load (local.get $a)))
                    (i64.extend_i32_u (i32.mul (local.get $b) (i32.const 8)))))
                (i32.const 0xff)))
            (local.set $sp (i32.add (local.get $sp) (i32.const 4)))
            (br $dispatch)))

        ;; unknown opcode → halt
        (br $exit)

      )
    )
    (local.get $sp)
  )
)
