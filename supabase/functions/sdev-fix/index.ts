import { aiKey, aiUrl, aiHeaders, aiModel, usingOwnProvider, AI_NOT_CONFIGURED } from '../_shared/ai.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SDEV_INTERNALS } from "../_shared/sdev-internals.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SDEV_REF = `
SDEV LANGUAGE QUICK REFERENCE (use these exact keywords — never invent new ones):
- Variables: \`forge name be value\`, reassign with \`name be value\`
- Functions: \`conjure name(args) :: ... yield value ;;\`
- Lambdas: \`(x) -> x * 2\`
- Conditionals: \`ponder cond :: ... ;; otherwise ponder c2 :: ... ;; otherwise :: ... ;;\`
- Loops: \`cycle cond :: ... ;;\` and \`iterate item through list :: ... ;;\`
- Booleans: \`yep\` / \`nope\`. Null: \`void\`.
- Operators: equals, differs, also, either, isnt, +, -, *, /, %, ^
- Output: \`speak(v)\`, \`whisper(v)\`, \`shout(v)\`
- Lists: [1,2,3]   Tomes: {"k": v}
- Common builtins: measure, gather, pluck, sort, sift, each, fold, find, sum, root, ground, elevate, magnitude, hue, rect, circle, line, canvas, clear
- Blocks ALWAYS open with \`::\` and close with \`;;\` — NEVER \`{ }\`.
- Use \`be\` for assignment, NEVER \`=\`.
`;

const SYSTEM = `You are SDev Doctor — an expert AI that diagnoses and repairs SDEV programming-language code.
You receive: the user's source code, an optional runtime/lint error, and an optional user note.
Return ONLY a tool call to \`fix_sdev_code\` with these fields:
- fixed_code: the COMPLETE corrected source. Preserve unrelated logic & style.
- explanation: a short Markdown overview of what the program does (2–4 sentences).
- changes: a Markdown bullet list of every meaningful edit you made and WHY.
- how_it_works: a Markdown walkthrough of how the fixed program now runs end-to-end.
- confidence: "high" | "medium" | "low".

If the code already runs perfectly, set fixed_code to the original and explain that no fix was needed.
${SDEV_REF}
${SDEV_INTERNALS}

Use the internals reference to diagnose root causes — e.g. if the lexer
would reject a character, if the parser expects \`::\`/\`;;\`, if a
builtin lives in graphics/web/ui, or if a link cycle is at fault.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { code, error, note } = await req.json();
    if (typeof code !== "string") {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (code.length > 50000) {
      return new Response(JSON.stringify({ error: "Code too long (max 50000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (error != null && (typeof error !== "string" || error.length > 5000)) {
      return new Response(JSON.stringify({ error: "Error field invalid or too long (max 5000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (note != null && (typeof note !== "string" || note.length > 2000)) {
      return new Response(JSON.stringify({ error: "Note too long (max 2000 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_KEY = aiKey();
    if (!AI_KEY) throw new Error(AI_NOT_CONFIGURED);

    const userMsg = [
      note ? `User note:\n${note}` : null,
      error ? `Reported error / problems:\n${error}` : null,
      `Source code:\n\`\`\`sdev\n${code}\n\`\`\``,
    ].filter(Boolean).join("\n\n");

    const resp = await fetch(aiUrl('/chat/completions'), {
      method: "POST",
      headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: aiModel("google/gemini-3-flash-preview"),
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userMsg },
        ],
        tools: [{
          type: "function",
          function: {
            name: "fix_sdev_code",
            description: "Return repaired sdev code plus explanations.",
            parameters: {
              type: "object",
              properties: {
                fixed_code: { type: "string" },
                explanation: { type: "string" },
                changes: { type: "string" },
                how_it_works: { type: "string" },
                confidence: { type: "string", enum: ["high", "medium", "low"] },
              },
              required: ["fixed_code", "explanation", "changes", "how_it_works", "confidence"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "fix_sdev_code" } },
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded — try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (resp.status === 402) return new Response(JSON.stringify({ error: "AI usage limit reached. Add credits to keep using the assistant." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await resp.text();
      console.error("ai gateway", resp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const json = await resp.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return new Response(JSON.stringify({ error: "No fix returned by AI" }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(call.function.arguments);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sdev-fix error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
