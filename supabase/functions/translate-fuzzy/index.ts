import { requireUser } from '../_shared/auth.ts';
import { aiKey, aiUrl, aiHeaders, aiModel, AI_NOT_CONFIGURED } from '../_shared/ai.ts';
import { corsHeaders, handleCors, jsonResponse } from '../_shared/http.ts';

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

Deno.serve(async (req: Request) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const denied = await requireUser(req, corsHeaders);
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => ({}));
    const partial: string = typeof body.code === "string" ? body.code : "";
    const sourceLanguage: string = typeof body.sourceLanguage === "string" ? body.sourceLanguage : "auto";
    const original: string = typeof body.original === "string" ? body.original : partial;

    if (partial.length > 50000 || original.length > 50000 || sourceLanguage.length > 40) {
      return jsonResponse({ error: "Payload too large" }, 400);
    }

    if (!partial.trim()) {
      return jsonResponse({ translated: partial, usedAI: false });
    }

    const stripped = partial
      .replace(/(["'`])(?:\\.|(?!\1).)*\1/g, "")
      .replace(/(\/\/|#)[^\n]*/g, "");
    if (!/[^\x00-\x7F]/.test(stripped)) {
      return jsonResponse({ translated: partial, usedAI: false });
    }

    if (!aiKey()) {
      return jsonResponse({ translated: partial, usedAI: false, error: AI_NOT_CONFIGURED }, 200);
    }

    const userMessage = [
      `Source language: ${sourceLanguage}`,
      original !== partial ? `\nOriginal user code:\n\`\`\`\n${original}\n\`\`\`` : "",
      `\nDictionary-translated (this still has foreign words to fix):\n\`\`\`\n${partial}\n\`\`\``,
      `\nReturn ONLY the fully-translated sdev source code.`,
    ].join("\n");

    const aiResp = await fetch(aiUrl('/chat/completions'), {
      method: "POST",
      headers: aiHeaders(),
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
        return jsonResponse({ translated: partial, usedAI: false, error: "Rate limit reached. Try again shortly." }, 429);
      }
      if (aiResp.status === 402) {
        return jsonResponse({ translated: partial, usedAI: false, error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }, 402);
      }
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return jsonResponse({ translated: partial, usedAI: false, error: "AI gateway error" }, 200);
    }

    const data = await aiResp.json();
    let translated: string = data?.choices?.[0]?.message?.content ?? partial;

    translated = translated.replace(/^```(?:sdev|sd|js|javascript)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    if (!translated) translated = partial;

    return jsonResponse({ translated, usedAI: true });
  } catch (e) {
    console.error("translate-fuzzy error:", e);
    return jsonResponse({ translated: "", usedAI: false, error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
