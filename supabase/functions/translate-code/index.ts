import { aiKey, aiUrl, aiHeaders, aiModel, usingOwnProvider, AI_NOT_CONFIGURED } from '../_shared/ai.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SDEV_SYNTAX_GUIDE = `
SDEV Language COMPLETE Reference - Follow these rules EXACTLY. Any deviation = broken code.

=== CORE SYNTAX ===
- Variable declaration: forge <name> be <value>
- Reassignment: <name> be <newValue>    (NO "=" ever!)
- Function: conjure <name>(<params>) :: <body> ;;
- Lambda: (<params>) -> <expression>
- If: ponder <condition> :: <body> ;;
- Else: otherwise :: <body> ;;
- Else-if: otherwise ponder <condition> :: <body> ;;
- While: cycle <condition> :: <body> ;;
- For-each: iterate <var> through <iterable> :: <body> ;;
- Return: yield <value>
- Break: yeet
- Continue: skip
- Boolean true: yep
- Boolean false: nope
- Null: void
- Block start: ::    Block end: ;;
- Comments: // single line only
- NO curly braces { } EVER
- NO semicolons ; (only ;; for block end)
- Pipe operator: expr |> func (chains function calls)

=== OPERATORS ===
- Arithmetic: + - * / % ^ (power)
- Comparison: equals (==), differs (!=), < > <= >=
- Logical: also (&&), either (||), isnt (!)
- String concat: + (same as arithmetic)
- Assignment: be (NOT =)

=== ALL BUILT-IN FUNCTIONS ===

** I/O **
speak(value)           - Print to console (NOT print/console.log/echo)
whisper(values...)     - Print without space between args
shout(value)           - Print uppercase

** Type Conversion **
morph(value, "text")   - To string
morph(value, "num")    - To number
morph(value, "truth")  - To boolean

** Type Checking **
isNum(v), isText(v), isList(v), isTome(v), isTruth(v), isVoid(v), isFunc(v)

** String Functions **
measure(str)           - String length
carve(str, start, end?)- Substring (NOT slice/substring)
upper(str)             - Uppercase
lower(str)             - Lowercase
trim(str)              - Trim whitespace
split(str, delim)      - Split to list
replace(str, find, rep)- Replace occurrences
startswith(str, s)     - Starts with check
endswith(str, s)       - Ends with check
repeat(str, n)         - Repeat string n times
padleft(str, len, ch?) - Pad left
padright(str, len, ch?)- Pad right
charAt(str, i)         - Char at index
indexOf(str, sub)      - Find first index (-1 if not found)
lastIndexOf(str, sub)  - Find last index
seek(str, pattern)     - Check if contains (also works on lists)

** List Functions **
measure(list)          - List length
gather(list, item)     - Push/append (mutates list)
yoink(list)            - Pop last item
insert(list, i, item)  - Insert at index
remove(list, i)        - Remove at index
concat(a, b)           - Concatenate lists
flatten(list)          - Flatten nested lists
first(list)            - First element
last(list)             - Last element
rest(list)             - All except first
take(list, n)          - First n elements
drop(list, n)          - All except first n
reverse(list)          - Reverse list
sort(list)             - Sort list
unique(list)           - Remove duplicates
count(list, fn)        - Count matching elements
find(list, fn)         - Find first matching element
sum(list)              - Sum of numbers
product(list)          - Product of numbers
average(list)          - Average of numbers
all(list, fn)          - All match predicate
any(list, fn)          - Any match predicate
zip(a, b)              - Zip two lists
unzip(list)            - Unzip list of pairs
weave(list, sep)       - Join list to string (NOT join)
sift(list, fn)         - Filter list (NOT filter)
warp(list, fn)         - Map over list (NOT map)
fold(list, fn, init)   - Reduce list (NOT reduce)

** Tome (Dictionary/Object) Functions **
forge t be {key: value, key2: value2}
has(tome, key)         - Check key exists
get(tome, key)         - Get value by key
set(tome, key, val)    - Set key-value
del(tome, key)         - Delete key
merge(tome1, tome2)    - Merge tomes
keys(tome)             - Get all keys
values(tome)           - Get all values
entries(tome)          - Get [key, value] pairs
fromEntries(list)      - Create tome from pairs

** Math **
ground(n)              - Floor (NOT floor)
elevate(n)             - Ceiling (NOT ceil)
round(n)               - Round
absolute(n)            - Abs (NOT abs/Math.abs)
root(n)                - Square root
pow(base, exp)         - Power
clamp(val, min, max)   - Clamp value
sign(n)                - Sign (-1, 0, 1)
chaos()                - Random 0-1 (also: random())
cos(a), sin(a), tan(a) - Trig (radians)
acos(a), asin(a), atan(a), atan2(y,x) - Inverse trig
sinh(a), cosh(a), tanh(a) - Hyperbolic
log(n), log10(n), log2(n) - Logarithms
min(a,b), max(a,b)     - Min/max
radians(deg), degrees(rad) - Angle conversion

** Math Constants (NOT functions - no parentheses) **
PI, TAU, E, INFINITY

** Time **
now()                  - Current timestamp ms
timestamp()            - Same as now()

=== GRAPHICS SYSTEM ===
sdev has a full canvas graphics system. When translating HTML/CSS/JS visual content,
convert it to sdev's canvas-based graphics.

** Canvas Setup **
canvas(width, height)  - Create canvas (MUST be first graphics call)
clear(color?)          - Clear canvas
background(color)      - Set background

** Drawing State **
fill(color)            - Set fill color
noFill()               - Disable fill
stroke(color, width?)  - Set stroke color/width
noStroke()             - Disable stroke
lineWidth(w)           - Set line width
alpha(0-1)             - Set transparency
shadow(color, blur, ox, oy?) - Add shadow
noShadow()             - Remove shadow

** Shapes **
rect(x, y, w, h, radius?)     - Rectangle
circle(x, y, radius)          - Circle
ellipse(x, y, rx, ry, rot?)   - Ellipse
line(x1, y1, x2, y2)          - Line
triangle(x1,y1, x2,y2, x3,y3)- Triangle
polygon([[x,y], ...])         - Polygon from points
star(x, y, outer, inner, pts?)- Star shape
heart(x, y, size)             - Heart shape
point(x, y, size?)            - Point
arc(x, y, r, start, end, ccw?)- Arc

** Text **
text(str, x, y, size?)        - Draw text
textAlign(h, v?)               - Align text
font(family, style?)           - Set font

** Colors **
hue(h, s?, l?)                - HSL color string
rgb(r, g, b)                  - RGB color string
rgba(r, g, b, a)              - RGBA color string
hsla(h, s, l, a)              - HSLA color string
randomColor()                 - Random HSL color

** Gradients **
linearGradient(x1,y1, x2,y2, ...stops) - Linear gradient
radialGradient(x1,y1,r1, x2,y2,r2, ...stops) - Radial gradient

** Transformations **
save()                 - Save canvas state
restore()              - Restore canvas state
translate(x, y)        - Move origin
rotate(angle)          - Rotate (radians)
scale(x, y?)           - Scale
resetTransform()       - Reset transforms

** Path Drawing **
beginPath(), closePath(), moveTo(x,y), lineTo(x,y)
bezierTo(cp1x,cp1y, cp2x,cp2y, x,y)
quadraticTo(cpx,cpy, x,y)
fillPath(), strokePath()

** Turtle Graphics **
turtle()               - Initialize turtle at center
forward(dist), backward(dist)
left(degrees), right(degrees)
penup(), pendown()
pencolor(color), penwidth(w)
goto(x, y), home()
setheading(angle), heading(), pos()
dot(size?, color?), stamp()
turtleCircle(radius, steps?)

** Sprites **
createSprite(x, y, w, h, color?) - Create sprite object
drawSprite(sprite)     - Draw sprite
moveSprite(sprite, dx, dy) - Move sprite
updateSprite(sprite)   - Apply velocity
spriteCollides(s1, s2) - Collision detection

** Utility **
dist(x1,y1, x2,y2)    - Distance between points
lerp(a, b, t)          - Linear interpolation
mapRange(v, inMin,inMax, outMin,outMax) - Map value range
constrain(v, min, max) - Clamp value

=== COMPLETE EXAMPLES ===

Example: Drawing a button-like shape
canvas(400, 300)
background("#1a1a2e")
fill("#4CAF50")
rect(100, 120, 200, 60, 12)
fill("#ffffff")
textAlign("center", "middle")
text("Click Me", 200, 150, 20)

Example: Fibonacci
conjure fibonacci(n) ::
  ponder n <= 0 :: yield [] ;;
  otherwise ponder n equals 1 :: yield [0] ;;
  forge seq be [0, 1]
  cycle measure(seq) < n ::
    forge len be measure(seq)
    forge next be seq[len - 1] + seq[len - 2]
    gather(seq, next)
  ;;
  yield seq
;;
forge result be fibonacci(15)
iterate num through result ::
  speak(morph(num, "text"))
;;

Example: Interactive-looking UI with canvas
canvas(500, 400)
background("#0f0f1a")

// Header bar
fill("#1e1e3a")
rect(0, 0, 500, 60)
fill("#00ff88")
font("monospace", "bold")
text("My App", 20, 38, 24)

// Card
fill("#1a1a2e")
shadow("#00ff8855", 10, 0, 4)
rect(30, 80, 440, 280, 16)
noShadow()

// Card content
fill("#e0e0e0")
text("Welcome to the app!", 60, 140, 18)
fill("#888888")
text("This is a card component", 60, 170, 14)

// Button inside card
fill("#6C63FF")
rect(60, 220, 160, 45, 8)
fill("#ffffff")
textAlign("center", "middle")
text("Get Started", 140, 242, 16)

=== TRANSLATING HTML/CSS/JS WEBSITES ===
When translating a full HTML file with CSS and JavaScript:
1. Convert the VISUAL LAYOUT to canvas drawing commands
2. Convert any JS LOGIC to sdev equivalents
3. Map CSS colors, fonts, sizes to sdev fill(), font(), text() etc.
4. Convert DOM structure to positioned canvas elements
5. Interactive elements (buttons, inputs) become drawn rectangles with text
6. Animations/timers: convert to loops or sequential drawing
7. Layout: estimate pixel positions based on CSS layout
8. Keep the VISUAL APPEARANCE as close as possible
9. Output speak() for any console.log/alert content
10. Convert JS arrays/objects to sdev lists/tomes

CRITICAL: sdev has NO DOM, NO HTML, NO CSS. Everything visual = canvas commands.
The output should recreate the LOOK of the website as a canvas drawing.
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, sourceLanguage } = await req.json();

    const VALID_LANGS = ['html-css-js','python','javascript','typescript','java','csharp','cpp','c','go','rust','ruby','php','swift','kotlin','lua','html','css','sdev-fix','auto'];
    if (!code || typeof code !== 'string' || !sourceLanguage || typeof sourceLanguage !== 'string') {
      return new Response(
        JSON.stringify({ error: "Missing or invalid code/sourceLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (code.length > 50000) {
      return new Response(
        JSON.stringify({ error: "Code too long (max 50000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!VALID_LANGS.includes(sourceLanguage)) {
      return new Response(
        JSON.stringify({ error: "Unsupported sourceLanguage" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const AI_KEY = aiKey();
    if (!AI_KEY) {
      throw new Error(AI_NOT_CONFIGURED);
    }

    const isWebCode = sourceLanguage === 'html' || sourceLanguage === 'html-css-js';
    const isFix = sourceLanguage === 'sdev-fix';

    const systemPrompt = isFix 
      ? `You are an SDEV code fixer. You receive broken sdev code with its error message. Fix the code and return ONLY the corrected sdev code. No explanations, no markdown fences.

${SDEV_SYNTAX_GUIDE}

ABSOLUTE RULES:
- Return ONLY valid SDEV code
- NO markdown code blocks
- Fix the specific error mentioned
- Ensure ALL sdev syntax rules are followed
- The output MUST be immediately runnable`
      : `You are an expert code translator specializing in SDEV, a unique programming language with its own canvas-based graphics system. Your ONLY task is to convert source code into valid, working SDEV code.

${SDEV_SYNTAX_GUIDE}

ABSOLUTE RULES - VIOLATION = BROKEN CODE:
1. EVERY variable: "forge name be value" — NEVER use let/const/var/=
2. EVERY function: "conjure name(params) :: body ;;" — NEVER use function/def/fn
3. EVERY if: "ponder condition :: body ;;" — NEVER use if/else
4. EVERY while: "cycle condition :: body ;;" — NEVER use while/for
5. EVERY for-each: "iterate var through list :: body ;;" — NEVER use for/forEach
6. EVERY return: "yield value" — NEVER use return
7. EVERY print: "speak(value)" — NEVER use print/console.log/echo/puts
8. Blocks: :: to start, ;; to end — NEVER use { } or begin/end
9. Assignment operator: "be" — NEVER use "=" 
10. true=yep, false=nope, null=void — NEVER use true/false/null/None/nil
11. String length/list length: measure() — NEVER use .length/.len()/.size()
12. Floor: ground() — NEVER use floor/Math.floor
13. Ceiling: elevate() — NEVER use ceil/Math.ceil
14. Abs: absolute() — NEVER use abs/Math.abs
15. Sqrt: root() — NEVER use sqrt/Math.sqrt
16. Push/append: gather() — NEVER use .push/.append
17. Pop: yoink() — NEVER use .pop
18. Join: weave() — NEVER use .join
19. Filter: sift() — NEVER use .filter
20. Map: warp() — NEVER use .map
21. Reduce: fold() — NEVER use .reduce
22. Contains/includes: seek() — NEVER use .includes/.contains
23. Substring: carve() — NEVER use .slice/.substring
24. PI is a bare constant — NEVER use PI() or Math.PI
${isWebCode ? `
25. HTML/CSS/JS → Canvas: Convert ALL visual elements to canvas drawing commands
26. Start with canvas(width, height) and background(color)
27. Convert each HTML element to positioned rect/text/circle calls
28. Convert CSS styles to fill/stroke/font/shadow calls
29. Convert JS logic to sdev loops/functions/variables
30. Convert event handlers to comments explaining interactivity
31. There is NO DOM in sdev — everything is canvas-based
` : ''}

OUTPUT FORMAT:
- Return ONLY valid SDEV code — nothing else
- NO markdown code blocks (\`\`\`)
- NO explanations, headers, or notes before/after code
- Include // comments where helpful
- The output MUST be immediately runnable in the SDEV interpreter
- DOUBLE CHECK every line uses sdev syntax, not the source language`;

    const userPrompt = isFix
      ? code
      : isWebCode
      ? `Translate this complete HTML webpage (with embedded CSS and JavaScript) into an SDEV canvas-based visual program that recreates the look of the page. Convert all visual elements, colors, layout, text, and any JS logic.

\`\`\`html
${code}
\`\`\``
      : `Translate this ${sourceLanguage} code to SDEV. Use ONLY sdev built-in functions and syntax:

\`\`\`${sourceLanguage}
${code}
\`\`\``;

    const response = await fetch(aiUrl('/chat/completions'), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${AI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel("google/gemini-3.8-flash", 'strong'),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    let translatedCode = data.choices?.[0]?.message?.content || "";
    
    // Clean up any markdown formatting the model might add
    translatedCode = translatedCode
      .replace(/^```(?:sdev|SDEV)?\n?/gm, '')
      .replace(/\n?```$/gm, '')
      .trim();

    return new Response(
      JSON.stringify({ translatedCode }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Translation error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
