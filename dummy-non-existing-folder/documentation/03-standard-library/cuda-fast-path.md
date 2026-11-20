# sdev CUDA Fast Path (Milestone 11)

`ml/cuda.sdev` puts the sdev ML stack on the GPU. It sits on top of
`ffi.sdev`'s cuBLAS/cudart bindings, hides the C ABI awkwardness, and
transparently falls back to the pure-sdev tensor ops when CUDA isn't
present — so the same program still runs in the browser IDE.

## Quick start

```sdev
link "ml/cuda.sdev"

forge dev be cuda_device_default()
speak cuda_report(dev)

forge a be tensor([1.0,2.0,3.0,4.0], [2,2])
forge b be tensor([5.0,6.0,7.0,8.0], [2,2])
forge c be cuda_matmul(dev, a, b)   // GPU when available, CPU otherwise
speak c.data

cuda_free_device(dev)
```

## Device handle

- `cuda_device(cudart_path, cublas_path)` — open explicit shared libs.
- `cuda_device_default()` — Debian/Ubuntu paths under
  `/usr/lib/x86_64-linux-gnu/`. Override for macOS, WSL, or custom
  CUDA toolkit installs.
- `cuda_free_device(dev)` — destroy the cublas handle and close both
  libraries. Always call before process exit.
- `cuda_report(dev)` — one-line status string for logs.

The returned tome carries `ok`, the loaded `cu` bindings, and a live
`cublasHandle_t`. When `ok` is `nope`, every helper falls back to CPU.

## Device memory

- `cuda_alloc(dev, n_f64)` → `{ dptr, n, bytes }`
- `cuda_upload(dev, list)` — host list → device buffer.
- `cuda_download(dev, buf)` — device buffer → host list.
- `cuda_free(dev, buf)` — free device memory.

Use these directly only when writing custom kernels. `cuda_matmul`
and `cuda_forward_linear` handle the upload/compute/download cycle
for you.

## Accelerated ops

- `cuda_matmul(dev, a, b)` — row-major matmul via `cublasDgemm`. The
  wrapper swaps operands under the hood to reinterpret cuBLAS's
  column-major output as row-major, matching `ml/tensor.sdev`'s layout.
- `cuda_forward_linear(dev, x, w, bias)` — one linear layer forward
  pass, ready to slot into `nn.fit`.
- `best_matmul(dev, blas, a, b)` — pick the fastest available backend:
  CUDA → BLAS → pure sdev.

## Fallback semantics

Every helper checks `dev.ok` (and, for `best_matmul`, the BLAS handle)
before touching FFI. In the browser IDE the FFI builtins are stubbed
to `void`, so `cuda_device_default()` returns `{ ok: nope, ... }` and
`cuda_matmul` calls straight through to `matmul(a, b)`. Programs
authored on a workstation run unchanged in the web playground.

## Safety notes

- Always pair `cuda_alloc` with `cuda_free` and `cuda_device*` with
  `cuda_free_device`. FFI leaks bypass sdev's runtime accounting.
- cuBLAS handles are not thread-safe across sdev tasks — use one
  device per task, or serialize access at the caller.
- `cuda_matmul` synchronizes with `cudaDeviceSynchronize` before
  downloading results. Skip the sync only if you chain multiple GPU
  ops and download once at the end.
