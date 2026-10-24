// Shared sdev language data: keywords, builtins, snippets, docs.
// Used by autocomplete, hover, and outline.

export const SDEV_KEYWORDS = [
  'forge', 'be', 'conjure', 'yield', 'yeet', 'skip',
  'ponder', 'otherwise', 'cycle', 'iterate', 'through', 'within',
  'summon', 'essence', 'extend', 'self', 'super', 'new',
  'async', 'await', 'spawn', 'attempt', 'rescue',
  'also', 'either', 'isnt', 'equals', 'differs',
  'void', 'yep', 'nope',
];

export interface BuiltinDoc {
  name: string;
  signature: string;
  doc: string;
  category: 'io' | 'math' | 'string' | 'list' | 'graphics' | 'turtle' | 'ui' | 'oop' | 'sys' | 'type' | 'web';
}

export const SDEV_BUILTINS: BuiltinDoc[] = [
  // I/O
  { name: 'speak',  signature: 'speak(...args)',          doc: 'Print values to the output, separated by spaces.', category: 'io' },
  { name: 'print',  signature: 'print(value)',            doc: 'Alias for speak().', category: 'io' },
  { name: 'input',  signature: 'input(prompt)',           doc: 'Read a line of text from the user.', category: 'io' },
  { name: 'wait',   signature: 'wait(ms)',                doc: 'Pause execution for the given milliseconds.', category: 'io' },

  // Math
  { name: 'random', signature: 'random()',                doc: 'Random float between 0 and 1.', category: 'math' },
  { name: 'floor',  signature: 'floor(n)',                doc: 'Round down to nearest integer.', category: 'math' },
  { name: 'ground', signature: 'ground(n)',               doc: 'Floor — round towards negative infinity.', category: 'math' },
  { name: 'ceil',   signature: 'ceil(n)',                 doc: 'Round up to nearest integer.', category: 'math' },
  { name: 'round',  signature: 'round(n)',                doc: 'Round to nearest integer.', category: 'math' },
  { name: 'abs',    signature: 'abs(n)',                  doc: 'Absolute value.', category: 'math' },
  { name: 'root',   signature: 'root(n)',                 doc: 'Square root.', category: 'math' },
  { name: 'pow',    signature: 'pow(base, exp)',          doc: 'Raise base to exponent.', category: 'math' },
  { name: 'min',    signature: 'min(...values)',          doc: 'Smallest value.', category: 'math' },
  { name: 'max',    signature: 'max(...values)',          doc: 'Largest value.', category: 'math' },
  { name: 'sin',    signature: 'sin(rad)',                doc: 'Sine.', category: 'math' },
  { name: 'cos',    signature: 'cos(rad)',                doc: 'Cosine.', category: 'math' },
  { name: 'tan',    signature: 'tan(rad)',                doc: 'Tangent.', category: 'math' },
  { name: 'log',    signature: 'log(n)',                  doc: 'Natural logarithm.', category: 'math' },

  // Type
  { name: 'morph',  signature: 'morph(value, type)',      doc: 'Convert value to "text", "number", or "bool".', category: 'type' },
  { name: 'type',   signature: 'type(value)',             doc: 'Get the type name of a value.', category: 'type' },

  // String
  { name: 'measure',  signature: 'measure(s)',            doc: 'Length of string or list.', category: 'string' },
  { name: 'upper',    signature: 'upper(s)',              doc: 'Uppercase a string.', category: 'string' },
  { name: 'lower',    signature: 'lower(s)',              doc: 'Lowercase a string.', category: 'string' },
  { name: 'trim',     signature: 'trim(s)',               doc: 'Remove leading/trailing whitespace.', category: 'string' },
  { name: 'split',    signature: 'split(s, sep)',         doc: 'Split string into list.', category: 'string' },
  { name: 'join',     signature: 'join(list, sep)',       doc: 'Join list into string.', category: 'string' },
  { name: 'replace',  signature: 'replace(s, find, rep)', doc: 'Replace first occurrence.', category: 'string' },
  { name: 'includes', signature: 'includes(s, sub)',      doc: 'True if substring/element present.', category: 'string' },
  { name: 'startsWith', signature: 'startsWith(s, sub)',  doc: 'True if string starts with sub.', category: 'string' },
  { name: 'endsWith',   signature: 'endsWith(s, sub)',    doc: 'True if string ends with sub.', category: 'string' },

  // Lists
  { name: 'gather', signature: 'gather(list, fn)',        doc: 'Reduce a list with a function.', category: 'list' },
  { name: 'pluck',  signature: 'pluck(list, idx)',        doc: 'Get element at index.', category: 'list' },
  { name: 'weave',  signature: 'weave(...lists)',         doc: 'Concatenate lists.', category: 'list' },
  { name: 'each',   signature: 'each(list, fn)',          doc: 'Map over list.', category: 'list' },
  { name: 'sift',   signature: 'sift(list, fn)',          doc: 'Filter list by predicate.', category: 'list' },
  { name: 'clone',  signature: 'clone(value)',            doc: 'Deep copy a value.', category: 'list' },
  { name: 'range',  signature: 'range(start, end, step?)',doc: 'Generate a range list.', category: 'list' },
  { name: 'sort',   signature: 'sort(list)',              doc: 'Sort a list.', category: 'list' },
  { name: 'reverse',signature: 'reverse(list)',           doc: 'Reverse a list.', category: 'list' },
  { name: 'push',   signature: 'push(list, item)',        doc: 'Append to list.', category: 'list' },
  { name: 'pop',    signature: 'pop(list)',               doc: 'Remove and return last item.', category: 'list' },
  { name: 'keys',   signature: 'keys(map)',               doc: 'Keys of a map.', category: 'list' },
  { name: 'values', signature: 'values(map)',             doc: 'Values of a map.', category: 'list' },

  // Graphics
  { name: 'canvas',     signature: 'canvas(w, h)',        doc: 'Open a drawing canvas.', category: 'graphics' },
  { name: 'clear',      signature: 'clear(color)',        doc: 'Clear canvas to color.', category: 'graphics' },
  { name: 'rect',       signature: 'rect(x, y, w, h)',    doc: 'Draw a rectangle.', category: 'graphics' },
  { name: 'circle',     signature: 'circle(x, y, r)',     doc: 'Draw a circle.', category: 'graphics' },
  { name: 'ellipse',    signature: 'ellipse(x, y, rx, ry)', doc: 'Draw an ellipse.', category: 'graphics' },
  { name: 'triangle',   signature: 'triangle(x1,y1,x2,y2,x3,y3)', doc: 'Draw a triangle.', category: 'graphics' },
  { name: 'line',       signature: 'line(x1,y1,x2,y2)',   doc: 'Draw a line.', category: 'graphics' },
  { name: 'point',      signature: 'point(x, y)',         doc: 'Draw a point.', category: 'graphics' },
  { name: 'text',       signature: 'text(s, x, y)',       doc: 'Draw text.', category: 'graphics' },
  { name: 'fill',       signature: 'fill(color)',         doc: 'Set fill color.', category: 'graphics' },
  { name: 'stroke',     signature: 'stroke(color)',       doc: 'Set stroke color.', category: 'graphics' },
  { name: 'noStroke',   signature: 'noStroke()',          doc: 'Disable stroke.', category: 'graphics' },
  { name: 'hue',        signature: 'hue(deg)',            doc: 'HSL hue color string.', category: 'graphics' },
  { name: 'star',       signature: 'star(x,y,r,points)',  doc: 'Draw a star.', category: 'graphics' },
  { name: 'heart',      signature: 'heart(x, y, size)',   doc: 'Draw a heart.', category: 'graphics' },

  // Turtle
  { name: 'turtle',     signature: 'turtle()',            doc: 'Initialize turtle graphics.', category: 'turtle' },
  { name: 'forward',    signature: 'forward(d)',          doc: 'Move turtle forward.', category: 'turtle' },
  { name: 'backward',   signature: 'backward(d)',         doc: 'Move turtle backward.', category: 'turtle' },
  { name: 'left',       signature: 'left(deg)',           doc: 'Turn left.', category: 'turtle' },
  { name: 'right',      signature: 'right(deg)',          doc: 'Turn right.', category: 'turtle' },
  { name: 'goto',       signature: 'goto(x, y)',          doc: 'Move turtle to position.', category: 'turtle' },
  { name: 'home',       signature: 'home()',              doc: 'Return turtle to origin.', category: 'turtle' },
  { name: 'pendown',    signature: 'pendown()',           doc: 'Pen down (draws while moving).', category: 'turtle' },
  { name: 'penup',      signature: 'penup()',             doc: 'Pen up (no drawing).', category: 'turtle' },
  { name: 'pencolor',   signature: 'pencolor(color)',     doc: 'Set pen color.', category: 'turtle' },
  { name: 'penwidth',   signature: 'penwidth(w)',         doc: 'Set pen width.', category: 'turtle' },

  // OOP / data
  { name: 'Stack', signature: 'Stack()', doc: 'Stack data structure.', category: 'oop' },
  { name: 'Queue', signature: 'Queue()', doc: 'Queue data structure.', category: 'oop' },
  { name: 'Set',   signature: 'Set()',   doc: 'Set data structure.', category: 'oop' },
  { name: 'Map',   signature: 'Map()',   doc: 'Map (dictionary) data structure.', category: 'oop' },

  // UI
  { name: 'window',   signature: 'window(title)',         doc: 'Create a UI window.', category: 'ui' },
  { name: 'button',   signature: 'button(label, fn)',     doc: 'Create a button.', category: 'ui' },
  { name: 'label',    signature: 'label(text)',           doc: 'Create a text label.', category: 'ui' },
  { name: 'textbox',  signature: 'textbox(key)',          doc: 'Create a text input.', category: 'ui' },

  // Web (browser DSL — renders in the IDE's WEB preview panel)
  { name: 'page',       signature: 'page(title)',                doc: 'Start a new HTML page. Switches the IDE to the WEB preview panel.', category: 'web' },
  { name: 'endpage',    signature: 'endpage()',                  doc: 'Finalize the page and auto-close any open containers.', category: 'web' },
  { name: 'tag',        signature: 'tag(name, text?, attrs?)',   doc: 'Emit any HTML tag (e.g. tag("div","hi",{class:"x"})).', category: 'web' },
  { name: 'open',       signature: 'open(name, attrs?)',         doc: 'Open a container element; pair with close().', category: 'web' },
  { name: 'close',      signature: 'close()',                    doc: 'Close the most recently opened container.', category: 'web' },
  { name: 'style',      signature: 'style(selector, dict) | style(raw_css)', doc: 'Add CSS — either a selector + dict of declarations, or a raw CSS string.', category: 'web' },
  { name: 'keyframes',  signature: 'keyframes(name, steps)',     doc: 'Define a @keyframes animation from a step dict.', category: 'web' },
  { name: 'script',     signature: 'script(code)',               doc: 'Append JavaScript to the page <script>.', category: 'web' },
  { name: 'onclick',    signature: 'onclick(selector, code)',    doc: 'Bind a click handler to all elements matching a CSS selector.', category: 'web' },
  { name: 'on',         signature: 'on(event, selector, code)',  doc: 'Bind any DOM event to elements matching a CSS selector.', category: 'web' },
  { name: 'raw_html',   signature: 'raw_html(html)',             doc: 'Insert raw HTML at the current position.', category: 'web' },
  { name: 'raw_css',    signature: 'raw_css(css)',               doc: 'Append raw CSS to the document <style>.', category: 'web' },
  { name: 'raw_js',     signature: 'raw_js(js)',                 doc: 'Append raw JavaScript to the document <script>.', category: 'web' },
  { name: 'html_div',   signature: 'html_div(text?, attrs?)',    doc: 'Emit a <div>. Every HTML5 tag has an html_<tag> form (html_h1, html_button, html_input, …) and a paired open_<tag> / end_<tag> for nesting.', category: 'web' },
  { name: 'h1',         signature: 'h1(text?, attrs?)',          doc: 'Emit an <h1> heading. Same shape for h2…h6, p, span, a, img, ul/li, table, form, etc.', category: 'web' },
  { name: 'meta',       signature: 'meta(attrs)',                doc: 'Add a <meta> tag to <head>.', category: 'web' },
  { name: 'link',       signature: 'link(rel, href) | link(attrs)', doc: 'Add a <link> tag to <head> (stylesheets, icons, …).', category: 'web' },
];

export const SDEV_CONSTANTS = ['PI', 'TAU', 'E', 'INFINITY', 'yep', 'nope', 'void'];

export interface Snippet {
  prefix: string;
  body: string;
  description: string;
}

export const SDEV_SNIPPETS: Snippet[] = [
  { prefix: 'forge',    body: 'forge $1 be $2',                                      description: 'Variable declaration' },
  { prefix: 'conjure',  body: 'conjure $1($2) ::\n  $3\n;;',                          description: 'Function definition' },
  { prefix: 'ponder',   body: 'ponder $1 ::\n  $2\n;;',                               description: 'If statement' },
  { prefix: 'pondelse', body: 'ponder $1 ::\n  $2\n;; otherwise ::\n  $3\n;;',        description: 'If/else statement' },
  { prefix: 'cycle',    body: 'cycle $1 ::\n  $2\n;;',                                description: 'While loop' },
  { prefix: 'iterate',  body: 'iterate $1 through $2 ::\n  $3\n;;',                   description: 'For-each loop' },
  { prefix: 'within',   body: 'within $1 be $2 ::\n  $3\n;;',                         description: 'Range loop' },
  { prefix: 'essence',  body: 'essence $1 ::\n  conjure init(self) ::\n    $2\n  ;;\n;;', description: 'Class definition' },
  { prefix: 'attempt',  body: 'attempt ::\n  $1\n;; rescue err ::\n  $2\n;;',         description: 'Try/catch' },
  { prefix: 'speak',    body: 'speak($1)',                                            description: 'Print to console' },
  { prefix: 'canvas',   body: 'canvas($1, $2)\nclear("$3")',                          description: 'Open canvas' },
  { prefix: 'turtle',   body: 'canvas(400, 400)\nclear("#0d0d15")\nturtle()\n$0',     description: 'Turtle graphics setup' },
  { prefix: 'window',   body: 'window("$1")\nbutton("$2", () -> ::\n  $3\n;;)',       description: 'UI window with button' },
  { prefix: 'page',     body: 'page("$1")\n  h1("$2")\n  p("$3")\nendpage()',         description: 'Web page (renders in WEB preview panel)' },
  { prefix: 'webform',  body: 'page("$1")\n  open_form({ id: "f" })\n    html_input({ name: "q", placeholder: "type..." })\n    html_button("Go", { type: "submit" })\n  end_form()\n  onclick("#f button", "event.preventDefault(); alert(document.querySelector(\'[name=q]\').value)")\nendpage()', description: 'Web form with click handler' },
];
