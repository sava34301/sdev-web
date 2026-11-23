import { SdevFunction, OutputCallback, isTruthy, stringify } from './utils';
import { SdevError } from '../errors';

export interface FopFeatureRefinement {
  targetName: string;
  isFunctionRefine: boolean;
  fields: Record<string, unknown>;
  methods: Map<string, SdevFunction>;
  fnWrapper?: SdevFunction;
}

export interface FopFeature {
  __feature__: true;
  name: string;
  active: boolean;
  requires: string[];
  excludes: string[];
  fields: Record<string, unknown>;
  methods: Record<string, SdevFunction>;
  refinements: FopFeatureRefinement[];
  [key: string]: unknown;
}

export interface FopModel {
  __feature_model__: true;
  name: string;
  features: string[];
  mandatory: string[];
  optional: string[];
  requires: Record<string, string[]>;
  excludes: Record<string, string[]>;
  alternatives: string[][];
  or_groups: string[][];
}

function isCallable(v: unknown): v is SdevFunction {
  return Boolean(v && typeof v === 'object' && 'call' in v && typeof (v as SdevFunction).call === 'function');
}

function isFeatureObj(v: unknown): v is FopFeature {
  return Boolean(v && typeof v === 'object' && (v as { __feature__?: boolean }).__feature__);
}

function isModelObj(v: unknown): v is FopModel {
  return Boolean(v && typeof v === 'object' && (v as { __feature_model__?: boolean }).__feature_model__);
}

const RESERVED_FEATURE_KEYS = new Set([
  '__feature__',
  'name',
  'active',
  'requires',
  'excludes',
  'fields',
  'methods',
  'refinements',
]);

export class FopRegistry {
  features = new Map<string, FopFeature>();
  activeOrder: string[] = [];
  requiresMap = new Map<string, Set<string>>();
  excludesMap = new Map<string, Set<string>>();
  proceedStack: SdevFunction[] = [];

  registerFeature(feat: FopFeature): FopFeature {
    this.features.set(feat.name, feat);
    if (feat.active && !this.activeOrder.includes(feat.name)) {
      this.activeOrder.push(feat.name);
    }
    return feat;
  }

  resolveName(featOrName: unknown, line: number): string {
    if (typeof featOrName === 'string') return featOrName;
    if (isFeatureObj(featOrName)) return featOrName.name;
    if (featOrName && typeof featOrName === 'object' && typeof (featOrName as { name?: unknown }).name === 'string') {
      return (featOrName as { name: string }).name;
    }
    throw new SdevError('Expected feature name or feature object', line);
  }

  isEnabled(featOrName: unknown): boolean {
    const name = typeof featOrName === 'string'
      ? featOrName
      : isFeatureObj(featOrName)
        ? featOrName.name
        : '';
    if (!name) return false;
    return this.activeOrder.includes(name);
  }

  addRequires(a: string, b: string): void {
    if (!this.requiresMap.has(a)) this.requiresMap.set(a, new Set());
    this.requiresMap.get(a)!.add(b);
  }

  addExcludes(a: string, b: string): void {
    if (!this.excludesMap.has(a)) this.excludesMap.set(a, new Set());
    this.excludesMap.get(a)!.add(b);
    if (!this.excludesMap.has(b)) this.excludesMap.set(b, new Set());
    this.excludesMap.get(b)!.add(a);
  }

  private getExclusionsFor(name: string): string[] {
    const out = new Set<string>();
    const feat = this.features.get(name);
    if (feat) {
      for (const ex of feat.excludes) out.add(ex);
    }
    const globalEx = this.excludesMap.get(name);
    if (globalEx) {
      for (const ex of globalEx) out.add(ex);
    }
    // Check symmetric exclusions from active features
    for (const active of this.activeOrder) {
      const af = this.features.get(active);
      if (af?.excludes.includes(name)) out.add(active);
      if (this.excludesMap.get(active)?.has(name)) out.add(active);
    }
    return [...out];
  }

  private getRequirementsFor(name: string): string[] {
    const out = new Set<string>();
    const feat = this.features.get(name);
    if (feat) {
      for (const req of feat.requires) out.add(req);
    }
    const globalReq = this.requiresMap.get(name);
    if (globalReq) {
      for (const req of globalReq) out.add(req);
    }
    return [...out];
  }

  enable(featOrName: unknown, line: number, visiting = new Set<string>()): boolean {
    if (isFeatureObj(featOrName) && !this.features.has(featOrName.name)) {
      this.registerFeature(featOrName);
    }
    const name = this.resolveName(featOrName, line);
    if (this.isEnabled(name)) return true;
    if (visiting.has(name)) {
      throw new SdevError(`Cyclic feature requirement involving '${name}'`, line);
    }
    visiting.add(name);

    const exclusions = this.getExclusionsFor(name);
    for (const ex of exclusions) {
      if (this.isEnabled(ex)) {
        throw new SdevError(`Feature '${name}' excludes active feature '${ex}'`, line);
      }
    }

    const reqs = this.getRequirementsFor(name);
    for (const req of reqs) {
      if (!this.isEnabled(req)) {
        if (!this.features.has(req)) {
          throw new SdevError(`Feature '${name}' requires unregistered feature '${req}'`, line);
        }
        this.enable(req, line, visiting);
      }
    }

    const feat = this.features.get(name);
    if (feat) feat.active = true;
    if (!this.activeOrder.includes(name)) {
      this.activeOrder.push(name);
    }
    visiting.delete(name);
    return true;
  }

  disable(featOrName: unknown, line: number): boolean {
    const name = this.resolveName(featOrName, line);
    const feat = this.features.get(name);
    if (feat) feat.active = false;
    this.activeOrder = this.activeOrder.filter((n) => n !== name);
    return false;
  }

  toggle(featOrName: unknown, line: number): boolean {
    const name = this.resolveName(featOrName, line);
    if (this.isEnabled(name)) {
      this.disable(name, line);
      return false;
    }
    this.enable(name, line);
    return true;
  }

  snapshot(): { activeOrder: string[]; activeStates: Map<string, boolean> } {
    const activeStates = new Map<string, boolean>();
    this.features.forEach((f, k) => activeStates.set(k, f.active));
    return { activeOrder: [...this.activeOrder], activeStates };
  }

  restore(snap: { activeOrder: string[]; activeStates: Map<string, boolean> }): void {
    this.activeOrder = [...snap.activeOrder];
    this.features.forEach((f, k) => {
      const prev = snap.activeStates.get(k);
      f.active = prev !== undefined ? prev : this.activeOrder.includes(k);
    });
  }

  withProceed<T>(prevFn: SdevFunction, body: () => T): T {
    this.proceedStack.push(prevFn);
    try {
      return body();
    } finally {
      this.proceedStack.pop();
    }
  }

  callProceed(args: unknown[], line: number): unknown {
    if (this.proceedStack.length === 0) {
      throw new SdevError('proceed() called outside of a feature refinement', line);
    }
    const prev = this.proceedStack.pop()!;
    try {
      return prev.call(args, line);
    } finally {
      this.proceedStack.push(prev);
    }
  }

  validateSelection(selection: string[], model?: FopModel): { valid: boolean; errors: string[]; resolved: string[] } {
    const errors: string[] = [];
    const selected = new Set(selection);

    if (model) {
      if (model.features.length > 0) {
        for (const s of selection) {
          if (!model.features.includes(s)) {
            errors.push(`Unknown feature '${s}' in model '${model.name}'`);
          }
        }
      }
      for (const m of model.mandatory) {
        if (!selected.has(m)) {
          errors.push(`Missing mandatory feature '${m}'`);
        }
      }
      for (const altGroup of model.alternatives) {
        const count = altGroup.filter((f) => selected.has(f)).length;
        if (count !== 1) {
          errors.push(`Alternative group [${altGroup.join(', ')}] requires exactly 1 feature (got ${count})`);
        }
      }
      for (const orGroup of model.or_groups) {
        const count = orGroup.filter((f) => selected.has(f)).length;
        if (count < 1) {
          errors.push(`OR group [${orGroup.join(', ')}] requires at least 1 feature`);
        }
      }
    }

    const reqSources = (f: string): string[] => {
      const s = new Set<string>(this.getRequirementsFor(f));
      if (model?.requires[f]) {
        for (const r of model.requires[f]) s.add(r);
      }
      return [...s];
    };

    const exSources = (f: string): string[] => {
      const s = new Set<string>(this.getExclusionsFor(f));
      if (model?.excludes[f]) {
        for (const e of model.excludes[f]) s.add(e);
      }
      return [...s];
    };

    for (const f of selection) {
      for (const req of reqSources(f)) {
        if (!selected.has(req)) {
          errors.push(`Feature '${f}' requires '${req}'`);
        }
      }
      for (const ex of exSources(f)) {
        if (selected.has(ex)) {
          const pair = f < ex ? `'${f}' excludes '${ex}'` : `'${ex}' excludes '${f}'`;
          const msg = `Feature conflict: ${pair}`;
          if (!errors.includes(msg)) errors.push(msg);
        }
      }
    }

    // Transitive closure for resolved
    const resolved: string[] = [];
    const seen = new Set<string>();
    const visit = (f: string) => {
      if (seen.has(f)) return;
      seen.add(f);
      for (const r of reqSources(f)) visit(r);
      resolved.push(f);
    };
    if (model) {
      for (const m of model.mandatory) visit(m);
    }
    for (const f of selection) visit(f);

    return { valid: errors.length === 0, errors, resolved };
  }
}

export function buildFeatureObject(
  name: string,
  requires: string[] = [],
  excludes: string[] = [],
  fields: Record<string, unknown> = {},
  methods: Record<string, SdevFunction> = {},
  refinements: FopFeatureRefinement[] = [],
  active = false
): FopFeature {
  const feat: FopFeature = {
    __feature__: true,
    name,
    active,
    requires: [...requires],
    excludes: [...excludes],
    fields: { ...fields },
    methods: { ...methods },
    refinements: [...refinements],
  };
  for (const [k, v] of Object.entries(fields)) {
    if (!RESERVED_FEATURE_KEYS.has(k)) feat[k] = v;
  }
  for (const [k, v] of Object.entries(methods)) {
    if (!RESERVED_FEATURE_KEYS.has(k)) feat[k] = v;
  }
  return feat;
}

export function chainMethodWithProceed(
  registry: FopRegistry,
  prevFn: SdevFunction | undefined,
  newFn: SdevFunction
): SdevFunction {
  const fallback: SdevFunction = prevFn ?? {
    type: 'builtin',
    call: () => null,
  };
  return {
    type: newFn.type,
    call: (args: unknown[], callLine: number) =>
      registry.withProceed(fallback, () => newFn.call(args, callLine)),
  };
}

export function registerFop(
  builtins: Map<string, SdevFunction>,
  _output: OutputCallback,
  registry: FopRegistry = new FopRegistry()
): FopRegistry {
  const resolveFeatureObj = (arg: unknown, line: number): FopFeature => {
    if (isFeatureObj(arg)) return arg;
    if (typeof arg === 'string') {
      const f = registry.features.get(arg);
      if (!f) throw new SdevError(`Unknown feature '${arg}'`, line);
      return f;
    }
    if (arg && typeof arg === 'object') {
      const obj = arg as Record<string, unknown>;
      const fname = typeof obj.name === 'string' ? obj.name : 'anonymous';
      const fields: Record<string, unknown> = {};
      const methods: Record<string, SdevFunction> = {};
      const srcFields = obj.fields && typeof obj.fields === 'object' ? (obj.fields as Record<string, unknown>) : null;
      const srcMethods = obj.methods && typeof obj.methods === 'object' ? (obj.methods as Record<string, unknown>) : null;
      if (srcFields) Object.assign(fields, srcFields);
      if (srcMethods) {
        for (const [k, v] of Object.entries(srcMethods)) {
          if (isCallable(v)) methods[k] = v;
        }
      }
      for (const [k, v] of Object.entries(obj)) {
        if (RESERVED_FEATURE_KEYS.has(k)) continue;
        if (isCallable(v)) methods[k] = v;
        else fields[k] = v;
      }
      return buildFeatureObject(
        fname,
        Array.isArray(obj.requires) ? obj.requires.map(String) : [],
        Array.isArray(obj.excludes) ? obj.excludes.map(String) : [],
        fields,
        methods
      );
    }
    throw new SdevError('Expected a feature object or name', line);
  };

  builtins.set('proceed', {
    type: 'builtin',
    call: (args: unknown[], line: number) => registry.callProceed(args, line),
  });

  builtins.set('original', {
    type: 'builtin',
    call: (args: unknown[], line: number) => registry.callProceed(args, line),
  });

  // Internal helper for compiled multi-clause functions (Compiler/VM)
  builtins.set('__register_clause', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const prev = args[0] as (SdevFunction & { __clauses?: { matchFn: SdevFunction; bodyFn: SdevFunction }[] }) | null;
      const matchFn = args[1] as SdevFunction;
      const bodyFn = args[2] as SdevFunction;
      if (!isCallable(matchFn) || !isCallable(bodyFn)) {
        throw new SdevError('__register_clause requires matchFn and bodyFn', line);
      }
      const clauses = prev?.__clauses ? [...prev.__clauses, { matchFn, bodyFn }] : [{ matchFn, bodyFn }];
      const dispatcher: SdevFunction & { __clauses?: { matchFn: SdevFunction; bodyFn: SdevFunction }[] } = {
        type: 'user',
        __clauses: clauses,
        call: (callArgs: unknown[], callLine: number) => {
          for (const c of clauses) {
            if (isTruthy(c.matchFn.call(callArgs, callLine))) {
              return c.bodyFn.call(callArgs, callLine);
            }
          }
          throw new SdevError('No matching function clause for provided arguments', callLine);
        },
      };
      return dispatcher;
    },
  });

  // Internal helpers for Compiler/VM FOP support
  builtins.set('__fop_register_feature', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const spec = (args[0] ?? {}) as Record<string, unknown>;
      const name = String(spec.name ?? 'Feature');
      const requires = Array.isArray(spec.requires) ? spec.requires.map(String) : [];
      const excludes = Array.isArray(spec.excludes) ? spec.excludes.map(String) : [];
      const fields = (spec.fields && typeof spec.fields === 'object' ? spec.fields : {}) as Record<string, unknown>;
      const methods = (spec.methods && typeof spec.methods === 'object' ? spec.methods : {}) as Record<string, SdevFunction>;
      const rawRefs = Array.isArray(spec.refinements) ? spec.refinements : [];
      const refinements: FopFeatureRefinement[] = rawRefs.map((r) => {
        const rr = r as Record<string, unknown>;
        const rm = new Map<string, SdevFunction>();
        if (rr.methods && typeof rr.methods === 'object') {
          for (const [k, v] of Object.entries(rr.methods as Record<string, unknown>)) {
            if (isCallable(v)) rm.set(k, v);
          }
        }
        return {
          targetName: String(rr.targetName ?? ''),
          isFunctionRefine: Boolean(rr.isFunctionRefine),
          fields: (rr.fields && typeof rr.fields === 'object' ? rr.fields : {}) as Record<string, unknown>,
          methods: rm,
          fnWrapper: isCallable(rr.fnWrapper) ? rr.fnWrapper : undefined,
        };
      });
      const feat = buildFeatureObject(name, requires, excludes, fields, methods, refinements, false);
      return registry.registerFeature(feat);
    },
  });

  builtins.set('__fop_refine_func', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const target = args[0];
      const wrapper = args[1];
      const featureName = typeof args[2] === 'string' ? args[2] : null;
      if (!isCallable(target) || !isCallable(wrapper)) {
        throw new SdevError('__fop_refine_func requires two callable functions', line);
      }
      if (featureName === null && !(target as { __fop_layers?: unknown }).__fop_layers) {
        return chainMethodWithProceed(registry, target, wrapper);
      }
      type LayerEntry = { featureName: string | null; fn: SdevFunction };
      type GatedFn = SdevFunction & { __fop_base?: SdevFunction; __fop_layers?: LayerEntry[] };
      const t = target as GatedFn;
      const baseFn = t.__fop_base ?? target;
      const layers: LayerEntry[] = t.__fop_layers
        ? [...t.__fop_layers, { featureName, fn: wrapper }]
        : [{ featureName, fn: wrapper }];
      const disp: GatedFn = {
        type: 'user',
        __fop_base: baseFn,
        __fop_layers: layers,
        call: (callArgs: unknown[], callLine: number) => {
          const active = layers.filter((l) => l.featureName === null || registry.isEnabled(l.featureName));
          if (active.length === 0) return baseFn.call(callArgs, callLine);
          let runner: SdevFunction = baseFn;
          for (const l of active) {
            runner = chainMethodWithProceed(registry, runner, l.fn);
          }
          return runner.call(callArgs, callLine);
        },
      };
      return disp;
    },
  });

  builtins.set('__fop_refine_class', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const ctor = args[0];
      const fields = (args[1] && typeof args[1] === 'object' ? args[1] : {}) as Record<string, unknown>;
      const methods = (args[2] && typeof args[2] === 'object' ? args[2] : {}) as Record<string, SdevFunction>;
      const featureName = typeof args[3] === 'string' ? args[3] : null;
      if (!isCallable(ctor)) {
        throw new SdevError('__fop_refine_class requires a class/constructor', line);
      }
      const wrappedCtor: SdevFunction = {
        type: ctor.type,
        call: (ctorArgs: unknown[], callLine: number) => {
          const inst = ctor.call(ctorArgs, callLine) as Record<string, unknown>;
          if (inst && typeof inst === 'object' && (featureName === null || registry.isEnabled(featureName))) {
            for (const [k, v] of Object.entries(fields)) {
              inst[k] = v;
            }
            for (const [k, fn] of Object.entries(methods)) {
              if (!isCallable(fn)) continue;
              const prev = inst[k];
              const prevFn = isCallable(prev) ? prev : undefined;
              inst[k] = chainMethodWithProceed(registry, prevFn, fn);
            }
          }
          return inst;
        },
      };
      return wrappedCtor;
    },
  });

  builtins.set('feature_define', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) {
        throw new SdevError('feature_define() takes 1-2 arguments (name, spec?)', line);
      }
      const name = String(args[0]);
      const spec = (args[1] && typeof args[1] === 'object' ? args[1] : {}) as Record<string, unknown>;
      const requires = Array.isArray(spec.requires) ? spec.requires.map(String) : [];
      const excludes = Array.isArray(spec.excludes) ? spec.excludes.map(String) : [];
      const fields: Record<string, unknown> = spec.fields && typeof spec.fields === 'object'
        ? { ...(spec.fields as Record<string, unknown>) }
        : {};
      const methods: Record<string, SdevFunction> = {};
      if (spec.methods && typeof spec.methods === 'object') {
        for (const [k, v] of Object.entries(spec.methods as Record<string, unknown>)) {
          if (isCallable(v)) methods[k] = v;
        }
      }
      for (const [k, v] of Object.entries(spec)) {
        if (RESERVED_FEATURE_KEYS.has(k)) continue;
        if (isCallable(v)) methods[k] = v;
        else fields[k] = v;
      }
      const active = Boolean(spec.active);
      const feat = buildFeatureObject(name, requires, excludes, fields, methods, [], active);
      return registry.registerFeature(feat);
    },
  });

  const enableFn: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('enable_feature() takes 1 argument', line);
      return registry.enable(args[0], line);
    },
  };
  builtins.set('enable_feature', enableFn);
  builtins.set('feature_enable', enableFn);

  const disableFn: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('disable_feature() takes 1 argument', line);
      return registry.disable(args[0], line);
    },
  };
  builtins.set('disable_feature', disableFn);
  builtins.set('feature_disable', disableFn);

  const toggleFn: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('toggle_feature() takes 1 argument', line);
      return registry.toggle(args[0], line);
    },
  };
  builtins.set('toggle_feature', toggleFn);
  builtins.set('feature_toggle', toggleFn);

  const isEnabledFn: SdevFunction = {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('is_feature_enabled() takes 1 argument', line);
      return registry.isEnabled(args[0]);
    },
  };
  builtins.set('is_feature_enabled', isEnabledFn);
  builtins.set('feature_enabled', isEnabledFn);

  builtins.set('active_features', {
    type: 'builtin',
    call: () => [...registry.activeOrder],
  });

  const makeFeatureContext = (featureList: unknown[], line: number) => {
    let savedSnap: { activeOrder: string[]; activeStates: Map<string, boolean> } | null = null;
    return {
      __feature_context__: true,
      features: featureList,
      on_enter: {
        type: 'builtin' as const,
        call: () => {
          savedSnap = registry.snapshot();
          try {
            for (const f of featureList) registry.enable(f, line);
          } catch (e) {
            if (savedSnap) registry.restore(savedSnap);
            throw e;
          }
          return featureList;
        },
      },
      on_exit: {
        type: 'builtin' as const,
        call: () => {
          if (savedSnap) {
            registry.restore(savedSnap);
            savedSnap = null;
          }
          return false;
        },
      },
    };
  };

  builtins.set('with_features', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) {
        throw new SdevError('with_features() takes 1 or 2 arguments (features, fn?)', line);
      }
      const list = Array.isArray(args[0]) ? args[0] : [args[0]];
      if (args.length === 1) {
        return makeFeatureContext(list, line);
      }
      const fn = args[1];
      if (!isCallable(fn)) throw new SdevError('Second argument to with_features() must be a function', line);
      const snap = registry.snapshot();
      try {
        for (const f of list) registry.enable(f, line);
        return fn.call([], line);
      } finally {
        registry.restore(snap);
      }
    },
  });

  builtins.set('feature_context', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const list = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      return makeFeatureContext(list, line);
    },
  });

  builtins.set('compose_features', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const items = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
      if (items.length === 0) return buildFeatureObject('empty');
      const feats = items.map((item) => resolveFeatureObj(item, line));
      const names: string[] = [];
      const reqs = new Set<string>();
      const excls = new Set<string>();
      const fields: Record<string, unknown> = {};
      const methods: Record<string, SdevFunction> = {};
      const refinements: FopFeatureRefinement[] = [];

      for (const f of feats) {
        names.push(f.name);
        for (const r of f.requires) reqs.add(r);
        for (const e of f.excludes) excls.add(e);
        Object.assign(fields, f.fields);
        for (const [mName, mFn] of Object.entries(f.methods)) {
          if (!isCallable(mFn)) continue;
          const prev = methods[mName];
          methods[mName] = chainMethodWithProceed(registry, prev, mFn);
        }
        refinements.push(...f.refinements);
      }
      for (const n of names) reqs.delete(n);
      for (const ex of excls) {
        if (names.includes(ex)) {
          throw new SdevError(`Cannot compose mutually excluding features including '${ex}'`, line);
        }
      }
      return buildFeatureObject(names.join('+'), [...reqs], [...excls], fields, methods, refinements, false);
    },
  });

  builtins.set('apply_feature', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('apply_feature() takes 2 arguments (target, feature)', line);
      const target = args[0] as Record<string, unknown>;
      const feat = resolveFeatureObj(args[1], line);
      if (!target || typeof target !== 'object') {
        throw new SdevError('First argument to apply_feature() must be an object, instance, or class', line);
      }
      const targetClass = target.type === 'class' ? target : null;
      if (targetClass) {
        const layers = (targetClass.featureLayers as unknown[] | undefined) ?? [];
        const methodMap = new Map<string, SdevFunction>(Object.entries(feat.methods));
        layers.push({ featureName: null, methods: methodMap, attrs: { ...feat.fields } });
        targetClass.featureLayers = layers;
        return target;
      }
      Object.assign(target, feat.fields);
      for (const [mName, mFn] of Object.entries(feat.methods)) {
        if (!isCallable(mFn)) continue;
        const prev = isCallable(target[mName]) ? (target[mName] as SdevFunction) : undefined;
        const wrapped = chainMethodWithProceed(registry, prev, mFn);
        target[mName] = {
          type: 'user' as const,
          call: (callArgs: unknown[], callLine: number) => wrapped.call([target, ...callArgs], callLine),
        };
      }
      return target;
    },
  });

  builtins.set('refine_target', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('refine_target() takes 2 arguments (target, overrides)', line);
      const target = args[0];
      const overrides = args[1];
      if (isCallable(target) && isCallable(overrides)) {
        return chainMethodWithProceed(registry, target, overrides);
      }
      if (target && typeof target === 'object' && overrides && typeof overrides === 'object') {
        const tObj = target as Record<string, unknown>;
        const oObj = overrides as Record<string, unknown>;
        if (tObj.type === 'class') {
          const layers = (tObj.featureLayers as unknown[] | undefined) ?? [];
          const methodMap = new Map<string, SdevFunction>();
          const attrs: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(oObj)) {
            if (isCallable(v)) methodMap.set(k, v);
            else attrs[k] = v;
          }
          layers.push({ featureName: null, methods: methodMap, attrs });
          tObj.featureLayers = layers;
          return target;
        }
        const clone: Record<string, unknown> = { ...tObj };
        for (const [k, v] of Object.entries(oObj)) {
          if (isCallable(v)) {
            const prev = isCallable(clone[k]) ? (clone[k] as SdevFunction) : undefined;
            clone[k] = chainMethodWithProceed(registry, prev, v);
          } else {
            clone[k] = v;
          }
        }
        return clone;
      }
      throw new SdevError('refine_target() expects (fn, wrapper) or (object/class, overrides)', line);
    },
  });

  builtins.set('feature_model', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) {
        throw new SdevError('feature_model() takes 1-2 arguments (name, config?)', line);
      }
      const name = String(args[0]);
      const cfg = (args[1] && typeof args[1] === 'object' ? args[1] : {}) as Record<string, unknown>;
      const model: FopModel = {
        __feature_model__: true,
        name,
        features: Array.isArray(cfg.features) ? cfg.features.map(String) : [],
        mandatory: Array.isArray(cfg.mandatory) ? cfg.mandatory.map(String) : [],
        optional: Array.isArray(cfg.optional) ? cfg.optional.map(String) : [],
        requires: {},
        excludes: {},
        alternatives: Array.isArray(cfg.alternatives)
          ? cfg.alternatives.map((g) => (Array.isArray(g) ? g.map(String) : []))
          : [],
        or_groups: Array.isArray(cfg.or_groups)
          ? cfg.or_groups.map((g) => (Array.isArray(g) ? g.map(String) : []))
          : [],
      };
      if (cfg.requires && typeof cfg.requires === 'object') {
        for (const [k, v] of Object.entries(cfg.requires as Record<string, unknown>)) {
          model.requires[k] = Array.isArray(v) ? v.map(String) : [String(v)];
        }
      }
      if (cfg.excludes && typeof cfg.excludes === 'object') {
        for (const [k, v] of Object.entries(cfg.excludes as Record<string, unknown>)) {
          model.excludes[k] = Array.isArray(v) ? v.map(String) : [String(v)];
        }
      }
      if (model.features.length === 0) {
        const all = new Set<string>([
          ...model.mandatory,
          ...model.optional,
          ...model.alternatives.flat(),
          ...model.or_groups.flat(),
          ...Object.keys(model.requires),
          ...Object.values(model.requires).flat(),
          ...Object.keys(model.excludes),
          ...Object.values(model.excludes).flat(),
        ]);
        model.features = [...all];
      }
      return model;
    },
  });

  builtins.set('feature_require', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('feature_require() takes 2 arguments (featureA, featureB)', line);
      const a = registry.resolveName(args[0], line);
      const b = registry.resolveName(args[1], line);
      registry.addRequires(a, b);
      return true;
    },
  });

  builtins.set('feature_exclude', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('feature_exclude() takes 2 arguments (featureA, featureB)', line);
      const a = registry.resolveName(args[0], line);
      const b = registry.resolveName(args[1], line);
      registry.addExcludes(a, b);
      return true;
    },
  });

  builtins.set('validate_features', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) {
        throw new SdevError('validate_features() takes 1-2 arguments (modelOrSelection, selection?)', line);
      }
      let model: FopModel | undefined;
      let selection: string[];
      if (args.length === 1) {
        if (!Array.isArray(args[0])) {
          throw new SdevError('validate_features(selection) expects a list of feature names', line);
        }
        selection = args[0].map((x) => (isFeatureObj(x) ? x.name : stringify(x)));
      } else {
        if (!isModelObj(args[0])) {
          throw new SdevError('First argument to validate_features(model, selection) must be a feature_model', line);
        }
        model = args[0];
        if (!Array.isArray(args[1])) {
          throw new SdevError('Second argument to validate_features(model, selection) must be a list', line);
        }
        selection = args[1].map((x) => (isFeatureObj(x) ? x.name : stringify(x)));
      }
      return registry.validateSelection(selection, model);
    },
  });

  builtins.set('resolve_features', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1 || args.length > 2) {
        throw new SdevError('resolve_features() takes 1-2 arguments (selection, model?)', line);
      }
      let selectionRaw = args[0];
      let model: FopModel | undefined;
      if (isModelObj(args[0]) && Array.isArray(args[1])) {
        model = args[0];
        selectionRaw = args[1];
      } else if (args.length === 2 && isModelObj(args[1])) {
        model = args[1];
      }
      if (!Array.isArray(selectionRaw)) {
        throw new SdevError('resolve_features() expects a list of feature names', line);
      }
      const selection = selectionRaw.map((x) => (isFeatureObj(x) ? x.name : stringify(x)));
      const res = registry.validateSelection(selection, model);
      // Verify resolved set doesn't violate exclusions
      const resolvedCheck = registry.validateSelection(res.resolved, model);
      const conflicts = resolvedCheck.errors.filter((e) => e.startsWith('Feature conflict:'));
      if (conflicts.length > 0) {
        throw new SdevError(conflicts[0], line);
      }
      return res.resolved;
    },
  });

  return registry;
}
