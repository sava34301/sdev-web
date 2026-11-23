import { SDEV_REPR_HOOK, type SdevFunction, stringify } from '../builtins/utils';
import { SdevSet, isTuple, isGenerator, isFunction } from './runtime-values';

export function repr(value: unknown): string {
  if (value && typeof value === 'object') {
    const hook = (value as Record<symbol, (() => string | undefined) | undefined>)[SDEV_REPR_HOOK];
    if (hook) {
      const custom = hook();
      if (custom !== undefined) return custom;
    }
    const directRepr = (value as Record<string, unknown>).on_repr;
    if (directRepr && typeof (directRepr as SdevFunction).call === 'function') {
      return stringify((directRepr as SdevFunction).call([], 0));
    }
    const directText = (value as Record<string, unknown>).on_text;
    if (directText && typeof (directText as SdevFunction).call === 'function') {
      return stringify((directText as SdevFunction).call([], 0));
    }
  }
  if (value === null || value === undefined) return 'void';
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'boolean') return value ? 'yep' : 'nope';
  if (typeof value === 'number') return String(value);
  if (value instanceof SdevSet) return '{|' + value.values().map(repr).join(', ') + '|}';
  if (value instanceof Uint8Array) return `b"${Array.from(value).map((b) => String.fromCharCode(b)).join('')}"`;
  if (Array.isArray(value)) {
    const body = value.map(repr).join(', ');
    return isTuple(value) ? `(${body}${value.length === 1 ? ',' : ''})` : `[${body}]`;
  }
  if (isGenerator(value)) return '<generator>';
  if (isFunction(value)) return '<function>';
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.__error__) return `${o.name}(${repr(o.message)})`;
    const klass = (value as { __class__?: { name: string } }).__class__;
    const body = Object.keys(o).map((k) => `${k}: ${repr(o[k])}`).join(', ');
    return klass ? `${klass.name}{${body}}` : `{${body}}`;
  }
  return String(value);
}

/**
 * Python format-spec mini-language:
 * `[[fill]align][sign][#][0][width][,][.precision][type]`
 */
export function formatValue(value: unknown, spec?: string, conv?: string): string {
  let text: string;
  if (conv === 'r' || conv === 'a') text = repr(value);
  else text = displayText(value);

  if (!spec) return text;

  const m = /^(?:(.)?([<>^]))?([+\- ])?(#)?(0)?(\d+)?(,)?(?:\.(\d+))?([bcdeEfFgGnosxX%])?$/.exec(spec);
  if (!m) return text;
  const [, fillRaw, align, sign, alt, zero, widthRaw, comma, precRaw, kind] = m;
  const width = widthRaw ? parseInt(widthRaw, 10) : 0;
  const prec = precRaw ? parseInt(precRaw, 10) : undefined;

  if (kind && 'bcdeEfFgGnosxX%'.includes(kind) && kind !== 's') {
    const num = Number(value);
    switch (kind) {
      case 'b': text = (num >>> 0).toString(2); break;
      case 'o': text = (num >>> 0).toString(8); break;
      case 'x': text = (num >>> 0).toString(16); break;
      case 'X': text = (num >>> 0).toString(16).toUpperCase(); break;
      case 'c': text = String.fromCharCode(num); break;
      case 'd': case 'n': text = String(Math.trunc(num)); break;
      case 'e': text = num.toExponential(prec ?? 6); break;
      case 'E': text = num.toExponential(prec ?? 6).toUpperCase(); break;
      case 'f': case 'F': text = num.toFixed(prec ?? 6); break;
      case 'g': case 'G': text = prec !== undefined ? num.toPrecision(prec) : String(num); break;
      case '%': text = (num * 100).toFixed(prec ?? 6) + '%'; break;
    }
    if (alt && kind === 'x') text = '0x' + text;
    if (alt && kind === 'b') text = '0b' + text;
    if (alt && kind === 'o') text = '0o' + text;
  } else if (prec !== undefined && typeof value === 'number') {
    text = value.toFixed(prec);
  } else if (prec !== undefined && typeof value === 'string') {
    text = value.slice(0, prec);
  }

  if (comma) {
    const [ip, fp] = text.split('.');
    text = ip.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (fp ? '.' + fp : '');
  }
  if (sign === '+' && typeof value === 'number' && Number(value) >= 0) text = '+' + text;
  if (sign === ' ' && typeof value === 'number' && Number(value) >= 0) text = ' ' + text;

  if (width && text.length < width) {
    const fill = fillRaw ?? (zero ? '0' : ' ');
    const pad = fill.repeat(width - text.length);
    const defaultAlign = typeof value === 'number' ? '>' : '<';
    switch (align ?? (zero ? '>' : defaultAlign)) {
      case '>': text = pad + text; break;
      case '^': {
        const left = Math.floor(pad.length / 2);
        text = pad.slice(0, left) + text + pad.slice(left);
        break;
      }
      default: text = text + pad;
    }
  }
  return text;
}

export function displayText(value: unknown): string {
  if (value === null || value === undefined) return 'void';
  if (typeof value === 'boolean') return value ? 'yep' : 'nope';
  if (value instanceof SdevSet) return value.toString();
  if (Array.isArray(value)) {
    const body = value.map(repr).join(', ');
    return isTuple(value) ? `(${body})` : `[${body}]`;
  }
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (o.__error__) return `${o.name}: ${o.message}`;
  }
  return stringify(value);
}
