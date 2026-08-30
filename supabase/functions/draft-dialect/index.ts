import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * AI-assisted dialect drafting.
 * Input:  { request: string, words: string[], current?: Record<string,string> }
 * Output: { names: Record<string,string>, style?: {...}, notes?: string }
 *
 * The model only ever proposes — the client validates and the user accepts.
 */

interface Body {
  request?: string;
  words?: string[];
  current?: Record<string, string>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const key = Deno.env.get('LOVABLE_API_KEY');
  if (!key) {
    return new Response(JSON.stringify({ error: 'AI is not configured for this project.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: Body;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const request = (body.request ?? '').trim();
  const words = Array.isArray(body.words) ? body.words.filter((w) => typeof w === 'string').slice(0, 400) : [];
  if (!request || words.length === 0) {
    return new Response(JSON.stringify({ error: 'Describe the dialect you want, and send the word list.' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const system = [
    'You design surface dialects for the sdev programming language.',
    'You are given the canonical sdev words and a description of the dialect the user wants.',
    'Return a JSON object mapping EVERY canonical word to the dialect word for it.',
    'Rules: one single word per entry — letters, digits and underscore only, no spaces, no punctuation.',
    'Never reuse the same dialect word for two different canonical words.',
    'Words may be in any human language or script, exactly as the user asks.',
    'Keep a canonical word unchanged when the user gives no reason to change it.',
    'Also return a "style" object with blockStyle ("word" or "braces"), commentMarker, stringQuote, assignment ("set-to", "equals" or "arrow"), argSeparator ("space" or "comma").',
    'Add one short sentence of "notes" describing the result.',
  ].join(' ');

  const user = [
    `Dialect request: ${request}`,
    '',
    'Canonical words:',
    words.join(', '),
    '',
    'Current words (canonical -> current): ' + JSON.stringify(body.current ?? {}),
    '',
    'Reply as JSON: { "names": { canonical: word, ... }, "style": {...}, "notes": "..." }',
  ].join('\n');

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Lovable-API-Key': key,
      'X-Lovable-AIG-SDK': 'fetch',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.7-flash',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    const status = res.status;
    const message = status === 402
      ? 'AI credits are exhausted for this workspace. Add credits to keep using assisted drafting.'
      : status === 429
        ? 'Too many requests right now — try again in a moment.'
        : `AI request failed (${status}): ${text.slice(0, 400)}`;
    return new Response(JSON.stringify({ error: message }), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...(res.headers.get('Retry-After') ? { 'Retry-After': res.headers.get('Retry-After')! } : {}) },
    });
  }

  const json = await res.json();
  const content: string = json?.choices?.[0]?.message?.content ?? '{}';
  let proposal: unknown;
  try { proposal = JSON.parse(content); } catch { proposal = { names: {}, notes: content.slice(0, 500) }; }

  return new Response(JSON.stringify(proposal), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
