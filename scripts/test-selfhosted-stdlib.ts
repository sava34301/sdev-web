import { execute } from '../src/lang';
import { resolveLinks, type LinkableFile } from '../src/lang/tools/linker';
import { readFileSync } from 'node:fs';

console.log('Testing Self-Hosted VM, Kernel, and v2 Stdlib...');

const files: LinkableFile[] = [
  { name: 'seed_vm.sdev', content: readFileSync('lang/bootstrap/seed_vm.sdev', 'utf8') },
  { name: 'vm.sdev', content: readFileSync('lang/runtime/vm.sdev', 'utf8') },
  { name: 'kernel.sdev', content: readFileSync('lang/runtime/kernel.sdev', 'utf8') },
  { name: 'text.sdev', content: readFileSync('lang/stdlib/v2/text.sdev', 'utf8') },
  { name: 'list.sdev', content: readFileSync('lang/stdlib/v2/list.sdev', 'utf8') },
  { name: 'tome.sdev', content: readFileSync('lang/stdlib/v2/tome.sdev', 'utf8') },
  { name: 'math.sdev', content: readFileSync('lang/stdlib/v2/math.sdev', 'utf8') },
  { name: 'bits.sdev', content: readFileSync('lang/stdlib/v2/bits.sdev', 'utf8') },
  { name: 'time.sdev', content: readFileSync('lang/stdlib/v2/time.sdev', 'utf8') },
  { name: 'func.sdev', content: readFileSync('lang/stdlib/v2/func.sdev', 'utf8') },
  { name: 'json.sdev', content: readFileSync('lang/stdlib/v2/json.sdev', 'utf8') },
  { name: 'types.sdev', content: readFileSync('lang/stdlib/v2/types.sdev', 'utf8') },
  { name: 'random.sdev', content: readFileSync('lang/stdlib/v2/random.sdev', 'utf8') },
];

const program = `
link "seed_vm.sdev"
link "vm.sdev"
link "kernel.sdev"
link "text.sdev"
link "list.sdev"
link "tome.sdev"
link "math.sdev"
link "bits.sdev"
link "time.sdev"
link "func.sdev"
link "json.sdev"
link "types.sdev"
link "random.sdev"

# 1. Test Seed VM & VM step/run
set bc to mklist(7)
set bc[0] to 1
set bc[1] to 42
set bc[2] to 0
set bc[3] to 0
set bc[4] to 0
set bc[5] to 80
set bc[6] to 255
set vm to vm_create(bc, mklist(0))
set out to vm_run(vm, 10)
say "VM_OUT=" + out[0]

# 2. Test Kernel & VFS & Syscalls
set k to kernel_boot()
say "K_HOST=" + kernel_syscall(k, 1, "/etc/hostname", "")
set _ to kernel_syscall(k, 2, "/tmp/hello.txt", "sdev-kernel-lives")
say "K_FILE=" + kernel_syscall(k, 1, "/tmp/hello.txt", "")
say "K_UNAME=" + kernel_syscall(k, 8, "", "")

# 3. Test Text stdlib
say "TXT_PAD=" + text_pad_left("42", 5, "0")
say "TXT_REV=" + text_reverse("stressed")

# 4. Test List stdlib
set xs to [1, 2, 3, 4]
say "L_SUM=" + str(list_sum_all(xs))

# 5. Test Math stdlib
say "M_GCD=" + str(math_gcd(48, 18))
say "M_FIB=" + str(math_fib(8))

# 6. Test Bits stdlib
say "B_HEX=" + bits_to_hex(255)
say "B_DEC=" + str(bits_from_hex("ff"))

# 7. Test Time stdlib
say "T_LEAP=" + str(time_is_leap_year(2024))
say "T_DUR=" + time_format_duration_ms(3661000)

# 8. Test Random stdlib
set rng to rng_make(42)
say "R_INT=" + str(rng_int_range(rng, 10, 20))
`;

const linked = resolveLinks(program, files, { entryName: '<test-stdlib>' });
const res = execute(linked);

if (!res.success) {
  console.error('Execution failed:', res.error);
  process.exit(1);
}

for (const line of res.output) {
  console.log(' ', line);
}

const checks = [
  ['VM_OUT=42', 'VM executed bytecode output 42'],
  ['K_HOST=sdev-vm', 'Kernel VFS hostname read'],
  ['K_FILE=sdev-kernel-lives', 'Kernel VFS write and read syscall'],
  ['K_UNAME=SDEV OS 2.0-selfhosted', 'Kernel uname syscall'],
  ['TXT_PAD=00042', 'Text pad left'],
  ['TXT_REV=desserts', 'Text reverse'],
  ['L_SUM=10', 'List sum all'],
  ['M_GCD=6', 'Math GCD(48, 18)'],
  ['M_FIB=21', 'Math Fib(8)'],
  ['B_HEX=ff', 'Bits to hex'],
  ['B_DEC=255', 'Bits from hex'],
  ['T_LEAP=1', 'Time leap year 2024'],
  ['T_DUR=01:01:01', 'Time format duration'],
];

let failed = 0;
for (const [expected, label] of checks) {
  if (res.output.includes(expected)) {
    console.log(`✓ ${label}`);
  } else {
    console.error(`✗ ${label} (expected '${expected}')`);
    failed++;
  }
}

if (failed > 0) {
  console.error(`FAILED: ${failed} checks failed`);
  process.exit(1);
}

console.log(`\nALL ${checks.length} CHECKS PASSED.`);
