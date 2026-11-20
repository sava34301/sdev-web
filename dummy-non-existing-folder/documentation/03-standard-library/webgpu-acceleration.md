# sdev WebGPU Acceleration (M10)

The `webgpu` stdlib module gives sdev programs GPU acceleration inside
the browser IDE — no toolchain, no plugins — while transparently
falling back to the pure-sdev CPU kernels when a GPU adapter is not
available (e.g. Node CLI, the sandbox preview, or a browser without
WebGPU support). It sits alongside `ffi.sdev` (CPU BLAS / cuBLAS) so
`ml/*` code can pick whichever backend the host offers.

```sdev
use "lang/stdlib/webgpu.sdev" as gpu
use "lang/stdlib/ml/tensor.sdev" as T

print(gpu.device_info())

let a = T.rand([512, 512])
let b = T.rand([512, 512])
let c = gpu.matmul(a, b)     # runs on the GPU if available, CPU otherwise
```

## Availability

| Environment                 | GPU path      | Notes                              |
| --------------------------- | ------------- | ---------------------------------- |
| Chrome / Edge (WebGPU on)   | Yes           | Native adapter                     |
| Safari 17+ (feature flag)   | Yes           |                                    |
| Firefox Nightly             | Partial       | Falls back where features missing  |
| Lovable preview sandbox     | No            | Auto CPU fallback                  |
| Node CLI / Electron desktop | Optional      | Uses Dawn if bundled, else CPU     |

`gpu.is_available()` returns `true` only when both `navigator.gpu`
exists **and** `requestAdapter()` returned a real adapter — matching
the platform notes.

## API

| Function                          | Description                                      |
| --------------------------------- | ------------------------------------------------ |
| `is_available()`                  | Probe for a working WebGPU adapter               |
| `init()`                          | Lazy device request; returns 0 on fallback       |
| `device_info()`                   | Adapter / vendor string for logging              |
| `upload(t)` / `download(g)`       | Move a tensor to / from GPU memory               |
| `free(g)`                         | Release a GPU buffer                             |
| `matmul(a, b)`                    | Batched f32 matmul (8x8 workgroups)              |
| `add(a, b)`                       | Element-wise add (64-wide workgroups)            |
| `relu(x)`                         | In-place ReLU                                    |
| `kernel(name, wgsl)`              | Register a custom WGSL compute shader            |
| `run(pipe, bufs, uniforms, x,y,z)`| Dispatch a registered kernel                     |
| `heartbeat()`                     | Re-initialise after a device-lost event          |

## Writing custom WGSL

The runtime keeps bindings tight (≤ 3 storage buffers by default) so
shaders compile under the standard `maxStorageBuffersPerShaderStage`
limit of 8. Use `f32` for numeric payloads and pad `vec3<f32>` to 16
bytes — WGSL enforces the alignment rules called out in the platform
notes.

```sdev
let src = "
  @group(0) @binding(0) var<storage, read_write> X : array<f32>;
  @compute @workgroup_size(64)
  fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
    let i = gid.x;
    if (i >= arrayLength(&X)) { return; }
    X[i] = X[i] * X[i];
  }
"

let pipe = gpu.kernel("square", src)
let g = gpu.upload(T.range(1024))
gpu.run(pipe, [g], [], (1024 + 63) / 64, 1, 1)
print(T.data(gpu.download(g))[0..8])
gpu.free(g)
```

### Reserved-word gotchas

WGSL reserves `meta`, `target`, `type`, `namespace`, and others. Using
them as identifiers causes silent shader compilation failure. Prefer
`info`, `dest`, etc.

### Device loss

Call `gpu.heartbeat()` between training steps in long loops. When the
adapter is lost (driver reset, tab suspension), the module drops its
cached device and pipelines and reinitialises on the next call.

## Integration with the ML stdlib

`ml/tensor.sdev` inspects `gpu.is_available()` at import time and
routes `matmul`, `add`, and `relu` through this module when a GPU is
present. Training loops in `ml/nn.sdev` therefore accelerate
automatically — no code changes required.

## Limits and next steps

Milestone 10 delivers f32 kernels and manual custom-shader dispatch.
Milestone 11 (CUDA) will provide the same surface for cuBLAS / cuDNN
via the FFI layer so large-model training on desktop GPUs works
through the exact same tensor API.
