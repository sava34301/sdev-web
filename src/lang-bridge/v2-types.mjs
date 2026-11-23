// Shared scope/type-collection helpers used by both the bytecode oracle and native backend.

export function collectSets(body, locals, foreachNames) {
  for (const s of body) {
    // Only plain `set x to v` introduces a new binding; indexed writes mutate an existing binding.
    if (s.k === 'set' && !locals.has(s.name)) locals.set(s.name, locals.size);
    if (s.k === 'if') { collectSets(s.then_, locals, foreachNames); if (s.else_) collectSets(s.else_, locals, foreachNames); }
    if (s.k === 'while') collectSets(s.body, locals, foreachNames);
    if (s.k === 'attempt') {
      collectSets(s.body, locals, foreachNames);
      if (s.errName && !locals.has(s.errName)) locals.set(s.errName, locals.size);
      collectSets(s.rescue_, locals, foreachNames);
    }
    if (s.k === 'foreach') {
      for (const n of foreachNames(s)) {
        if (!locals.has(n)) locals.set(n, locals.size);
      }
      collectSets(s.body, locals, foreachNames);
    }
  }
}

export function resolveMethodReturnType(classes, getFnType, key) {
  if (!classes) return 'int';
  for (const ms of classes.values()) {
    for (const mm of ms) {
      if (mm.key !== key) continue;
      const t = getFnType(mm.fn);
      if (t && t !== 'int') return t;
    }
  }
  return 'int';
}
