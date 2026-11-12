import { requireUser } from '../_shared/auth.ts';
import { aiKey, aiUrl, aiHeaders, aiModel, usingOwnProvider, AI_NOT_CONFIGURED } from '../_shared/ai.ts';
// supabase/functions/translate-fuzzy/index.ts
// ────────────────────────────────────────────────────────────────────
// AI fallback for the sdev built-in translator.
// The synchronous dictionary + fuzzy translator handles 95%+ of cases.
// When user code STILL contains foreign-script words after that pass,
// we ask the configured AI provider to rewrite the snippet as canonical English sdev.
// ────────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a translator for the sdev programming language.

sdev uses these EXACT canonical English keywords (DO NOT invent new ones):
  forge        — declare a variable             (forge x be 5)
  be           — assign a value
  conjure      — define a function              (conjure name(args) :: ... ;;)
  yield        — return a value from a function
  ponder       — if statement                   (ponder x equals 5 :: ... ;;)
  otherwise    — else
  cycle        — while loop                     (cycle x < 10 :: ... ;;)
  iterate      — for loop                       (iterate x through list :: ... ;;)
  through      — over a collection (used with iterate)
  within       — membership / scope (in)
  yeet         — break out of a loop / throw
  skip         — continue
  speak        — print to output                (speak("hello"))
  essence      — class definition               (essence Dog :: ... ;;)
  extend       — inherit
  self         — current instance
  super        — parent class
  new          — instantiate
  attempt      — try block                      (attempt :: ... rescue err :: ... ;;)
  rescue       — catch block
  also         — logical AND (&&)
  either       — logical OR (||)
  isnt         — not / NOT EQUAL
  equals       — == comparison
  differs      — != comparison
  yep          — true
  nope         — false
  void         — null / nothing
  summon       — import a module
  async, await, spawn — async primitives

BLOCK SYNTAX: opens with :: and closes with ;;
COMMENTS: // line comment   or   # line comment

YOUR JOB:
The user wrote sdev code in their native language (e.g. Bulgarian, Spanish).
Our offline dictionary already translated most words. Some foreign words may
remain — translate them to the closest canonical English keyword above.

RULES:
1. Output ONLY the rewritten sdev source. No explanations, no markdown fences,
   no commentary.
2. PRESERVE everything that is already English (forge, be, conjure, etc.) —
   do NOT rephrase working code.
3. PRESERVE all string literals exactly (everything inside " ' or \`).
4. PRESERVE all comments exactly.
5. PRESERVE identifiers (variable / function names) — even non-ASCII ones like
   "поздрав" — they are NOT keywords, leave them alone.
6. PRESERVE indentation, line breaks, and the :: / ;; block markers.
7. If a foreign word doesn't map to any canonical keyword, leave it as-is.
8. Do NOT add new lines or restructure code.`;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await requireUser(req, corsHeaders);
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => ({}));
    const partial: string = typeof body.code === "string" ? body.code : "";
    const sourceLanguage: string = typeof body.sourceLanguage === "string" ? body.sourceLanguage : "auto";
    const original: string = typeof body.original === "string" ? body.original : partial;

    if (partial.length > 50000 || original.length > 50000 || sourceLanguage.length > 40) {
      return new Response(
        JSON.stringify({ error: "Payload too large" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!partial.trim()) {
      return new Response(
        JSON.stringify({ translated: partial, usedAI: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Heuristic guard — only invoke AI if the dictionary pass left
    // foreign-script characters behind in code (not strings/comments).
    const stripped = partial
      .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "")
      .replace(/(\/\/|#)[^\n]*/g, "");
    if (!/[^\x00-\x7F]/.test(stripped)) {
      return new Response(
        JSON.stringify({ translated: partial, usedAI: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AI_KEY = aiKey();
    if (!AI_KEY) {
      return new Response(
        JSON.stringify({ translated: partial, usedAI: false, error: AI_NOT_CONFIGURED }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userMessage = [
      `Source language: ${sourceLanguage}`,
      original !== partial ? `\nOriginal user code:\n\`\`\`\n${original}\n\`\`\`` : "",
      `\nDictionary-translated (this still has foreign words to fix):\n\`\`\`\n${partial}\n\`\`\``,
      `\nReturn ONLY the fully-translated sdev source code.`,
    ].join("\n");

    const aiResp = await fetch(aiUrl('/chat/completions'), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-3-flash-preview"),
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ translated: partial, usedAI: false, error: "Rate limit reached. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ translated: partial, usedAI: false, error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return new Response(
        JSON.stringify({ translated: partial, usedAI: false, error: "AI gateway error" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await aiResp.json();
    let translated: string = data?.choices?.[0]?.message?.content ?? partial;

    // Strip accidental markdown code fences.
    translated = translated.replace(/^```(?:sdev|sd|js|javascript)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    if (!translated) translated = partial;

    return new Response(
      JSON.stringify({ translated, usedAI: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("translate-fuzzy error:", e);
    return new Response(
      JSON.stringify({ translated: "", usedAI: false, error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
