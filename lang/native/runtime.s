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

    .bss
    .align 8
sdev_heap_ptr:
    .quad 0

    .section .rodata
nl: .byte 10
