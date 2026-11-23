// SDev UI Toolkit — produces declarative UI commands consumed by AppPreviewPanel.tsx
import { SdevError } from '../core/errors';
import { SdevFunction, stringify } from '../builtins/utils';
import { lazyModuleRunner } from '../runtime/sdev-module';
import SDEV_TEXT_SRC from '../../../lang/stdlib/v2/text.sdev?raw';
import SDEV_UI_SRC from '../../../lang/stdlib/v2/ui.sdev?raw';

const getUiRunner = lazyModuleRunner(SDEV_TEXT_SRC, SDEV_UI_SRC);

export type UiNodeType =
  | 'window' | 'row' | 'column' | 'group' | 'tabs' | 'tab'
  | 'label' | 'heading' | 'paragraph'
  | 'button' | 'input' | 'textarea' | 'checkbox' | 'slider'
  | 'select' | 'option'
  | 'image' | 'divider' | 'spacer' | 'progress'
  | 'table' | 'menu' | 'menuitem' | 'dialog';

export interface UiNode {
  id: number;
  type: UiNodeType;
  props: Record<string, unknown>;
  children: number[]; // ordered child ids
  parent: number | null;
  // Event handler IDs (handler => sdev callable)
  handlers: Record<string, number>;
}

export interface UiCallback {
  fn: (args: unknown[]) => unknown;
}

export interface UiState {
  nodes: Map<number, UiNode>;
  rootId: number | null;
  // Reactive variables (bound to inputs/checkboxes/sliders)
  values: Map<string, unknown>;
}

export type UiEmitCallback = (state: UiState) => void;

export function createUiBuiltins(
  emit: UiEmitCallback,
  registerHandler: (cb: UiCallback) => number
): Map<string, SdevFunction> {
  const builtins = new Map<string, SdevFunction>();
  const state: UiState = { nodes: new Map(), rootId: null, values: new Map() };
  let nextId = 1;
  // Stack of currently-open container IDs for fluent building.
  const containerStack: number[] = [];

  const currentParent = (): number | null =>
    containerStack.length > 0 ? containerStack[containerStack.length - 1] : state.rootId;

  function pushNode(type: UiNodeType, props: Record<string, unknown>, opts: { container?: boolean; isRoot?: boolean } = {}): UiNode {
    const id = nextId++;
    const parent = opts.isRoot ? null : currentParent();
    const node: UiNode = { id, type, props, children: [], parent, handlers: {} };
    state.nodes.set(id, node);
    if (parent !== null) {
      const p = state.nodes.get(parent);
      if (p) p.children.push(id);
    }
    if (opts.isRoot) state.rootId = id;
    if (opts.container) containerStack.push(id);
    emit(state);
    return node;
  }

  function pop() {
    if (containerStack.length > 0) containerStack.pop();
    emit(state);
  }

  function asString(v: unknown, fallback = ''): string {
    if (v === null || v === undefined) return fallback;
    return typeof v === 'string' ? v : stringify(v);
  }
  function asNumber(v: unknown, fallback = 0): number {
    if (typeof v === 'number') return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }
  function asBool(v: unknown): boolean { return !!v; }

  // Helper: callable arg (for onclick etc.)
  function asHandler(v: unknown): number | null {
    if (!v || typeof v !== 'object') return null;
    const fn = v as { type?: string; call?: (args: unknown[]) => unknown };
    if (fn.type !== 'builtin' && fn.type !== 'user' && fn.type !== 'lambda') return null;
    if (typeof fn.call !== 'function') return null;
    return registerHandler({ fn: (args) => fn.call!(args) });
  }

  // ───────────────────────── Containers ─────────────────────────
  builtins.set('window', { type: 'builtin', call: (args: unknown[], line: number) => {
    const title = asString(args[0], 'sdev App');
    const width = asNumber(args[1], 480);
    const height = asNumber(args[2], 600);
    // Reset state
    state.nodes.clear();
    state.rootId = null;
    state.values.clear();
    containerStack.length = 0;
    nextId = 1;
    getUiRunner().call('ui_window', title, width, height);
    pushNode('window', { title, width, height }, { container: true, isRoot: true });
    return null;
  }});

  builtins.set('endwindow', { type: 'builtin', call: () => { pop(); return null; }});

  builtins.set('row', { type: 'builtin', call: () => { getUiRunner().call('ui_row', 8); pushNode('row', { gap: 8 }, { container: true }); return null; }});
  builtins.set('endrow', { type: 'builtin', call: () => { getUiRunner().call('ui_end'); pop(); return null; }});
  builtins.set('column', { type: 'builtin', call: () => { getUiRunner().call('ui_column', 8); pushNode('column', { gap: 8 }, { container: true }); return null; }});
  builtins.set('endcolumn', { type: 'builtin', call: () => { getUiRunner().call('ui_end'); pop(); return null; }});

  builtins.set('group', { type: 'builtin', call: (args: unknown[]) => {
    const title = asString(args[0], '');
    getUiRunner().call('ui_card', title);
    pushNode('group', { title }, { container: true });
    return null;
  }});
  builtins.set('endgroup', { type: 'builtin', call: () => { getUiRunner().call('ui_end'); pop(); return null; }});

  builtins.set('tabs', { type: 'builtin', call: () => { pushNode('tabs', {}, { container: true }); return null; }});
  builtins.set('endtabs', { type: 'builtin', call: () => { pop(); return null; }});
  builtins.set('tab', { type: 'builtin', call: (args: unknown[]) => {
    pushNode('tab', { title: asString(args[0], 'Tab') }, { container: true });
    return null;
  }});
  builtins.set('endtab', { type: 'builtin', call: () => { pop(); return null; }});

  // ───────────────────────── Display widgets ─────────────────────────
  function resolveTextArg(raw: unknown): { text: string; bind?: string } {
    const s = asString(raw, '');
    const [bound, key, val] = getUiRunner().call('ui_resolve_bind', s) as [number, string, string];
    if (bound === 1) {
      return { text: state.values.has(key) ? asString(state.values.get(key), '') : String(val ?? ''), bind: key };
    }
    if (state.values.has(s)) {
      return { text: asString(state.values.get(s), ''), bind: s };
    }
    return { text: s };
  }

  builtins.set('heading', { type: 'builtin', call: (args: unknown[]) => {
    const { text, bind } = resolveTextArg(args[0]);
    const level = asNumber(args[1], 1);
    getUiRunner().call('ui_heading', text, level);
    pushNode('heading', { text, bind, level });
    return null;
  }});

  builtins.set('label', { type: 'builtin', call: (args: unknown[]) => {
    const { text, bind } = resolveTextArg(args[0]);
    getUiRunner().call('ui_label', text);
    pushNode('label', { text, bind });
    return null;
  }});

  builtins.set('paragraph', { type: 'builtin', call: (args: unknown[]) => {
    const { text, bind } = resolveTextArg(args[0]);
    getUiRunner().call('ui_text', text);
    pushNode('paragraph', { text, bind });
    return null;
  }});

  builtins.set('image', { type: 'builtin', call: (args: unknown[]) => {
    pushNode('image', { src: asString(args[0]), width: asNumber(args[1], 0), height: asNumber(args[2], 0), alt: asString(args[3], '') });
    return null;
  }});

  builtins.set('divider', { type: 'builtin', call: () => { getUiRunner().call('ui_divider'); pushNode('divider', {}); return null; }});
  builtins.set('spacer', { type: 'builtin', call: (args: unknown[]) => { const size = asNumber(args[0], 8); getUiRunner().call('ui_spacer', size); pushNode('spacer', { size }); return null; }});

  builtins.set('progress', { type: 'builtin', call: (args: unknown[]) => {
    const raw = args[0];
    let bind: string | undefined;
    let value = 0;
    if (typeof raw === 'string') {
      const k = raw.startsWith('@') ? raw.slice(1) : raw;
      if (state.values.has(k)) { bind = k; value = asNumber(state.values.get(k), 0); }
      else value = asNumber(raw, 0);
    } else value = asNumber(raw, 0);
    const max = asNumber(args[1], 100);
    getUiRunner().call('ui_progress', bind ?? 'progress', value, max);
    pushNode('progress', { value, bind, max });
    return null;
  }});

  // ───────────────────────── Interactive widgets ─────────────────────────
  builtins.set('button', { type: 'builtin', call: (args: unknown[], line: number) => {
    const label = asString(args[0], 'Button');
    const handler = asHandler(args[1]);
    const variant = asString(args[2], 'default');
    getUiRunner().call('ui_button', label, variant);
    const node = pushNode('button', { label, variant });
    if (handler !== null) node.handlers.click = handler;
    emit(state);
    return null;
  }});

  builtins.set('input', { type: 'builtin', call: (args: unknown[]) => {
    const bind = asString(args[0], '');
    const placeholder = asString(args[1], '');
    if (bind && !state.values.has(bind)) {
      state.values.set(bind, '');
      getUiRunner().call('ui_set', bind, '');
    }
    getUiRunner().call('ui_input', bind, placeholder, asString(state.values.get(bind), ''));
    pushNode('input', { bind, placeholder });
    return null;
  }});

  builtins.set('textarea', { type: 'builtin', call: (args: unknown[]) => {
    const bind = asString(args[0], '');
    const placeholder = asString(args[1], '');
    const rows = asNumber(args[2], 4);
    if (bind && !state.values.has(bind)) {
      state.values.set(bind, '');
      getUiRunner().call('ui_set', bind, '');
    }
    pushNode('textarea', { bind, placeholder, rows });
    return null;
  }});

  builtins.set('checkbox', { type: 'builtin', call: (args: unknown[]) => {
    const bind = asString(args[0], '');
    const label = asString(args[1], '');
    if (bind && !state.values.has(bind)) {
      state.values.set(bind, false);
      getUiRunner().call('ui_set', bind, 'false');
    }
    getUiRunner().call('ui_checkbox', bind, label, state.values.get(bind) ? 1 : 0);
    pushNode('checkbox', { bind, label });
    return null;
  }});

  builtins.set('slider', { type: 'builtin', call: (args: unknown[]) => {
    const bind = asString(args[0], '');
    const min = asNumber(args[1], 0);
    const max = asNumber(args[2], 100);
    const step = asNumber(args[3], 1);
    if (bind && !state.values.has(bind)) {
      state.values.set(bind, min);
      getUiRunner().call('ui_set', bind, String(min));
    }
    getUiRunner().call('ui_slider', bind, min, max, asNumber(state.values.get(bind), min));
    pushNode('slider', { bind, min, max, step });
    return null;
  }});

  builtins.set('select', { type: 'builtin', call: (args: unknown[]) => {
    const bind = asString(args[0], '');
    const opts = Array.isArray(args[1]) ? (args[1] as unknown[]).map(o => asString(o)) : [];
    if (bind && !state.values.has(bind)) {
      const def = opts[0] ?? '';
      state.values.set(bind, def);
      getUiRunner().call('ui_set', bind, def);
    }
    pushNode('select', { bind, options: opts });
    return null;
  }});

  // ───────────────────────── Tables ─────────────────────────
  builtins.set('table', { type: 'builtin', call: (args: unknown[]) => {
    const headers = Array.isArray(args[0]) ? (args[0] as unknown[]).map(h => asString(h)) : [];
    const rowsArg = Array.isArray(args[1]) ? args[1] as unknown[] : [];
    const rows = rowsArg.map(r => Array.isArray(r) ? (r as unknown[]).map(c => asString(c)) : []);
    pushNode('table', { headers, rows });
    return null;
  }});

  // ───────────────────────── Menu ─────────────────────────
  builtins.set('menu', { type: 'builtin', call: (args: unknown[]) => {
    pushNode('menu', { label: asString(args[0], 'Menu') }, { container: true });
    return null;
  }});
  builtins.set('endmenu', { type: 'builtin', call: () => { pop(); return null; }});
  builtins.set('menuitem', { type: 'builtin', call: (args: unknown[]) => {
    const label = asString(args[0], 'Item');
    const handler = asHandler(args[1]);
    const node = pushNode('menuitem', { label });
    if (handler !== null) node.handlers.click = handler;
    emit(state);
    return null;
  }});

  // ───────────────────────── Reactive value helpers ─────────────────────────
  builtins.set('uiget', { type: 'builtin', call: (args: unknown[]) => {
    const k = asString(args[0]);
    if (state.values.has(k)) return state.values.get(k);
    if (Number(getUiRunner().call('ui_has_key', k)) === 1) {
      return getUiRunner().callStr('ui_get', k);
    }
    return null;
  }});
  builtins.set('uiset', { type: 'builtin', call: (args: unknown[]) => {
    const k = asString(args[0]);
    state.values.set(k, args[1]);
    getUiRunner().call('ui_set', k, asString(args[1], ''));
    // Reactively refresh any text/progress nodes bound to this key
    for (const node of state.nodes.values()) {
      const b = (node.props as Record<string, unknown>).bind;
      if (typeof b === 'string' && b === k) {
        if (node.type === 'progress') (node.props as Record<string, unknown>).value = asNumber(args[1], 0);
        else (node.props as Record<string, unknown>).text = asString(args[1], '');
      }
    }
    emit(state);
    return null;
  }});

  // Show window (re-emit in case)
  builtins.set('show', { type: 'builtin', call: () => { emit(state); return null; }});

  // Programmatic dialog
  builtins.set('alert', { type: 'builtin', call: (args: unknown[]) => {
    const msg = asString(args[0], '');
    if (typeof window !== 'undefined') {
      window.alert(msg);
    }
    return null;
  }});

  return builtins;
}

// External setter so the React panel can update reactive values when an input changes.
export function setUiValue(state: UiState, key: string, value: unknown): UiState {
  state.values.set(key, value);
  getUiRunner().call('ui_set', key, value == null ? '' : String(value));
  // Mirror the new value into any text/progress widgets bound to this key,
  // so labels/headings/paragraphs stay in sync with input/slider/checkbox edits.
  for (const node of state.nodes.values()) {
    const b = (node.props as Record<string, unknown>).bind;
    if (typeof b === 'string' && b === key) {
      if (node.type === 'progress') {
        const n = Number(value);
        (node.props as Record<string, unknown>).value = Number.isFinite(n) ? n : 0;
      } else if (node.type === 'label' || node.type === 'heading' || node.type === 'paragraph') {
        (node.props as Record<string, unknown>).text = value == null ? '' : String(value);
      }
    }
  }
  return state;
}
