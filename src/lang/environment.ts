import { SdevError } from './errors';

export class Environment {
  private values: Map<string, unknown> = new Map();
  private fixed: Set<string> = new Set();
  private parent?: Environment;

  constructor(parent?: Environment) {
    this.parent = parent;
  }

  define(name: string, value: unknown): void {
    this.values.set(name, value);
  }

  defineFixed(name: string, value: unknown): void {
    this.values.set(name, value);
    this.fixed.add(name);
  }

  isFixed(name: string): boolean {
    if (this.fixed.has(name)) return true;
    if (this.parent) return this.parent.isFixed(name);
    return false;
  }

  hasOwn(name: string): boolean {
    return this.values.has(name);
  }

  get(name: string, line: number): unknown {
    if (this.values.has(name)) {
      return this.values.get(name);
    }
    if (this.parent) {
      return this.parent.get(name, line);
    }
    throw new SdevError(`Undefined variable: '${name}'`, line);
  }

  set(name: string, value: unknown, line: number): void {
    if (this.values.has(name)) {
      if (this.fixed.has(name)) {
        throw new SdevError(`Cannot reassign fixed variable '${name}'`, line);
      }
      this.values.set(name, value);
      return;
    }
    if (this.parent) {
      if (this.parent.isFixed(name)) {
        throw new SdevError(`Cannot reassign fixed variable '${name}'`, line);
      }
      this.parent.set(name, value, line);
      return;
    }
    throw new SdevError(`Undefined variable: '${name}'`, line);
  }

  has(name: string): boolean {
    if (this.values.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
}
