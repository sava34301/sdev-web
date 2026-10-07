# Project Architecture Rules

- Drive all homepage scroll motion and reading progress from one passive scroll listener writing CSS variables/styles, with IntersectionObserver for reveals; reduced motion and small screens get a static stacked layout, and interactive examples remain usable without animation.
