# SDEV native runtime — hand-written x86-64 assembly (Linux SysV).
#
# Provides:
#   _start          — ELF entry, calls sdev_main, then exits(0).
#   sdev_say_int    — prints an int64 in %rdi as decimal + newline.
#   sdev_say_str    — prints a length-prefixed UTF-8 string.
#                     %rdi points at [i64 length][bytes...].
#   sdev_alloc      — bump allocator over one anonymous mmap region.
#   sdev_concat     — joins two length-prefixed strings into a fresh one.
#   sdev_chr        — one-byte string from a code point (0..255).
#   sdev_str_int    — decimal text for an int64, as a heap string.
#
# Heap values (Milestone 6c):
#   string = [i64 byte-length][bytes...]
#   list   = [i64 element-count][i64 elements...]
# Both are just a length word followed by payload, so `length(x)` is a
# single load regardless of which one you hand it.
#
# No libc. All syscalls direct.

    .text
    .globl _start

_start:
    movq (%rsp), %rax               # argc
    movq %rax, sdev_argc(%rip)
    leaq 8(%rsp), %rcx              # argv
    movq %rcx, sdev_argv(%rip)
    incq %rax                       # skip argv[0..argc-1] + NULL
    leaq (%rcx,%rax,8), %rcx
    movq %rcx, sdev_envp(%rip)
    call sdev_main
    movq $60, %rax          # sys_exit
    xorq %rdi, %rdi
    syscall

# ---- sdev_say_str(struct { i64 len; char bytes[len]; } *) ----
# %rdi = ptr to length-prefixed string
    .globl sdev_say_str
sdev_say_str:
    movq (%rdi), %rdx       # length
    leaq 8(%rdi), %rsi      # bytes
    movq $1, %rax           # sys_write
    movq $1, %rdi           # fd = stdout
    syscall
    # newline
    movq $1, %rax
    movq $1, %rdi
    leaq nl(%rip), %rsi
    movq $1, %rdx
    syscall
    ret

# ---- sdev_say_int(i64) ----
# %rdi = value; writes decimal + newline to stdout.
    .globl sdev_say_int
sdev_say_int:
    pushq %rbp
    movq %rsp, %rbp
    subq $32, %rsp                  # buffer[24] + slack
    movq %rdi, %rax
    leaq -1(%rbp), %rsi             # end of buffer, we write backwards
    movb $10, (%rsi)                # trailing newline
    decq %rsi

    xorl %r8d, %r8d                 # negative flag
    testq %rax, %rax
    jns .Ldigits
    negq %rax
    movl $1, %r8d

.Ldigits:
    movq $10, %rcx
.Ldigit_loop:
    xorq %rdx, %rdx
    divq %rcx                       # %rdx = digit, %rax = quotient
    addb $'0', %dl
    movb %dl, (%rsi)
    decq %rsi
    testq %rax, %rax
    jnz .Ldigit_loop

    testl %r8d, %r8d
    jz .Lno_sign
    movb $'-', (%rsi)
    decq %rsi

.Lno_sign:
    incq %rsi                       # now points at first byte to write
    leaq -1(%rbp), %rdx
    subq %rsi, %rdx
    incq %rdx                       # length = end - start + 1

    movq $1, %rax                   # sys_write
    movq $1, %rdi
    # %rsi already points at start
    syscall

    movq %rbp, %rsp
    popq %rbp
    ret

# ---- sdev_alloc(i64 size) -> ptr ----
# Bump allocator. The first call mmaps a 64 MiB anonymous RW region; there
# is no free — native SDEV programs are short-lived compiler runs.
    .globl sdev_alloc
sdev_alloc:
    pushq %rbp
    movq %rsp, %rbp
    addq $7, %rdi
    andq $-8, %rdi
    movq sdev_heap_ptr(%rip), %rax
    testq %rax, %rax
    jnz .Lheap_ready
    pushq %rdi
    movq $9, %rax                   # sys_mmap
    xorq %rdi, %rdi                 # addr = NULL
    movq $67108864, %rsi            # 64 MiB
    movq $3, %rdx                   # PROT_READ|PROT_WRITE
    movq $34, %r10                  # MAP_PRIVATE|MAP_ANONYMOUS
    movq $-1, %r8
    xorq %r9, %r9
    syscall
    movq %rax, sdev_heap_ptr(%rip)
    popq %rdi
.Lheap_ready:
    movq sdev_heap_ptr(%rip), %rax
    addq %rax, %rdi
    movq %rdi, sdev_heap_ptr(%rip)
    popq %rbp
    ret

# ---- sdev_concat(ptr a, ptr b) -> ptr ----
    .globl sdev_concat
sdev_concat:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    movq %rdi, %r12
    movq %rsi, %r13
    movq (%r12), %rbx
    addq (%r13), %rbx
    leaq 8(%rbx), %rdi
    call sdev_alloc
    movq %rax, %r14
    movq %rbx, (%r14)
    leaq 8(%r14), %rdi
    movq (%r12), %rcx
    leaq 8(%r12), %rsi
    testq %rcx, %rcx
    jz .Lcat_b
.Lcat_a_loop:
    movb (%rsi), %dl
    movb %dl, (%rdi)
    incq %rsi
    incq %rdi
    decq %rcx
    jnz .Lcat_a_loop
.Lcat_b:
    movq (%r13), %rcx
    leaq 8(%r13), %rsi
    testq %rcx, %rcx
    jz .Lcat_done
.Lcat_b_loop:
    movb (%rsi), %dl
    movb %dl, (%rdi)
    incq %rsi
    incq %rdi
    decq %rcx
    jnz .Lcat_b_loop
.Lcat_done:
    movq %r14, %rax
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

# ---- sdev_chr(i64 code) -> ptr ----
    .globl sdev_chr
sdev_chr:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    movq %rdi, %rbx
    movq $9, %rdi
    call sdev_alloc
    movq $1, (%rax)
    movb %bl, 8(%rax)
    popq %rbx
    popq %rbp
    ret

# ---- sdev_str_int(i64) -> ptr ----
    .globl sdev_str_int
sdev_str_int:
    pushq %rbp
    movq %rsp, %rbp
    subq $48, %rsp
    pushq %rbx
    pushq %r12
    movq %rdi, %rax
    leaq -8(%rbp), %rsi             # write digits backwards
    xorl %r9d, %r9d
    testq %rax, %rax
    jns .Lsi_digits
    negq %rax
    movl $1, %r9d
.Lsi_digits:
    xorq %r8, %r8                   # digit count
    movq $10, %rcx
.Lsi_loop:
    xorq %rdx, %rdx
    divq %rcx
    addb $'0', %dl
    movb %dl, (%rsi)
    decq %rsi
    incq %r8
    testq %rax, %rax
    jnz .Lsi_loop
    testl %r9d, %r9d
    jz .Lsi_nosign
    movb $'-', (%rsi)
    decq %rsi
    incq %r8
.Lsi_nosign:
    incq %rsi
    movq %rsi, %rbx                 # first byte
    movq %r8, %r12                  # length
    movq %r12, %rdi
    addq $8, %rdi
    call sdev_alloc
    movq %r12, (%rax)
    leaq 8(%rax), %rdi
    movq %rbx, %rsi
    movq %r12, %rcx
.Lsi_copy:
    movb (%rsi), %dl
    movb %dl, (%rdi)
    incq %rsi
    incq %rdi
    decq %rcx
    jnz .Lsi_copy
    popq %r12
    popq %rbx
    movq %rbp, %rsp
    popq %rbp
    ret


# ===========================================================================
# Milestone 6d — string library and tomes.
#
#   tome = [i64 count][i64 cap][cap * (i64 key-ptr, i64 value)]
# `length(t)` therefore still reads the header word, like strings and lists.
# ===========================================================================

# ---- sdev_empty() -> ptr (zero-length string) ----
    .globl sdev_empty
sdev_empty:
    pushq %rbp
    movq %rsp, %rbp
    movq $8, %rdi
    call sdev_alloc
    movq $0, (%rax)
    popq %rbp
    ret

# ---- sdev_str_eq(a, b) -> 0/1 ----
    .globl sdev_str_eq
sdev_str_eq:
    movq (%rdi), %rcx
    cmpq (%rsi), %rcx
    jne 2f
    leaq 8(%rdi), %r8
    leaq 8(%rsi), %r9
1:  testq %rcx, %rcx
    jz 3f
    movb (%r8), %al
    cmpb (%r9), %al
    jne 2f
    incq %r8
    incq %r9
    decq %rcx
    jmp 1b
2:  xorq %rax, %rax
    ret
3:  movq $1, %rax
    ret

# ---- sdev_index_of(hay, needle) -> index or -1 ----
    .globl sdev_index_of
sdev_index_of:
    pushq %rbx
    movq (%rdi), %r10
    movq (%rsi), %r11
    leaq 8(%rdi), %r8
    leaq 8(%rsi), %r9
    xorq %rax, %rax
1:  movq %rax, %rcx
    addq %r11, %rcx
    cmpq %r10, %rcx
    jg 4f
    xorq %rdx, %rdx
2:  cmpq %r11, %rdx
    jge 3f
    movq %rax, %rcx
    addq %rdx, %rcx
    movb (%r8,%rcx,1), %bl
    cmpb (%r9,%rdx,1), %bl
    jne 5f
    incq %rdx
    jmp 2b
3:  popq %rbx
    ret
5:  incq %rax
    jmp 1b
4:  movq $-1, %rax
    popq %rbx
    ret

# ---- sdev_contains(hay, needle) -> 0/1 ----
    .globl sdev_contains
sdev_contains:
    pushq %rbp
    movq %rsp, %rbp
    call sdev_index_of
    xorq %rcx, %rcx
    testq %rax, %rax
    setns %cl
    movq %rcx, %rax
    popq %rbp
    ret

# ---- sdev_substr(s, start, len) -> ptr ----
    .globl sdev_substr
sdev_substr:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    movq %rdi, %r12
    movq %rsi, %r13
    movq %rdx, %r14
    movq (%r12), %rbx
    testq %r13, %r13
    jns 1f
    xorq %r13, %r13
1:  cmpq %rbx, %r13
    jle 2f
    movq %rbx, %r13
2:  testq %r14, %r14
    jns 3f
    xorq %r14, %r14
3:  movq %rbx, %rax
    subq %r13, %rax
    cmpq %rax, %r14
    jle 4f
    movq %rax, %r14
4:  leaq 8(%r14), %rdi
    call sdev_alloc
    movq %r14, (%rax)
    pushq %rax
    leaq 8(%rax), %rdi
    leaq 8(%r12), %rsi
    addq %r13, %rsi
    movq %r14, %rcx
    testq %rcx, %rcx
    jz 6f
5:  movb (%rsi), %dl
    movb %dl, (%rdi)
    incq %rsi
    incq %rdi
    decq %rcx
    jnz 5b
6:  popq %rax
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

# ---- sdev_upper(s) / sdev_lower(s) ----
    .globl sdev_upper
sdev_upper:
    pushq %rbp
    movq %rsp, %rbp
    pushq %r12
    movq %rdi, %r12
    movq (%r12), %rdi
    addq $8, %rdi
    call sdev_alloc
    movq (%r12), %rcx
    movq %rcx, (%rax)
    pushq %rax
    leaq 8(%rax), %rdi
    leaq 8(%r12), %rsi
    testq %rcx, %rcx
    jz 2f
1:  movb (%rsi), %dl
    cmpb $'a', %dl
    jb 3f
    cmpb $'z', %dl
    ja 3f
    subb $32, %dl
3:  movb %dl, (%rdi)
    incq %rsi
    incq %rdi
    decq %rcx
    jnz 1b
2:  popq %rax
    popq %r12
    popq %rbp
    ret

    .globl sdev_lower
sdev_lower:
    pushq %rbp
    movq %rsp, %rbp
    pushq %r12
    movq %rdi, %r12
    movq (%r12), %rdi
    addq $8, %rdi
    call sdev_alloc
    movq (%r12), %rcx
    movq %rcx, (%rax)
    pushq %rax
    leaq 8(%rax), %rdi
    leaq 8(%r12), %rsi
    testq %rcx, %rcx
    jz 2f
1:  movb (%rsi), %dl
    cmpb $'A', %dl
    jb 3f
    cmpb $'Z', %dl
    ja 3f
    addb $32, %dl
3:  movb %dl, (%rdi)
    incq %rsi
    incq %rdi
    decq %rcx
    jnz 1b
2:  popq %rax
    popq %r12
    popq %rbp
    ret

# ---- sdev_trim(s) -> ptr ----
    .globl sdev_trim
sdev_trim:
    pushq %rbp
    movq %rsp, %rbp
    pushq %r12
    pushq %r13
    movq %rdi, %r12
    movq (%r12), %r13
    xorq %rax, %rax
1:  cmpq %r13, %rax
    jge 2f
    movzbq 8(%r12,%rax,1), %rcx
    cmpq $32, %rcx
    ja 2f
    incq %rax
    jmp 1b
2:  movq %r13, %rdx
3:  cmpq %rax, %rdx
    jle 4f
    movzbq 7(%r12,%rdx,1), %rcx
    cmpq $32, %rcx
    ja 4f
    decq %rdx
    jmp 3b
4:  subq %rax, %rdx
    movq %rax, %rsi
    movq %r12, %rdi
    call sdev_substr
    popq %r13
    popq %r12
    popq %rbp
    ret

# ---- sdev_replace(s, from, to) -> ptr ----
    .globl sdev_replace
sdev_replace:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    pushq %r15
    movq %rdi, %r12
    movq %rsi, %r13
    movq %rdx, %r14
    call sdev_empty
    movq %rax, %r15
    xorq %rbx, %rbx
    cmpq $0, (%r13)
    je 9f
1:  movq (%r12), %rdx
    subq %rbx, %rdx
    movq %r12, %rdi
    movq %rbx, %rsi
    call sdev_substr
    pushq %rax
    movq %rax, %rdi
    movq %r13, %rsi
    call sdev_index_of
    testq %rax, %rax
    js 8f
    movq %rax, %rcx
    movq (%rsp), %rdi
    xorq %rsi, %rsi
    movq %rcx, %rdx
    pushq %rcx
    call sdev_substr
    movq %r15, %rdi
    movq %rax, %rsi
    call sdev_concat
    movq %rax, %r15
    movq %r15, %rdi
    movq %r14, %rsi
    call sdev_concat
    movq %rax, %r15
    popq %rcx
    popq %rdx
    addq %rcx, %rbx
    addq (%r13), %rbx
    jmp 1b
8:  popq %rsi
    movq %r15, %rdi
    call sdev_concat
    movq %rax, %r15
    jmp 10f
9:  movq %r12, %r15
10: movq %r15, %rax
    popq %r15
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

# ---- sdev_split(s, sep) -> list of strings ----
    .globl sdev_split
sdev_split:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    pushq %r15
    movq %rdi, %r12
    movq %rsi, %r13
    movq (%r12), %rdi
    addq $2, %rdi
    shlq $3, %rdi
    call sdev_alloc
    movq %rax, %r15
    xorq %rbx, %rbx
    xorq %r14, %r14
    cmpq $0, (%r13)
    je 8f
1:  movq (%r12), %rdx
    subq %rbx, %rdx
    movq %r12, %rdi
    movq %rbx, %rsi
    call sdev_substr
    pushq %rax
    movq %rax, %rdi
    movq %r13, %rsi
    call sdev_index_of
    testq %rax, %rax
    js 7f
    movq %rax, %rcx
    movq (%rsp), %rdi
    xorq %rsi, %rsi
    movq %rcx, %rdx
    pushq %rcx
    call sdev_substr
    popq %rcx
    movq %rax, 8(%r15,%r14,8)
    incq %r14
    popq %rdx
    addq %rcx, %rbx
    addq (%r13), %rbx
    jmp 1b
7:  popq %rsi
    movq %rsi, 8(%r15,%r14,8)
    incq %r14
    jmp 9f
8:  movq %r12, 8(%r15)
    movq $1, %r14
9:  movq %r14, (%r15)
    movq %r15, %rax
    popq %r15
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

# ---- sdev_join(list, sep) -> str ----
    .globl sdev_join
sdev_join:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r15
    movq %rdi, %r12
    movq %rsi, %r13
    call sdev_empty
    movq %rax, %r15
    xorq %rbx, %rbx
1:  cmpq (%r12), %rbx
    jge 3f
    testq %rbx, %rbx
    jz 2f
    movq %r15, %rdi
    movq %r13, %rsi
    call sdev_concat
    movq %rax, %r15
2:  movq %r15, %rdi
    movq 8(%r12,%rbx,8), %rsi
    call sdev_concat
    movq %rax, %r15
    incq %rbx
    jmp 1b
3:  movq %r15, %rax
    popq %r15
    popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

# ---- sdev_tnew() -> tome (capacity 64 pairs) ----
    .globl sdev_tnew
sdev_tnew:
    pushq %rbp
    movq %rsp, %rbp
    movq $1040, %rdi
    call sdev_alloc
    movq $0, (%rax)
    movq $64, 8(%rax)
    popq %rbp
    ret

# ---- sdev_tfind(t, k) -> pair index or -1 ----
    .globl sdev_tfind
sdev_tfind:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    movq %rdi, %r12
    movq %rsi, %r13
    xorq %rbx, %rbx
1:  cmpq (%r12), %rbx
    jge 2f
    movq %rbx, %rax
    shlq $4, %rax
    movq 16(%r12,%rax,1), %rdi
    movq %r13, %rsi
    call sdev_str_eq
    testq %rax, %rax
    jnz 3f
    incq %rbx
    jmp 1b
2:  movq $-1, %rax
    jmp 4f
3:  movq %rbx, %rax
4:  popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

# ---- sdev_tset(t, k, v) -> t ----
    .globl sdev_tset
sdev_tset:
    pushq %rbp
    movq %rsp, %rbp
    pushq %r12
    pushq %r13
    pushq %r14
    movq %rdi, %r12
    movq %rsi, %r13
    movq %rdx, %r14
    call sdev_tfind
    testq %rax, %rax
    jns 1f
    movq (%r12), %rax
    cmpq 8(%r12), %rax
    jge 2f
    incq %rax
    movq %rax, (%r12)
    decq %rax
    shlq $4, %rax
    movq %r13, 16(%r12,%rax,1)
    movq %r14, 24(%r12,%rax,1)
    jmp 2f
1:  shlq $4, %rax
    movq %r14, 24(%r12,%rax,1)
2:  movq %r12, %rax
    popq %r14
    popq %r13
    popq %r12
    popq %rbp
    ret

# ---- sdev_tget(t, k) -> value (0 when absent) ----
    .globl sdev_tget
sdev_tget:
    pushq %rbp
    movq %rsp, %rbp
    pushq %r12
    movq %rdi, %r12
    call sdev_tfind
    testq %rax, %rax
    js 1f
    shlq $4, %rax
    movq 24(%r12,%rax,1), %rax
    jmp 2f
1:  xorq %rax, %rax
2:  popq %r12
    popq %rbp
    ret

# ---- sdev_thas(t, k) -> 0/1 ----
    .globl sdev_thas
sdev_thas:
    pushq %rbp
    movq %rsp, %rbp
    call sdev_tfind
    xorq %rcx, %rcx
    testq %rax, %rax
    setns %cl
    movq %rcx, %rax
    popq %rbp
    ret

# ---- sdev_tkeys(t) / sdev_tvals(t) -> list ----
    .globl sdev_tkeys
sdev_tkeys:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    movq %rdi, %r12
    movq (%r12), %r13
    leaq 8(,%r13,8), %rdi
    call sdev_alloc
    movq %r13, (%rax)
    xorq %rbx, %rbx
1:  cmpq %r13, %rbx
    jge 2f
    movq %rbx, %rcx
    shlq $4, %rcx
    movq 16(%r12,%rcx,1), %rdx
    movq %rdx, 8(%rax,%rbx,8)
    incq %rbx
    jmp 1b
2:  popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

    .globl sdev_tvals
sdev_tvals:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    movq %rdi, %r12
    movq (%r12), %r13
    leaq 8(,%r13,8), %rdi
    call sdev_alloc
    movq %r13, (%rax)
    xorq %rbx, %rbx
1:  cmpq %r13, %rbx
    jge 2f
    movq %rbx, %rcx
    shlq $4, %rcx
    movq 24(%r12,%rcx,1), %rdx
    movq %rdx, 8(%rax,%rbx,8)
    incq %rbx
    jmp 1b
2:  popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret


# ===========================================================================
# Milestone 6e — floats.
#
# A float value is simply the raw IEEE-754 bit pattern in a 64-bit word; the
# compiler knows statically which words are floats, so no runtime tag is
# needed. Every helper below takes and returns those bit patterns in general
# registers.
# ===========================================================================

    .section .rodata
    .align 8
.LFhalf:  .double 0.5
.LF1:     .double 1.0
.LF10:    .double 10.0
.LF1e6:   .double 1000000.0
.LF2p32:  .double 4294967296.0
    .text

# ---- sdev_str_float(bits) -> string, 1..6 fraction digits ----
    .globl sdev_str_float
sdev_str_float:
    pushq %rbp
    movq %rsp, %rbp
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    pushq %r15
    subq $32, %rsp
    movq %rdi, %xmm0
    xorq %r12, %r12
    xorpd %xmm1, %xmm1
    ucomisd %xmm0, %xmm1        # flags: 0 ? x
    jbe 1f
    movq $1, %r12
    subsd %xmm0, %xmm1
    movapd %xmm1, %xmm0
1:  cvttsd2si %xmm0, %rbx       # integer part
    cvtsi2sdq %rbx, %xmm2
    subsd %xmm2, %xmm0          # fraction
    mulsd .LF1e6(%rip), %xmm0
    addsd .LFhalf(%rip), %xmm0
    cvttsd2si %xmm0, %r13
    cmpq $1000000, %r13
    jl 3f
    xorq %r13, %r13
    incq %rbx
3:  movq %r13, %rax
    movq $5, %rcx
    movq $10, %r8
4:  xorq %rdx, %rdx
    divq %r8
    addb $'0', %dl
    movb %dl, (%rsp,%rcx,1)
    decq %rcx
    jns 4b
    movq $6, %r14
5:  cmpq $1, %r14
    jle 6f
    movq %r14, %rcx
    decq %rcx
    cmpb $'0', (%rsp,%rcx,1)
    jne 6f
    decq %r14
    jmp 5b
6:  leaq 9(%r14), %rdi
    call sdev_alloc
    movq %rax, %r15
    movq %r14, %rcx
    incq %rcx
    movq %rcx, (%r15)
    movb $'.', 8(%r15)
    leaq 9(%r15), %rdi
    movq %rsp, %rsi
    movq %r14, %rcx
7:  movb (%rsi), %dl
    movb %dl, (%rdi)
    incq %rsi
    incq %rdi
    decq %rcx
    jnz 7b
    movq %rbx, %rdi
    call sdev_str_int
    movq %rax, %rdi
    movq %r15, %rsi
    call sdev_concat
    movq %rax, %r15
    testq %r12, %r12
    jz 8f
    movq $45, %rdi
    call sdev_chr
    movq %rax, %rdi
    movq %r15, %rsi
    call sdev_concat
    movq %rax, %r15
8:  movq %r15, %rax
    addq $32, %rsp
    popq %r15
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    popq %rbp
    ret

# ---- sdev_say_float(bits) ----
    .globl sdev_say_float
sdev_say_float:
    pushq %rbp
    movq %rsp, %rbp
    call sdev_str_float
    movq %rax, %rdi
    call sdev_say_str
    popq %rbp
    ret

# ---- sdev_fsqrt / sdev_ffloor / sdev_fceil / sdev_fround ----
    .globl sdev_fsqrt
sdev_fsqrt:
    movq %rdi, %xmm0
    sqrtsd %xmm0, %xmm0
    movq %xmm0, %rax
    ret

    .globl sdev_ffloor
sdev_ffloor:
    movq %rdi, %xmm0
    cvttsd2si %xmm0, %rax       # truncation is toward zero
    cvtsi2sdq %rax, %xmm1
    ucomisd %xmm0, %xmm1        # trunc ? x
    jbe 1f
    decq %rax
1:  cvtsi2sdq %rax, %xmm0
    movq %xmm0, %rax
    ret

    .globl sdev_fceil
sdev_fceil:
    movq %rdi, %xmm0
    cvttsd2si %xmm0, %rax
    cvtsi2sdq %rax, %xmm1
    ucomisd %xmm1, %xmm0        # x ? trunc
    jbe 1f
    incq %rax
1:  cvtsi2sdq %rax, %xmm0
    movq %xmm0, %rax
    ret

    .globl sdev_fround
sdev_fround:
    movq %rdi, %xmm0
    addsd .LFhalf(%rip), %xmm0
    movq %xmm0, %rdi
    jmp sdev_ffloor

# ---- sdev_fsin / sdev_fcos / sdev_flog / sdev_fexp / sdev_fpow ----
    .globl sdev_fsin
sdev_fsin:
    pushq %rdi
    fldl (%rsp)
    fsin
    fstpl (%rsp)
    popq %rax
    ret

    .globl sdev_fcos
sdev_fcos:
    pushq %rdi
    fldl (%rsp)
    fcos
    fstpl (%rsp)
    popq %rax
    ret

    .globl sdev_flog
sdev_flog:
    pushq %rdi
    fldln2
    fldl (%rsp)
    fyl2x                       # ln2 * log2(x) = ln x
    fstpl (%rsp)
    popq %rax
    ret

    .globl sdev_fexp
sdev_fexp:
    pushq %rdi
    fldl (%rsp)
    fldl2e
    fmulp %st, %st(1)           # y = x * log2(e)
    fld %st(0)
    frndint                     # i
    fxch %st(1)
    fsub %st(1), %st            # f = y - i, |f| <= 0.5
    f2xm1
    fld1
    faddp %st, %st(1)           # 2^f
    fscale                      # 2^f * 2^i
    fstp %st(1)
    fstpl (%rsp)
    popq %rax
    ret

    .globl sdev_fpow
sdev_fpow:
    pushq %rsi                  # exponent
    pushq %rdi                  # base
    fldl 8(%rsp)
    fldl (%rsp)
    fyl2x                       # y * log2(x)
    fld %st(0)
    frndint
    fxch %st(1)
    fsub %st(1), %st
    f2xm1
    fld1
    faddp %st, %st(1)
    fscale
    fstp %st(1)
    fstpl (%rsp)
    popq %rax
    addq $8, %rsp
    ret

# ---- sdev_random() -> float in [0, 1) — xorshift32, matching the seed VM ----
    .globl sdev_random
sdev_random:
    movl sdev_rng(%rip), %eax
    testl %eax, %eax
    jnz 1f
    movl $2463534242, %eax
1:  movl %eax, %ecx
    shll $13, %ecx
    xorl %ecx, %eax
    movl %eax, %ecx
    shrl $17, %ecx
    xorl %ecx, %eax
    movl %eax, %ecx
    shll $5, %ecx
    xorl %ecx, %eax
    movl %eax, sdev_rng(%rip)
    movl %eax, %ecx
    cvtsi2sdq %rcx, %xmm0
    divsd .LF2p32(%rip), %xmm0
    movq %xmm0, %rax
    ret

# ---- sdev_num(str) -> float bits ----
    .globl sdev_num
sdev_num:
    movq (%rdi), %rcx
    leaq 8(%rdi), %rsi
    xorq %r8, %r8
    xorq %r9, %r9
    pxor %xmm0, %xmm0
    testq %rcx, %rcx
    jz 7f
    movzbq (%rsi), %rax
    cmpq $45, %rax
    jne 1f
    movq $1, %r9
    incq %r8
1:  cmpq %rcx, %r8
    jge 3f
    movzbq (%rsi,%r8,1), %rax
    cmpq $48, %rax
    jb 3f
    cmpq $57, %rax
    ja 3f
    subq $48, %rax
    mulsd .LF10(%rip), %xmm0
    cvtsi2sdq %rax, %xmm1
    addsd %xmm1, %xmm0
    incq %r8
    jmp 1b
3:  cmpq %rcx, %r8
    jge 6f
    movzbq (%rsi,%r8,1), %rax
    cmpq $46, %rax
    jne 6f
    incq %r8
    movsd .LF1(%rip), %xmm4
4:  cmpq %rcx, %r8
    jge 6f
    movzbq (%rsi,%r8,1), %rax
    cmpq $48, %rax
    jb 6f
    cmpq $57, %rax
    ja 6f
    subq $48, %rax
    divsd .LF10(%rip), %xmm4
    cvtsi2sdq %rax, %xmm1
    mulsd %xmm4, %xmm1
    addsd %xmm1, %xmm0
    incq %r8
    jmp 4b
6:  testq %r9, %r9
    jz 7f
    pxor %xmm1, %xmm1
    subsd %xmm0, %xmm1
    movapd %xmm1, %xmm0
7:  movq %xmm0, %rax
    ret

# ---- Milestone 6f: error handling ------------------------------------------
# A handler stack of (handler label, saved %rsp, saved %rbp) triples, pushed
# by `attempt` and popped on normal exit. `throw` unwinds to the innermost
# entry by restoring the saved stack registers and jumping to the handler
# with the message pointer in %rax.

# ---- sdev_try_push(handler, rsp, rbp) ----
    .globl sdev_try_push
sdev_try_push:
    movq sdev_hdepth(%rip), %rax
    cmpq $64, %rax
    jge 1f
    leaq sdev_hstack(%rip), %rcx
    imulq $24, %rax, %r8
    addq %r8, %rcx
    movq %rdi, (%rcx)
    movq %rsi, 8(%rcx)
    movq %rdx, 16(%rcx)
    incq %rax
    movq %rax, sdev_hdepth(%rip)
1:  ret

# ---- sdev_try_pop() ----
    .globl sdev_try_pop
sdev_try_pop:
    movq sdev_hdepth(%rip), %rax
    testq %rax, %rax
    jle 1f
    decq %rax
    movq %rax, sdev_hdepth(%rip)
1:  ret

# ---- sdev_throw(msg) ----
    .globl sdev_throw
sdev_throw:
    movq sdev_hdepth(%rip), %rax
    testq %rax, %rax
    jle 2f
    decq %rax
    movq %rax, sdev_hdepth(%rip)
    leaq sdev_hstack(%rip), %rcx
    imulq $24, %rax, %r8
    addq %r8, %rcx
    movq %rdi, %rax             # message lands in %rax for the handler
    movq 8(%rcx), %rsp
    movq 16(%rcx), %rbp
    jmpq *(%rcx)
2:  # uncaught: print "uncaught: <msg>" and exit(1)
    movq %rdi, %rsi
    leaq .Luncaught(%rip), %rdi
    call sdev_concat
    movq %rax, %rdi
    call sdev_say_str
    movq $60, %rax
    movq $1, %rdi
    syscall

# ===========================================================================
# Milestone 6g — host file I/O on the native track.
#
#   sdev_cstr(str)              -> null-terminated copy of a heap string
#   sdev_read_file(path)        -> heap string with the file's bytes ("" on error)
#   sdev_write_file(path, data) -> 1 on success, 0 on error
#   sdev_file_exists(path)      -> 1/0 (access(F_OK))
#   sdev_input()                -> one line from stdin, newline stripped
#
# All paths go through sdev_cstr because Linux syscalls want NUL-terminated
# strings while SDEV strings are length-prefixed.
# ===========================================================================

# ---- sdev_cstr(ptr) -> ptr (NUL-terminated bytes, no length header) ----
    .globl sdev_cstr
sdev_cstr:
    pushq %rbx
    movq %rdi, %rbx
    movq (%rbx), %rdi
    incq %rdi
    call sdev_alloc
    movq (%rbx), %rcx
    xorq %rdx, %rdx
.Lcstr_loop:
    cmpq %rcx, %rdx
    jge .Lcstr_done
    movzbq 8(%rbx,%rdx,1), %r8
    movb %r8b, (%rax,%rdx,1)
    incq %rdx
    jmp .Lcstr_loop
.Lcstr_done:
    movb $0, (%rax,%rdx,1)
    popq %rbx
    ret

# ---- sdev_read_file(path) -> str ----
    .globl sdev_read_file
sdev_read_file:
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    call sdev_cstr
    movq %rax, %rbx
    movq $2, %rax                   # sys_open
    movq %rbx, %rdi
    xorq %rsi, %rsi                 # O_RDONLY
    xorq %rdx, %rdx
    syscall
    testq %rax, %rax
    js .Lrf_fail
    movq %rax, %r12                 # fd
    movq $8, %rax                   # sys_lseek(fd, 0, SEEK_END)
    movq %r12, %rdi
    xorq %rsi, %rsi
    movq $2, %rdx
    syscall
    testq %rax, %rax
    js .Lrf_close_fail
    movq %rax, %r13                 # size
    movq $8, %rax                   # rewind
    movq %r12, %rdi
    xorq %rsi, %rsi
    xorq %rdx, %rdx
    syscall
    leaq 8(%r13), %rdi
    call sdev_alloc
    movq %rax, %rbx
    movq %r13, (%rbx)
    xorq %r14, %r14
.Lrf_loop:
    cmpq %r13, %r14
    jge .Lrf_done
    movq $0, %rax                   # sys_read
    movq %r12, %rdi
    leaq 8(%rbx,%r14,1), %rsi
    movq %r13, %rdx
    subq %r14, %rdx
    syscall
    testq %rax, %rax
    jle .Lrf_done
    addq %rax, %r14
    jmp .Lrf_loop
.Lrf_done:
    movq %r14, (%rbx)
    movq $3, %rax                   # sys_close
    movq %r12, %rdi
    syscall
    movq %rbx, %rax
    jmp .Lrf_ret
.Lrf_close_fail:
    movq $3, %rax
    movq %r12, %rdi
    syscall
.Lrf_fail:
    call sdev_empty
.Lrf_ret:
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    ret

# ---- sdev_write_file(path, data) -> 1/0 ----
    .globl sdev_write_file
sdev_write_file:
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    movq %rsi, %r13                 # data
    call sdev_cstr                  # %rdi = path
    movq %rax, %rbx
    movq $2, %rax                   # sys_open
    movq %rbx, %rdi
    movq $577, %rsi                 # O_WRONLY|O_CREAT|O_TRUNC
    movq $420, %rdx                 # 0644
    syscall
    testq %rax, %rax
    js .Lwf_fail
    movq %rax, %r12                 # fd
    xorq %r14, %r14
.Lwf_loop:
    cmpq (%r13), %r14
    jge .Lwf_done
    movq $1, %rax                   # sys_write
    movq %r12, %rdi
    leaq 8(%r13,%r14,1), %rsi
    movq (%r13), %rdx
    subq %r14, %rdx
    syscall
    testq %rax, %rax
    jle .Lwf_done
    addq %rax, %r14
    jmp .Lwf_loop
.Lwf_done:
    movq $3, %rax                   # sys_close
    movq %r12, %rdi
    syscall
    movq $1, %rax
    jmp .Lwf_ret
.Lwf_fail:
    xorq %rax, %rax
.Lwf_ret:
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    ret

# ---- sdev_file_exists(path) -> 1/0 ----
    .globl sdev_file_exists
sdev_file_exists:
    pushq %rbx
    call sdev_cstr
    movq %rax, %rdi
    movq $21, %rax                  # sys_access
    xorq %rsi, %rsi                 # F_OK
    syscall
    xorq %rcx, %rcx
    testq %rax, %rax
    sete %cl
    movq %rcx, %rax
    popq %rbx
    ret

# ---- sdev_input() -> str (one line from stdin, newline stripped) ----
    .globl sdev_input
sdev_input:
    pushq %rbx
    pushq %r12
    movq $4096, %rdi
    call sdev_alloc
    movq %rax, %rbx
    xorq %r12, %r12
.Lin_loop:
    cmpq $4088, %r12
    jge .Lin_done
    movq $0, %rax                   # sys_read(stdin, buf+8+n, 1)
    xorq %rdi, %rdi
    leaq 8(%rbx,%r12,1), %rsi
    movq $1, %rdx
    syscall
    cmpq $1, %rax
    jne .Lin_done
    movzbq 8(%rbx,%r12,1), %rcx
    cmpq $10, %rcx
    je .Lin_done
    incq %r12
    jmp .Lin_loop
.Lin_done:
    movq %r12, (%rbx)
    movq %rbx, %rax
    popq %r12
    popq %rbx
    ret


# ================= Milestone 6h: process / OS layer =================

# ---- sdev_from_cstr(char *) -> str ----
    .globl sdev_from_cstr
sdev_from_cstr:
    pushq %rbx
    pushq %r12
    movq %rdi, %rbx
    xorq %r12, %r12
.Lfc_len:
    cmpb $0, (%rbx,%r12,1)
    je .Lfc_have
    incq %r12
    jmp .Lfc_len
.Lfc_have:
    leaq 8(%r12), %rdi
    call sdev_alloc
    movq %r12, (%rax)
    xorq %rcx, %rcx
.Lfc_copy:
    cmpq %r12, %rcx
    jge .Lfc_done
    movzbq (%rbx,%rcx,1), %rdx
    movb %dl, 8(%rax,%rcx,1)
    incq %rcx
    jmp .Lfc_copy
.Lfc_done:
    popq %r12
    popq %rbx
    ret

# ---- sdev_args() -> list of strings (argv[1..]) ----
    .globl sdev_args
sdev_args:
    pushq %rbx
    pushq %r12
    pushq %r13
    movq sdev_argc(%rip), %r13
    decq %r13
    testq %r13, %r13
    jns .Largs_ok
    xorq %r13, %r13
.Largs_ok:
    movq %r13, %rdi
    shlq $3, %rdi
    addq $8, %rdi
    call sdev_alloc
    movq %rax, %rbx
    movq %r13, (%rbx)
    xorq %r12, %r12
.Largs_loop:
    cmpq %r13, %r12
    jge .Largs_done
    movq sdev_argv(%rip), %rcx
    movq 8(%rcx,%r12,8), %rdi       # argv[i+1]
    call sdev_from_cstr
    movq %rax, 8(%rbx,%r12,8)
    incq %r12
    jmp .Largs_loop
.Largs_done:
    movq %rbx, %rax
    popq %r13
    popq %r12
    popq %rbx
    ret

# ---- sdev_env(str name) -> str value ("" when unset) ----
    .globl sdev_env
sdev_env:
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    call sdev_cstr
    movq %rax, %rbx                 # name as C string
    movq sdev_envp(%rip), %r12
.Lenv_next:
    movq (%r12), %r13               # entry
    testq %r13, %r13
    jz .Lenv_miss
    xorq %r14, %r14
.Lenv_cmp:
    movzbq (%rbx,%r14,1), %rax
    testq %rax, %rax
    jz .Lenv_name_end
    movzbq (%r13,%r14,1), %rcx
    cmpq %rcx, %rax
    jne .Lenv_advance
    incq %r14
    jmp .Lenv_cmp
.Lenv_name_end:
    cmpb $61, (%r13,%r14,1)         # '='
    jne .Lenv_advance
    leaq 1(%r13,%r14,1), %rdi
    call sdev_from_cstr
    jmp .Lenv_ret
.Lenv_advance:
    addq $8, %r12
    jmp .Lenv_next
.Lenv_miss:
    call sdev_empty
.Lenv_ret:
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    ret

# ---- sdev_exit(i64 code) — never returns ----
    .globl sdev_exit
sdev_exit:
    movq $60, %rax
    syscall
    hlt

# ---- sdev_now_ms() -> i64 milliseconds since the epoch ----
    .globl sdev_now_ms
sdev_now_ms:
    pushq %rbp
    movq %rsp, %rbp
    subq $32, %rsp
    movq $228, %rax                 # sys_clock_gettime
    xorq %rdi, %rdi                 # CLOCK_REALTIME
    leaq -16(%rbp), %rsi
    syscall
    movq -16(%rbp), %rax            # seconds
    movq $1000, %rcx
    imulq %rcx, %rax
    movq -8(%rbp), %rdx             # nanoseconds
    pushq %rax
    movq %rdx, %rax
    xorq %rdx, %rdx
    movq $1000000, %rcx
    divq %rcx
    movq %rax, %rcx
    popq %rax
    addq %rcx, %rax
    movq %rbp, %rsp
    popq %rbp
    ret

# ---- sdev_sleep_ms(i64 ms) ----
    .globl sdev_sleep_ms
sdev_sleep_ms:
    pushq %rbp
    movq %rsp, %rbp
    subq $32, %rsp
    movq %rdi, %rax
    testq %rax, %rax
    jle .Lsleep_done
    xorq %rdx, %rdx
    movq $1000, %rcx
    divq %rcx                       # rax = seconds, rdx = remainder ms
    movq %rax, -16(%rbp)
    movq $1000000, %rcx
    imulq %rcx, %rdx
    movq %rdx, -8(%rbp)
    movq $35, %rax                  # sys_nanosleep
    leaq -16(%rbp), %rdi
    xorq %rsi, %rsi
    syscall
.Lsleep_done:
    movq %rbp, %rsp
    popq %rbp
    ret

# ---- sdev_append_file(path, data) -> 1/0 ----
    .globl sdev_append_file
sdev_append_file:
    pushq %rbx
    pushq %r12
    pushq %r13
    pushq %r14
    movq %rsi, %r13
    call sdev_cstr
    movq %rax, %rbx
    movq $2, %rax                   # sys_open
    movq %rbx, %rdi
    movq $1089, %rsi                # O_WRONLY|O_CREAT|O_APPEND
    movq $420, %rdx
    syscall
    testq %rax, %rax
    js .Laf_fail
    movq %rax, %r12
    xorq %r14, %r14
.Laf_loop:
    cmpq (%r13), %r14
    jge .Laf_done
    movq $1, %rax
    movq %r12, %rdi
    leaq 8(%r13,%r14,1), %rsi
    movq (%r13), %rdx
    subq %r14, %rdx
    syscall
    testq %rax, %rax
    jle .Laf_done
    addq %rax, %r14
    jmp .Laf_loop
.Laf_done:
    movq $3, %rax
    movq %r12, %rdi
    syscall
    movq $1, %rax
    jmp .Laf_ret
.Laf_fail:
    xorq %rax, %rax
.Laf_ret:
    popq %r14
    popq %r13
    popq %r12
    popq %rbx
    ret

# ---- sdev_say_err(str) — write to stderr with newline ----
    .globl sdev_say_err
sdev_say_err:
    movq (%rdi), %rdx
    leaq 8(%rdi), %rsi
    movq $1, %rax
    movq $2, %rdi
    syscall
    movq $1, %rax
    movq $2, %rdi
    leaq nl(%rip), %rsi
    movq $1, %rdx
    syscall
    ret


    .bss
    .align 8
sdev_heap_ptr:
    .quad 0
sdev_argc:
    .quad 0
sdev_argv:
    .quad 0
sdev_envp:
    .quad 0
sdev_hdepth:
    .quad 0
sdev_hstack:
    .space 1536
sdev_rng:
    .long 0

    .section .rodata
nl: .byte 10
.Luncaught:
    .quad 10
    .ascii "uncaught: "
    .byte 0

