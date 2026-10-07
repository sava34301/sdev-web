# Project Architecture Rules

- Drive homepage scroll motion (hero depth, sticky "How it works" card stack) from one passive scroll listener writing CSS variables/styles, with IntersectionObserver for reveals, so native scrolling, accessibility and first paint stay intact; reduced motion and small screens get a static stacked layout.
