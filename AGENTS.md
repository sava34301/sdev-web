# Project Architecture Rules

- Drive all homepage scroll motion (lazy-loaded WebGL flight, pinned chapter overlays, CSS 3D ring) from one passive scroll listener with sticky stages, so native scrolling, accessibility and first paint stay intact; reduced motion gets a static stacked layout.
