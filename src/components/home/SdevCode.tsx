import { Fragment } from 'react';

const KW = new Set(['forge', 'be', 'conjure', 'yield', 'ponder', 'otherwise', 'cycle', 'iterate', 'through', 'within', 'speak', 'yeet', 'skip', 'essence', 'extend', 'attempt', 'rescue', 'also', 'either', 'isnt', 'equals', 'differs', 'yep', 'nope', 'void', 'summon', 'new', 'self', 'async', 'await', 'ask', 'say', 'when', 'is', 'add', 'to', 'as']);
const RE = /("(?:[^"\\]|\\.)*"|\/\/.*$|\|>|::|;;|->|\d+(?:\.\d+)?|[\p{L}_][\p{L}\p{N}_]*|[+\-*/<>=%^~]+)/u;
const SPLIT = new RegExp(RE.source, 'gu');

const cls = (t: string, next: string) => {
  if (t.startsWith('"')) return 'text-[#e9c46a]';
  if (t.startsWith('//')) return 'text-[#7d8783] italic';
  if (/^\d/.test(t)) return 'text-[#8fd3ff]';
  if (/^(\|>|::|;;|->|[+\-*/<>=%^~]+)$/.test(t)) return 'text-[#c8ff2e]';
  if (KW.has(t)) return 'text-[#3ddc97] font-medium';
  if (next.startsWith('(')) return 'text-[#f4f1ea]';
  if (/^[\p{L}_]/u.test(t)) return 'text-[#cfd6d2]';
  return 'text-[#cfd6d2]';
};

export function SdevCode({ code, numbered = false, className = '', extraKeywords }: { code: string; numbered?: boolean; className?: string; extraKeywords?: Set<string> }) {
  return (
    <pre className={`font-mono text-[13px] leading-6 whitespace-pre overflow-x-auto ${className}`}>
      {code.split('\n').map((line, i) => {
        const parts = line.split(SPLIT);
        return (
          <div key={i} className="flex">
            {numbered && <span className="w-7 shrink-0 select-none pr-3 text-right text-[#5d6662]">{i + 1}</span>}
            <span>
              {parts.map((p, j) => p && (
                <Fragment key={j}>
                  {j % 2 === 1
                    ? <span className={extraKeywords?.has(p) ? 'text-[#3ddc97] font-medium' : cls(p, parts[j + 1] ?? '')}>{p}</span>
                    : <span className="text-[#cfd6d2]">{p}</span>}
                </Fragment>
              ))}
              {'\u200b'}
            </span>
          </div>
        );
      })}
    </pre>
  );
}
