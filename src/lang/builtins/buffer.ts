import { SdevFunction, OutputCallback, stringify, isTruthy, toNumber } from './utils';
import { SdevError } from '../errors';

export function registerBuffer(builtins: Map<string, SdevFunction>, output: OutputCallback): void {

  // ============= Buffer / Byte Array =============

  // buffer(size) - create a byte buffer
  builtins.set('buffer', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('buffer() takes 1 argument (size)', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      const size = Math.trunc(args[0]);
      const data = new Uint8Array(size);
      const obj: Record<string, unknown> = {};
      obj._type = 'buffer';
      obj._data = data;
      obj.size = { type: 'builtin', call: () => size } as SdevFunction;
      obj.get = { type: 'builtin', call: (a: unknown[], l: number) => {
        const i = a[0] as number;
        if (i < 0 || i >= size) throw new SdevError('Buffer index out of bounds', l);
        return data[i];
      } } as SdevFunction;
      obj.set = { type: 'builtin', call: (a: unknown[], l: number) => {
        const i = a[0] as number;
        const v = a[1] as number;
        if (i < 0 || i >= size) throw new SdevError('Buffer index out of bounds', l);
        data[i] = v & 0xFF;
        return null;
      } } as SdevFunction;
      obj.fill = { type: 'builtin', call: (a: unknown[]) => { data.fill(a[0] as number & 0xFF); return null; } } as SdevFunction;
      obj.slice = { type: 'builtin', call: (a: unknown[]) => {
        const start = (a[0] as number) || 0;
        const end = (a[1] as number) || size;
        return Array.from(data.slice(start, end));
      } } as SdevFunction;
      obj.toList = { type: 'builtin', call: () => Array.from(data) } as SdevFunction;
      obj.toText = { type: 'builtin', call: () => new TextDecoder().decode(data) } as SdevFunction;
      obj.fromString = { type: 'builtin', call: (a: unknown[]) => {
        const bytes = new TextEncoder().encode(a[0] as string);
        data.set(bytes.slice(0, size));
        return null;
      } } as SdevFunction;
      obj.copyTo = { type: 'builtin', call: (a: unknown[], l: number) => {
        const target = a[0] as Record<string, unknown>;
        if (!target || target._type !== 'buffer') throw new SdevError('Target must be a buffer', l);
        (target._data as Uint8Array).set(data.slice(0, (target._data as Uint8Array).length));
        return null;
      } } as SdevFunction;
      return obj;
    },
  });

  // ============= Pointer-like References =============

  // pointer(buffer, offset) - create a reference to a buffer position
  builtins.set('pointer', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('pointer() takes 2 arguments (buffer, offset)', line);
      const buf = args[0] as Record<string, unknown>;
      if (!buf || buf._type !== 'buffer') throw new SdevError('First argument must be a buffer', line);
      const offset = args[1] as number;
      const data = buf._data as Uint8Array;
      const obj: Record<string, unknown> = {};
      obj._type = 'pointer';
      obj.offset = offset;
      obj.read = { type: 'builtin', call: () => data[offset] ?? 0 } as SdevFunction;
      obj.write = { type: 'builtin', call: (a: unknown[]) => { data[offset] = (a[0] as number) & 0xFF; return null; } } as SdevFunction;
      obj.advance = { type: 'builtin', call: (a: unknown[]) => {
        const newOffset = offset + (a.length > 0 ? (a[0] as number) : 1);
        return (builtins.get('pointer') as SdevFunction).call([buf, newOffset], line);
      } } as SdevFunction;
      obj.readU16 = { type: 'builtin', call: () => data[offset] | (data[offset + 1] << 8) } as SdevFunction;
      obj.readU32 = { type: 'builtin', call: () => data[offset] | (data[offset+1]<<8) | (data[offset+2]<<16) | (data[offset+3]<<24) } as SdevFunction;
      obj.writeU16 = { type: 'builtin', call: (a: unknown[]) => { const v = a[0] as number; data[offset]=v&0xFF; data[offset+1]=(v>>8)&0xFF; return null; } } as SdevFunction;
      obj.writeU32 = { type: 'builtin', call: (a: unknown[]) => { const v = a[0] as number; data[offset]=v&0xFF; data[offset+1]=(v>>8)&0xFF; data[offset+2]=(v>>16)&0xFF; data[offset+3]=(v>>24)&0xFF; return null; } } as SdevFunction;
      return obj;
    },
  });
}
