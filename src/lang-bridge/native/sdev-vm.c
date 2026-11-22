// ============================================================================
// sdev-vm — Standalone Zero-Host Native SDEV Virtual Machine & Compiler Host
// ("Path A: Our own Node for SDEV")
//
// Zero Node.js, zero V8, zero WebAssembly runtime.
// Embeds the SDEV v2 Seed VM in native x86-64 machine code alongside the
// baked self-hosted SDEV compiler (lang/compiler/driver.sdev), so `.sdev`
// source files and `.sdevc` bytecode containers execute directly on the OS.
// ============================================================================

#define _GNU_SOURCE
#include <ctype.h>
#include <dirent.h>
#include <math.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/wait.h>
#include <unistd.h>

#include "driver-embedded.h"

#define MEM_INIT_CAPACITY (64U * 1024U * 1024U)
#define MEM_MAX_CAPACITY  (1024U * 1024U * 1024U)
#define VAR_BASE     0x10000U
#define HANDLER_BASE 0x13000U
#define STACK_BASE   0x14000U
#define CALL_BASE    0x18000U
#define CODE_BASE    0x1C000U
#define HEAP_BASE    0x30000U

#define TOME_MAGIC   0x7FED10E5
#define CLOS_MAGIC   0x7FC105E5

typedef struct {
  uint8_t *mem;
  uint32_t mem_cap;
  uint32_t fp;
  uint32_t csp;
  uint32_t hp;
  uint32_t hsp;
  uint32_t prog_len;
  uint32_t rng;
  int exit_code;

  // For compiler mode (capturing driver output stream):
  int is_compiler_mode;
  const char *stdin_src;
  size_t stdin_len;
  int32_t *dumped;
  size_t dumped_len;
  size_t dumped_cap;
  char *compiler_err;

  // For normal execution mode:
  int prog_argc;
  char **prog_argv;
} Vm;

static inline int32_t load_i32(const uint8_t *mem, uint32_t addr) {
  int32_t v;
  memcpy(&v, mem + addr, 4);
  return v;
}

static inline uint32_t load_u32(const uint8_t *mem, uint32_t addr) {
  uint32_t v;
  memcpy(&v, mem + addr, 4);
  return v;
}

static inline uint16_t load_u16(const uint8_t *mem, uint32_t addr) {
  uint16_t v;
  memcpy(&v, mem + addr, 2);
  return v;
}

static inline int16_t load_i16(const uint8_t *mem, uint32_t addr) {
  int16_t v;
  memcpy(&v, mem + addr, 2);
  return v;
}

static inline double load_f64(const uint8_t *mem, uint32_t addr) {
  double v;
  memcpy(&v, mem + addr, 8);
  return v;
}

static inline void store_i32(uint8_t *mem, uint32_t addr, int32_t v) {
  memcpy(mem + addr, &v, 4);
}

static inline void store_f64(uint8_t *mem, uint32_t addr, double v) {
  memcpy(mem + addr, &v, 8);
}

static uint32_t vm_alloc(Vm *vm, uint32_t n) {
  uint32_t ret = vm->hp;
  uint32_t aligned = (n + 3U) & ~3U;
  while (ret + aligned > vm->mem_cap) {
    if (vm->mem_cap >= MEM_MAX_CAPACITY) {
      fprintf(stderr, "sdev-vm: out of VM heap memory (1 GiB)\n");
      exit(1);
    }
    uint32_t new_cap = vm->mem_cap * 2U;
    uint8_t *nm = (uint8_t *)realloc(vm->mem, new_cap);
    if (!nm) {
      fprintf(stderr, "sdev-vm: realloc failed\n");
      exit(1);
    }
    memset(nm + vm->mem_cap, 0, new_cap - vm->mem_cap);
    vm->mem = nm;
    vm->mem_cap = new_cap;
  }
  vm->hp = ret + aligned;
  return ret;
}

static uint32_t vm_alloc_str(Vm *vm, const char *bytes, uint32_t n) {
  uint32_t p = vm_alloc(vm, n + 4U);
  store_i32(vm->mem, p, (int32_t)n);
  if (n > 0 && bytes) memcpy(vm->mem + p + 4U, bytes, n);
  return p;
}

static uint32_t vm_box_f(Vm *vm, double x) {
  uint32_t p = vm_alloc(vm, 8U);
  store_f64(vm->mem, p, x);
  return p;
}

static int vm_streq(Vm *vm, uint32_t a, uint32_t b) {
  if (a == b) return 1;
  uint32_t na = load_u32(vm->mem, a);
  uint32_t nb = load_u32(vm->mem, b);
  if (na != nb) return 0;
  return memcmp(vm->mem + a + 4U, vm->mem + b + 4U, na) == 0 ? 1 : 0;
}

static int vm_is_tome(Vm *vm, uint32_t p) {
  if (p >= vm->mem_cap - 16U) return 0;
  return load_i32(vm->mem, p) == TOME_MAGIC;
}

static int vm_is_closure(Vm *vm, uint32_t p) {
  if (p < HEAP_BASE || p >= vm->hp) return 0;
  return load_i32(vm->mem, p) == CLOS_MAGIC;
}

static uint32_t vm_tnew(Vm *vm, int32_t cap) {
  if (cap < 4) cap = 4;
  uint32_t t = vm_alloc(vm, 16U);
  store_i32(vm->mem, t, TOME_MAGIC);
  store_i32(vm->mem, t + 4U, 0);
  store_i32(vm->mem, t + 8U, cap);
  store_i32(vm->mem, t + 12U, (int32_t)vm_alloc(vm, (uint32_t)cap * 8U));
  return t;
}

static int32_t vm_tfind(Vm *vm, uint32_t t, uint32_t k) {
  int32_t n = load_i32(vm->mem, t + 4U);
  uint32_t e = load_u32(vm->mem, t + 12U);
  for (int32_t i = 0; i < n; i++) {
    uint32_t ki = load_u32(vm->mem, e + (uint32_t)i * 8U);
    if (vm_streq(vm, ki, k)) return i;
  }
  return -1;
}

static void vm_tset(Vm *vm, uint32_t t, uint32_t k, int32_t v) {
  int32_t idx = vm_tfind(vm, t, k);
  if (idx >= 0) {
    uint32_t e = load_u32(vm->mem, t + 12U);
    store_i32(vm->mem, e + (uint32_t)idx * 8U + 4U, v);
    return;
  }
  int32_t n = load_i32(vm->mem, t + 4U);
  int32_t cap = load_i32(vm->mem, t + 8U);
  if (n >= cap) {
    uint32_t e = load_u32(vm->mem, t + 12U);
    uint32_t ne = vm_alloc(vm, (uint32_t)cap * 16U);
    memcpy(vm->mem + ne, vm->mem + e, (size_t)cap * 8U);
    store_i32(vm->mem, t + 8U, cap * 2);
    store_i32(vm->mem, t + 12U, (int32_t)ne);
  }
  uint32_t e = load_u32(vm->mem, t + 12U);
  store_i32(vm->mem, e + (uint32_t)n * 8U, (int32_t)k);
  store_i32(vm->mem, e + (uint32_t)n * 8U + 4U, v);
  store_i32(vm->mem, t + 4U, n + 1);
}

static uint32_t vm_tcollect(Vm *vm, uint32_t t, uint32_t off) {
  int32_t n = load_i32(vm->mem, t + 4U);
  uint32_t e = load_u32(vm->mem, t + 12U);
  uint32_t out = vm_alloc(vm, 4U + (uint32_t)n * 4U);
  store_i32(vm->mem, out, n);
  for (int32_t i = 0; i < n; i++) {
    store_i32(vm->mem, out + 4U + (uint32_t)i * 4U, load_i32(vm->mem, e + (uint32_t)i * 8U + off));
  }
  return out;
}

static uint32_t vm_substr(Vm *vm, uint32_t s, int32_t start, int32_t len) {
  int32_t n = load_i32(vm->mem, s);
  if (start < 0) start = 0;
  if (start > n) start = n;
  if (len < 0) len = 0;
  if (start + len > n) len = n - start;
  uint32_t dst = vm_alloc(vm, (uint32_t)len + 4U);
  store_i32(vm->mem, dst, len);
  if (len > 0) memcpy(vm->mem + dst + 4U, vm->mem + s + 4U + start, (size_t)len);
  return dst;
}

static int32_t vm_find(Vm *vm, uint32_t hay, uint32_t needle) {
  int32_t hn = load_i32(vm->mem, hay);
  int32_t nn = load_i32(vm->mem, needle);
  if (nn == 0) return 0;
  for (int32_t i = 0; i + nn <= hn; i++) {
    if (memcmp(vm->mem + hay + 4U + i, vm->mem + needle + 4U, (size_t)nn) == 0) return i;
  }
  return -1;
}

static uint32_t vm_case_fold(Vm *vm, uint32_t s, int up) {
  int32_t n = load_i32(vm->mem, s);
  uint32_t dst = vm_alloc(vm, (uint32_t)n + 4U);
  store_i32(vm->mem, dst, n);
  for (int32_t i = 0; i < n; i++) {
    uint8_t c = vm->mem[s + 4U + i];
    if (up && c >= 'a' && c <= 'z') c -= 32;
    else if (!up && c >= 'A' && c <= 'Z') c += 32;
    vm->mem[dst + 4U + i] = c;
  }
  return dst;
}

static int is_space_byte(uint8_t c) {
  return c == 32 || c == 9 || c == 10 || c == 13;
}

static uint32_t vm_trim(Vm *vm, uint32_t s) {
  int32_t n = load_i32(vm->mem, s);
  int32_t a = 0, b = n;
  while (a < b && is_space_byte(vm->mem[s + 4U + a])) a++;
  while (a < b && is_space_byte(vm->mem[s + 3U + b])) b--;
  return vm_substr(vm, s, a, b - a);
}

static uint32_t vm_split(Vm *vm, uint32_t s, uint32_t sep) {
  int32_t n = load_i32(vm->mem, s);
  int32_t sn = load_i32(vm->mem, sep);
  if (sn == 0) {
    uint32_t out = vm_alloc(vm, 4U + (uint32_t)n * 4U);
    store_i32(vm->mem, out, n);
    for (int32_t i = 0; i < n; i++) {
      store_i32(vm->mem, out + 4U + (uint32_t)i * 4U, (int32_t)vm_substr(vm, s, i, 1));
    }
    return out;
  }
  int32_t count = 1;
  for (int32_t i = 0; i + sn <= n;) {
    if (memcmp(vm->mem + s + 4U + i, vm->mem + sep + 4U, (size_t)sn) == 0) {
      count++;
      i += sn;
    } else {
      i++;
    }
  }
  uint32_t out = vm_alloc(vm, 4U + (uint32_t)count * 4U);
  store_i32(vm->mem, out, count);
  int32_t hit = 0, start = 0, i = 0;
  while (1) {
    if (i + sn > n) {
      store_i32(vm->mem, out + 4U + (uint32_t)hit * 4U, (int32_t)vm_substr(vm, s, start, n - start));
      break;
    }
    if (memcmp(vm->mem + s + 4U + i, vm->mem + sep + 4U, (size_t)sn) == 0) {
      store_i32(vm->mem, out + 4U + (uint32_t)hit * 4U, (int32_t)vm_substr(vm, s, start, i - start));
      hit++;
      i += sn;
      start = i;
    } else {
      i++;
    }
  }
  return out;
}

static uint32_t vm_join(Vm *vm, uint32_t list, uint32_t sep) {
  int32_t n = load_i32(vm->mem, list);
  int32_t sep_len = load_i32(vm->mem, sep);
  int32_t total = 0;
  for (int32_t i = 0; i < n; i++) {
    uint32_t item = load_u32(vm->mem, list + 4U + (uint32_t)i * 4U);
    total += load_i32(vm->mem, item);
  }
  if (n > 0) total += (n - 1) * sep_len;
  uint32_t dst = vm_alloc(vm, (uint32_t)total + 4U);
  store_i32(vm->mem, dst, total);
  uint32_t p = dst + 4U;
  for (int32_t i = 0; i < n; i++) {
    if (i > 0 && sep_len > 0) {
      memcpy(vm->mem + p, vm->mem + sep + 4U, (size_t)sep_len);
      p += (uint32_t)sep_len;
    }
    uint32_t item = load_u32(vm->mem, list + 4U + (uint32_t)i * 4U);
    int32_t ilen = load_i32(vm->mem, item);
    if (ilen > 0) {
      memcpy(vm->mem + p, vm->mem + item + 4U, (size_t)ilen);
      p += (uint32_t)ilen;
    }
  }
  return dst;
}

static uint32_t vm_replace(Vm *vm, uint32_t s, uint32_t old_s, uint32_t new_s) {
  if (load_i32(vm->mem, old_s) == 0) return s;
  return vm_join(vm, vm_split(vm, s, old_s), new_s);
}

static int32_t vm_s2i(Vm *vm, uint32_t s) {
  int32_t n = load_i32(vm->mem, s);
  int32_t i = 0, sign = 1, acc = 0;
  while (i < n && is_space_byte(vm->mem[s + 4U + i])) i++;
  if (i < n && vm->mem[s + 4U + i] == '-') {
    sign = -1;
    i++;
  }
  while (i < n) {
    uint8_t c = vm->mem[s + 4U + i];
    if (c < '0' || c > '9') break;
    acc = acc * 10 + (c - '0');
    i++;
  }
  return acc * sign;
}

static double vm_s2f(Vm *vm, uint32_t s) {
  int32_t n = load_i32(vm->mem, s);
  int32_t i = 0;
  double sign = 1.0, acc = 0.0;
  while (i < n && is_space_byte(vm->mem[s + 4U + i])) i++;
  if (i < n) {
    uint8_t c = vm->mem[s + 4U + i];
    if (c == '-') { sign = -1.0; i++; }
    else if (c == '+') { i++; }
  }
  while (i < n) {
    uint8_t c = vm->mem[s + 4U + i];
    if (c < '0' || c > '9') break;
    acc = acc * 10.0 + (double)(c - '0');
    i++;
  }
  if (i < n && vm->mem[s + 4U + i] == '.') {
    i++;
    double scale = 0.1;
    while (i < n) {
      uint8_t c = vm->mem[s + 4U + i];
      if (c < '0' || c > '9') break;
      acc += scale * (double)(c - '0');
      scale *= 0.1;
      i++;
    }
  }
  return sign * acc;
}

static int32_t vm_rand_next(Vm *vm) {
  uint32_t x = vm->rng;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  vm->rng = x;
  return (int32_t)(x & 0x7fffffffU);
}

// Forward declaration for recursive compile calls (`sdev:compile:self:...`)
static int compile_with_driver(
  const uint8_t *drv_bc, uint32_t drv_bc_len,
  const uint8_t *drv_pool, uint32_t drv_pool_len,
  const char *src_text, size_t src_len,
  uint8_t **out_bc, uint32_t *out_bc_len,
  uint8_t **out_pool, uint32_t *out_pool_len,
  char **out_err
);

static char *read_disk_file(const char *path, size_t *out_len);

// Cached stage2 / v1 drivers (lazily compiled on demand)
static uint8_t *g_stage2_bc = NULL, *g_stage2_pool = NULL;
static uint32_t g_stage2_bc_len = 0, g_stage2_pool_len = 0;

static uint8_t *g_v1_bc = NULL, *g_v1_pool = NULL;
static uint32_t g_v1_bc_len = 0, g_v1_pool_len = 0;

static uint8_t *g_v1self_bc = NULL, *g_v1self_pool = NULL;
static uint32_t g_v1self_bc_len = 0, g_v1self_pool_len = 0;

static uint8_t *g_v1self2_bc = NULL, *g_v1self2_pool = NULL;
static uint32_t g_v1self2_bc_len = 0, g_v1self2_pool_len = 0;

static int ensure_stage2_driver(char **err) {
  if (g_stage2_bc) return 1;
  size_t slen = 0;
  char *src = read_disk_file("lang/compiler/driver.sdev", &slen);
  if (!src) { if (err) *err = strdup("cannot read lang/compiler/driver.sdev"); return 0; }
  int ok = compile_with_driver(
    BAKED_DRIVER_BC, BAKED_DRIVER_BC_LEN,
    BAKED_DRIVER_POOL, BAKED_DRIVER_POOL_LEN,
    src, slen, &g_stage2_bc, &g_stage2_bc_len, &g_stage2_pool, &g_stage2_pool_len, err
  );
  free(src);
  return ok;
}

static int ensure_v1_driver(char **err) {
  if (g_v1_bc) return 1;
  size_t slen = 0;
  char *src = read_disk_file("lang/compiler/v1_driver.sdev", &slen);
  if (!src) { if (err) *err = strdup("cannot read lang/compiler/v1_driver.sdev"); return 0; }
  int ok = compile_with_driver(
    BAKED_DRIVER_BC, BAKED_DRIVER_BC_LEN,
    BAKED_DRIVER_POOL, BAKED_DRIVER_POOL_LEN,
    src, slen, &g_v1_bc, &g_v1_bc_len, &g_v1_pool, &g_v1_pool_len, err
  );
  free(src);
  return ok;
}

static int ensure_v1_self_driver(char **err) {
  if (g_v1self_bc) return 1;
  if (!ensure_v1_driver(err)) return 0;
  size_t slen = 0;
  char *src = read_disk_file("lang/compiler/v1_self.sdev", &slen);
  if (!src) { if (err) *err = strdup("cannot read lang/compiler/v1_self.sdev"); return 0; }
  int ok = compile_with_driver(
    g_v1_bc, g_v1_bc_len,
    g_v1_pool, g_v1_pool_len,
    src, slen, &g_v1self_bc, &g_v1self_bc_len, &g_v1self_pool, &g_v1self_pool_len, err
  );
  free(src);
  return ok;
}

static int ensure_v1_self_stage2_driver(char **err) {
  if (g_v1self2_bc) return 1;
  if (!ensure_v1_self_driver(err)) return 0;
  size_t slen = 0;
  char *src = read_disk_file("lang/compiler/v1_self.sdev", &slen);
  if (!src) { if (err) *err = strdup("cannot read lang/compiler/v1_self.sdev"); return 0; }
  int ok = compile_with_driver(
    g_v1self_bc, g_v1self_bc_len,
    g_v1self_pool, g_v1self_pool_len,
    src, slen, &g_v1self2_bc, &g_v1self2_bc_len, &g_v1self2_pool, &g_v1self2_pool_len, err
  );
  free(src);
  return ok;
}

static char *read_disk_file(const char *path, size_t *out_len) {
  FILE *f = fopen(path, "rb");
  if (!f) {
    if (out_len) *out_len = 0;
    return NULL;
  }
  fseek(f, 0, SEEK_END);
  long sz = ftell(f);
  if (sz < 0) sz = 0;
  fseek(f, 0, SEEK_SET);
  char *buf = (char *)malloc((size_t)sz + 1);
  size_t got = sz > 0 ? fread(buf, 1, (size_t)sz, f) : 0;
  buf[got] = '\0';
  fclose(f);
  if (out_len) *out_len = got;
  return buf;
}

static char *bytes_to_hex(const uint8_t *b, uint32_t len) {
  static const char *H = "0123456789abcdef";
  char *out = (char *)malloc((size_t)len * 2 + 1);
  for (uint32_t i = 0; i < len; i++) {
    out[i * 2]     = H[(b[i] >> 4) & 0xf];
    out[i * 2 + 1] = H[b[i] & 0xf];
  }
  out[len * 2] = '\0';
  return out;
}

static uint32_t host_read_file(Vm *vm, const char *path_raw, uint32_t path_len) {
  char *path = (char *)malloc((size_t)path_len + 1);
  memcpy(path, path_raw, path_len);
  path[path_len] = '\0';

  if (vm->is_compiler_mode && strcmp(path, "<stdin>") == 0) {
    free(path);
    return vm_alloc_str(vm, vm->stdin_src, (uint32_t)vm->stdin_len);
  }

  if (strcmp(path, "sdev:args") == 0) {
    free(path);
    size_t total = 0;
    for (int i = 0; i < vm->prog_argc; i++) {
      total += strlen(vm->prog_argv[i]) + (i > 0 ? 1 : 0);
    }
    char *joined = (char *)malloc(total + 1);
    joined[0] = '\0';
    for (int i = 0; i < vm->prog_argc; i++) {
      if (i > 0) strcat(joined, "\n");
      strcat(joined, vm->prog_argv[i]);
    }
    uint32_t res = vm_alloc_str(vm, joined, (uint32_t)total);
    free(joined);
    return res;
  }

  if (strcmp(path, "sdev:driver:baked") == 0 || strcmp(path, "sdev:driver:fresh") == 0) {
    free(path);
    char *bh = bytes_to_hex(BAKED_DRIVER_BC, BAKED_DRIVER_BC_LEN);
    char *ph = bytes_to_hex(BAKED_DRIVER_POOL, BAKED_DRIVER_POOL_LEN);
    size_t len = strlen(bh) + 1 + strlen(ph);
    char *comb = (char *)malloc(len + 1);
    snprintf(comb, len + 1, "%s %s", bh, ph);
    uint32_t res = vm_alloc_str(vm, comb, (uint32_t)len);
    free(bh);
    free(ph);
    free(comb);
    return res;
  }

  if (strcmp(path, "sdev:driver:v1") == 0 ||
      strcmp(path, "sdev:driver:v1-self") == 0 ||
      strcmp(path, "sdev:driver:v1-self-stage2") == 0) {
    char *err = NULL;
    int ok = 0;
    const uint8_t *dbc = NULL, *dpool = NULL;
    uint32_t dbcl = 0, dpl = 0;
    if (strcmp(path, "sdev:driver:v1") == 0) {
      ok = ensure_v1_driver(&err);
      dbc = g_v1_bc; dbcl = g_v1_bc_len; dpool = g_v1_pool; dpl = g_v1_pool_len;
    } else if (strcmp(path, "sdev:driver:v1-self") == 0) {
      ok = ensure_v1_self_driver(&err);
      dbc = g_v1self_bc; dbcl = g_v1self_bc_len; dpool = g_v1self_pool; dpl = g_v1self_pool_len;
    } else {
      ok = ensure_v1_self_stage2_driver(&err);
      dbc = g_v1self2_bc; dbcl = g_v1self2_bc_len; dpool = g_v1self2_pool; dpl = g_v1self2_pool_len;
    }
    free(path);
    if (!ok) {
      char buf[512];
      snprintf(buf, sizeof(buf), "error %s", err ? err : "v1 driver build failed");
      free(err);
      return vm_alloc_str(vm, buf, (uint32_t)strlen(buf));
    }
    char *bh = bytes_to_hex(dbc, dbcl);
    char *ph = bytes_to_hex(dpool, dpl);
    size_t len = strlen(bh) + 1 + strlen(ph);
    char *comb = (char *)malloc(len + 1);
    snprintf(comb, len + 1, "%s %s", bh, ph);
    uint32_t res = vm_alloc_str(vm, comb, (uint32_t)len);
    free(bh);
    free(ph);
    free(comb);
    return res;
  }

  if (strncmp(path, "sdev:compile:", 13) == 0) {
    const char *rest = path + 13;
    const char *colon = strchr(rest, ':');
    if (colon) {
      size_t mode_len = (size_t)(colon - rest);
      char mode[32];
      if (mode_len >= sizeof(mode)) mode_len = sizeof(mode) - 1;
      memcpy(mode, rest, mode_len);
      mode[mode_len] = '\0';
      const char *target_path = colon + 1;
      size_t slen = 0;
      char *src = read_disk_file(target_path, &slen);
      if (!src) {
        free(path);
        const char *err = "error file not found";
        return vm_alloc_str(vm, err, (uint32_t)strlen(err));
      }
      const uint8_t *dbc = BAKED_DRIVER_BC;
      uint32_t dbcl = BAKED_DRIVER_BC_LEN;
      const uint8_t *dpool = BAKED_DRIVER_POOL;
      uint32_t dpl = BAKED_DRIVER_POOL_LEN;
      char *err = NULL;
      int drv_ok = 1;
      if (strcmp(mode, "stage2") == 0) {
        drv_ok = ensure_stage2_driver(&err);
        dbc = g_stage2_bc; dbcl = g_stage2_bc_len; dpool = g_stage2_pool; dpl = g_stage2_pool_len;
      } else if (strcmp(mode, "v1") == 0) {
        drv_ok = ensure_v1_driver(&err);
        dbc = g_v1_bc; dbcl = g_v1_bc_len; dpool = g_v1_pool; dpl = g_v1_pool_len;
      } else if (strcmp(mode, "v1-self") == 0) {
        drv_ok = ensure_v1_self_driver(&err);
        dbc = g_v1self_bc; dbcl = g_v1self_bc_len; dpool = g_v1self_pool; dpl = g_v1self_pool_len;
      } else if (strcmp(mode, "v1-self-stage2") == 0) {
        drv_ok = ensure_v1_self_stage2_driver(&err);
        dbc = g_v1self2_bc; dbcl = g_v1self2_bc_len; dpool = g_v1self2_pool; dpl = g_v1self2_pool_len;
      }
      uint8_t *bc = NULL, *pool = NULL;
      uint32_t bc_len = 0, pool_len = 0;
      int ok = drv_ok ? compile_with_driver(
        dbc, dbcl, dpool, dpl,
        src, slen, &bc, &bc_len, &pool, &pool_len, &err
      ) : 0;
      free(src);
      free(path);
      if (!ok) {
        char buf[512];
        snprintf(buf, sizeof(buf), "error %s", err ? err : "compile failed");
        free(err);
        return vm_alloc_str(vm, buf, (uint32_t)strlen(buf));
      }
      char *bh = bytes_to_hex(bc, bc_len);
      char *ph = bytes_to_hex(pool, pool_len);
      size_t len = strlen(bh) + 1 + strlen(ph);
      char *comb = (char *)malloc(len + 1);
      snprintf(comb, len + 1, "%s %s", bh, ph);
      uint32_t res = vm_alloc_str(vm, comb, (uint32_t)len);
      free(bh);
      free(ph);
      free(comb);
      free(bc);
      free(pool);
      return res;
    }
  }

  if (strncmp(path, "sdev:ls:", 8) == 0) {
    const char *dir_path = path + 8;
    DIR *d = opendir(dir_path);
    if (!d) {
      free(path);
      return vm_alloc_str(vm, "", 0);
    }
    size_t cap = 4096, len = 0;
    char *buf = (char *)malloc(cap);
    buf[0] = '\0';
    struct dirent *de;
    while ((de = readdir(d)) != NULL) {
      if (strcmp(de->d_name, ".") == 0 || strcmp(de->d_name, "..") == 0) continue;
      size_t nl = strlen(de->d_name);
      if (len + nl + 2 > cap) {
        cap *= 2;
        buf = (char *)realloc(buf, cap);
      }
      if (len > 0) buf[len++] = '\n';
      memcpy(buf + len, de->d_name, nl);
      len += nl;
      buf[len] = '\0';
    }
    closedir(d);
    free(path);
    uint32_t res = vm_alloc_str(vm, buf, (uint32_t)len);
    free(buf);
    return res;
  }

  if (strncmp(path, "sdev:exec:", 10) == 0) {
    const char *cmd = path + 10;
    size_t cmd_len = strlen(cmd);
    char *full_cmd = (char *)malloc(cmd_len + 16);
    snprintf(full_cmd, cmd_len + 16, "(%s) 2>&1", cmd);
    FILE *p = popen(full_cmd, "r");
    free(full_cmd);
    free(path);
    if (!p) {
      const char *fail = "1\n";
      return vm_alloc_str(vm, fail, 2);
    }
    size_t cap = 65536, len = 0;
    char *out = (char *)malloc(cap);
    size_t n;
    while ((n = fread(out + len, 1, cap - len - 1, p)) > 0) {
      len += n;
      if (cap - len < 4096) {
        cap *= 2;
        out = (char *)realloc(out, cap);
      }
    }
    out[len] = '\0';
    int st = pclose(p);
    int code = WIFEXITED(st) ? WEXITSTATUS(st) : 1;
    char prefix[32];
    int plen = snprintf(prefix, sizeof(prefix), "%d\n", code);
    char *final_buf = (char *)malloc((size_t)plen + len + 1);
    memcpy(final_buf, prefix, (size_t)plen);
    memcpy(final_buf + plen, out, len);
    uint32_t res = vm_alloc_str(vm, final_buf, (uint32_t)((size_t)plen + len));
    free(out);
    free(final_buf);
    return res;
  }

  if (strncmp(path, "sdev:", 5) == 0) {
    free(path);
    return vm_alloc_str(vm, "", 0);
  }

  size_t flen = 0;
  char *data = read_disk_file(path, &flen);
  free(path);
  if (!data) return vm_alloc_str(vm, "", 0);
  uint32_t res = vm_alloc_str(vm, data, (uint32_t)flen);
  free(data);
  return res;
}

static int32_t host_write_file(Vm *vm, const char *p_raw, uint32_t p_len, const char *d_raw, uint32_t d_len) {
  if (vm->is_compiler_mode) return -1;
  char *path = (char *)malloc((size_t)p_len + 1);
  memcpy(path, p_raw, p_len);
  path[p_len] = '\0';

  if (strncmp(path, "sdev:exit:", 10) == 0) {
    vm->exit_code = atoi(path + 10);
    free(path);
    return 0;
  }
  if (strcmp(path, "sdev:err") == 0) {
    fwrite(d_raw, 1, d_len, stderr);
    free(path);
    return 0;
  }
  if (strncmp(path, "sdev:append:", 12) == 0) {
    FILE *f = fopen(path + 12, "ab");
    free(path);
    if (!f) return -1;
    fwrite(d_raw, 1, d_len, f);
    fclose(f);
    return 0;
  }
  if (strncmp(path, "sdev:write_hex:", 15) == 0) {
    FILE *f = fopen(path + 15, "wb");
    free(path);
    if (!f) return -1;
    uint32_t nbytes = d_len / 2;
    uint8_t *raw = (uint8_t *)malloc(nbytes + 1);
    for (uint32_t i = 0; i < nbytes; i++) {
      uint8_t hi = (uint8_t)d_raw[i * 2];
      uint8_t lo = (uint8_t)d_raw[i * 2 + 1];
      uint8_t hv = (hi >= 'a') ? (hi - 'a' + 10) : (hi >= 'A') ? (hi - 'A' + 10) : (hi - '0');
      uint8_t lv = (lo >= 'a') ? (lo - 'a' + 10) : (lo >= 'A') ? (lo - 'A' + 10) : (lo - '0');
      raw[i] = (uint8_t)((hv << 4) | (lv & 0xf));
    }
    fwrite(raw, 1, nbytes, f);
    free(raw);
    fclose(f);
    return 0;
  }
  FILE *f = fopen(path, "wb");
  free(path);
  if (!f) return -1;
  fwrite(d_raw, 1, d_len, f);
  fclose(f);
  return 0;
}

static void host_say_i32(Vm *vm, int32_t n) {
  if (vm->is_compiler_mode) {
    if (vm->dumped_len >= vm->dumped_cap) {
      vm->dumped_cap = vm->dumped_cap ? vm->dumped_cap * 2 : 65536;
      vm->dumped = (int32_t *)realloc(vm->dumped, vm->dumped_cap * sizeof(int32_t));
    }
    vm->dumped[vm->dumped_len++] = n;
    return;
  }
  printf("%d\n", n);
}

static void host_say_str(Vm *vm, uint32_t ptr, uint32_t len) {
  if (vm->is_compiler_mode) {
    char *msg = (char *)malloc((size_t)len + 1);
    memcpy(msg, vm->mem + ptr, len);
    msg[len] = '\0';
    if (vm->compiler_err) free(vm->compiler_err);
    vm->compiler_err = msg;
    return;
  }
  fwrite(vm->mem + ptr, 1, len, stdout);
  fputc('\n', stdout);
}

static void host_say_f64(Vm *vm, double x) {
  if (vm->is_compiler_mode) return;
  printf("%.15g\n", x);
}

static double host_fmath(int op, double a, double b) {
  switch (op) {
    case 0: return sin(a);
    case 1: return cos(a);
    case 2: return tan(a);
    case 3: return exp(a);
    case 4: return log(a);
    case 5: return pow(a, b);
    case 6: return ceil(a);
    case 7: return floor(a);
    case 8: return nearbyint(a);
    case 9: return sqrt(a);
    default: return 0.0;
  }
}

static void vm_run(Vm *vm) {
  uint32_t ip = 0;
  uint32_t sp = STACK_BASE;
  vm->hsp = HANDLER_BASE;

  while (ip < vm->prog_len) {
    uint8_t op = vm->mem[CODE_BASE + ip++];
    if (op == 0xFF) break;

    switch (op) {
      case 0x01: { // PUSH_I32
        int32_t v = load_i32(vm->mem, CODE_BASE + ip);
        ip += 4;
        store_i32(vm->mem, sp, v);
        sp += 4;
        break;
      }
      case 0x02: { // PUSH_STR
        uint16_t off = load_u16(vm->mem, CODE_BASE + ip);
        ip += 2;
        store_i32(vm->mem, sp, (int32_t)off);
        sp += 4;
        break;
      }
      case 0x03: { // LOAD
        uint8_t slot = vm->mem[CODE_BASE + ip++];
        store_i32(vm->mem, sp, load_i32(vm->mem, VAR_BASE + (uint32_t)slot * 4U));
        sp += 4;
        break;
      }
      case 0x04: { // STORE
        uint8_t slot = vm->mem[CODE_BASE + ip++];
        sp -= 4;
        store_i32(vm->mem, VAR_BASE + (uint32_t)slot * 4U, load_i32(vm->mem, sp));
        break;
      }
      case 0x05: { // POP
        sp -= 4;
        break;
      }
      case 0x10: case 0x11: case 0x12: case 0x13: case 0x14: {
        sp -= 4; int32_t b = load_i32(vm->mem, sp);
        sp -= 4; int32_t a = load_i32(vm->mem, sp);
        int32_t r = 0;
        if (op == 0x10) r = a + b;
        else if (op == 0x11) r = a - b;
        else if (op == 0x12) r = a * b;
        else if (op == 0x13) r = b != 0 ? a / b : 0;
        else if (op == 0x14) r = b != 0 ? a % b : 0;
        store_i32(vm->mem, sp, r);
        sp += 4;
        break;
      }
      case 0x20: case 0x21: case 0x22: case 0x23: case 0x24: case 0x25: {
        sp -= 4; int32_t b = load_i32(vm->mem, sp);
        sp -= 4; int32_t a = load_i32(vm->mem, sp);
        int32_t r = 0;
        if (op == 0x20) r = (a == b);
        else if (op == 0x21) r = (a != b);
        else if (op == 0x22) r = (a < b);
        else if (op == 0x23) r = (a > b);
        else if (op == 0x24) r = (a <= b);
        else if (op == 0x25) r = (a >= b);
        store_i32(vm->mem, sp, r);
        sp += 4;
        break;
      }
      case 0x30: { // NOT
        sp -= 4;
        store_i32(vm->mem, sp, load_i32(vm->mem, sp) == 0 ? 1 : 0);
        sp += 4;
        break;
      }
      case 0x40: { // JMP
        int16_t off = load_i16(vm->mem, CODE_BASE + ip);
        ip = (uint32_t)((int32_t)ip + 2 + off);
        break;
      }
      case 0x41: { // JZ
        sp -= 4;
        int32_t a = load_i32(vm->mem, sp);
        int16_t off = load_i16(vm->mem, CODE_BASE + ip);
        ip += 2;
        if (a == 0) ip = (uint32_t)((int32_t)ip + off);
        break;
      }
      case 0x50: { // SAY_I32
        sp -= 4;
        host_say_i32(vm, load_i32(vm->mem, sp));
        break;
      }
      case 0x51: { // SAY_STR
        sp -= 4;
        uint32_t addr = load_u32(vm->mem, sp);
        host_say_str(vm, addr + 4U, load_u32(vm->mem, addr));
        break;
      }
      case 0x60: { // CALL
        uint16_t target = load_u16(vm->mem, CODE_BASE + ip);
        uint8_t n_args = vm->mem[CODE_BASE + ip + 2U];
        ip += 3;
        store_i32(vm->mem, vm->csp, (int32_t)ip);
        store_i32(vm->mem, vm->csp + 4U, (int32_t)vm->fp);
        vm->fp = vm->csp;
        vm->csp += 8U;
        uint32_t addr = sp - (uint32_t)n_args * 4U;
        for (uint8_t i = 0; i < n_args; i++) {
          store_i32(vm->mem, vm->csp, load_i32(vm->mem, addr));
          vm->csp += 4U;
          addr += 4U;
        }
        sp -= (uint32_t)n_args * 4U;
        ip = target;
        break;
      }
      case 0x61: { // RET
        sp -= 4;
        int32_t retval = load_i32(vm->mem, sp);
        ip = load_u32(vm->mem, vm->fp);
        uint32_t saved_fp = load_u32(vm->mem, vm->fp + 4U);
        vm->csp = vm->fp;
        vm->fp = saved_fp;
        store_i32(vm->mem, sp, retval);
        sp += 4;
        break;
      }
      case 0x62: { // ENTER
        uint8_t n_locals = vm->mem[CODE_BASE + ip++];
        memset(vm->mem + vm->csp, 0, (size_t)n_locals * 4U);
        vm->csp += (uint32_t)n_locals * 4U;
        break;
      }
      case 0x63: { // LOAD_LOC
        uint8_t slot = vm->mem[CODE_BASE + ip++];
        store_i32(vm->mem, sp, load_i32(vm->mem, vm->fp + 8U + (uint32_t)slot * 4U));
        sp += 4;
        break;
      }
      case 0x64: { // STORE_LOC
        uint8_t slot = vm->mem[CODE_BASE + ip++];
        sp -= 4;
        store_i32(vm->mem, vm->fp + 8U + (uint32_t)slot * 4U, load_i32(vm->mem, sp));
        break;
      }
      case 0x70: { // ALLOC
        sp -= 4;
        uint32_t sz = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm_alloc(vm, sz));
        sp += 4;
        break;
      }
      case 0x80: { // NEWLIST
        uint16_t n = load_u16(vm->mem, CODE_BASE + ip);
        ip += 2;
        uint32_t addr = vm_alloc(vm, 4U + (uint32_t)n * 4U);
        store_i32(vm->mem, addr, n);
        uint32_t src = sp - (uint32_t)n * 4U;
        memcpy(vm->mem + addr + 4U, vm->mem + src, (size_t)n * 4U);
        sp = src;
        store_i32(vm->mem, sp, (int32_t)addr);
        sp += 4;
        break;
      }
      case 0x81: { // LGET
        sp -= 4; int32_t idx = load_i32(vm->mem, sp);
        sp -= 4; uint32_t arr = load_u32(vm->mem, sp);
        if (vm_is_tome(vm, arr)) {
          int32_t ti = vm_tfind(vm, arr, (uint32_t)idx);
          int32_t val = 0;
          if (ti >= 0) {
            uint32_t e = load_u32(vm->mem, arr + 12U);
            val = load_i32(vm->mem, e + (uint32_t)ti * 8U + 4U);
          }
          store_i32(vm->mem, sp, val);
        } else {
          store_i32(vm->mem, sp, load_i32(vm->mem, arr + 4U + (uint32_t)idx * 4U));
        }
        sp += 4;
        break;
      }
      case 0x82: { // LSET
        sp -= 4; int32_t val = load_i32(vm->mem, sp);
        sp -= 4; int32_t idx = load_i32(vm->mem, sp);
        sp -= 4; uint32_t arr = load_u32(vm->mem, sp);
        if (vm_is_tome(vm, arr)) {
          vm_tset(vm, arr, (uint32_t)idx, val);
        } else {
          store_i32(vm->mem, arr + 4U + (uint32_t)idx * 4U, val);
        }
        break;
      }
      case 0x83: { // LEN
        sp -= 4; uint32_t a = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, vm_is_tome(vm, a) ? load_i32(vm->mem, a + 4U) : load_i32(vm->mem, a));
        sp += 4;
        break;
      }
      case 0x84: { // SGET
        sp -= 4; int32_t idx = load_i32(vm->mem, sp);
        sp -= 4; uint32_t s = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm->mem[s + 4U + (uint32_t)idx]);
        sp += 4;
        break;
      }
      case 0x87: { // I2S
        sp -= 4; int32_t v = load_i32(vm->mem, sp);
        char buf[32];
        int len = snprintf(buf, sizeof(buf), "%d", v);
        store_i32(vm->mem, sp, (int32_t)vm_alloc_str(vm, buf, (uint32_t)len));
        sp += 4;
        break;
      }
      case 0x88: { // CHR
        sp -= 4; uint8_t c = (uint8_t)load_i32(vm->mem, sp);
        uint32_t dst = vm_alloc(vm, 5U);
        store_i32(vm->mem, dst, 1);
        vm->mem[dst + 4U] = c;
        store_i32(vm->mem, sp, (int32_t)dst);
        sp += 4;
        break;
      }
      case 0x89: { // LNEW
        sp -= 4; int32_t n = load_i32(vm->mem, sp);
        if (n < 0) n = 0;
        uint32_t dst = vm_alloc(vm, 4U + (uint32_t)n * 4U);
        store_i32(vm->mem, dst, n);
        memset(vm->mem + dst + 4U, 0, (size_t)n * 4U);
        store_i32(vm->mem, sp, (int32_t)dst);
        sp += 4;
        break;
      }
      case 0x8A: { // TNEW
        uint16_t cap = load_u16(vm->mem, CODE_BASE + ip);
        ip += 2;
        store_i32(vm->mem, sp, (int32_t)vm_tnew(vm, cap));
        sp += 4;
        break;
      }
      case 0x8B: { // TSET
        sp -= 4; int32_t val = load_i32(vm->mem, sp);
        sp -= 4; uint32_t key = load_u32(vm->mem, sp);
        uint32_t t = load_u32(vm->mem, sp - 4U);
        vm_tset(vm, t, key, val);
        break;
      }
      case 0x8C: { // TGET
        sp -= 4; uint32_t key = load_u32(vm->mem, sp);
        sp -= 4; uint32_t t = load_u32(vm->mem, sp);
        int32_t ti = vm_tfind(vm, t, key);
        int32_t val = 0;
        if (ti >= 0) {
          uint32_t e = load_u32(vm->mem, t + 12U);
          val = load_i32(vm->mem, e + (uint32_t)ti * 8U + 4U);
        }
        store_i32(vm->mem, sp, val);
        sp += 4;
        break;
      }
      case 0x8D: { // THAS
        sp -= 4; uint32_t key = load_u32(vm->mem, sp);
        sp -= 4; uint32_t t = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, vm_tfind(vm, t, key) >= 0 ? 1 : 0);
        sp += 4;
        break;
      }
      case 0x8E: { // TKEYS
        sp -= 4; uint32_t t = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm_tcollect(vm, t, 0));
        sp += 4;
        break;
      }
      case 0x8F: { // TVALS
        sp -= 4; uint32_t t = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm_tcollect(vm, t, 4));
        sp += 4;
        break;
      }
      case 0x90: { // STREQ
        sp -= 4; uint32_t b = load_u32(vm->mem, sp);
        sp -= 4; uint32_t a = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, vm_streq(vm, a, b));
        sp += 4;
        break;
      }
      case 0x91: { // STRCAT
        sp -= 4; uint32_t b = load_u32(vm->mem, sp);
        sp -= 4; uint32_t a = load_u32(vm->mem, sp);
        uint32_t na = load_u32(vm->mem, a);
        uint32_t nb = load_u32(vm->mem, b);
        uint32_t dst = vm_alloc(vm, na + nb + 4U);
        store_i32(vm->mem, dst, (int32_t)(na + nb));
        if (na > 0) memcpy(vm->mem + dst + 4U, vm->mem + a + 4U, na);
        if (nb > 0) memcpy(vm->mem + dst + 4U + na, vm->mem + b + 4U, nb);
        store_i32(vm->mem, sp, (int32_t)dst);
        sp += 4;
        break;
      }
      case 0x92: { // UPPER
        sp -= 4; store_i32(vm->mem, sp, (int32_t)vm_case_fold(vm, load_u32(vm->mem, sp), 1)); sp += 4; break;
      }
      case 0x93: { // LOWER
        sp -= 4; store_i32(vm->mem, sp, (int32_t)vm_case_fold(vm, load_u32(vm->mem, sp), 0)); sp += 4; break;
      }
      case 0x94: { // TRIM
        sp -= 4; store_i32(vm->mem, sp, (int32_t)vm_trim(vm, load_u32(vm->mem, sp))); sp += 4; break;
      }
      case 0x95: { // SUBSTR
        sp -= 4; int32_t len = load_i32(vm->mem, sp);
        sp -= 4; int32_t st = load_i32(vm->mem, sp);
        sp -= 4; uint32_t s = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm_substr(vm, s, st, len));
        sp += 4;
        break;
      }
      case 0x96: { // FIND
        sp -= 4; uint32_t needle = load_u32(vm->mem, sp);
        sp -= 4; uint32_t hay = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, vm_find(vm, hay, needle));
        sp += 4;
        break;
      }
      case 0x97: { // SPLIT
        sp -= 4; uint32_t sep = load_u32(vm->mem, sp);
        sp -= 4; uint32_t s = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm_split(vm, s, sep));
        sp += 4;
        break;
      }
      case 0x98: { // JOIN
        sp -= 4; uint32_t sep = load_u32(vm->mem, sp);
        sp -= 4; uint32_t list = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm_join(vm, list, sep));
        sp += 4;
        break;
      }
      case 0x99: { // REPLACE
        sp -= 4; uint32_t new_s = load_u32(vm->mem, sp);
        sp -= 4; uint32_t old_s = load_u32(vm->mem, sp);
        sp -= 4; uint32_t s = load_u32(vm->mem, sp);
        store_i32(vm->mem, sp, (int32_t)vm_replace(vm, s, old_s, new_s));
        sp += 4;
        break;
      }
      case 0x9A: { // S2I
        sp -= 4; store_i32(vm->mem, sp, vm_s2i(vm, load_u32(vm->mem, sp))); sp += 4; break;
      }
      case 0x9B: { // IABS
        sp -= 4; int32_t a = load_i32(vm->mem, sp); store_i32(vm->mem, sp, a < 0 ? -a : a); sp += 4; break;
      }
      case 0x9C: { // IMIN
        sp -= 4; int32_t b = load_i32(vm->mem, sp);
        sp -= 4; int32_t a = load_i32(vm->mem, sp);
        store_i32(vm->mem, sp, a < b ? a : b); sp += 4; break;
      }
      case 0x9D: { // IMAX
        sp -= 4; int32_t b = load_i32(vm->mem, sp);
        sp -= 4; int32_t a = load_i32(vm->mem, sp);
        store_i32(vm->mem, sp, a > b ? a : b); sp += 4; break;
      }
      case 0x9E: { // RANGE
        sp -= 4; int32_t n = load_i32(vm->mem, sp);
        if (n < 0) n = 0;
        uint32_t out = vm_alloc(vm, 4U + (uint32_t)n * 4U);
        store_i32(vm->mem, out, n);
        for (int32_t i = 0; i < n; i++) store_i32(vm->mem, out + 4U + (uint32_t)i * 4U, i);
        store_i32(vm->mem, sp, (int32_t)out);
        sp += 4;
        break;
      }
      case 0x9F: { // SUM
        sp -= 4; uint32_t list = load_u32(vm->mem, sp);
        int32_t n = load_i32(vm->mem, list), acc = 0;
        for (int32_t i = 0; i < n; i++) acc += load_i32(vm->mem, list + 4U + (uint32_t)i * 4U);
        store_i32(vm->mem, sp, acc);
        sp += 4;
        break;
      }
      case 0xA0: { // PUSH_F64
        double f = load_f64(vm->mem, CODE_BASE + ip);
        ip += 8;
        store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, f));
        sp += 4;
        break;
      }
      case 0xA1: case 0xA2: case 0xA3: case 0xA4: {
        sp -= 4; double fb = load_f64(vm->mem, load_u32(vm->mem, sp));
        sp -= 4; double fa = load_f64(vm->mem, load_u32(vm->mem, sp));
        double r = (op == 0xA1) ? fa + fb : (op == 0xA2) ? fa - fb : (op == 0xA3) ? fa * fb : fa / fb;
        store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, r));
        sp += 4;
        break;
      }
      case 0xA5: case 0xA6: case 0xA7: {
        sp -= 4; double fb = load_f64(vm->mem, load_u32(vm->mem, sp));
        sp -= 4; double fa = load_f64(vm->mem, load_u32(vm->mem, sp));
        int32_t r = (op == 0xA5) ? (fa < fb) : (op == 0xA6) ? (fa > fb) : (fa == fb);
        store_i32(vm->mem, sp, r);
        sp += 4;
        break;
      }
      case 0xA8: { // I2F
        sp -= 4; store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, (double)load_i32(vm->mem, sp))); sp += 4; break;
      }
      case 0xA9: { // F2I
        sp -= 4; store_i32(vm->mem, sp, (int32_t)load_f64(vm->mem, load_u32(vm->mem, sp))); sp += 4; break;
      }
      case 0xAA: case 0xAB: case 0xAC: {
        sp -= 4; double fa = load_f64(vm->mem, load_u32(vm->mem, sp));
        double r = (op == 0xAA) ? -fa : (op == 0xAB) ? fabs(fa) : sqrt(fa);
        store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, r));
        sp += 4;
        break;
      }
      case 0xAD: { // SAY_F64
        sp -= 4; host_say_f64(vm, load_f64(vm->mem, load_u32(vm->mem, sp))); break;
      }
      case 0xAE: { // FMATH
        uint8_t mop = vm->mem[CODE_BASE + ip++];
        if (mop == 5) {
          sp -= 4; double fb = load_f64(vm->mem, load_u32(vm->mem, sp));
          sp -= 4; double fa = load_f64(vm->mem, load_u32(vm->mem, sp));
          store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, host_fmath(mop, fa, fb)));
          sp += 4;
        } else {
          sp -= 4; double fa = load_f64(vm->mem, load_u32(vm->mem, sp));
          store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, host_fmath(mop, fa, 0.0)));
          sp += 4;
        }
        break;
      }
      case 0xB0: { // READFILE
        sp -= 4; uint32_t a = load_u32(vm->mem, sp);
        uint32_t res = host_read_file(vm, (const char *)(vm->mem + a + 4U), load_u32(vm->mem, a));
        store_i32(vm->mem, sp, (int32_t)res);
        sp += 4;
        break;
      }
      case 0xB1: { // WRITEFILE
        sp -= 4; uint32_t b = load_u32(vm->mem, sp);
        sp -= 4; uint32_t a = load_u32(vm->mem, sp);
        int32_t st = host_write_file(
          vm,
          (const char *)(vm->mem + a + 4U), load_u32(vm->mem, a),
          (const char *)(vm->mem + b + 4U), load_u32(vm->mem, b)
        );
        store_i32(vm->mem, sp, st);
        sp += 4;
        break;
      }
      case 0xB2: { // HTTPGET
        sp -= 4;
        store_i32(vm->mem, sp, (int32_t)vm_alloc_str(vm, "", 0));
        sp += 4;
        break;
      }
      case 0xB4: { // FBYTE
        sp -= 4; int32_t idx = load_i32(vm->mem, sp);
        sp -= 4; uint32_t faddr = load_u32(vm->mem, sp);
        int32_t byte_val = (idx >= 0 && idx < 8) ? (int32_t)vm->mem[faddr + (uint32_t)idx] : 0;
        store_i32(vm->mem, sp, byte_val);
        sp += 4;
        break;
      }
      case 0xB5: case 0xB6: case 0xB7: {
        sp -= 4; double fa = load_f64(vm->mem, load_u32(vm->mem, sp));
        double r = (op == 0xB5) ? ceil(fa) : (op == 0xB6) ? floor(fa) : nearbyint(fa);
        store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, r));
        sp += 4;
        break;
      }
      case 0xB8: { // RANDINT
        sp -= 4; int32_t a = load_i32(vm->mem, sp);
        store_i32(vm->mem, sp, a <= 0 ? 0 : (vm_rand_next(vm) % a));
        sp += 4;
        break;
      }
      case 0xC0: { // TRY
        int16_t rel = load_i16(vm->mem, CODE_BASE + ip);
        ip += 2;
        store_i32(vm->mem, vm->hsp, (int32_t)ip + rel);
        store_i32(vm->mem, vm->hsp + 4U, (int32_t)sp);
        store_i32(vm->mem, vm->hsp + 8U, (int32_t)vm->fp);
        store_i32(vm->mem, vm->hsp + 12U, (int32_t)vm->csp);
        vm->hsp += 16U;
        break;
      }
      case 0xC1: { // ENDTRY
        if (vm->hsp > HANDLER_BASE) vm->hsp -= 16U;
        break;
      }
      case 0xC2: { // THROW
        sp -= 4; uint32_t addr = load_u32(vm->mem, sp);
        if (vm->hsp <= HANDLER_BASE) {
          host_say_str(vm, addr + 4U, load_u32(vm->mem, addr));
          return;
        }
        vm->hsp -= 16U;
        ip      = load_u32(vm->mem, vm->hsp);
        sp      = load_u32(vm->mem, vm->hsp + 4U);
        vm->fp  = load_u32(vm->mem, vm->hsp + 8U);
        vm->csp = load_u32(vm->mem, vm->hsp + 12U);
        store_i32(vm->mem, sp, (int32_t)addr);
        sp += 4;
        break;
      }
      case 0xC3: { // S2F
        sp -= 4; store_i32(vm->mem, sp, (int32_t)vm_box_f(vm, vm_s2f(vm, load_u32(vm->mem, sp)))); sp += 4; break;
      }
      case 0xC4: { // CALLV
        uint8_t n = vm->mem[CODE_BASE + ip++];
        sp -= 4; uint32_t target = load_u32(vm->mem, sp);
        store_i32(vm->mem, vm->csp, (int32_t)ip);
        store_i32(vm->mem, vm->csp + 4U, (int32_t)vm->fp);
        vm->fp = vm->csp;
        vm->csp += 8U;
        uint32_t addr = sp - (uint32_t)n * 4U;
        for (uint8_t i = 0; i < n; i++) {
          store_i32(vm->mem, vm->csp, load_i32(vm->mem, addr));
          vm->csp += 4U;
          addr += 4U;
        }
        sp -= (uint32_t)n * 4U;
        if (vm_is_closure(vm, target)) {
          int32_t ncaps = load_i32(vm->mem, target + 8U);
          uint32_t caddr = target + 12U;
          for (int32_t i = 0; i < ncaps; i++) {
            store_i32(vm->mem, vm->csp, load_i32(vm->mem, caddr));
            vm->csp += 4U;
            caddr += 4U;
          }
          target = load_u32(vm->mem, target + 4U);
        }
        ip = target;
        break;
      }
      case 0xC5: { // CLOSURE
        uint16_t target = load_u16(vm->mem, CODE_BASE + ip);
        uint8_t ncaps = vm->mem[CODE_BASE + ip + 2U];
        ip += 3;
        uint32_t obj = vm_alloc(vm, 12U + (uint32_t)ncaps * 4U);
        store_i32(vm->mem, obj, CLOS_MAGIC);
        store_i32(vm->mem, obj + 4U, target);
        store_i32(vm->mem, obj + 8U, ncaps);
        uint32_t addr = sp - (uint32_t)ncaps * 4U;
        sp = addr;
        memcpy(vm->mem + obj + 12U, vm->mem + addr, (size_t)ncaps * 4U);
        store_i32(vm->mem, sp, (int32_t)obj);
        sp += 4;
        break;
      }
      default:
        return;
    }
  }
}

static void vm_init(Vm *vm, const uint8_t *bc, uint32_t bc_len, const uint8_t *pool, uint32_t pool_len) {
  memset(vm, 0, sizeof(*vm));
  vm->mem_cap = MEM_INIT_CAPACITY;
  vm->mem = (uint8_t *)calloc(vm->mem_cap, 1);
  vm->fp = CALL_BASE;
  vm->csp = CALL_BASE;
  vm->hp = HEAP_BASE;
  vm->hsp = HANDLER_BASE;
  vm->rng = 0x2545F491U;
  vm->prog_len = bc_len;
  if (pool_len > 0) memcpy(vm->mem, pool, pool_len);
  if (bc_len > 0) memcpy(vm->mem + CODE_BASE, bc, bc_len);
}

static void vm_destroy(Vm *vm) {
  free(vm->mem);
  free(vm->dumped);
  free(vm->compiler_err);
}

static int compile_with_driver(
  const uint8_t *drv_bc, uint32_t drv_bc_len,
  const uint8_t *drv_pool, uint32_t drv_pool_len,
  const char *src_text, size_t src_len,
  uint8_t **out_bc, uint32_t *out_bc_len,
  uint8_t **out_pool, uint32_t *out_pool_len,
  char **out_err
) {
  Vm vm;
  vm_init(&vm, drv_bc, drv_bc_len, drv_pool, drv_pool_len);
  vm.is_compiler_mode = 1;
  vm.stdin_src = src_text;
  vm.stdin_len = src_len;
  vm_run(&vm);

  if (vm.compiler_err) {
    if (out_err) *out_err = strdup(vm.compiler_err);
    vm_destroy(&vm);
    return 0;
  }
  if (vm.dumped_len == 0) {
    if (out_err) *out_err = strdup("self-hosted compiler exited without emitting bytecode");
    vm_destroy(&vm);
    return 0;
  }

  size_t cur = 0;
  int32_t bcl = vm.dumped[cur++];
  if (bcl < 0 || bcl > 0x14000 || cur + (size_t)bcl > vm.dumped_len) {
    if (out_err) *out_err = strdup("bytecode buffer overflow");
    vm_destroy(&vm);
    return 0;
  }
  uint8_t *bc = (uint8_t *)malloc((size_t)bcl + 1);
  for (int32_t i = 0; i < bcl; i++) bc[i] = (uint8_t)(vm.dumped[cur++] & 0xff);

  int32_t pl = (cur < vm.dumped_len) ? vm.dumped[cur++] : 0;
  if (pl < 0 || pl > 0x10000 || cur + (size_t)pl > vm.dumped_len) {
    free(bc);
    if (out_err) *out_err = strdup("string pool overflow");
    vm_destroy(&vm);
    return 0;
  }
  uint8_t *pool = (uint8_t *)malloc((size_t)pl + 1);
  for (int32_t i = 0; i < pl; i++) pool[i] = (uint8_t)(vm.dumped[cur++] & 0xff);

  *out_bc = bc;
  *out_bc_len = (uint32_t)bcl;
  *out_pool = pool;
  *out_pool_len = (uint32_t)pl;
  vm_destroy(&vm);
  return 1;
}

static void print_usage(void) {
  printf(
    "sdev-vm — Zero-Host Native SDEV Virtual Machine & Self-Hosted Compiler\n\n"
    "USAGE\n"
    "  sdev-vm [--v1] <program.sdev> [args...]         Compile and run an SDEV v2/v1 program\n"
    "  sdev-vm run [--v1] <program.sdev> [args...]     Compile and run an SDEV v2/v1 program\n"
    "  sdev-vm compile [--v1] <program.sdev> [-o out]  Compile to an SDEVC4 bytecode container\n"
    "  sdev-vm run-bc <program.sdevc> [args...]        Execute an SDEVC4 bytecode container\n"
    "  sdev-vm native [--v1] <program.sdev> [-o out]   Compile to a standalone native ELF via pure SDEV\n"
    "  sdev-vm --version | --help\n"
  );
}

static int is_cli_subcommand(const char *cmd) {
  static const char *SUBS[] = {
    "doctor", "check", "disasm", "lint", "fmt", "translate",
    "v1", "pe", "web", "test", "bootstrap",
    "eval", "dialect", "api", "explain", "new", NULL
  };
  for (int i = 0; SUBS[i]; i++) {
    if (strcmp(cmd, SUBS[i]) == 0) return 1;
  }
  return 0;
}

static int check_v1_fixed_reassignment(const char *src, char *bad_name, size_t bad_cap) {
  char fixed_names[32][64];
  int n_fixed = 0;
  const char *p = src;
  while (*p) {
    while (*p == ' ' || *p == '\t') p++;
    const char *eol = strchr(p, '\n');
    size_t len = eol ? (size_t)(eol - p) : strlen(p);
    if (len > 0 && p[len - 1] == '\r') len--;
    if ((len > 6 && strncmp(p, "fixed ", 6) == 0) || (len > 6 && strncmp(p, "const ", 6) == 0)) {
      const char *ns = p + 6;
      while (*ns == ' ') ns++;
      const char *ne = ns;
      while (*ne && (isalnum((unsigned char)*ne) || *ne == '_')) ne++;
      size_t nlen = (size_t)(ne - ns);
      if (nlen > 0 && nlen < 63 && strncmp(ne, " be ", 4) == 0 && n_fixed < 32) {
        memcpy(fixed_names[n_fixed], ns, nlen);
        fixed_names[n_fixed][nlen] = '\0';
        n_fixed++;
      }
    } else {
      for (int i = 0; i < n_fixed; i++) {
        size_t flen = strlen(fixed_names[i]);
        if (len > flen + 4 && strncmp(p, fixed_names[i], flen) == 0 && strncmp(p + flen, " be ", 4) == 0) {
          snprintf(bad_name, bad_cap, "%.60s", fixed_names[i]);
          return 1;
        }
        if (len > flen + 7 && strncmp(p, "be ", 3) == 0 && strncmp(p + 3, fixed_names[i], flen) == 0 && strncmp(p + 3 + flen, " be ", 4) == 0) {
          snprintf(bad_name, bad_cap, "%.60s", fixed_names[i]);
          return 1;
        }
      }
    }
    if (!eol) break;
    p = eol + 1;
  }
  return 0;
}

static int has_v1_shebang(const char *src, size_t slen) {
  return slen >= 9 && strncmp(src, "#!sdev v1", 9) == 0 &&
         (slen == 9 || src[9] == '\n' || src[9] == '\r');
}

static int compile_source_mode(
  int v1_mode, const char *script_path, const char *src, size_t slen,
  uint8_t **bc, uint32_t *bc_len, uint8_t **pool, uint32_t *pool_len
) {
  char *err = NULL;
  const uint8_t *dbc = BAKED_DRIVER_BC;
  uint32_t dbcl = BAKED_DRIVER_BC_LEN;
  const uint8_t *dpool = BAKED_DRIVER_POOL;
  uint32_t dpl = BAKED_DRIVER_POOL_LEN;
  if (v1_mode) {
    char bad_fixed[64];
    if (check_v1_fixed_reassignment(src, bad_fixed, sizeof(bad_fixed))) {
      fprintf(stderr, "sdev: %s: Cannot reassign fixed constant '%s'\n", script_path, bad_fixed);
      return 0;
    }
    if (!ensure_v1_driver(&err)) {
      fprintf(stderr, "sdev: %s: %s\n", script_path, err ? err : "v1 driver error");
      free(err);
      return 0;
    }
    dbc = g_v1_bc; dbcl = g_v1_bc_len; dpool = g_v1_pool; dpl = g_v1_pool_len;
  }
  if (!compile_with_driver(dbc, dbcl, dpool, dpl, src, slen, bc, bc_len, pool, pool_len, &err)) {
    fprintf(stderr, "sdev: %s: %s\n", script_path, err ? err : "compile error");
    free(err);
    return 0;
  }
  return 1;
}

int main(int argc, char **argv) {
  // Delegate high-level pure-SDEV CLI subcommands to cli/sdev.sdev if available
  if (argc >= 2 && (is_cli_subcommand(argv[1]) ||
      ((strcmp(argv[1], "help") == 0 || strcmp(argv[1], "--help") == 0) && access("cli/sdev.sdev", R_OK) == 0))) {
    const char *cli_script = "cli/sdev.sdev";
    size_t slen = 0;
    char *src = read_disk_file(cli_script, &slen);
    if (src) {
      uint8_t *bc = NULL, *pool = NULL;
      uint32_t bc_len = 0, pool_len = 0;
      char *err = NULL;
      if (!compile_with_driver(
            BAKED_DRIVER_BC, BAKED_DRIVER_BC_LEN,
            BAKED_DRIVER_POOL, BAKED_DRIVER_POOL_LEN,
            src, slen, &bc, &bc_len, &pool, &pool_len, &err)) {
        fprintf(stderr, "sdev: %s: %s\n", cli_script, err ? err : "compile error");
        free(err);
        free(src);
        return 1;
      }
      free(src);
      Vm vm;
      vm_init(&vm, bc, bc_len, pool, pool_len);
      vm.prog_argc = argc - 1;
      vm.prog_argv = argv + 1;
      vm_run(&vm);
      int code = vm.exit_code;
      vm_destroy(&vm);
      free(bc);
      free(pool);
      return code;
    }
  }

  if (argc < 2 || strcmp(argv[1], "--help") == 0 || strcmp(argv[1], "help") == 0) {
    print_usage();
    return argc < 2 ? 2 : 0;
  }
  if (strcmp(argv[1], "--version") == 0 || strcmp(argv[1], "version") == 0) {
    printf("sdev-vm 4.0.0 (zero-host native seed VM + self-hosted compiler)\n");
    return 0;
  }

  // Subcommand: compile [--v1] <file.sdev> [-o out.sdevc]
  if (strcmp(argv[1], "compile") == 0) {
    int c_v1 = 0;
    const char *src_path = NULL;
    const char *out_path = NULL;
    for (int i = 2; i < argc; i++) {
      if (strcmp(argv[i], "--v1") == 0) c_v1 = 1;
      else if (strcmp(argv[i], "-o") == 0 && i + 1 < argc) out_path = argv[++i];
      else if (!src_path) src_path = argv[i];
    }
    if (!src_path) {
      fprintf(stderr, "usage: sdev-vm compile [--v1] <file.sdev> [-o out.sdevc]\n");
      return 2;
    }
    char default_out[512];
    if (!out_path) {
      snprintf(default_out, sizeof(default_out), "%s.sdevc", src_path);
      out_path = default_out;
    }
    size_t slen = 0;
    char *src = read_disk_file(src_path, &slen);
    if (!src) {
      fprintf(stderr, "sdev-vm: cannot read %s\n", src_path);
      return 1;
    }
    if (!c_v1 && has_v1_shebang(src, slen)) c_v1 = 1;
    uint8_t *bc = NULL, *pool = NULL;
    uint32_t bc_len = 0, pool_len = 0;
    if (!compile_source_mode(c_v1, src_path, src, slen, &bc, &bc_len, &pool, &pool_len)) {
      free(src);
      return 1;
    }
    free(src);
    FILE *f = fopen(out_path, "wb");
    if (!f) {
      fprintf(stderr, "sdev-vm: cannot write %s\n", out_path);
      return 1;
    }
    fwrite("SDEVC4", 1, 6, f);
    fwrite(&bc_len, 4, 1, f);
    fwrite(&pool_len, 4, 1, f);
    fwrite(bc, 1, bc_len, f);
    fwrite(pool, 1, pool_len, f);
    fclose(f);
    printf("compiled %s -> %s (%u bytes bytecode, %u bytes pool)\n", src_path, out_path, bc_len, pool_len);
    free(bc);
    free(pool);
    return 0;
  }

  // Subcommand: run-bc <file.sdevc> [args...]
  if (strcmp(argv[1], "run-bc") == 0) {
    if (argc < 3) {
      fprintf(stderr, "usage: sdev-vm run-bc <file.sdevc> [args...]\n");
      return 2;
    }
    size_t flen = 0;
    uint8_t *buf = (uint8_t *)read_disk_file(argv[2], &flen);
    if (!buf || flen < 14 || memcmp(buf, "SDEVC4", 6) != 0) {
      fprintf(stderr, "sdev-vm: %s is not a valid SDEVC4 container\n", argv[2]);
      free(buf);
      return 1;
    }
    uint32_t bc_len = load_u32(buf, 6);
    uint32_t pool_len = load_u32(buf, 10);
    if (14U + bc_len + pool_len > flen) {
      fprintf(stderr, "sdev-vm: %s truncated container\n", argv[2]);
      free(buf);
      return 1;
    }
    Vm vm;
    vm_init(&vm, buf + 14U, bc_len, buf + 14U + bc_len, pool_len);
    vm.prog_argc = argc - 3;
    vm.prog_argv = argv + 3;
    vm_run(&vm);
    int code = vm.exit_code;
    vm_destroy(&vm);
    free(buf);
    return code;
  }

  // Subcommand: native <file.sdev> [-o out] [--asm-only]
  if (strcmp(argv[1], "native") == 0) {
    if (argc < 3) {
      fprintf(stderr, "usage: sdev-vm native <file.sdev> [-o out] [--asm-only]\n");
      return 2;
    }
    const char *build_script = "lang/native/build.sdev";
    size_t slen = 0;
    char *src = read_disk_file(build_script, &slen);
    if (!src) {
      fprintf(stderr, "sdev-vm: cannot open %s\n", build_script);
      return 1;
    }
    uint8_t *bc = NULL, *pool = NULL;
    uint32_t bc_len = 0, pool_len = 0;
    char *err = NULL;
    if (!compile_with_driver(
          BAKED_DRIVER_BC, BAKED_DRIVER_BC_LEN,
          BAKED_DRIVER_POOL, BAKED_DRIVER_POOL_LEN,
          src, slen, &bc, &bc_len, &pool, &pool_len, &err)) {
      fprintf(stderr, "sdev: %s: %s\n", build_script, err ? err : "compile error");
      free(err);
      free(src);
      return 1;
    }
    free(src);
    Vm vm;
    vm_init(&vm, bc, bc_len, pool, pool_len);
    vm.prog_argc = argc - 2;
    vm.prog_argv = argv + 2;
    vm_run(&vm);
    int code = vm.exit_code;
    vm_destroy(&vm);
    free(bc);
    free(pool);
    return code;
  }

  // Default / `run`: compile and execute [--v1] <file.sdev> [args...]
  int arg_idx = (strcmp(argv[1], "run") == 0) ? 2 : 1;
  int v1_mode = 0;
  if (arg_idx < argc && strcmp(argv[arg_idx], "--v1") == 0) {
    v1_mode = 1;
    arg_idx++;
  }
  if (arg_idx >= argc) {
    print_usage();
    return 2;
  }
  const char *script_path = argv[arg_idx];
  size_t slen = 0;
  char *src = read_disk_file(script_path, &slen);
  if (!src) {
    fprintf(stderr, "sdev-vm: cannot open %s\n", script_path);
    return 1;
  }
  if (!v1_mode && has_v1_shebang(src, slen)) {
    v1_mode = 1;
  }

  uint8_t *bc = NULL, *pool = NULL;
  uint32_t bc_len = 0, pool_len = 0;
  if (!compile_source_mode(v1_mode, script_path, src, slen, &bc, &bc_len, &pool, &pool_len)) {
    free(src);
    return 1;
  }
  free(src);

  Vm vm;
  vm_init(&vm, bc, bc_len, pool, pool_len);
  vm.prog_argc = argc - (arg_idx + 1);
  vm.prog_argv = argv + (arg_idx + 1);
  vm_run(&vm);
  int code = vm.exit_code;
  vm_destroy(&vm);
  free(bc);
  free(pool);
  return code;
}
