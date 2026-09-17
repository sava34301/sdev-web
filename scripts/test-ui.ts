import { createUiBuiltins, setUiValue, type UiState } from '../src/lang/ui';

let passed = 0;
let failed = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.log(`  FAIL ${name}\n       got:      ${a}\n       expected: ${e}`);
  }
}

console.log('UI Builtins Tests');

let lastState: UiState | null = null;
const emit = (state: UiState) => {
  lastState = state;
};

let handlerIdCounter = 1;
const registerHandler = (cb: any) => handlerIdCounter++;

const builtins = createUiBuiltins(emit, registerHandler);

// Helper to call built-ins
function call(name: string, args: unknown[] = []) {
  const fn = builtins.get(name);
  if (!fn) throw new Error(`Built-in ${name} not found`);
  return fn.call!(args, 0);
}

// 1. Basic window and containers
call('window', ['Test Window', 800, 600]); // Node 1 is created, state.nodes.clear() resets `nextId` back to 1
if (!lastState) throw new Error('State not emitted');

check('Window is root node', lastState.rootId, 1);
const windowNode = lastState.nodes.get(1);
check('Window properties', (windowNode?.props as any)?.title, 'Test Window');
check('Window has no parent', windowNode?.parent, null);

// 2. Child nodes (row inside window)
call('row'); // Node 2
const rowNode = lastState.nodes.get(2);
check('Row has parent window', rowNode?.parent, 1);
check('Window has child row', windowNode?.children, [2]);

// 3. Child inside row (button)
call('button', ['Click Me']); // Node 3
const buttonNode = lastState.nodes.get(3);
check('Button has parent row', buttonNode?.parent, 2);
check('Row has child button', rowNode?.children, [3]);
check('Button properties', (buttonNode?.props as any)?.label, 'Click Me');

call('endrow'); // Pop row
call('endwindow'); // Pop window

// 4. Reactive State (uiset and uiget)
call('window', ['Reactive Window']); // starts a new window (Node 1 again, since window clears nodes and resets nextId=1)
call('uiset', ['counter', 42]);
check('uiget retrieves value', call('uiget', ['counter']), 42);

// 5. Binding UI elements to state
call('progress', ['@counter']); // Node 2
// The root window is 1. The progress is node 2.
const progressNode = lastState!.nodes.get(2);
check('Progress initial bound value', (progressNode?.props as any)?.value, 42);
check('Progress binding key', (progressNode?.props as any)?.bind, 'counter');

// 6. Updating state reflects in bound nodes
call('uiset', ['counter', 100]);
check('Progress value updated', (lastState!.nodes.get(2)?.props as any)?.value, 100);

// 7. External setter (setUiValue)
setUiValue(lastState!, 'counter', 50);
check('State updated externally', lastState!.values.get('counter'), 50);
check('Progress updated externally', (lastState!.nodes.get(2)?.props as any)?.value, 50);

// 8. Event handlers
let clicked = false;
// asHandler looks for v.type 'lambda', 'builtin', 'user' and v.call a function.
call('button', ['Action', { type: 'lambda', call: () => { clicked = true; } }]); // Node 3
const actionNode = lastState!.nodes.get(3);
check('Action button has click handler', typeof actionNode?.handlers.click, 'number');

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
