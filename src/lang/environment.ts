import { SdevError } from './errors';

export class Environment {
  private values: Map<string, unknown> = new Map();
  private fixed: Set<string> | null = null;
  private parent?: Environment;

  constructor(parent?: Environment) {
    this.parent = parent;
  }

  define(name: string, value: unknown): void {
    this.values.set(name, value);
  }

  defineFixed(name: string, value: unknown): void {
    this.values.set(name, value);
    if (this.fixed === null) this.fixed = new Set();
    this.fixed.add(name);
  }

  isFixed(name: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Environment | undefined = this;
    while (cur !== undefined) {
      if (cur.fixed !== null && cur.fixed.has(name)) return true;
      cur = cur.parent;
    }
    return false;
  }

  hasOwn(name: string): boolean {
    return this.values.has(name);
  }

  get(name: string, line: number): unknown {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Environment | undefined = this;
    while (cur !== undefined) {
      const v = cur.values.get(name);
      if (v !== undefined || cur.values.has(name)) {
        return v;
      }
      cur = cur.parent;
    }
    throw new SdevError(`Undefined variable: '${name}'`, line);
  }

  set(name: string, value: unknown, line: number): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Environment | undefined = this;
    while (cur !== undefined) {
      if (cur.values.has(name)) {
        if (cur.fixed !== null && cur.fixed.has(name)) {
          throw new SdevError(`Cannot reassign fixed variable '${name}'`, line);
        }
        cur.values.set(name, value);
        return;
      }
      cur = cur.parent;
    }
    throw new SdevError(`Undefined variable: '${name}'`, line);
  }

  has(name: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let cur: Environment | undefined = this;
    while (cur !== undefined) {
      if (cur.values.has(name)) return true;
      cur = cur.parent;
    }
    return false;
  }
}
