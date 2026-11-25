import type { IdeFile } from './types';
import sdevWebsiteSource from '../../lang/web/sdev-website.sdev?raw';

export const STARTER_FILES: IdeFile[] = [
  {
    id: '1',
    name: 'main.sdev',
    content: `// ═══════════════════════════════════════
// Welcome to the sdev IDE!
// Press Ctrl+Enter to run your code
// ═══════════════════════════════════════

forge message be "Hello, World!"
speak(message)

// Functions:
conjure greet(name) ::
  yield "Hello, " + name + "!"
;;

speak(greet("sdev"))

// Lists and higher-order functions:
forge nums be [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
forge evens be sift(nums, x -> x % 2 equals 0)
forge doubled be each(evens, x -> x * 2)
speak("Doubled evens:", doubled)
`,
  },
  {
    id: '2',
    name: 'graphics.sdev',
    content: `// Psychedelic Turtle Spiral
canvas(400, 400)
clear("#0d0d15")
turtle()

forge i be 0
cycle i < 200 ::
  pencolor(hue(i * 1.8))
  penwidth(1 + i * 0.02)
  forward(i * 0.7)
  right(29)
  i be i + 1
;;
`,
  },
  {
    id: '3',
    name: 'oop.sdev',
    content: `// Object-Oriented Programming in sdev

essence Animal ::
  conjure init(self, name, sound) ::
    self.name be name
    self.sound be sound
    self.energy be 100
  ;;

  conjure speak(self) ::
    speak(self.name + " says: " + self.sound + "!")
  ;;

  conjure eat(self, food) ::
    self.energy be self.energy + 20
    speak(self.name + " eats " + food + " (energy: " + morph(self.energy, "text") + ")")
  ;;
;;

essence Dog extend Animal ::
  conjure init(self, name, breed) ::
    super.init(name, "Woof")
    self.breed be breed
  ;;

  conjure fetch(self) ::
    self.energy be self.energy - 15
    speak(self.name + " the " + self.breed + " fetches the ball!")
  ;;
;;

forge buddy be new Dog("Buddy", "Golden Retriever")
buddy.speak()
buddy.eat("kibble")
buddy.fetch()
speak("Energy left:", buddy.energy)
`,
  },
  {
    id: '4',
    name: 'algorithms.sdev',
    content: `// Classic Algorithms

// Fibonacci (recursive)
conjure fib(n) ::
  ponder n <= 1 :: yield n ;;
  yield fib(n - 1) + fib(n - 2)
;;

speak("Fibonacci:")
forge i be 0
cycle i < 10 ::
  speak("  fib(" + morph(i, "text") + ") =", fib(i))
  i be i + 1
;;

// Bubble sort
conjure bubbleSort(arr) ::
  forge n be measure(arr)
  forge sorted be clone(arr)
  forge i be 0
  cycle i < n ::
    forge j be 0
    cycle j < n - i - 1 ::
      ponder sorted[j] > sorted[j + 1] ::
        forge temp be sorted[j]
        sorted[j] be sorted[j + 1]
        sorted[j + 1] be temp
      ;;
      j be j + 1
    ;;
    i be i + 1
  ;;
  yield sorted
;;

forge arr be [64, 34, 25, 12, 22, 11, 90]
speak("\\nOriginal:", arr)
speak("Sorted:", bubbleSort(arr))

// Binary search
conjure binarySearch(arr, target) ::
  forge left be 0
  forge right be measure(arr) - 1
  cycle left <= right ::
    forge mid be ground((left + right) / 2)
    ponder arr[mid] equals target ::
      yield mid
    ;; otherwise ponder arr[mid] < target ::
      left be mid + 1
    ;; otherwise ::
      right be mid - 1
    ;;
  ;;
  yield -1
;;

forge sorted be [1, 3, 5, 7, 9, 11, 13, 15]
speak("\\nBinary search for 7:", binarySearch(sorted, 7))
speak("Binary search for 6:", binarySearch(sorted, 6))
`,
  },
  {
    id: '5',
    name: 'data-structures.sdev',
    content: `// Data Structures Demo

speak("=== Stack ===")
forge stack be Stack()
stack.push(10)
stack.push(20)
stack.push(30)
speak("Push 10, 20, 30")
speak("Peek:", stack.peek())
speak("Pop:", stack.pop())
speak("Size:", stack.size())

speak("")
speak("=== Queue ===")
forge queue be Queue()
queue.enqueue("first")
queue.enqueue("second")
queue.enqueue("third")
speak("Dequeue:", queue.dequeue())
speak("Peek:", queue.peek())

speak("")
speak("=== Set ===")
forge s be Set()
s.add(1)
s.add(2)
s.add(2)
s.add(3)
speak("Set values (no dupes):", s.values())
speak("Has 2:", s.has(2))
s.remove(2)
speak("After removing 2:", s.values())

speak("")
speak("=== Map ===")
forge m be Map()
m.set("name", "Alice")
m.set("age", 30)
m.set("city", "NYC")
speak("Get name:", m.get("name"))
speak("Keys:", m.keys())
speak("Has age:", m.has("age"))
`,
  },
  {
    id: '6',
    name: 'sdev-website.sdev',
    content: sdevWebsiteSource,
  },
  {
    id: '99',
    name: 'blink.sdev',
    content: `// Arduino Uno — classic blink, written in sdev.
// Open the Hardware panel (Usb icon), pick your board, hit Detect Board,
// then Compile + Upload. Requires Chrome / Edge / Opera on desktop.

board "uno" {
  conjure setup() {
    pin 13 be output
    serial begin 9600
  }

  conjure loop() {
    pin 13 write high
    serial println "ON"
    wait 500
    pin 13 write low
    serial println "OFF"
    wait 500
  }
}
`,
  },
];

export const SNIPPETS: Record<string, string> = {
  'hello': 'speak("Hello, World!")\n',
  'forge': 'forge $1 be $2\n',
  'conjure': 'conjure $1($2) ::\n  $3\n;;\n',
  'ponder': 'ponder $1 ::\n  $2\n;;\n',
  'cycle': 'cycle $1 ::\n  $2\n;;\n',
  'within': 'within $1 be $2 ::\n  $3\n;;\n',
  'class': 'essence $1 ::\n  conjure init(self) ::\n    $2\n  ;;\n;;\n',
};

/** Collision-proof file id: unique across reloads and restored workspaces. */
let fileIdSeq = 0;
export const nextFileId = () => `n-${Date.now().toString(36)}-${(fileIdSeq++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/** First "untitled<N>.sdev" that is not already taken. */
export function uniqueUntitled(existing: { name: string }[]): string {
  const taken = new Set(existing.map(f => f.name));
  let n = 1;
  while (taken.has(`untitled${n}.sdev`)) n++;
  return `untitled${n}.sdev`;
}
