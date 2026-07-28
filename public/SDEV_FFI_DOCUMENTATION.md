# sdev FFI & Native Acceleration (Milestone 9)

sdev now speaks the C ABI. The `ffi.sdev` stdlib lets any sdev program
open a shared library (`.so`, `.dylib`, `.dll`), resolve symbols, and
call them with typed arguments — which is the foundation the ML stdlib
uses to reach BLAS, cuBLAS, cuDNN, and anything else the host exposes.

FFI runs on the **native / Node** track. In the browser IDE the calls
are stubbed to `void` so the same program can be edited safely; run it
through the desktop IDE or `scripts/sdev-native.mjs` to actually cross
the boundary.

## Quick tour

```sdev
link "ffi.sdev"

forge lib be Library("/usr/lib/libm.so.6")
forge cos be bind(lib, "cos", FFI_F64, [FFI_F64])
speak invoke(cos, [0.0])   // 1.0
lib_close(lib)
```

## Type kinds

| Constant   | Meaning                     |
| ---------- | --------------------------- |
| `FFI_VOID` | no value                    |
| `FFI_I32`  | 32-bit signed int           |
| `FFI_I64`  | 64-bit signed int           |
| `FFI_F32`  | 32-bit float                |
| `FFI_F64`  | 64-bit float                |
| `FFI_PTR`  | opaque pointer (buffer addr)|
| `FFI_CSTR` | NUL-terminated UTF-8        |
| `FFI_BUF`  | length-carrying byte buffer |
| `FFI_BOOL` | 0 / 1                       |

## Buffers

`buf_f64(n)` allocates a native f64 array. `buf_from_list(xs)` and
`buf_to_list(b)` shuttle sdev lists across the boundary. Buffers are
the standard way to hand large tensors to BLAS or CUDA without going
through the boxed-float heap.

## BLAS matmul (drop-in acceleration for `ml/tensor.sdev`)

```sdev
link "ffi.sdev"
link "ml/tensor.sdev"

forge blas be open_blas("/usr/lib/libopenblas.so.0")
forge a be tensor([1.0,2.0,3.0,4.0], [2,2])
forge b be tensor([5.0,6.0,7.0,8.0], [2,2])
forge c be blas_matmul(blas, a, b)   // uses cblas_dgemm when available
```

`blas_matmul` transparently falls back to the pure-sdev `matmul` when
the library isn't installed, so the ML stdlib keeps running everywhere.

## CUDA fast path

```sdev
forge cuda be open_cuda("/usr/lib/libcudart.so", "/usr/lib/libcublas.so")
either cuda_ok(cuda) ::
    speak "GPU ready — cublasDgemm bound as cuda.dgemm"
;;
```

The `open_cuda` helper binds the minimal cuBLAS surface the training
loop needs (`Create/Destroy`, `Dgemm`, `Malloc/Free/Memcpy/Sync`).
Higher-level kernels can be added by binding whatever additional
symbols your build of libcublas / libcudnn exports.

## Host builtins the FFI stdlib expects

The native runtime provides these (Node CLI wires them through
`koffi` when installed; the browser stubs them to `void`):

```
ffi_open(path)               -> lib handle | void
ffi_sym(lib, name)           -> fn handle  | void
ffi_call(fn, ret, args, argv)-> typed result
ffi_close(lib)               -> yep/nope
ffi_buf(nbytes)              -> raw pointer int
ffi_read_f64(buf, i)  / ffi_write_f64(buf, i, x)
ffi_read_i32(buf, i)  / ffi_write_i32(buf, i, n)
```

## Safety

FFI bypasses sdev's runtime checks — a wrong signature crashes the
process. Keep bindings in one module per library, treat every pointer
as untrusted, and always `lib_close` on shutdown.
