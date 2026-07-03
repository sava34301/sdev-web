import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BookOpen, Variable, Wand2, GitBranch, Calculator, ArrowRight, Wrench, Sparkles, Globe } from 'lucide-react';

const REFERENCE = [
  {
    title: 'v2 "Prism" — the easy syntax',
    icon: Sparkles,
    content: `Add \`#!sdev v2\` on line 1 to opt in. Reads like English.
\`\`\`
say "hello"
set age to 21
if age is 18 or more :: say "adult" ;;
for each n in range(5) :: say n ;;
to greet with who :: say "hi " + who ;;
greet with "world"
\`\`\`
Full guide: /SDEV_V2_DOCUMENTATION.md`,
  },
  {
    title: 'Variables',
    icon: Variable,
    content: `Use \`forge\` and \`be\`:
\`\`\`
forge x be 10
forge name be "sdev"
x be 20  // reassign
\`\`\``,
  },
  {
    title: 'Functions',
    icon: Wand2,
    content: `Define with \`conjure\`:
\`\`\`
conjure add(a, b) ::
  yield a + b
;;
\`\`\`

**Lambdas:** \`(x) -> x * 2\``,
  },
  {
    title: 'Control Flow',
    icon: GitBranch,
    content: `**ponder** (if) · **otherwise** (else) · **cycle** (while) · **iterate** (for-each)

\`\`\`
ponder x > 10 :: speak("big") ;;
otherwise :: speak("small") ;;

cycle x < 10 :: x be x + 1 ;;

iterate item through myList :: speak(item) ;;
\`\`\``,
  },
  {
    title: 'Operators',
    icon: Calculator,
    content: `**Math:** \`+\`, \`-\`, \`*\`, \`/\`, \`%\`, \`^\` (power)
**Compare:** \`equals\`, \`differs\`, \`<\`, \`>\`, \`<=\`, \`>=\`
**Logic:** \`also\` (and), \`either\` (or), \`isnt\` (not)
**Pipe:** \`|>\` chains function calls`,
  },
  {
    title: 'Pipe Operator',
    icon: ArrowRight,
    content: `Chain operations:
\`\`\`
forge result be nums |> each(x -> x * 2) |> sift(x -> x > 5)
\`\`\``,
  },
  {
    title: 'Built-in Functions',
    icon: Wrench,
    content: `**Output:** \`speak()\`, \`whisper()\`, \`shout()\`
**Type:** \`essence()\`, \`morph(v, "type")\`
**Lists:** \`measure()\`, \`gather()\`, \`pluck()\`, \`portion()\`, \`concat()\`, \`flatten()\`
**Transform:** \`each()\`, \`sift()\`, \`fold()\`, \`find()\`
**Text:** \`upper()\`, \`lower()\`, \`trim()\`, \`shatter()\`, \`weave()\`, \`replace()\`
**Math:** \`magnitude()\`, \`root()\`, \`ground()\`, \`elevate()\`, \`clamp()\`, \`lerp()\`
**Random:** \`chaos()\`, \`randint()\`, \`pick()\`, \`shuffle()\`
**Tomes:** \`inscriptions()\`, \`contents()\`, \`entries()\`
**JSON:** \`etch()\`, \`unetch()\``,
  },
  {
    title: 'Web Building (HTML/CSS/JS)',
    icon: Globe,
    content: `Build real web pages — runs in the IDE's **WEB** preview panel.
**Page:** \`page("Title")\` … \`endpage()\`
**Elements:** \`h1()\`, \`p()\`, \`div()\`, \`a()\`, \`img()\` (+ \`html_<tag>\` for every HTML5 tag)
**Containers:** \`open_div({class:"x"})\` … \`end_div()\`
**CSS:** \`style("body", {background:"#0b1220", color:"white"})\`
**JS:** \`onclick("#btn", "alert('hi')")\`, \`on("input", "#q", "...")\`
**Raw passthrough:** \`raw_html()\`, \`raw_css()\`, \`raw_js()\`
**Animations:** \`keyframes("spin", {...})\`
Hit Run → preview opens in-IDE with Reload / Download / Open in new tab.`,
  },
  {
    title: 'Unique Syntax',
    icon: Sparkles,
    content: `**Blocks:** \`::\` starts, \`;;\` ends
**No semicolons** required
**Power:** \`2^10\`
**Booleans:** \`yep\` / \`nope\`
**Null:** \`void\`
**Constants:** \`PI\`, \`TAU\`, \`E\`, \`INFINITY\``,
  },
];

export function LanguageReference() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Accordion type="single" collapsible className="px-3">
        {REFERENCE.map((item, i) => {
          const Icon = item.icon;
          return (
            <AccordionItem key={i} value={`item-${i}`} className="border-border/50">
              <AccordionTrigger className="text-sm py-3 hover:no-underline group">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="font-medium text-sm">{item.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground pb-4 pl-9">
                <div className="space-y-1.5">
                  {item.content.split('\n').map((line, j) => {
                    if (line.startsWith('```')) return null;
                    if (line.startsWith('**') && line.includes('**')) {
                      const parts = line.split('**');
                      return (
                        <p key={j} className="my-0.5 text-xs">
                          <strong className="text-primary font-mono">{parts[1]}</strong>
                          <span>{parts[2]}</span>
                        </p>
                      );
                    }
                    if (line.trim()) {
                      return (
                        <code key={j} className="block px-3 py-1.5 bg-muted/50 rounded text-xs font-mono text-foreground/70">
                          {line}
                        </code>
                      );
                    }
                    return null;
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
