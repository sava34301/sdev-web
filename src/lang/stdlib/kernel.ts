// ============================================================
// sdev OS Kernel - VFS, Scheduler, Syscalls, HAL, Security
// ============================================================
import { SdevError } from '../core/errors';
import { SdevFunction, stringify, OutputCallback } from '../builtins/utils';

// ======================== Virtual File System ========================

interface VFSNode {
  type: 'file' | 'directory';
  content?: string | Uint8Array;
  children?: Map<string, VFSNode>;
  permissions: number; // unix-style: 0o755
  owner: string;
  created: number;
  modified: number;
}

export class VirtualFileSystem {
  private root: VFSNode;

  constructor() {
    this.root = this.makeDir('kernel');
    // Create default structure
    this.mkdir('/home');
    this.mkdir('/tmp');
    this.mkdir('/bin');
    this.mkdir('/etc');
    this.mkdir('/dev');
    this.mkdir('/var');
    this.mkdir('/var/log');
  }

  private makeDir(owner: string): VFSNode {
    return {
      type: 'directory',
      children: new Map(),
      permissions: 0o755,
      owner,
      created: Date.now(),
      modified: Date.now(),
    };
  }

  private makeFile(content: string, owner: string): VFSNode {
    return {
      type: 'file',
      content,
      permissions: 0o644,
      owner,
      created: Date.now(),
      modified: Date.now(),
    };
  }

  private resolve(path: string): { parent: VFSNode; name: string; node?: VFSNode } {
    const parts = path.split('/').filter(Boolean);
    if (parts.length === 0) return { parent: this.root, name: '', node: this.root };
    let current = this.root;
    for (let i = 0; i < parts.length - 1; i++) {
      const child = current.children?.get(parts[i]);
      if (!child || child.type !== 'directory') {
        throw new SdevError(`VFS: directory not found: ${parts.slice(0, i + 1).join('/')}`, 0);
      }
      current = child;
    }
    const name = parts[parts.length - 1];
    return { parent: current, name, node: current.children?.get(name) };
  }

  read(path: string): string {
    const { node } = this.resolve(path);
    if (!node) throw new SdevError(`VFS: file not found: ${path}`, 0);
    if (node.type !== 'file') throw new SdevError(`VFS: not a file: ${path}`, 0);
    return typeof node.content === 'string' ? node.content : new TextDecoder().decode(node.content);
  }

  readBytes(path: string): Uint8Array {
    const { node } = this.resolve(path);
    if (!node) throw new SdevError(`VFS: file not found: ${path}`, 0);
    if (node.type !== 'file') throw new SdevError(`VFS: not a file: ${path}`, 0);
    if (node.content instanceof Uint8Array) return node.content;
    return new TextEncoder().encode(node.content as string);
  }

  write(path: string, content: string | Uint8Array, owner = 'user'): void {
    const { parent, name } = this.resolve(path);
    const existing = parent.children?.get(name);
    if (existing && existing.type === 'directory') {
      throw new SdevError(`VFS: cannot write to directory: ${path}`, 0);
    }
    const file = this.makeFile(typeof content === 'string' ? content : '', owner);
    if (content instanceof Uint8Array) file.content = content;
    else file.content = content;
    parent.children!.set(name, file);
  }

  append(path: string, content: string): void {
    const { parent, name, node } = this.resolve(path);
    if (node && node.type === 'file') {
      const existing = typeof node.content === 'string' ? node.content : '';
      node.content = existing + content;
      node.modified = Date.now();
    } else {
      parent.children!.set(name, this.makeFile(content, 'user'));
    }
  }

  mkdir(path: string, owner = 'kernel'): void {
    const parts = path.split('/').filter(Boolean);
    let current = this.root;
    for (const part of parts) {
      if (!current.children!.has(part)) {
        current.children!.set(part, this.makeDir(owner));
      }
      current = current.children!.get(part)!;
    }
  }

  list(path: string): string[] {
    const { node } = this.resolve(path || '/');
    if (!node) throw new SdevError(`VFS: path not found: ${path}`, 0);
    if (node.type !== 'directory') throw new SdevError(`VFS: not a directory: ${path}`, 0);
    return Array.from(node.children!.keys());
  }

  exists(path: string): boolean {
    try {
      const { node } = this.resolve(path);
      return !!node;
    } catch { return false; }
  }

  delete(path: string): boolean {
    const { parent, name, node } = this.resolve(path);
    if (!node) return false;
    parent.children!.delete(name);
    return true;
  }

  stat(path: string): Record<string, unknown> {
    const { node } = this.resolve(path);
    if (!node) throw new SdevError(`VFS: not found: ${path}`, 0);
    return {
      type: node.type,
      permissions: node.permissions,
      owner: node.owner,
      created: node.created,
      modified: node.modified,
      size: node.type === 'file'
        ? (typeof node.content === 'string' ? node.content.length : (node.content as Uint8Array).length)
        : node.children!.size,
    };
  }

  // Export entire VFS as a tome for sdev code
  toTome(): Record<string, unknown> {
    const convert = (node: VFSNode): unknown => {
      if (node.type === 'file') return typeof node.content === 'string' ? node.content : '<binary>';
      const obj: Record<string, unknown> = {};
      node.children!.forEach((child, name) => { obj[name] = convert(child); });
      return obj;
    };
    return convert(this.root) as Record<string, unknown>;
  }
}

// ======================== Task Scheduler ========================

export type TaskState = 'ready' | 'running' | 'blocked' | 'terminated';

export interface Task {
  id: number;
  name: string;
  state: TaskState;
  priority: number;
  privilegeLevel: 'kernel' | 'user';
  fn: SdevFunction;
  result?: unknown;
  created: number;
  cpuTime: number;
}

export class TaskScheduler {
  private tasks: Map<number, Task> = new Map();
  private nextId = 1;
  private currentTask: number | null = null;
  private tickCount = 0;
  private output: OutputCallback;
  private quantum = 100; // instructions per time slice

  constructor(output: OutputCallback) {
    this.output = output;
  }

  createTask(fn: SdevFunction, name = '', priority = 0, privilege: 'kernel' | 'user' = 'user'): number {
    const id = this.nextId++;
    this.tasks.set(id, {
      id,
      name: name || `task_${id}`,
      state: 'ready',
      priority,
      privilegeLevel: privilege,
      fn,
      created: Date.now(),
      cpuTime: 0,
    });
    return id;
  }

  killTask(id: number): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    task.state = 'terminated';
    return true;
  }

  getTask(id: number): Task | undefined {
    return this.tasks.get(id);
  }

  listTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  yieldCurrent(): void {
    if (this.currentTask !== null) {
      const task = this.tasks.get(this.currentTask);
      if (task && task.state === 'running') task.state = 'ready';
    }
  }

  // Round-robin scheduler with priority
  schedule(): Task | null {
    const ready = Array.from(this.tasks.values())
      .filter(t => t.state === 'ready')
      .sort((a, b) => b.priority - a.priority);
    if (ready.length === 0) return null;
    const task = ready[0];
    task.state = 'running';
    this.currentTask = task.id;
    return task;
  }

  // Run one scheduling cycle (cooperative)
  tick(line: number): void {
    this.tickCount++;
    const task = this.schedule();
    if (!task) return;
    try {
      const t0 = performance.now();
      task.result = task.fn.call([], line);
      task.cpuTime += performance.now() - t0;
      task.state = 'terminated';
    } catch (e) {
      task.state = 'terminated';
      this.output(`[KERNEL] Task ${task.name} crashed: ${e instanceof SdevError ? e.message : String(e)}`);
    }
  }

  runAll(line: number): void {
    let safety = 0;
    while (this.tasks.size > 0 && safety < 10000) {
      const alive = Array.from(this.tasks.values()).filter(t => t.state !== 'terminated');
      if (alive.length === 0) break;
      this.tick(line);
      safety++;
    }
  }

  getCurrentPrivilege(): 'kernel' | 'user' {
    if (this.currentTask === null) return 'kernel';
    return this.tasks.get(this.currentTask)?.privilegeLevel ?? 'user';
  }
}

// ======================== System Call Interface ========================

export type SyscallHandler = (args: unknown[], line: number) => unknown;

export class SyscallInterface {
  private handlers: Map<string, SyscallHandler> = new Map();
  private privilegeRequired: Map<string, 'kernel' | 'user'> = new Map();

  register(name: string, handler: SyscallHandler, privilege: 'kernel' | 'user' = 'user'): void {
    this.handlers.set(name, handler);
    this.privilegeRequired.set(name, privilege);
  }

  call(name: string, args: unknown[], line: number, currentPrivilege: 'kernel' | 'user'): unknown {
    const handler = this.handlers.get(name);
    if (!handler) throw new SdevError(`Syscall not found: ${name}`, line);
    const required = this.privilegeRequired.get(name) ?? 'user';
    if (required === 'kernel' && currentPrivilege !== 'kernel') {
      throw new SdevError(`Permission denied: syscall '${name}' requires kernel privilege`, line);
    }
    return handler(args, line);
  }

  list(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// ======================== Heap Memory Manager ========================

interface HeapBlock {
  address: number;
  size: number;
  free: boolean;
  data: unknown[];
}

export class HeapManager {
  private blocks: HeapBlock[] = [];
  private nextAddress = 0;
  private totalAllocated = 0;
  private totalFreed = 0;
  private maxHeapSize: number;

  constructor(maxSize = 1_048_576) { // 1MB default
    this.maxHeapSize = maxSize;
  }

  alloc(size: number, line: number): number {
    if (size <= 0) throw new SdevError('Heap: allocation size must be positive', line);
    if (this.totalAllocated - this.totalFreed + size > this.maxHeapSize) {
      throw new SdevError('Heap: out of memory', line);
    }
    // First-fit free block reuse
    for (const block of this.blocks) {
      if (block.free && block.size >= size) {
        block.free = false;
        block.data = new Array(size).fill(null);
        return block.address;
      }
    }
    const address = this.nextAddress;
    this.blocks.push({ address, size, free: false, data: new Array(size).fill(null) });
    this.nextAddress += size;
    this.totalAllocated += size;
    return address;
  }

  free(address: number, line: number): void {
    const block = this.blocks.find(b => b.address === address);
    if (!block) throw new SdevError(`Heap: invalid address ${address}`, line);
    if (block.free) throw new SdevError(`Heap: double free at address ${address}`, line);
    block.free = true;
    this.totalFreed += block.size;
  }

  load(address: number, line: number): unknown {
    for (const block of this.blocks) {
      if (!block.free && address >= block.address && address < block.address + block.size) {
        return block.data[address - block.address];
      }
    }
    throw new SdevError(`Heap: access violation at address ${address}`, line);
  }

  store(address: number, value: unknown, line: number): void {
    for (const block of this.blocks) {
      if (!block.free && address >= block.address && address < block.address + block.size) {
        block.data[address - block.address] = value;
        return;
      }
    }
    throw new SdevError(`Heap: access violation at address ${address}`, line);
  }

  // Mark-and-sweep GC
  gc(roots: Set<number>): number {
    const marked = new Set<number>();
    // Mark phase
    for (const addr of roots) {
      for (const block of this.blocks) {
        if (!block.free && addr >= block.address && addr < block.address + block.size) {
          marked.add(block.address);
        }
      }
    }
    // Sweep phase
    let freed = 0;
    for (const block of this.blocks) {
      if (!block.free && !marked.has(block.address)) {
        block.free = true;
        this.totalFreed += block.size;
        freed++;
      }
    }
    return freed;
  }

  stats(): Record<string, number> {
    const usedBlocks = this.blocks.filter(b => !b.free);
    const freeBlocks = this.blocks.filter(b => b.free);
    return {
      totalAllocated: this.totalAllocated,
      totalFreed: this.totalFreed,
      inUse: this.totalAllocated - this.totalFreed,
      usedBlocks: usedBlocks.length,
      freeBlocks: freeBlocks.length,
      maxHeapSize: this.maxHeapSize,
    };
  }
}

// ======================== Hardware Abstraction Layer ========================

export interface DeviceDriver {
  name: string;
  type: 'keyboard' | 'mouse' | 'timer' | 'display' | 'disk' | 'network';
  read: () => unknown;
  write: (data: unknown) => void;
  status: () => Record<string, unknown>;
}

export class HAL {
  private devices: Map<string, DeviceDriver> = new Map();
  private interruptHandlers: Map<number, SdevFunction> = new Map();
  private pendingInterrupts: number[] = [];
  private eventQueue: { type: string; data: unknown }[] = [];

  registerDevice(device: DeviceDriver): void {
    this.devices.set(device.name, device);
  }

  getDevice(name: string): DeviceDriver | undefined {
    return this.devices.get(name);
  }

  listDevices(): string[] {
    return Array.from(this.devices.keys());
  }

  registerInterrupt(num: number, handler: SdevFunction): void {
    this.interruptHandlers.set(num, handler);
  }

  triggerInterrupt(num: number): void {
    this.pendingInterrupts.push(num);
  }

  processPendingInterrupts(line: number): void {
    while (this.pendingInterrupts.length > 0) {
      const num = this.pendingInterrupts.shift()!;
      const handler = this.interruptHandlers.get(num);
      if (handler) {
        handler.call([num], line);
      }
    }
  }

  pushEvent(type: string, data: unknown): void {
    this.eventQueue.push({ type, data });
  }

  pollEvent(): { type: string; data: unknown } | null {
    return this.eventQueue.shift() ?? null;
  }
}

// ======================== Window Manager ========================

export interface Window {
  id: number;
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  focused: boolean;
  content: string[];
  zIndex: number;
}

export class WindowManager {
  private windows: Map<number, Window> = new Map();
  private nextId = 1;
  private focusedId: number | null = null;

  createWindow(title: string, x: number, y: number, w: number, h: number): number {
    const id = this.nextId++;
    this.windows.set(id, {
      id, title, x, y, width: w, height: h,
      visible: true, focused: false, content: [], zIndex: id,
    });
    this.focusWindow(id);
    return id;
  }

  closeWindow(id: number): boolean {
    const existed = this.windows.delete(id);
    if (this.focusedId === id) this.focusedId = null;
    return existed;
  }

  moveWindow(id: number, x: number, y: number): void {
    const w = this.windows.get(id);
    if (w) { w.x = x; w.y = y; }
  }

  resizeWindow(id: number, width: number, height: number): void {
    const w = this.windows.get(id);
    if (w) { w.width = width; w.height = height; }
  }

  focusWindow(id: number): void {
    this.windows.forEach(w => { w.focused = false; });
    const w = this.windows.get(id);
    if (w) { w.focused = true; this.focusedId = id; }
  }

  setContent(id: number, content: string[]): void {
    const w = this.windows.get(id);
    if (w) w.content = content;
  }

  getWindow(id: number): Window | undefined {
    return this.windows.get(id);
  }

  listWindows(): Window[] {
    return Array.from(this.windows.values()).sort((a, b) => a.zIndex - b.zIndex);
  }
}

// ======================== Kernel ========================

export class Kernel {
  vfs: VirtualFileSystem;
  scheduler: TaskScheduler;
  syscalls: SyscallInterface;
  heap: HeapManager;
  hal: HAL;
  windowManager: WindowManager;
  private privilegeLevel: 'kernel' | 'user' = 'kernel';
  private output: OutputCallback;
  private booted = false;

  constructor(output: OutputCallback) {
    this.output = output;
    this.vfs = new VirtualFileSystem();
    this.scheduler = new TaskScheduler(output);
    this.syscalls = new SyscallInterface();
    this.heap = new HeapManager();
    this.hal = new HAL();
    this.windowManager = new WindowManager();
    this.registerDefaultSyscalls();
    this.registerDefaultDevices();
  }

  private registerDefaultSyscalls(): void {
    const { vfs, heap, scheduler, hal, windowManager } = this;

    // FS syscalls
    this.syscalls.register('fs_read', (args) => vfs.read(String(args[0])));
    this.syscalls.register('fs_read_bytes', (args) => {
      const bytes = vfs.readBytes(String(args[0]));
      return Array.from(bytes);
    });
    this.syscalls.register('fs_write', (args) => { vfs.write(String(args[0]), String(args[1])); return true; });
    this.syscalls.register('fs_append', (args) => { vfs.append(String(args[0]), String(args[1])); return true; });
    this.syscalls.register('fs_mkdir', (args) => { vfs.mkdir(String(args[0])); return true; });
    this.syscalls.register('fs_list', (args) => vfs.list(String(args[0])));
    this.syscalls.register('fs_exists', (args) => vfs.exists(String(args[0])));
    this.syscalls.register('fs_delete', (args) => vfs.delete(String(args[0])));
    this.syscalls.register('fs_stat', (args) => vfs.stat(String(args[0])));

    // Memory syscalls (kernel only)
    this.syscalls.register('mem_alloc', (args, line) => heap.alloc(Number(args[0]), line), 'kernel');
    this.syscalls.register('mem_free', (args, line) => { heap.free(Number(args[0]), line); return null; }, 'kernel');
    this.syscalls.register('mem_load', (args, line) => heap.load(Number(args[0]), line), 'kernel');
    this.syscalls.register('mem_store', (args, line) => { heap.store(Number(args[0]), args[1], line); return null; }, 'kernel');
    this.syscalls.register('mem_stats', () => heap.stats());
    this.syscalls.register('gc', () => heap.gc(new Set()));

    // I/O syscalls
    this.syscalls.register('write', (args) => { this.output(stringify(args[0])); return null; });
    this.syscalls.register('read', () => {
      if (typeof globalThis !== 'undefined' && typeof (globalThis as any).prompt === 'function') {
        return (globalThis as any).prompt('') ?? '';
      }
      return '';
    });

    // Task syscalls
    this.syscalls.register('task_create', (args, line) => {
      const fn = args[0] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('task_create: argument must be a function', line);
      return scheduler.createTask(fn, String(args[1] ?? ''), Number(args[2] ?? 0));
    });
    this.syscalls.register('task_kill', (args) => scheduler.killTask(Number(args[0])));
    this.syscalls.register('task_yield', () => { scheduler.yieldCurrent(); return null; });
    this.syscalls.register('task_list', () => scheduler.listTasks().map(t => ({
      id: t.id, name: t.name, state: t.state, priority: t.priority, privilege: t.privilegeLevel
    })));

    // Device syscalls
    this.syscalls.register('dev_list', () => hal.listDevices());
    this.syscalls.register('dev_read', (args, line) => {
      const dev = hal.getDevice(String(args[0]));
      if (!dev) throw new SdevError(`Device not found: ${args[0]}`, line);
      return dev.read();
    });
    this.syscalls.register('dev_write', (args, line) => {
      const dev = hal.getDevice(String(args[0]));
      if (!dev) throw new SdevError(`Device not found: ${args[0]}`, line);
      dev.write(args[1]);
      return null;
    });

    // Window syscalls
    this.syscalls.register('win_create', (args) =>
      windowManager.createWindow(String(args[0]), Number(args[1]??0), Number(args[2]??0), Number(args[3]??400), Number(args[4]??300)));
    this.syscalls.register('win_close', (args) => windowManager.closeWindow(Number(args[0])));
    this.syscalls.register('win_move', (args) => { windowManager.moveWindow(Number(args[0]), Number(args[1]), Number(args[2])); return null; });
    this.syscalls.register('win_resize', (args) => { windowManager.resizeWindow(Number(args[0]), Number(args[1]), Number(args[2])); return null; });
    this.syscalls.register('win_focus', (args) => { windowManager.focusWindow(Number(args[0])); return null; });
    this.syscalls.register('win_list', () => windowManager.listWindows().map(w => ({
      id: w.id, title: w.title, x: w.x, y: w.y, width: w.width, height: w.height, focused: w.focused
    })));

    // Time
    this.syscalls.register('time', () => Date.now());
    this.syscalls.register('uptime', () => this.booted ? Date.now() : 0);

    // Interrupt
    this.syscalls.register('interrupt', (args, line) => {
      const num = Number(args[0]);
      const handler = args[1] as SdevFunction;
      if (!handler || typeof handler !== 'object' || !('call' in handler)) throw new SdevError('interrupt handler must be a function', line);
      hal.registerInterrupt(num, handler);
      return null;
    }, 'kernel');

    // Privilege
    this.syscalls.register('get_privilege', () => this.privilegeLevel);
    this.syscalls.register('set_privilege', (args, line) => {
      const level = String(args[0]);
      if (level !== 'kernel' && level !== 'user') throw new SdevError('Invalid privilege level', line);
      if (this.privilegeLevel !== 'kernel') throw new SdevError('Permission denied: only kernel can change privilege', line);
      this.privilegeLevel = level as 'kernel' | 'user';
      return null;
    }, 'kernel');

    // Panic
    this.syscalls.register('panic', (args, line) => {
      const msg = args.length > 0 ? stringify(args[0]) : 'kernel panic';
      this.output(`\n========================================`);
      this.output(`  KERNEL PANIC: ${msg}`);
      this.output(`========================================`);
      this.output(`  System halted.`);
      throw new SdevError(`KERNEL PANIC: ${msg}`, line);
    }, 'kernel');
  }

  private registerDefaultDevices(): void {
    // Virtual keyboard
    const keyBuffer: string[] = [];
    this.hal.registerDevice({
      name: 'keyboard',
      type: 'keyboard',
      read: () => keyBuffer.shift() ?? null,
      write: (data) => { keyBuffer.push(String(data)); },
      status: () => ({ buffered: keyBuffer.length }),
    });

    // Virtual display
    const displayBuffer: string[] = [];
    this.hal.registerDevice({
      name: 'display',
      type: 'display',
      read: () => [...displayBuffer],
      write: (data) => { displayBuffer.push(String(data)); },
      status: () => ({ lines: displayBuffer.length }),
    });

    // Virtual timer
    let timerTicks = 0;
    this.hal.registerDevice({
      name: 'timer',
      type: 'timer',
      read: () => timerTicks,
      write: () => { timerTicks++; },
      status: () => ({ ticks: timerTicks, time: Date.now() }),
    });

    // Virtual disk (backed by VFS)
    this.hal.registerDevice({
      name: 'disk0',
      type: 'disk',
      read: () => this.vfs.toTome(),
      write: () => {},
      status: () => ({ type: 'virtual', mounted: true }),
    });
  }

  boot(): void {
    this.booted = true;
    this.output('[KERNEL] sdev OS booting...');
    this.output('[KERNEL] VFS initialized');
    this.output('[KERNEL] Task scheduler ready');
    this.output('[KERNEL] Syscall interface registered');
    this.output('[KERNEL] HAL: ' + this.hal.listDevices().join(', '));
    this.output('[KERNEL] Window manager ready');
    this.output('[KERNEL] Boot complete.');

    // Write boot log
    this.vfs.write('/var/log/boot.log', [
      `sdev OS boot at ${new Date().toISOString()}`,
      `Devices: ${this.hal.listDevices().join(', ')}`,
      `Syscalls: ${this.syscalls.list().join(', ')}`,
    ].join('\n'));
  }

  getPrivilege(): 'kernel' | 'user' {
    return this.privilegeLevel;
  }

  setPrivilege(level: 'kernel' | 'user'): void {
    this.privilegeLevel = level;
  }
}

// ======================== Create Kernel Builtins ========================

export function createKernelBuiltins(output: OutputCallback): { builtins: Map<string, SdevFunction>; kernel: Kernel } {
  const kernel = new Kernel(output);
  const builtins = new Map<string, SdevFunction>();

  // syscall(name, ...args)
  builtins.set('syscall', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('syscall() requires at least 1 argument (name)', line);
      const name = String(args[0]);
      return kernel.syscalls.call(name, args.slice(1), line, kernel.getPrivilege());
    },
  });

  // Boot
  builtins.set('kernelBoot', {
    type: 'builtin',
    call: () => { kernel.boot(); return true; },
  });

  // VFS shortcuts
  builtins.set('fsRead', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fsRead() takes 1 argument', line);
      return kernel.vfs.read(String(args[0]));
    },
  });

  builtins.set('fsWrite', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('fsWrite() takes 2 arguments (path, content)', line);
      kernel.vfs.write(String(args[0]), String(args[1]));
      return true;
    },
  });

  builtins.set('fsList', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fsList() takes 1 argument', line);
      return kernel.vfs.list(String(args[0]));
    },
  });

  builtins.set('fsMkdir', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fsMkdir() takes 1 argument', line);
      kernel.vfs.mkdir(String(args[0]));
      return true;
    },
  });

  builtins.set('fsDelete', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fsDelete() takes 1 argument', line);
      return kernel.vfs.delete(String(args[0]));
    },
  });

  builtins.set('fsExists', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fsExists() takes 1 argument', line);
      return kernel.vfs.exists(String(args[0]));
    },
  });

  builtins.set('fsStat', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('fsStat() takes 1 argument', line);
      return kernel.vfs.stat(String(args[0]));
    },
  });

  builtins.set('fsAppend', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('fsAppend() takes 2 arguments', line);
      kernel.vfs.append(String(args[0]), String(args[1]));
      return true;
    },
  });

  // Task shortcuts
  builtins.set('createTask', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const fn = args[0] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) throw new SdevError('createTask() requires a function', line);
      return kernel.scheduler.createTask(fn, String(args[1] ?? ''), Number(args[2] ?? 0));
    },
  });

  builtins.set('killTask', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('killTask() takes 1 argument', line);
      return kernel.scheduler.killTask(Number(args[0]));
    },
  });

  builtins.set('yieldTask', {
    type: 'builtin',
    call: () => { kernel.scheduler.yieldCurrent(); return null; },
  });

  builtins.set('taskList', {
    type: 'builtin',
    call: () => kernel.scheduler.listTasks().map(t => ({
      id: t.id, name: t.name, state: t.state, priority: t.priority
    })),
  });

  builtins.set('runTasks', {
    type: 'builtin',
    call: (_args: unknown[], line: number) => { kernel.scheduler.runAll(line); return null; },
  });

  // Heap
  builtins.set('heapAlloc', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('heapAlloc() takes 1 argument (size)', line);
      return kernel.heap.alloc(Number(args[0]), line);
    },
  });

  builtins.set('heapFree', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('heapFree() takes 1 argument (address)', line);
      kernel.heap.free(Number(args[0]), line);
      return null;
    },
  });

  builtins.set('heapLoad', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('heapLoad() takes 1 argument (address)', line);
      return kernel.heap.load(Number(args[0]), line);
    },
  });

  builtins.set('heapStore', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('heapStore() takes 2 arguments (address, value)', line);
      kernel.heap.store(Number(args[0]), args[1], line);
      return null;
    },
  });

  builtins.set('heapStats', {
    type: 'builtin',
    call: () => kernel.heap.stats(),
  });

  builtins.set('gc', {
    type: 'builtin',
    call: () => kernel.heap.gc(new Set()),
  });

  // Window manager
  builtins.set('createWindow', {
    type: 'builtin',
    call: (args: unknown[]) => {
      return kernel.windowManager.createWindow(
        String(args[0] ?? 'Window'),
        Number(args[1] ?? 0), Number(args[2] ?? 0),
        Number(args[3] ?? 400), Number(args[4] ?? 300)
      );
    },
  });

  builtins.set('closeWindow', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('closeWindow() takes 1 argument', line);
      return kernel.windowManager.closeWindow(Number(args[0]));
    },
  });

  builtins.set('moveWindow', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('moveWindow() takes 3 arguments (id, x, y)', line);
      kernel.windowManager.moveWindow(Number(args[0]), Number(args[1]), Number(args[2]));
      return null;
    },
  });

  builtins.set('resizeWindow', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 3) throw new SdevError('resizeWindow() takes 3 arguments (id, w, h)', line);
      kernel.windowManager.resizeWindow(Number(args[0]), Number(args[1]), Number(args[2]));
      return null;
    },
  });

  builtins.set('windowList', {
    type: 'builtin',
    call: () => kernel.windowManager.listWindows().map(w => ({
      id: w.id, title: w.title, x: w.x, y: w.y, width: w.width, height: w.height, focused: w.focused
    })),
  });

  // HAL
  builtins.set('deviceList', {
    type: 'builtin',
    call: () => kernel.hal.listDevices(),
  });

  builtins.set('deviceRead', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('deviceRead() takes 1 argument', line);
      const dev = kernel.hal.getDevice(String(args[0]));
      if (!dev) throw new SdevError(`Device not found: ${args[0]}`, line);
      return dev.read();
    },
  });

  builtins.set('deviceWrite', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('deviceWrite() takes 2 arguments', line);
      const dev = kernel.hal.getDevice(String(args[0]));
      if (!dev) throw new SdevError(`Device not found: ${args[0]}`, line);
      dev.write(args[1]);
      return null;
    },
  });

  builtins.set('deviceStatus', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('deviceStatus() takes 1 argument', line);
      const dev = kernel.hal.getDevice(String(args[0]));
      if (!dev) throw new SdevError(`Device not found: ${args[0]}`, line);
      return dev.status();
    },
  });

  // Interrupt registration
  builtins.set('onInterrupt', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('onInterrupt() takes 2 arguments (num, handler)', line);
      const handler = args[1] as SdevFunction;
      if (!handler || typeof handler !== 'object' || !('call' in handler)) throw new SdevError('Second argument must be a function', line);
      kernel.hal.registerInterrupt(Number(args[0]), handler);
      return null;
    },
  });

  builtins.set('triggerInterrupt', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('triggerInterrupt() takes 1 argument', line);
      kernel.hal.triggerInterrupt(Number(args[0]));
      kernel.hal.processPendingInterrupts(line);
      return null;
    },
  });

  // Privilege
  builtins.set('getPrivilege', {
    type: 'builtin',
    call: () => kernel.getPrivilege(),
  });

  builtins.set('setPrivilege', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const level = String(args[0]);
      if (level !== 'kernel' && level !== 'user') throw new SdevError('Invalid privilege level', line);
      if (kernel.getPrivilege() !== 'kernel') throw new SdevError('Permission denied', line);
      kernel.setPrivilege(level as 'kernel' | 'user');
      return null;
    },
  });

  // Typed arrays
  const typedArrayFactory = (TypedArrayCtor: any, typeName: string): SdevFunction => ({
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError(`${typeName}() takes 1 argument (size)`, line);
      const size = Math.trunc(Number(args[0]));
      const data = new TypedArrayCtor(size);
      const obj: Record<string, unknown> = { _type: typeName, length: size };
      obj.get = { type: 'builtin', call: (a: unknown[]) => data[a[0] as number] } as SdevFunction;
      obj.set = { type: 'builtin', call: (a: unknown[]) => { data[a[0] as number] = a[1] as number; return null; } } as SdevFunction;
      obj.fill = { type: 'builtin', call: (a: unknown[]) => { data.fill(a[0] as number); return null; } } as SdevFunction;
      obj.toList = { type: 'builtin', call: () => Array.from(data) } as SdevFunction;
      obj.slice = { type: 'builtin', call: (a: unknown[]) => Array.from(data.slice(a[0] as number, a[1] as number)) } as SdevFunction;
      obj.size = { type: 'builtin', call: () => size } as SdevFunction;
      obj.copyTo = { type: 'builtin', call: (a: unknown[], l: number) => {
        const target = a[0] as Record<string, unknown>;
        if (!target || !target._type) throw new SdevError('Target must be a typed array', l);
        return null;
      }} as SdevFunction;
      return obj;
    },
  });

  builtins.set('u8', typedArrayFactory(Uint8Array, 'u8'));
  builtins.set('u16', typedArrayFactory(Uint16Array, 'u16'));
  builtins.set('u32', typedArrayFactory(Uint32Array, 'u32'));
  builtins.set('i8', typedArrayFactory(Int8Array, 'i8'));
  builtins.set('i16', typedArrayFactory(Int16Array, 'i16'));
  builtins.set('i32', typedArrayFactory(Int32Array, 'i32'));
  builtins.set('f32', typedArrayFactory(Float32Array, 'f32'));
  builtins.set('f64', typedArrayFactory(Float64Array, 'f64'));

  // Event system
  const eventHandlers: Map<string, SdevFunction[]> = new Map();

  builtins.set('onEvent', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('onEvent() takes 2 arguments (event, handler)', line);
      const event = String(args[0]);
      const handler = args[1] as SdevFunction;
      if (!handler || typeof handler !== 'object' || !('call' in handler)) throw new SdevError('Second argument must be a function', line);
      if (!eventHandlers.has(event)) eventHandlers.set(event, []);
      eventHandlers.get(event)!.push(handler);
      return null;
    },
  });

  builtins.set('emitEvent', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('emitEvent() takes at least 1 argument', line);
      const event = String(args[0]);
      const data = args.slice(1);
      const handlers = eventHandlers.get(event);
      if (handlers) {
        for (const h of handlers) h.call(data, line);
      }
      return null;
    },
  });

  // Module loader (simulated)
  builtins.set('loadModule', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('loadModule() takes 1 argument (path)', line);
      const path = String(args[0]);
      if (kernel.vfs.exists(path)) {
        return kernel.vfs.read(path);
      }
      throw new SdevError(`Module not found: ${path}`, line);
    },
  });

  // getTime
  builtins.set('getTime', { type: 'builtin', call: () => Date.now() });

  return { builtins, kernel };
}
