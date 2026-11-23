import { SdevFunction, stringify, isTruthy } from './utils';
import { SdevError } from '../core/errors';

export function registerSql(builtins: Map<string, SdevFunction>): void {
  // sql_select(records, cols) - project specific columns
  builtins.set('sql_select', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_select() takes 2 arguments: (records, columns)', line);
      const records = args[0];
      if (!Array.isArray(records)) throw new SdevError('First argument must be a list of records', line);
      
      let colList: string[] = [];
      if (typeof args[1] === 'string') {
        colList = args[1].split(',').map((s) => s.trim()).filter(Boolean);
      } else if (Array.isArray(args[1])) {
        colList = args[1].map((s) => stringify(s));
      } else {
        throw new SdevError('Columns must be a list of column names or comma-separated string', line);
      }

      if (colList.includes('*')) {
        return records.map((r) => (r && typeof r === 'object' ? { ...r } : r));
      }

      return records.map((row) => {
        if (!row || typeof row !== 'object') return {};
        const obj: Record<string, unknown> = {};
        for (const col of colList) {
          if (col in (row as Record<string, unknown>)) {
            obj[col] = (row as Record<string, unknown>)[col];
          }
        }
        return obj;
      });
    },
  });

  // sql_where(records, predicate) - filter records by condition
  builtins.set('sql_where', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_where() takes 2 arguments: (records, predicate_fn)', line);
      const records = args[0];
      if (!Array.isArray(records)) throw new SdevError('First argument must be a list of records', line);
      const fn = args[1] as SdevFunction;
      if (!fn || typeof fn !== 'object' || !('call' in fn)) {
        throw new SdevError('Second argument must be a predicate function', line);
      }

      return records.filter((row) => {
        const res = fn.call([row], line);
        return isTruthy(res);
      });
    },
  });

  // sql_order_by(records, key, ascending = true) - order records
  builtins.set('sql_order_by', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_order_by() takes at least 2 arguments: (records, key, [ascending])', line);
      const records = args[0];
      if (!Array.isArray(records)) throw new SdevError('First argument must be a list of records', line);
      const key = stringify(args[1]);
      const asc = args[2] === undefined ? true : isTruthy(args[2]);

      const copy = [...records];
      copy.sort((a, b) => {
        const va = (a && typeof a === 'object') ? (a as Record<string, unknown>)[key] : undefined;
        const vb = (b && typeof b === 'object') ? (b as Record<string, unknown>)[key] : undefined;
        if (va === vb) return 0;
        if (va === undefined || va === null) return asc ? -1 : 1;
        if (vb === undefined || vb === null) return asc ? 1 : -1;
        if (typeof va === 'number' && typeof vb === 'number') {
          return asc ? va - vb : vb - va;
        }
        const sa = stringify(va);
        const sb = stringify(vb);
        return asc ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
      return copy;
    },
  });

  // sql_limit(records, count, offset = 0) - slice records
  builtins.set('sql_limit', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_limit() takes at least 2 arguments: (records, count, [offset])', line);
      const records = args[0];
      if (!Array.isArray(records)) throw new SdevError('First argument must be a list of records', line);
      const count = Math.max(0, Math.floor(Number(args[1]) || 0));
      const offset = Math.max(0, Math.floor(Number(args[2]) || 0));
      return records.slice(offset, offset + count);
    },
  });

  // sql_distinct(records, key?) - de-duplicate records
  builtins.set('sql_distinct', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('sql_distinct() takes at least 1 argument: (records, [key])', line);
      const records = args[0];
      if (!Array.isArray(records)) throw new SdevError('First argument must be a list of records', line);
      const key = args[1] !== undefined ? stringify(args[1]) : null;

      const seen = new Set<string>();
      const out: unknown[] = [];
      for (const row of records) {
        const repr = key
          ? stringify((row && typeof row === 'object') ? (row as Record<string, unknown>)[key] : row)
          : JSON.stringify(row);
        if (!seen.has(repr)) {
          seen.add(repr);
          out.push(row);
        }
      }
      return out;
    },
  });

  // sql_join(left, right, onKey, type = 'inner') - relational join
  builtins.set('sql_join', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 3) throw new SdevError('sql_join() takes at least 3 arguments: (left, right, on_key, [join_type])', line);
      const left = args[0];
      const right = args[1];
      if (!Array.isArray(left) || !Array.isArray(right)) throw new SdevError('Left and right must be lists of records', line);
      
      let leftKey = '';
      let rightKey = '';
      if (Array.isArray(args[2])) {
        leftKey = stringify(args[2][0]);
        rightKey = stringify(args[2][1] ?? args[2][0]);
      } else {
        leftKey = stringify(args[2]);
        rightKey = leftKey;
      }

      const joinType = args[3] ? stringify(args[3]).toLowerCase() : 'inner';

      // Index right records by join key
      const rightMap = new Map<string, Record<string, unknown>[]>();
      for (const r of right) {
        if (!r || typeof r !== 'object') continue;
        const k = stringify((r as Record<string, unknown>)[rightKey]);
        const list = rightMap.get(k) ?? [];
        list.push(r as Record<string, unknown>);
        rightMap.set(k, list);
      }

      const out: Record<string, unknown>[] = [];
      for (const l of left) {
        if (!l || typeof l !== 'object') continue;
        const k = stringify((l as Record<string, unknown>)[leftKey]);
        const matches = rightMap.get(k);
        if (matches && matches.length > 0) {
          for (const m of matches) {
            out.push({ ...(m as Record<string, unknown>), ...(l as Record<string, unknown>) });
          }
        } else if (joinType === 'left') {
          out.push({ ...(l as Record<string, unknown>) });
        }
      }
      return out;
    },
  });

  // sql_group_by(records, key, aggCol, aggType) - group and aggregate
  builtins.set('sql_group_by', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 4) throw new SdevError('sql_group_by() takes 4 arguments: (records, key, agg_col, agg_type)', line);
      const records = args[0];
      if (!Array.isArray(records)) throw new SdevError('First argument must be a list of records', line);
      const groupKey = stringify(args[1]);
      const aggCol = stringify(args[2]);
      const aggType = stringify(args[3]).toLowerCase();

      const groups = new Map<string, { group: unknown; values: number[] }>();
      for (const row of records) {
        if (!row || typeof row !== 'object') continue;
        const gVal = (row as Record<string, unknown>)[groupKey];
        const gKey = stringify(gVal);
        const entry = groups.get(gKey) ?? { group: gVal, values: [] };
        const numVal = Number((row as Record<string, unknown>)[aggCol]);
        if (!isNaN(numVal)) entry.values.push(numVal);
        groups.set(gKey, entry);
      }

      const out: Record<string, unknown>[] = [];
      for (const [_, entry] of groups) {
        let aggVal = 0;
        if (aggType === 'sum') {
          aggVal = entry.values.reduce((a, b) => a + b, 0);
        } else if (aggType === 'avg') {
          aggVal = entry.values.length ? entry.values.reduce((a, b) => a + b, 0) / entry.values.length : 0;
        } else if (aggType === 'min') {
          aggVal = entry.values.length ? Math.min(...entry.values) : 0;
        } else if (aggType === 'max') {
          aggVal = entry.values.length ? Math.max(...entry.values) : 0;
        } else if (aggType === 'count') {
          aggVal = entry.values.length;
        }
        out.push({
          [groupKey]: entry.group,
          [aggType]: aggVal,
          count: entry.values.length,
        });
      }
      return out;
    },
  });

  // sql_count(records)
  builtins.set('sql_count', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 1) throw new SdevError('sql_count() takes 1 argument: (records)', line);
      return Array.isArray(args[0]) ? args[0].length : 0;
    },
  });

  // sql_sum(records, col)
  builtins.set('sql_sum', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_sum() takes 2 arguments: (records, col)', line);
      const records = args[0];
      if (!Array.isArray(records)) return 0;
      const col = stringify(args[1]);
      let total = 0;
      for (const r of records) {
        if (r && typeof r === 'object') {
          const val = Number((r as Record<string, unknown>)[col]);
          if (!isNaN(val)) total += val;
        }
      }
      return total;
    },
  });

  // sql_avg(records, col)
  builtins.set('sql_avg', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_avg() takes 2 arguments: (records, col)', line);
      const records = args[0];
      if (!Array.isArray(records) || records.length === 0) return 0;
      const col = stringify(args[1]);
      let total = 0;
      let count = 0;
      for (const r of records) {
        if (r && typeof r === 'object') {
          const val = Number((r as Record<string, unknown>)[col]);
          if (!isNaN(val)) { total += val; count++; }
        }
      }
      return count ? total / count : 0;
    },
  });

  // sql_min(records, col)
  builtins.set('sql_min', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_min() takes 2 arguments: (records, col)', line);
      const records = args[0];
      if (!Array.isArray(records) || records.length === 0) return 0;
      const col = stringify(args[1]);
      let minVal = Infinity;
      for (const r of records) {
        if (r && typeof r === 'object') {
          const val = Number((r as Record<string, unknown>)[col]);
          if (!isNaN(val) && val < minVal) minVal = val;
        }
      }
      return minVal === Infinity ? 0 : minVal;
    },
  });

  // sql_max(records, col)
  builtins.set('sql_max', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('sql_max() takes 2 arguments: (records, col)', line);
      const records = args[0];
      if (!Array.isArray(records) || records.length === 0) return 0;
      const col = stringify(args[1]);
      let maxVal = -Infinity;
      for (const r of records) {
        if (r && typeof r === 'object') {
          const val = Number((r as Record<string, unknown>)[col]);
          if (!isNaN(val) && val > maxVal) maxVal = val;
        }
      }
      return maxVal === -Infinity ? 0 : maxVal;
    },
  });

  // ============= Modern Language Conveniences (Kotlin, C#, Rust) =============

  // coalesce(val, fallback) - Elvis operator / null-coalescing
  builtins.set('coalesce', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('coalesce() takes 2 arguments: (val, fallback)', line);
      const val = args[0];
      return (val !== null && val !== undefined && val !== 'void') ? val : args[1];
    },
  });

  // safe_get(obj, key, fallback = null) - Safe navigation helper
  builtins.set('safe_get', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('safe_get() takes at least 2 arguments: (obj, key, [fallback])', line);
      const obj = args[0];
      const fallback = args[2] !== undefined ? args[2] : null;
      if (!obj || typeof obj !== 'object') return fallback;
      const key = stringify(args[1]);
      const val = (obj as Record<string, unknown>)[key];
      return val !== undefined ? val : fallback;
    },
  });

  // copy_record(record, updates) - Data class .copy() equivalent
  builtins.set('copy_record', {
    type: 'builtin',
    call: (args: unknown[], line: number) => {
      if (args.length < 2) throw new SdevError('copy_record() takes 2 arguments: (record, updates)', line);
      const rec = args[0];
      const upd = args[1];
      if (!rec || typeof rec !== 'object') throw new SdevError('First argument must be a record / tome', line);
      if (!upd || typeof upd !== 'object') throw new SdevError('Second argument must be a record of updates', line);
      return { ...(rec as Record<string, unknown>), ...(upd as Record<string, unknown>) };
    },
  });
}
