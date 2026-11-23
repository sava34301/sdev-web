import { SdevFunction, toNumber } from './utils';
import { SdevError } from '../core/errors';
import { lazyModuleRunner } from '../runtime/sdev-module';
import SDEV_TEXT_SRC from '../../../lang/stdlib/v2/text.sdev?raw';
import SDEV_BITS_SRC from '../../../lang/stdlib/v2/bits.sdev?raw';
import SDEV_BUFFER_SRC from '../../../lang/stdlib/v2/buffer.sdev?raw';

const getBufRunner = lazyModuleRunner(SDEV_TEXT_SRC, SDEV_BITS_SRC, SDEV_BUFFER_SRC);

export function registerBuffer(builtins: Map<string, SdevFunction>): void {
  builtins.set('buffer', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 1) throw new SdevError('buffer() takes 1 argument (size)', line);
      if (typeof args[0] !== 'number') throw new SdevError('Argument must be a number', line);
      const size = Math.trunc(args[0]);
      const data = new Uint8Array(size);
      const sdevList = new Array<number>(size).fill(0);
      const syncFromList = () => { for (let i = 0; i < size; i++) data[i] = sdevList[i] & 0xff; };
      const syncToList = () => { for (let i = 0; i < size; i++) sdevList[i] = data[i]; };
      const obj: Record<string, unknown> = {};
      obj._type = 'buffer';
      obj._data = data;
      obj.size = { type: 'builtin', call: () => getBufRunner().call('buf_len', sdevList) } as SdevFunction;
      obj.get = { type: 'builtin', call: (a: unknown[], l: number) => {
        const i = a[0] as number;
        if (i < 0 || i >= size) throw new SdevError('Buffer index out of bounds', l);
        syncToList();
        return getBufRunner().call('buf_get', sdevList, i);
      } } as SdevFunction;
      obj.set = { type: 'builtin', call: (a: unknown[], l: number) => {
        const i = a[0] as number;
        const v = a[1] as number;
        if (i < 0 || i >= size) throw new SdevError('Buffer index out of bounds', l);
        getBufRunner().call('buf_set', sdevList, i, v);
        syncFromList();
        return null;
      } } as SdevFunction;
      obj.fill = { type: 'builtin', call: (a: unknown[]) => {
        getBufRunner().call('mem_arena_fill', sdevList, 0, size, a[0] as number);
        syncFromList();
        return null;
      } } as SdevFunction;
      obj.slice = { type: 'builtin', call: (a: unknown[]) => {
        syncToList();
        return getBufRunner().call('buf_slice', sdevList, (a[0] as number) || 0, (a[1] as number) || size);
      } } as SdevFunction;
      obj.toList = { type: 'builtin', call: () => Array.from(data) } as SdevFunction;
      obj.toText = { type: 'builtin', call: () => {
        syncToList();
        return getBufRunner().callStr('buf_to_str', sdevList);
      } } as SdevFunction;
      obj.fromString = { type: 'builtin', call: (a: unknown[]) => {
        const list = getBufRunner().call('buf_from_str', String(a[0] ?? '')) as number[];
        data.fill(0);
        for (let i = 0; i < Math.min(size, list.length); i++) data[i] = list[i] & 0xff;
        syncToList();
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

  builtins.set('pointer', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length !== 2) throw new SdevError('pointer() takes 2 arguments (buffer, offset)', line);
      const buf = args[0] as Record<string, unknown>;
      if (!buf || buf._type !== 'buffer') throw new SdevError('First argument must be a buffer', line);
      const offset = args[1] as number;
      const data = buf._data as Uint8Array;
      const bytesView = () => Array.from(data);
      const obj: Record<string, unknown> = {};
      obj._type = 'pointer';
      obj.offset = offset;
      obj.read = { type: 'builtin', call: () => getBufRunner().call('mem_arena_peek_u8', bytesView(), offset) } as SdevFunction;
      obj.write = { type: 'builtin', call: (a: unknown[]) => {
        const b = bytesView();
        getBufRunner().call('mem_arena_poke_u8', b, offset, a[0] as number);
        data[offset] = b[offset];
        return null;
      } } as SdevFunction;
      obj.advance = { type: 'builtin', call: (a: unknown[]) => {
        const newOffset = offset + (a.length > 0 ? (a[0] as number) : 1);
        return (builtins.get('pointer') as SdevFunction).call([buf, newOffset], line);
      } } as SdevFunction;
      obj.readU16 = { type: 'builtin', call: () => data[offset] | (data[offset + 1] << 8) } as SdevFunction;
      obj.readU32 = { type: 'builtin', call: () => data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24) } as SdevFunction;
      obj.writeU16 = { type: 'builtin', call: (a: unknown[]) => {
        const b = bytesView();
        getBufRunner().call('mem_arena_poke_i16', b, offset, a[0] as number);
        data[offset] = b[offset]; data[offset + 1] = b[offset + 1];
        return null;
      } } as SdevFunction;
      obj.writeU32 = { type: 'builtin', call: (a: unknown[]) => {
        const b = bytesView();
        getBufRunner().call('mem_arena_poke_i32', b, offset, a[0] as number);
        data[offset] = b[offset]; data[offset + 1] = b[offset + 1]; data[offset + 2] = b[offset + 2]; data[offset + 3] = b[offset + 3];
        return null;
      } } as SdevFunction;
      return obj;
    },
  });

  interface ArenaRecord {
    bytes: number[];
    offset: number;
    cap: number;
    _sdevArena: unknown[];
  }

  const syncArenaToState = (a: ArenaRecord) => {
    a.offset = Number(a._sdevArena[2]);
  };

  builtins.set('arena_create', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const cap = toNumber(args[0], line);
      const raw = getBufRunner().call('mem_arena_new', cap) as [number[], number, number];
      return { bytes: raw[0], cap: raw[1], offset: raw[2], _sdevArena: raw };
    },
  });

  builtins.set('arena_alloc', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      const n = toNumber(args[1], line);
      if (!a || typeof a !== 'object') throw new SdevError('First argument must be an arena', line);
      const ptr = getBufRunner().call('mem_arena_alloc', a._sdevArena, n);
      syncArenaToState(a);
      return ptr;
    },
  });

  builtins.set('arena_reset', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      if (!a || typeof a !== 'object') throw new SdevError('First argument must be an arena', line);
      getBufRunner().call('mem_arena_reset', a._sdevArena);
      syncArenaToState(a);
      return 0;
    },
  });

  builtins.set('mem_poke_u8', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_poke_u8', a.bytes, toNumber(args[1], line), toNumber(args[2], line));
    },
  });

  builtins.set('mem_peek_u8', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_peek_u8', a.bytes, toNumber(args[1], line));
    },
  });

  builtins.set('mem_poke_i16', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_poke_i16', a.bytes, toNumber(args[1], line), toNumber(args[2], line));
    },
  });

  builtins.set('mem_peek_i16', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_peek_i16', a.bytes, toNumber(args[1], line));
    },
  });

  builtins.set('mem_poke_i32', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_poke_i32', a.bytes, toNumber(args[1], line), toNumber(args[2], line));
    },
  });

  builtins.set('mem_peek_i32', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_peek_i32', a.bytes, toNumber(args[1], line));
    },
  });

  builtins.set('mem_fill', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_fill', a.bytes, toNumber(args[1], line), toNumber(args[2], line), toNumber(args[3], line));
    },
  });

  builtins.set('mem_copy', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      const a = args[0] as ArenaRecord;
      return getBufRunner().call('mem_arena_copy', a.bytes, toNumber(args[1], line), toNumber(args[2], line), toNumber(args[3], line));
    },
  });
}
