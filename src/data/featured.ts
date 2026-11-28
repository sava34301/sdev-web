/**
 * Pinned programs for the Community showcase (shown first, with a Featured badge).
 * Add a shared program's slug (the part after /g/ in its share link) or an example file name.
 */
export const FEATURED: string[] = ['a8287cb905', 'web-page.sdev', 'geometric-bloom.sdev'];

/** Extra official examples that are not IDE starter files. */
export const EXTRA_EXAMPLES: { name: string; code: string }[] = [
  {
    name: 'web-page.sdev',
    code: `// A small web page, written in sdev
page("Hello from sdev")
style("body { font-family: system-ui, sans-serif; background: #f6f4ef; color: #14171c; padding: 32px } h1 { font-size: 40px; letter-spacing: -1px; margin: 0 0 8px } p { color: #52575f } .pill { display: inline-block; margin-top: 16px; background: #c8ff2e; padding: 6px 14px; border-radius: 99px; font-weight: 600 }")
tag("h1", "Built with sdev")
tag("p", "This page was written in sdev and rendered right in your browser.")
raw("<span class='pill'>100% sdev</span>")
endpage()`,
  },
  {
    name: 'editorial-card.sdev',
    code: `// Editorial status board built with sdev's HTML DSL
page("Compiler Status")
style("body { font-family: system-ui, sans-serif; background: #0e100f; color: #f1f0ea; padding: 28px; margin: 0 } .kicker { color: #c8ff2e; font-family: monospace; font-size: 11px; letter-spacing: .16em; text-transform: uppercase } h1 { font-size: 30px; margin: 10px 0 18px; letter-spacing: -.03em } .row { display: flex; justify-content: space-between; border-top: 1px solid #262b28; padding: 10px 0; font-family: monospace; font-size: 13px } .ok { color: #3ddc97 }")
raw("<div class='kicker'>sdev self-host gate</div>")
tag("h1", "All 3 stages byte-identical.")
raw("<div class='row'><span>lexer.sdev</span><span class='ok'>✓ verified</span></div>")
raw("<div class='row'><span>parser.sdev</span><span class='ok'>✓ verified</span></div>")
raw("<div class='row'><span>codegen.sdev</span><span class='ok'>✓ verified</span></div>")
endpage()`,
  },
  {
    name: 'geometric-bloom.sdev',
    code: `// Radial geometric lattice on the 2D canvas
canvas(380, 300)
clear("#0e100f")

forge rings be 28
forge i be 0
cycle i < rings ::
  forge a be (i / rings) * 2 * PI
  forge cx be 190 + cos(a) * 68
  forge cy be 150 + sin(a) * 68
  stroke(i % 2 equals 0 ? "#c8ff2e" : "#3ddc97", 1.3)
  circle(cx, cy, 44)
  i be i + 1
;;

fill("#f6f4ef")
circle(190, 150, 6)`,
  },
];
