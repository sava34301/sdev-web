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

    .bss
    .align 8
sdev_heap_ptr:
    .quad 0

    .section .rodata
nl: .byte 10
