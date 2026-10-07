# Project Architecture Rules

- Drive all homepage scroll motion and reading progress from one passive scroll listener writing CSS variables/styles, with IntersectionObserver for reveals; reduced motion and small screens get a static stacked layout, and interactive examples remain usable without animation.
- Lazy-load the homepage Three.js scene and read its progress from the existing scroll listener; dispose GPU resources and retain readable static content when WebGL or motion is unavailable.
