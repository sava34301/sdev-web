# SDEV native runtime — hand-written x86-64 assembly (Linux SysV).
#
# Provides:
#   _start          — ELF entry, calls sdev_main, then exits(0).
#   sdev_say_int    — prints an int64 in %rdi as decimal + newline.
#   sdev_say_str    — prints a length-prefixed UTF-8 string.
#                     %rdi points at [i64 length][bytes...].
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

    .section .rodata
nl: .byte 10
