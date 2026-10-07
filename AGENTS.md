# Project Architecture Rules

- Drive all homepage scroll motion and reading progress from one passive scroll listener writing CSS variables/styles, with IntersectionObserver for reveals; reduced motion and small screens get a static stacked layout, and interactive examples remain usable without animation.
- Lazy-load the homepage Three.js scene and read its progress from the existing scroll listener; dispose GPU resources and retain readable static content when WebGL or motion is unavailable.
- The code understander runs the sdev-written engine (`lang/agent/understander.sdev`, via `src/lang/agent/sdev-engine.ts`) first and uses its answer only when it is sure of every line and the result parses; the TypeScript understander remains the fallback — so behaviour migrates rule by rule without regressions.
- New language primitives needed by sdev-written tooling are added to both the JS builtins and the Python interpreter in the same change — dual-runtime parity is required.
- `sdev:ai` files (first code line `!#ai`) are translated to canonical sdev by `lang/agent/ai-dialect.sdev` inside the agent's `begin()`, so every runtime and the rest of the understander only ever see canonical sdev.
