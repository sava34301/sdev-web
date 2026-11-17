# Opening Statement: Prosecution

The case fails as stated: adopting and building all five expansion features simultaneously should not proceed.

### 1. Delivery Collapse Under Solo Pre-Launch Constraints
- **Evidence:** The proposal mandates to "simultaneously adopt and build all five new expansion features" under a "Single solo creator / student developer (Sava Milanov), self-funded, pre-launch."
- **Failure:** Expanding into five disconnected domains—hardware emulation, omniscient debugging, ML distillation, WASI specifications, and CRDT networking—exceeds the operational capacity of one self-funded student. The record is silent on scheduling, sequencing, or prioritization.
- **Cost:** Context starvation and total launch paralysis; none of the features ship, stalling core SDEV adoption before launch.

### 2. Time-Travel Debugger Heterogeneity Across Unaligned Execution Tracks
- **Evidence:** Demands a debugger scrubbing "variable states, call frames, and canvas draws line-by-line across both v1 and v2 Prism dialects," while SDEV operates "three execution tracks (v1 TypeScript interpreter, v2 self-hosted compiler on a WebAssembly seed VM, and a native x86-64 backend producing static Linux ELFs)."
- **Failure:** Deterministic state replay across two disparate dialects and three unaligned runtime architectures requires separate instrumentation layers. The record provides no shared intermediate representation or state serialization protocol to unify them.
- **Cost:** Runaway bug volume, divergent debugger states across tracks, and severe memory bloat in the browser tab.

### 3. Model Training Feasibility Void
- **Evidence:** Calls to "Train, distill, or quantize a custom sub-50MB local model specifically for sdev dialect translation and code understanding."
- **Failure:** SDEV is a "pre-launch", "independent" language. The record is silent on corpus size, training data, and compute resources. You cannot train or distill an effective code model without an existing corpus of production code.
- **Cost:** Wasted capital on unviable training runs, producing a hallucination-prone model that corrupts user code.

### 4. Premature Infrastructure Sprawl
- **Evidence:** Requires an "interactive circuit/MCU simulator (RP2040, ESP32, micro:bit)" combined with "real-time P2P WebRTC / CRDT multi-cursor rooms" for "shared execution."
- **Failure:** Emulating three hardware architectures alongside P2P distributed execution introduces extreme external complexity unrelated to the core compiler. The record contains no signaling architecture, conflict resolution model, or peripheral specs.
- **Cost:** Massive client bundle sizes, connection drops in live sessions, and unending maintenance overhead.
