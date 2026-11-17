import { useState } from 'react';
import { Sparkles, Code2, Palette, Cpu, Box, Layers, Globe, ChevronDown } from 'lucide-react';

interface ExampleCodeProps {
  onSelect: (code: string) => void;
}

interface Example {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'basics' | 'algorithms' | 'graphics' | '3d' | 'web';
  code: string;
}

const EXAMPLES: Example[] = [
  { name: 'Hello World', icon: Sparkles, category: 'basics', code: `// Welcome to sdev!\nspeak("Hello, World!")` },
  { name: 'Variables', icon: Code2, category: 'basics', code: `forge name be "sdev"\nforge version be 1.0\nspeak("Welcome to " + name + " v" + morph(version, "text"))` },
  { name: 'Functions', icon: Code2, category: 'basics', code: `conjure greet(who) ::\n  yield "Hello, " + who + "!"\n;;\n\nspeak(greet("World"))` },
  { name: 'Loops', icon: Code2, category: 'basics', code: `forge i be 1\ncycle i <= 5 ::\n  speak("Count: " + morph(i, "text"))\n  i be i + 1\n;;` },
  { name: 'Lists', icon: Code2, category: 'basics', code: `forge fruits be ["apple", "banana", "cherry"]\nspeak("Fruits: " + weave(fruits, ", "))\ngather(fruits, "mango")\nspeak("Added mango: " + weave(fruits, ", "))\nspeak("Total: " + morph(measure(fruits), "text"))` },
  { name: 'Fibonacci', icon: Cpu, category: 'algorithms', code: `conjure fib(n) ::\n  ponder n <= 1 :: yield n ;;\n  yield fib(n - 1) + fib(n - 2)\n;;\n\nforge i be 0\ncycle i < 10 ::\n  speak("fib(" + morph(i, "text") + ") = " + morph(fib(i), "text"))\n  i be i + 1\n;;` },
  { name: 'FizzBuzz', icon: Cpu, category: 'algorithms', code: `conjure fizzbuzz(n) ::\n  ponder n % 15 equals 0 :: yield "FizzBuzz" ;;\n  otherwise ponder n % 3 equals 0 :: yield "Fizz" ;;\n  otherwise ponder n % 5 equals 0 :: yield "Buzz" ;;\n  otherwise :: yield morph(n, "text") ;;\n;;\n\nforge i be 1\ncycle i <= 20 ::\n  speak(fizzbuzz(i))\n  i be i + 1\n;;` },
  { name: 'Prime Check', icon: Cpu, category: 'algorithms', code: `conjure isPrime(n) ::\n  ponder n < 2 :: yield nope ;;\n  forge i be 2\n  cycle i * i <= n ::\n    ponder n % i equals 0 :: yield nope ;;\n    i be i + 1\n  ;;\n  yield yep\n;;\n\nforge num be 1\ncycle num <= 20 ::\n  ponder isPrime(num) ::\n    speak(morph(num, "text") + " is prime!")\n  ;;\n  num be num + 1\n;;` },
  { name: 'Turtle Spiral', icon: Palette, category: 'graphics', code: `canvas(400, 400)\nclear("#0d0d15")\nturtle()\n\nforge i be 0\ncycle i < 200 ::\n  pencolor(hue(i * 2))\n  forward(i * 0.5)\n  right(25)\n  i be i + 1\n;;` },
  { name: 'Turtle Flower', icon: Palette, category: 'graphics', code: `canvas(400, 400)\nclear("#0d0d15")\nturtle()\npenwidth(2)\n\nconjure petal() ::\n  forge j be 0\n  cycle j < 30 ::\n    forward(2)\n    right(6)\n    j be j + 1\n  ;;\n  forge k be 0\n  cycle k < 30 ::\n    forward(2)\n    right(6)\n    k be k + 1\n  ;;\n;;\n\nforge i be 0\ncycle i < 12 ::\n  pencolor(hue(i * 30, 80, 60))\n  petal()\n  right(30)\n  i be i + 1\n;;` },
  { name: 'Shapes Gallery', icon: Palette, category: 'graphics', code: `canvas(400, 400)\nclear("#0d0d15")\n\nfill(hue(45, 100, 60))\nstroke(hue(45, 100, 80), 2)\nstar(80, 80, 40, 20, 5)\n\nfill(hue(350, 80, 55))\nnoStroke()\nheart(200, 30, 60)\n\nfill(hue(200, 70, 50))\nstroke("#ffffff", 2)\nrect(280, 50, 80, 60, 15)\n\nfill(hue(280, 70, 60))\nellipse(80, 200, 50, 30)\n\nfill(hue(120, 70, 50))\ntriangle(200, 160, 250, 240, 150, 240)\n\nfill("#ffffff")\ntext("Shapes Gallery", 120, 380, 20)` },
  { name: 'Starfield', icon: Palette, category: 'graphics', code: `canvas(400, 400)\nclear("#0a0a12")\n\nforge i be 0\ncycle i < 150 ::\n  forge x be random() * 400\n  forge y be random() * 400\n  forge size be random() * 2 + 0.5\n  forge brightness be random() * 50 + 50\n  fill(hue(random() * 60 + 180, 20, brightness))\n  point(x, y, size)\n  i be i + 1\n;;\n\nforge j be 0\ncycle j < 10 ::\n  fill(hue(random() * 40 + 200, 60, 80))\n  star(random() * 380 + 10, random() * 380 + 10, 8, 3, 4)\n  j be j + 1\n;;` },
  { name: 'Spirograph', icon: Palette, category: 'graphics', code: `canvas(400, 400)\nclear("#0d0d15")\nturtle()\npenwidth(1)\n\nforge R be 100\nforge r be 60\nforge d be 80\n\nforge t be 0\ncycle t < 3600 ::\n  forge angle be t * PI / 180\n  forge x be 200 + (R - r) * cos(angle) + d * cos((R - r) / r * angle)\n  forge y be 200 + (R - r) * sin(angle) + d * sin((R - r) / r * angle)\n  \n  pencolor(hue(t / 10))\n  ponder t equals 0 ::\n    penup()\n    goto(x, y)\n    pendown()\n  ;;\n  otherwise ::\n    goto(x, y)\n  ;;\n  t be t + 2\n;;` },
  { name: 'Wave Pattern', icon: Palette, category: 'graphics', code: `canvas(400, 400)\nclear("#0d0d15")\n\nforge y be 0\ncycle y < 400 ::\n  forge x be 0\n  cycle x < 400 ::\n    forge wave be sin(x / 20 + y / 30) * 127 + 128\n    forge hueVal be (x + y) / 4\n    fill(hue(hueVal, 70, wave / 4))\n    point(x, y, 3)\n    x be x + 4\n  ;;\n  y be y + 4\n;;` },
  { name: '3D Cube', icon: Box, category: '3d', code: `canvas(400, 400)\nclear("#0d0d15")\n\nforge vertices be [\n  [-50, -50, -50], [50, -50, -50], [50, 50, -50], [-50, 50, -50],\n  [-50, -50, 50], [50, -50, 50], [50, 50, 50], [-50, 50, 50]\n]\n\nforge edges be [\n  [0, 1], [1, 2], [2, 3], [3, 0],\n  [4, 5], [5, 6], [6, 7], [7, 4],\n  [0, 4], [1, 5], [2, 6], [3, 7]\n]\n\nforge angleX be 0.5\nforge angleY be 0.7\n\nconjure project(v) ::\n  forge x be v[0]\n  forge y be v[1]\n  forge z be v[2]\n  forge x2 be x * cos(angleY) - z * sin(angleY)\n  forge z2 be x * sin(angleY) + z * cos(angleY)\n  forge y2 be y * cos(angleX) - z2 * sin(angleX)\n  forge z3 be y * sin(angleX) + z2 * cos(angleX)\n  forge scale be 200 / (z3 + 300)\n  yield [200 + x2 * scale, 200 + y2 * scale]\n;;\n\nstroke(hue(180, 100, 60), 2)\nforge i be 0\ncycle i < measure(edges) ::\n  forge edge be edges[i]\n  forge p1 be project(vertices[edge[0]])\n  forge p2 be project(vertices[edge[1]])\n  line(p1[0], p1[1], p2[0], p2[1])\n  i be i + 1\n;;\n\nfill(hue(300, 100, 70))\nforge j be 0\ncycle j < measure(vertices) ::\n  forge p be project(vertices[j])\n  circle(p[0], p[1], 4)\n  j be j + 1\n;;\n\nfill("#ffffff")\ntext("3D Wireframe Cube", 110, 380, 18)` },
  { name: '3D Pyramid', icon: Layers, category: '3d', code: `canvas(400, 400)\nclear("#0d0d15")\n\nforge apex be [0, -60, 0]\nforge base be [\n  [-50, 40, -50], [50, 40, -50],\n  [50, 40, 50], [-50, 40, 50]\n]\n\nforge angleY be 0.8\n\nconjure rotateProject(v) ::\n  forge x be v[0] * cos(angleY) - v[2] * sin(angleY)\n  forge z be v[0] * sin(angleY) + v[2] * cos(angleY)\n  forge scale be 200 / (z + 300)\n  yield [200 + x * scale, 200 + v[1] * scale]\n;;\n\nstroke(hue(50, 100, 60), 2)\nforge i be 0\ncycle i < 4 ::\n  forge p1 be rotateProject(base[i])\n  forge p2 be rotateProject(base[(i + 1) % 4])\n  line(p1[0], p1[1], p2[0], p2[1])\n  i be i + 1\n;;\n\nstroke(hue(200, 100, 70), 2)\nforge apexProj be rotateProject(apex)\nforge j be 0\ncycle j < 4 ::\n  forge bp be rotateProject(base[j])\n  line(apexProj[0], apexProj[1], bp[0], bp[1])\n  j be j + 1\n;;\n\nfill(hue(0, 100, 70))\ncircle(apexProj[0], apexProj[1], 6)\n\nfill(hue(120, 100, 60))\nforge k be 0\ncycle k < 4 ::\n  forge bp be rotateProject(base[k])\n  circle(bp[0], bp[1], 4)\n  k be k + 1\n;;\n\nfill("#ffffff")\ntext("3D Pyramid", 150, 380, 18)` },
  { name: '3D Sphere', icon: Box, category: '3d', code: `canvas(400, 400)\nclear("#0d0d15")\n\nforge radius be 80\nforge rotY be 0.5\nforge points be 200\nforge phi be (1 + root(5)) / 2\n\nforge i be 0\ncycle i < points ::\n  forge y be 1 - (i / (points - 1)) * 2\n  forge radiusAtY be root(1 - y * y)\n  forge theta be 2 * PI * i / phi\n  forge x be cos(theta) * radiusAtY * radius\n  forge z be sin(theta) * radiusAtY * radius\n  forge yPos be y * radius\n  forge xRot be x * cos(rotY) - z * sin(rotY)\n  forge zRot be x * sin(rotY) + z * cos(rotY)\n  forge depth be (zRot + radius) / (radius * 2)\n  forge brightness be 30 + depth * 70\n  fill(hue(200 + depth * 60, 80, brightness))\n  forge size be 2 + depth * 3\n  circle(200 + xRot, 200 + yPos, size)\n  i be i + 1\n;;\n\nfill("#ffffff")\ntext("3D Sphere (Fibonacci)", 100, 380, 16)` },
  { name: 'Website Builder', icon: Globe, category: 'web', code: `// Build a full HTML/CSS/JS app in sdev!\npage("sdev Web Studio", { theme: "sdev-dark" })\n  web_state({ count: 0 })\n\n  div({ class: "max-w-xl mx-auto p-6" }, () -> ::\n    div({ class: "card text-center" }, () -> ::\n      span("HTML + CSS + JS in sdev", { class: "pill mb-4" })\n      h1("Reactive Web Counter", { class: "text-3xl mb-2" })\n      p("Client handlers compile directly from sdev to JavaScript.", { class: "text-muted-foreground text-sm mb-6" })\n      div("0", { id: "counter", bind: "count", class: "text-5xl font-display text-primary mb-6" })\n      div({ class: "flex justify-center gap-3" }, () -> ::\n        button("-1", () -> :: state_set("count", state_get("count") - 1) ;;, { class: "btn btn-outline" })\n        button("Reset", () -> :: state_set("count", 0) ;;, { class: "btn btn-secondary" })\n        button("+1", () -> :: state_set("count", state_get("count") + 1) ;;, { class: "btn btn-primary" })\n      ;;)\n    ;;)\n  ;;)\nendpage()` },
  { name: 'sdev Website', icon: Globe, category: 'web', code: `// The sdev homepage built in sdev!\npage("sdev — Self-Hosted Language", { theme: "sdev-dark" })\n  navbar("sdev", ["How it works", "Playground", "Features"], [\n    { label: "Open IDE", href: "#playground", variant: "primary" }\n  ])\n  hero_section({\n    badge: "Open source · A compiler written in itself",\n    title: "Write in plain words.",\n    highlight: "Run it anywhere.",\n    subtitle: "sdev is a programming language that reads like everyday language, runs in your browser, and compiles to native x86-64.",\n    primaryCta: { label: "Try Playground", href: "#playground" },\n    cli: "npm i -g sdev-lang"\n  })\n  stat_band([\n    { v: "2", l: "Runtimes", d: "WebAssembly and native x86-64" },\n    { v: "26", l: "Human languages", d: "for keywords and dialects" },\n    { v: "87", l: "Self-compile checks", d: "byte-identical every time" },\n    { v: "0", l: "Dependencies", d: "in native builds — no libc" }\n  ])\n  compiler_scene_3d()\n  sdev_playground()\n  footer_section("sdev", ["Docs", "IDE", "Privacy", "Terms"])\n  scroll_driver()\n  scroll_reveal()\nendpage()` },
];

const CATEGORIES = [
  { key: 'basics', label: 'Basics', icon: Sparkles, count: 5 },
  { key: 'algorithms', label: 'Algorithms', icon: Cpu, count: 3 },
  { key: 'graphics', label: 'Graphics', icon: Palette, count: 6 },
  { key: '3d', label: '3D', icon: Box, count: 3 },
  { key: 'web', label: 'Web', icon: Globe, count: 2 },
] as const;

export function ExampleCode({ onSelect }: ExampleCodeProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      {/* Quick access pills */}
      <div className="flex flex-wrap gap-2">
        {EXAMPLES.filter(e => ['Hello World', 'Fibonacci', 'Turtle Spiral', '3D Cube'].includes(e.name)).map(example => {
          const Icon = example.icon;
          return (
            <button
              key={example.name}
              onClick={() => onSelect(example.code)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-muted/50 transition-all text-xs font-mono text-muted-foreground hover:text-foreground"
            >
              <Icon className="w-3 h-3" />
              {example.name}
            </button>
          );
        })}
        {/* Category dropdown triggers */}
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.key}
              onClick={() => setExpanded(expanded === cat.key ? null : cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all text-xs font-mono ${
                expanded === cat.key
                  ? 'border-primary/30 bg-primary/5 text-primary'
                  : 'border-border bg-card hover:border-primary/20 text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-3 h-3" />
              {cat.label}
              <span className="opacity-50">({cat.count})</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded === cat.key ? 'rotate-180' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Expanded category */}
      {expanded && (
        <div className="flex flex-wrap gap-2 pl-1 pt-1 animate-fade-in">
          {EXAMPLES.filter(e => e.category === expanded).map(example => {
            const Icon = example.icon;
            return (
              <button
                key={example.name}
                onClick={() => onSelect(example.code)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/50 hover:border-primary/30 hover:bg-muted/30 transition-all text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                <Icon className="w-3.5 h-3.5 opacity-60" />
                {example.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
