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
}

const SYSTEM = [
  'You translate however a person chose to write a program into canonical sdev.',
  'Canonical sdev: `say X` prints, `set NAME to VALUE` assigns, `ask` reads input,',
  '`if COND` / `else` / `end`, `while COND` / `end`, `for each X in Y` / `end`,',
  '`to NAME with A B` / `end` declares a function, `return X`, `break`, `continue`,',
  'literals `true`, `false`, `nothing`, comparisons `is`, `is not`, `>`, `<`,',
  '`is or more`, `is or less`, and the operators + - * / %. Comments start with #.',
  'Rules: keep the meaning, keep the line count wherever possible, invent nothing,',
  'never add explanations to the code, quote bare words that were meant as text,',
  'and keep identifiers exactly as the author spelled them (any language/script).',
].join(' ');

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
