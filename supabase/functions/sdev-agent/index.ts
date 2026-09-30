import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * The online brain of the sdev understanding agent.
 *
 * Input:  { source, draft, unresolved: number[], vocabulary: Record<string,string> }
 * Output: { canonical: string, words?: Record<string,string>, notes?: string }
 *
 * It only ever rewrites source into canonical sdev — it never executes code.
 */

interface Body {
  source?: string;
  draft?: string;
  unresolved?: number[];
  vocabulary?: Record<string, string>;
  problems?: string[];
}

const SYSTEM = `You are the understanding agent of the sdev programming language.
A person wrote something — a program, a half-program, or a plain request in any human language
("calculate 23-21", "count from 1 to 10", "ask my name and greet me", "make a shopping list and print it sorted").
Turn it into a complete, WORKING sdev program that does what they meant. Output only code in the JSON field.

Canonical sdev you must write (verified syntax):
  say X                          print (say "a" + str(n) to join text and numbers)
  set NAME to VALUE              create or change a variable
  set name to input("Prompt? ")  read text; num(input("…")) reads a number
  if COND / else / end           blocks close with end (indent bodies 2 spaces)
  while COND / end
  for each x in LIST / end       for each i in sequence(1, 11) counts 1..10; sequence(n) is 0..n-1
  to NAME with a b / return X / end   declare a function, call it as NAME(1, 2)
  break, continue, true, false, nothing
  comparisons: is, is not, ==, !=, >, <, >=, <=      logic: and, or, not
  operators: + - * / % **         comments start with #
  lists [1, 2, 3], l[0], l + [4] appends; records {name: "Sam", age: 3}, r.name, r["age"]
  lambdas: (x) -> x * 2
Built-ins (use these exact names): len, str, num, int, round, floor, ceil, abs, sqrt, min, max, pow,
  random, randint(a, b), pick(list), shuffle, sum, average, sort, sortDesc, reverse, unique, count(list, x),
  first, last, upper, lower, trim, replace(s, a, b), contains(s_or_list, x), startswith, endswith,
  chars(s), weave(list, sep) joins, shatter(s, sep) splits, sift(list, fn) filters, each(list, fn) maps,
  fold(list, fn, start), toFixed(n, digits), keys(r), values(r), now(), typeof.
  There is NO join, split, append, push, map, filter, printf — use weave, shatter, l + [x], each, sift.

Rules:
- Compute with code; never hard-code an answer the program should work out.
- Keep the author's own code and identifiers exactly as written (any language/script); only fix what is wrong.
- If the author's code already works, return it unchanged.
- Bare words meant as text become quoted strings.
- Never add prose, markdown fences or explanations inside the code.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) {
    return new Response(JSON.stringify({ error: 'The understanding agent is not configured for this project.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const source = (body.source ?? '').slice(0, 40000);
  if (!source.trim()) {
    return new Response(JSON.stringify({ error: 'No source to understand.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const user = [
    'The author wrote this program:',
    '```', source, '```',
    '',
    'A rule engine already produced this draft of canonical sdev:',
    '```', (body.draft ?? '').slice(0, 40000), '```',
    '',
    body.unresolved?.length ? `Lines it could not resolve: ${body.unresolved.join(', ')}` : 'It resolved every line, but the result may still be wrong.',
    '',
    'Words this author is known to use (word -> meaning): ' + JSON.stringify(body.vocabulary ?? {}),
    '',
    body.problems?.length ? 'That draft still has these problems — fix them:\n- ' + body.problems.slice(0, 10).map((p) => String(p).slice(0, 300)).join('\n- ') : '',
    '',
    'Return the whole program as canonical sdev.',
  ].join('\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': key,
      'X-Lovable-AIG-SDK': 'fetch',
    },
    body: JSON.stringify({
      model: 'openai/gpt-6-astra',
      stream: true,
      instructions: SYSTEM,
      input: user,
      reasoning: { effort: 'low' },
      text: {
        format: {
          type: 'json_schema',
          name: 'canonical_sdev',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              canonical: { type: 'string', description: 'the whole program as canonical sdev' },
              notes: { type: ['string', 'null'], description: 'one short sentence about what was assumed' },
            },
            required: ['canonical', 'notes'],
          },
        },
      },
    }),
  });

  if (!res.ok || !res.body) {
    const text = res.body ? await res.text() : '';
    const status = res.status;
    const message = status === 402
      ? 'AI credits are exhausted for this workspace — the agent will keep working offline with rules and memory.'
      : status === 429
        ? 'The agent is rate limited right now — try again in a moment.'
        : `The agent could not reach the model (${status}): ${text.slice(0, 300)}`;
    return new Response(JSON.stringify({ error: message }), {
      status: status || 500,
      headers: {
        ...corsHeaders, 'Content-Type': 'application/json',
        ...(res.headers.get('Retry-After') ? { 'Retry-After': res.headers.get('Retry-After')! } : {}),
      },
    });
  }

  // Reasoning models must stream; accumulate the answer server-side.
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const part of parts) {
      for (const line of part.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          const event = JSON.parse(payload);
          if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') answer += event.delta;
          else if (event.type === 'response.completed' && typeof event.response?.output_text === 'string' && !answer) {
            answer = event.response.output_text;
          }
        } catch { /* keep reading */ }
      }
    }
  }

  let reply: { canonical?: string; notes?: string | null } = {};
  try { reply = JSON.parse(answer); } catch { reply = { canonical: '' }; }

  if (!reply.canonical) {
    return new Response(JSON.stringify({ error: 'The agent could not make sense of this file.' }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ canonical: reply.canonical, notes: reply.notes ?? undefined }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
