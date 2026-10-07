# sdev Programming Language

## Complete Documentation, Tutorial & Reference Guide

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Syntax Overview](#syntax-overview)
4. [Variables & Constants](#variables--constants)
5. [Data Types](#data-types)
6. [Operators](#operators)
7. [String Operations](#string-operations)
8. [Control Flow](#control-flow)
9. [Functions](#functions)
10. [Object-Oriented Programming](#object-oriented-programming)
11. [Error Handling](#error-handling)
12. [Async & Concurrency](#async--concurrency)
13. [Built-in Output Functions](#built-in-output-functions)
14. [Built-in Math Functions](#built-in-math-functions)
15. [Built-in String Functions](#built-in-string-functions)
16. [Built-in List Functions](#built-in-list-functions)
17. [Built-in Tome (Dict) Functions](#built-in-tome-dict-functions)
18. [Higher-Order Functions](#higher-order-functions)
19. [Type System & Conversion](#type-system--conversion)
20. [Collections: Set, Map, Queue, Stack, LinkedList](#collections)
21. [Matrix Operations](#matrix-operations)
22. [Graphics & Game Development](#graphics--game-development)
23. [File I/O](#file-io)
24. [Networking](#networking)
25. [Examples & Recipes](#examples--recipes)
26. [JavaScript Interop](#javascript-interop-js-interpreter-only)
27. [Complete Reference Card](#complete-reference-card)

---

## Introduction

**sdev** is an expressive, full-featured programming language with a deliberately unique syntax designed to feel fresh and readable. It supports:

- **Unique English-inspired keywords** — `forge`, `conjure`, `ponder`, `cycle`, `iterate`, `yield`, `yeet`, `skip`
- **Block delimiters** — `::` to open a block and `;;` to close it — no curly braces
- **First-class functions and lambdas** — `(x) -> x * 2`
- **Pipe operator** — `|>` for clean functional composition
- **Full OOP** — `essence` (classes), `extend` (inheritance), `self`, `super`, `new`
- **Error handling** — `attempt :: ... ;; rescue err :: ... ;;`
- **Built-in data structures** — Set, Map, Queue, Stack, LinkedList
- **Matrix math** — `matmul`, `transpose`, `dot`, `reshape`, etc.
- **2D Graphics & Turtle API** — canvas drawing, shapes, gradients, turtle graphics, sprites
- **Async / concurrency** — `async conjure`, `await`, `spawn`
- **JavaScript interop** — `js` keyword for seamless JS integration

sdev runs in the browser-based IDE (at `/ide`), in the Playground (`/`), and as a downloadable Electron desktop application.

---

## Getting Started

### Running in the IDE

Open the sdev IDE at `/ide`. Press **Ctrl+Enter** (or the **Run** button) to execute your program. Output appears in the **OUTPUT** panel at the bottom.

### Running in the Playground

Go to the main Playground at `/`. Type or paste sdev code in the editor, then click **Run**.

### Downloading the Desktop App

In the IDE, go to the **Download** button → **Electron Desktop App**. This gives you three files:

```
package.json
main.js
README.md
```

Install and run:

```bash
npm install
npm start
```

This opens sdev IDE as a native desktop window that wraps the full web IDE.

### Your First Program

```sdev
// hello.sdev
speak("Hello, World!")
```

Output:
```
Hello, World!
```

A slightly more involved first program:

```sdev
forge name be "Alice"
forge age be 30

speak("Name:", name)
speak("Age:", age)
speak("In 10 years:", age + 10)

conjure greet(person, greeting) ::
  yield greeting + ", " + person + "!"
;;

speak(greet(name, "Welcome"))
```

Output:
```
Name: Alice
Age: 30
In 10 years: 40
Welcome, Alice!
```

---

## Syntax Overview

### Comments

```sdev
// This is a single-line comment
# This is also a single-line comment (Python style)
```

### Blocks

sdev uses `::` to start a block and `;;` to end it — never curly braces `{}`:

```sdev
ponder x > 5 ::
  speak("x is big")
;;

conjure add(a, b) ::
  yield a + b
;;
```

Blocks can also be written inline for short single-statement bodies:

```sdev
ponder x > 5 :: speak("big") ;;
```

### No Semicolons Required

Statements are separated by newlines. You do NOT need `;` at the end of lines.

```sdev
forge a be 1
forge b be 2
forge c be a + b
speak(c)
```

### Indentation

Indentation is cosmetic but strongly recommended. The language uses `::` and `;;` for block structure, not whitespace.

---

## Variables & Constants

### Declaring Variables

Use `forge` to declare a new variable and `be` to assign its value:

```sdev
forge name be "Alice"
forge age be 25
forge isActive be yep
forge score be 0.0
```

### Reassigning Variables

Just use `be` without `forge`:

```sdev
forge count be 0
count be count + 1
count be 10
```

### Compound Assignment (shorthand patterns)

```sdev
forge x be 10
x be x + 5    // x = 15
x be x * 2    // x = 30
x be x - 10   // x = 20
x be x / 4    // x = 5
```

### Built-in Constants

sdev provides these constants directly:

```sdev
speak(PI)        // 3.141592653589793
speak(TAU)       // 6.283185307179586 (2 * PI)
speak(E)         // 2.718281828459045
speak(INFINITY)  // Infinity
```

### Multiple Variables

```sdev
forge x be 10
forge y be 20
forge z be x + y

// Swap pattern
forge temp be x
x be y
y be temp
```

---

## Data Types

sdev has six core types:

| sdev Type | Description | Literal Example |
|-----------|-------------|-----------------|
| `number` | Integer or float | `42`, `3.14`, `-7`, `1.5e10` |
| `text` | Strings | `"hello"`, `'world'` |
| `truth` | Booleans | `yep`, `nope` |
| `void` | Null / absent | `void` |
| `list` | Arrays | `[1, 2, 3]` |
| `tome` | Dictionaries | `:: "key": "value" ;;` |

Functions and class instances are also first-class values.

### Numbers

```sdev
forge integer be 42
forge float be 3.14159
forge negative be -100
forge scientific be 1.5e10      // 15,000,000,000
forge hex be 0xFF               // 255
```

Arithmetic is standard, with `^` for power:

```sdev
speak(2 ^ 10)   // 1024
speak(10 % 3)   // 1
speak(7 / 2)    // 3.5
```

### Text (Strings)

```sdev
forge single be 'Hello'
forge double be "World"

// Escape sequences
forge tab be "col1\tcol2"
forge newline be "line1\nline2"
forge quoted be "She said \"hi\""

// String concatenation
forge full be "Hello" + ", " + "World!"

// String repetition
forge stars be "*" * 10   // "**********"

// Access characters
speak("hello"[0])   // h
speak("hello"[-1])  // o (last character)
```

### Truth (Booleans)

```sdev
forge t be yep    // true
forge f be nope   // false

// Boolean expressions
speak(5 > 3)          // yep
speak(5 equals 3)     // nope
speak(yep also nope)  // nope
speak(yep either nope) // yep
speak(isnt nope)       // yep
```

### Void (Null)

```sdev
forge nothing be void
ponder nothing equals void ::
  speak("It's void!")
;;
```

### Lists

```sdev
forge nums be [1, 2, 3, 4, 5]
forge mixed be [1, "two", yep, void]
forge empty be []
forge nested be [[1, 2], [3, 4], [5, 6]]

// Access by index (0-based)
speak(nums[0])    // 1
speak(nums[2])    // 3
speak(nums[-1])   // 5  (last element)

// Modify element
nums[0] be 100
speak(nums)       // [100, 2, 3, 4, 5]

// List length
speak(measure(nums))   // 5

// Slicing
speak(portion(nums, 1, 3))  // [2, 3]
speak(portion(nums, 2))     // [3, 4, 5]
```

### Tomes (Dictionaries)

Tomes are key-value stores. Keys are strings.

```sdev
forge person be ::
  "name": "Alice",
  "age": 30,
  "active": yep
;;

// Access values - both bracket and dot notation work
speak(person["name"])  // Alice
speak(person.age)      // 30

// Set new or existing keys
person["city"] be "New York"
person.age be 31

// Check if key exists
speak(contains(person, "name"))   // yep
speak(contains(person, "phone"))  // nope

// Get all keys, values, entries
speak(inscriptions(person))  // ["name", "age", "active", "city"]
speak(contents(person))      // ["Alice", 31, yep, "New York"]
speak(entries(person))       // [["name","Alice"], ...]
```

---

## Operators

### Arithmetic Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `+` | Addition | `5 + 3` | `8` |
| `-` | Subtraction | `10 - 4` | `6` |
| `*` | Multiplication | `4 * 3` | `12` |
| `/` | Division | `7 / 2` | `3.5` |
| `%` | Modulo | `10 % 3` | `1` |
| `^` | Power | `2 ^ 8` | `256` |
| `-x` | Negation | `-5` | `-5` |

### Comparison Operators

| Operator | Description | Example | Result |
|----------|-------------|---------|--------|
| `equals` | Equal to | `5 equals 5` | `yep` |
| `differs` | Not equal | `5 differs 3` | `yep` |
| `<>` | Not equal (alt) | `5 <> 3` | `yep` |
| `<` | Less than | `3 < 5` | `yep` |
| `>` | Greater than | `5 > 3` | `yep` |
| `<=` | Less or equal | `3 <= 3` | `yep` |
| `>=` | Greater or equal | `5 >= 5` | `yep` |

### Logical Operators

| Operator | Meaning | Example |
|----------|---------|---------|
| `also` | AND | `yep also yep` → `yep` |
| `either` | OR | `nope either yep` → `yep` |
| `isnt` | NOT | `isnt nope` → `yep` |

Short-circuit evaluation applies: `also` stops at first `nope`, `either` stops at first `yep`.

### String & List Concatenation

```sdev
"Hello" + " World"    // "Hello World"
[1, 2] + [3, 4]       // [1, 2, 3, 4]
"ha" * 3              // "hahaha"
[0] * 5               // [0, 0, 0, 0, 0]
```

### Pipe Operator `|>`

The pipe operator passes the left-hand value as the first argument to the right-hand function:

```sdev
// Without pipe
forge result be weave(sort(sift(each([1,2,3,4,5], x -> x * 2), x -> x > 4)), ", ")

// With pipe — much cleaner!
forge result be [1, 2, 3, 4, 5]
  |> each(x -> x * 2)
  |> sift(x -> x > 4)
  |> weave(", ")
speak(result)  // "6, 8, 10"
```

### Ternary Operator `~`

Inline if/else expression:

```sdev
forge x be 10
forge label be x > 5 ~ "big" : "small"
speak(label)  // "big"

// In function calls
speak(magnitude(-5) > 3 ~ "large magnitude" : "small magnitude")

// Nested ternary
forge grade be 85
forge letter be grade >= 90 ~ "A" : grade >= 80 ~ "B" : grade >= 70 ~ "C" : "F"
speak(letter)  // "B"
```

### Operator Precedence (high to low)

1. `^` (power)
2. Unary `-`, `isnt`
3. `*`, `/`, `%`
4. `+`, `-`
5. `<`, `>`, `<=`, `>=`
6. `equals`, `differs`, `<>`
7. `also`
8. `either`
9. `~` (ternary)
10. `|>` (pipe)

---

## String Operations

sdev has a rich string library. All string functions return new strings — strings are immutable.

```sdev
forge s be "  Hello, World!  "

// Case conversion
speak(upper(s))          // "  HELLO, WORLD!  "
speak(lower(s))          // "  hello, world!  "

// Trimming
speak(trim(s))           // "Hello, World!"

// Length
speak(measure(s))        // 18

// Contains / starts / ends
speak(contains(s, "World"))      // yep
speak(startswith(trim(s), "Hello"))  // yep
speak(endswith(trim(s), "!"))        // yep

// Replace (replaces ALL occurrences)
speak(replace("banana", "a", "o"))   // "bonono"

// Find index
speak(locate("hello world", "world"))  // 6
speak(locate("hello", "xyz"))          // -1

// Split and join
forge parts be shatter("a,b,c,d", ",")
speak(parts)                 // ["a", "b", "c", "d"]
speak(weave(parts, " | "))   // "a | b | c | d"

// Character list
speak(chars("abc"))   // ["a", "b", "c"]

// Reverse
speak(reverse("hello"))  // "olleh"

// Padding
speak(padLeft("5", 4, "0"))    // "0005"
speak(padRight("hi", 6, "!"))  // "hi!!!!"

// Format strings (use {} as placeholders)
speak(format("Hello, {}! You are {} years old.", "Bob", 25))
// "Hello, Bob! You are 25 years old."

// Repeat
speak(repeat("ab", 3))   // "ababab"

// Substring
speak(snatch("hello world", 6, 11))  // "world"
```

---

## Control Flow

### If / Else — `ponder` / `otherwise`

```sdev
forge score be 87

ponder score >= 90 ::
  speak("Grade: A")
;; otherwise ponder score >= 80 ::
  speak("Grade: B")
;; otherwise ponder score >= 70 ::
  speak("Grade: C")
;; otherwise ponder score >= 60 ::
  speak("Grade: D")
;; otherwise ::
  speak("Grade: F")
;;
```

Inline (for short bodies):

```sdev
ponder x > 0 :: speak("positive") ;; otherwise :: speak("non-positive") ;;
```

### While Loop — `cycle`

```sdev
forge n be 1
cycle n <= 10 ::
  speak(n)
  n be n + 1
;;

// Infinite loop with break
cycle yep ::
  forge x be randint(1, 10)
  speak("Got:", x)
  ponder x equals 7 ::
    speak("Found 7! Stopping.")
    yeet    // break
  ;;
;;
```

### For-Each Loop — `iterate through`

```sdev
forge fruits be ["apple", "banana", "cherry"]

iterate fruit through fruits ::
  speak(fruit)
;;
// apple
// banana
// cherry
```

### For-In Loop — `within`

```sdev
// Iterate over a list
within fruit be ["apple", "banana", "cherry"] ::
  speak(fruit)
;;

// Iterate over a range
within i be sequence(5) ::
  speak(i)   // 0 1 2 3 4
;;

within i be sequence(1, 11) ::
  speak(i)   // 1 2 3 ... 10
;;

within i be sequence(0, 20, 5) ::
  speak(i)   // 0 5 10 15
;;
```

### Loop Control

#### `yeet` — Break

Exit the nearest enclosing loop immediately:

```sdev
within i be sequence(100) ::
  ponder i > 5 ::
    yeet
  ;;
  speak(i)
;;
// 0 1 2 3 4 5
```

#### `skip` — Continue

Skip the rest of the current iteration and go to the next:

```sdev
within i be sequence(10) ::
  ponder i % 2 equals 0 ::
    skip   // skip even numbers
  ;;
  speak(i)   // prints only odd: 1 3 5 7 9
;;
```

### Nested Loops

```sdev
within i be sequence(1, 4) ::
  within j be sequence(1, 4) ::
    speak(i + " x " + j + " = " + morph(i * j, "text"))
  ;;
;;
```

---

## Functions

### Basic Functions — `conjure`

```sdev
conjure greet(name) ::
  speak("Hello, " + name + "!")
;;

greet("Alice")
greet("World")
```

### Return Values — `yield`

```sdev
conjure add(a, b) ::
  yield a + b
;;

conjure max(a, b) ::
  ponder a > b :: yield a ;;
  yield b
;;

forge sum be add(10, 20)
speak(sum)         // 30
speak(max(5, 9))   // 9
```

### Default Parameters

```sdev
conjure greet(name, greeting) ::
  ponder greeting equals void :: greeting be "Hello" ;;
  yield greeting + ", " + name + "!"
;;

speak(greet("Alice"))           // Hello, Alice!
speak(greet("Bob", "Welcome"))  // Welcome, Bob!
```

### Lambda Functions (Arrow Syntax)

Single expression, one parameter:

```sdev
forge double be x -> x * 2
forge square be x -> x ^ 2
forge negate be x -> -x

speak(double(5))   // 10
speak(square(4))   // 16
speak(negate(7))   // -7
```

Multiple parameters (parentheses required):

```sdev
forge add be (a, b) -> a + b
forge clamp be (v, lo, hi) -> v < lo ~ lo : v > hi ~ hi : v

speak(add(3, 4))           // 7
speak(clamp(150, 0, 100))  // 100
```

Multi-statement lambda body with `::` and `;;`:

```sdev
forge process be x -> ::
  forge doubled be x * 2
  forge result be doubled + 10
  yield result
;;

speak(process(5))   // 20
```

### Closures

Functions capture variables from their enclosing scope:

```sdev
conjure makeCounter(start) ::
  forge count be start

  conjure increment() ::
    count be count + 1
    yield count
  ;;

  conjure reset() ::
    count be start
  ;;

  yield :: "next": increment, "reset": reset ;;
;;

forge c be makeCounter(0)
speak(c.next())   // 1
speak(c.next())   // 2
speak(c.next())   // 3
c.reset()
speak(c.next())   // 1
```

### Recursive Functions

```sdev
conjure factorial(n) ::
  ponder n <= 1 :: yield 1 ;;
  yield n * factorial(n - 1)
;;

speak(factorial(10))   // 3628800

// Mutual recursion
conjure isEven(n) ::
  ponder n equals 0 :: yield yep ;;
  yield isOdd(n - 1)
;;

conjure isOdd(n) ::
  ponder n equals 0 :: yield nope ;;
  yield isEven(n - 1)
;;

speak(isEven(4))   // yep
speak(isOdd(7))    // yep
```

### Higher-Order Functions as Parameters

```sdev
conjure applyTwice(f, x) ::
  yield f(f(x))
;;

forge double be x -> x * 2
speak(applyTwice(double, 3))   // 12

conjure compose(f, g) ::
  yield x -> f(g(x))
;;

forge addOne be x -> x + 1
forge triple be x -> x * 3
forge addOneThenTriple be compose(triple, addOne)
speak(addOneThenTriple(4))   // 15
```

### Variadic-style Functions

Use lists to simulate variadic arguments:

```sdev
conjure sumAll(nums) ::
  yield fold(nums, 0, (acc, x) -> acc + x)
;;

speak(sumAll([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]))   // 55
```

---

## Object-Oriented Programming

sdev has full class-based OOP using `essence` for class definitions, `new` for instantiation, `self` for the instance reference, `super` for parent class access, and `extend` for inheritance.

### Defining a Class — `essence`

```sdev
essence Person ::
  conjure init(self, name, age) ::
    self.name be name
    self.age be age
  ;;

  conjure greet(self) ::
    speak("Hi, I'm " + self.name + " and I'm " + morph(self.age, "text") + " years old.")
  ;;

  conjure birthday(self) ::
    self.age be self.age + 1
    speak(self.name + " is now " + morph(self.age, "text") + "!")
  ;;

  conjure toString(self) ::
    yield "Person(" + self.name + ", " + morph(self.age, "text") + ")"
  ;;
;;
```

### Creating Instances — `new`

```sdev
forge alice be new Person("Alice", 30)
forge bob be new Person("Bob", 25)

alice.greet()   // Hi, I'm Alice and I'm 30 years old.
bob.greet()     // Hi, I'm Bob and I'm 25 years old.

alice.birthday()   // Alice is now 31!
speak(alice.age)   // 31

speak(alice.toString())  // Person(Alice, 31)
```

### Inheritance — `extend`

```sdev
essence Animal ::
  conjure init(self, name, sound) ::
    self.name be name
    self.sound be sound
    self.energy be 100
  ;;

  conjure makeSound(self) ::
    speak(self.name + " says: " + self.sound)
  ;;

  conjure eat(self, food) ::
    self.energy be self.energy + 20
    speak(self.name + " eats " + food)
  ;;

  conjure status(self) ::
    speak(self.name + " | Energy: " + morph(self.energy, "text"))
  ;;
;;

essence Dog extend Animal ::
  conjure init(self, name, breed) ::
    super.init(name, "Woof!")
    self.breed be breed
    self.tricks be []
  ;;

  conjure makeSound(self) ::
    speak(self.name + " barks: WOOF WOOF!")   // Override parent
  ;;

  conjure learnTrick(self, trick) ::
    gather(self.tricks, trick)
    speak(self.name + " learned: " + trick)
  ;;

  conjure showTricks(self) ::
    ponder measure(self.tricks) equals 0 ::
      speak(self.name + " knows no tricks.")
      yield void
    ;;
    speak(self.name + " can do: " + weave(self.tricks, ", "))
  ;;
;;

forge rex be new Dog("Rex", "German Shepherd")
rex.makeSound()                // Rex barks: WOOF WOOF!
rex.eat("kibble")              // Rex eats kibble
rex.learnTrick("sit")
rex.learnTrick("shake")
rex.learnTrick("roll over")
rex.showTricks()               // Rex can do: sit, shake, roll over
rex.status()                   // Rex | Energy: 120
```

### Multi-level Inheritance

```sdev
essence Vehicle ::
  conjure init(self, brand, speed) ::
    self.brand be brand
    self.speed be speed
    self.fuel be 100
  ;;

  conjure describe(self) ::
    yield self.brand + " going " + morph(self.speed, "text") + " km/h"
  ;;
;;

essence Car extend Vehicle ::
  conjure init(self, brand, speed, doors) ::
    super.init(brand, speed)
    self.doors be doors
  ;;

  conjure honk(self) ::
    speak(self.brand + ": Beep beep!")
  ;;
;;

essence ElectricCar extend Car ::
  conjure init(self, brand, speed, doors, range) ::
    super.init(brand, speed, doors)
    self.range be range
    self.battery be 100
  ;;

  conjure charge(self) ::
    self.battery be 100
    speak(self.brand + " fully charged!")
  ;;

  conjure describe(self) ::
    yield super.describe() + " (Electric, " + morph(self.range, "text") + "km range)"
  ;;
;;

forge tesla be new ElectricCar("Tesla Model 3", 250, 4, 500)
speak(tesla.describe())   // Tesla Model 3 going 250 km/h (Electric, 500km range)
tesla.honk()              // Tesla Model 3: Beep beep!
tesla.charge()            // Tesla Model 3 fully charged!
```

### Properties and Computed Properties

```sdev
essence Circle ::
  conjure init(self, radius) ::
    self.radius be radius
  ;;

  conjure area(self) ::
    yield PI * self.radius ^ 2
  ;;

  conjure circumference(self) ::
    yield 2 * PI * self.radius
  ;;

  conjure scale(self, factor) ::
    self.radius be self.radius * factor
    yield self
  ;;

  conjure toString(self) ::
    yield "Circle(r=" + morph(nearby(self.radius * 100) / 100, "text") + ")"
  ;;
;;

forge c be new Circle(5)
speak(nearby(c.area()))           // 79
speak(nearby(c.circumference()))  // 31

c.scale(2)
speak(c.toString())   // Circle(r=10)
```

---

## Error Handling

### Try / Rescue — `attempt` / `rescue`

Use `attempt` to try code that might fail, and `rescue` to catch errors:

```sdev
attempt ::
  forge result be 10 / 0
  speak(result)
;; rescue err ::
  speak("Caught an error: " + err)
;;
```

```sdev
attempt ::
  forge nums be [1, 2, 3]
  speak(nums[10])   // index out of bounds
;; rescue err ::
  speak("Error accessing list:", err)
;;
```

### Nested Error Handling

```sdev
conjure safeDivide(a, b) ::
  attempt ::
    ponder b equals 0 ::
      speak("Error: division by zero")
      yield void
    ;;
    yield a / b
  ;; rescue err ::
    speak("Unexpected error:", err)
    yield void
  ;;
;;

speak(safeDivide(10, 2))   // 5
speak(safeDivide(10, 0))   // Error: division by zero
```

### Assertion

```sdev
conjure validateAge(age) ::
  attempt ::
    ponder age < 0 ::
      speak("Error: Age cannot be negative")
      yield nope
    ;;
    ponder age > 150 ::
      speak("Error: Age is unreasonably large")
      yield nope
    ;;
    yield yep
  ;; rescue err ::
    speak("Validation error:", err)
    yield nope
  ;;
;;
```

---

## Async & Concurrency

### Async Functions

Use `async conjure` to define an asynchronous function:

```sdev
async conjure fetchData(url) ::
  forge response be await fetch(url)
  yield response
;;
```

### Await

Use `await` inside `async` functions to wait for asynchronous operations:

```sdev
async conjure loadUserProfile(id) ::
  forge user be await fetchData("https://api.example.com/users/" + id)
  forge posts be await fetchData("https://api.example.com/posts?userId=" + id)

  yield ::
    "user": user,
    "posts": posts
  ;;
;;
```

### Spawn (Concurrent Execution)

Use `spawn` to run functions concurrently without waiting for them:

```sdev
conjure worker(name, ms) ::
  delay(ms)
  speak(name + " finished after " + morph(ms, "text") + "ms")
;;

spawn worker("Task A", 2000)
spawn worker("Task B", 500)
spawn worker("Task C", 1000)
// Task B completes first, then C, then A
```

### Delay

Pause execution for a number of milliseconds:

```sdev
speak("Starting...")
delay(1000)
speak("One second later...")
delay(2000)
speak("Three seconds total")
```

---

## Built-in Output Functions

| Function | Description | Example |
|----------|-------------|---------|
| `speak(...)` | Print values with spaces between them | `speak("x =", 42)` → `x = 42` |
| `whisper(...)` | Print values concatenated (no spaces) | `whisper("a", "b")` → `ab` |
| `shout(...)` | Print values uppercased | `shout("hello")` → `HELLO` |

```sdev
forge x be 42
forge name be "Alice"

speak("The answer is", x)       // The answer is 42
speak(name, "scored", x, "%")   // Alice scored 42 %
whisper("[", x, "]")             // [42]
shout("warning: low battery")    // WARNING: LOW BATTERY
```

---

## Built-in Math Functions

### Core Math

| Function | Description | Example |
|----------|-------------|---------|
| `magnitude(x)` | Absolute value | `magnitude(-5)` → `5` |
| `root(x)` | Square root | `root(16)` → `4` |
| `ground(x)` | Floor (round down) | `ground(3.7)` → `3` |
| `elevate(x)` | Ceiling (round up) | `elevate(3.2)` → `4` |
| `nearby(x)` | Round to nearest int | `nearby(3.5)` → `4` |
| `least(...)` | Minimum value | `least(3, 1, 4, 1)` → `1` |
| `greatest(...)` | Maximum value | `greatest(3, 1, 4, 1)` → `4` |

### Trigonometry

| Function | Description |
|----------|-------------|
| `sin(x)` | Sine (radians) |
| `cos(x)` | Cosine (radians) |
| `tan(x)` | Tangent (radians) |
| `asin(x)` | Arcsine |
| `acos(x)` | Arccosine |
| `atan(x)` | Arctangent |
| `atan2(y, x)` | Two-argument arctangent |
| `radians(deg)` | Convert degrees to radians |
| `degrees(rad)` | Convert radians to degrees |

### Logarithms & Exponentials

| Function | Description |
|----------|-------------|
| `log(x)` | Natural logarithm |
| `log10(x)` | Base-10 logarithm |
| `log2(x)` | Base-2 logarithm |
| `exp(x)` | e^x |

### Advanced Math

| Function | Description | Example |
|----------|-------------|---------|
| `clamp(v, min, max)` | Constrain value to range | `clamp(150, 0, 100)` → `100` |
| `lerp(a, b, t)` | Linear interpolation | `lerp(0, 100, 0.3)` → `30` |
| `mapRange(v, fromLo, fromHi, toLo, toHi)` | Map value between ranges | `mapRange(50, 0, 100, 0, 1)` → `0.5` |
| `sum(list)` | Sum all elements of a list | `sum([1,2,3,4])` → `10` |
| `average(list)` | Mean value of a list | `average([1,2,3,4])` → `2.5` |
| `sign(x)` | Sign: -1, 0, or 1 | `sign(-5)` → `-1` |
| `dist(x1, y1, x2, y2)` | Distance between two points | `dist(0,0,3,4)` → `5` |

### Random

| Function | Description | Example |
|----------|-------------|---------|
| `chaos()` | Random float 0-1 | `chaos()` → `0.7234` |
| `randint(min, max)` | Random integer (inclusive) | `randint(1, 6)` → `4` |
| `pick(list)` | Random element from list | `pick(["a","b","c"])` → `"b"` |
| `shuffle(list)` | Shuffle a copy of list | `shuffle([1,2,3])` → `[3,1,2]` |

```sdev
// Dice rolling
conjure rollDice(sides) ::
  yield randint(1, sides)
;;

speak("d6:", rollDice(6))
speak("d20:", rollDice(20))

// Coin flip
speak(chaos() > 0.5 ~ "Heads" : "Tails")
```

---

## Built-in String Functions

| Function | Description | Signature |
|----------|-------------|-----------|
| `upper(s)` | Uppercase | `upper("hi")` → `"HI"` |
| `lower(s)` | Lowercase | `lower("HI")` → `"hi"` |
| `trim(s)` | Remove surrounding whitespace | `trim("  hi  ")` → `"hi"` |
| `reverse(s)` | Reverse string | `reverse("abc")` → `"cba"` |
| `measure(s)` | String length | `measure("hello")` → `5` |
| `contains(s, sub)` | Check substring | `contains("hello", "ell")` → `yep` |
| `startswith(s, prefix)` | Starts with | `startswith("hello", "he")` → `yep` |
| `endswith(s, suffix)` | Ends with | `endswith("hello", "lo")` → `yep` |
| `replace(s, old, new)` | Replace all occurrences | `replace("aaa", "a", "b")` → `"bbb"` |
| `locate(s, sub)` | Index of substring (-1 if not found) | `locate("hello", "l")` → `2` |
| `shatter(s, sep)` | Split string into list | `shatter("a,b", ",")` → `["a","b"]` |
| `chars(s)` | Split into list of characters | `chars("abc")` → `["a","b","c"]` |
| `weave(list, sep)` | Join list with separator | `weave(["a","b"], "-")` → `"a-b"` |
| `padLeft(s, w, c)` | Pad left to width | `padLeft("5", 3, "0")` → `"005"` |
| `padRight(s, w, c)` | Pad right to width | `padRight("hi", 5, ".")` → `"hi..."` |
| `format(s, ...)` | Substitute `{}` placeholders | `format("Hi {}!", "Bob")` → `"Hi Bob!"` |
| `repeat(s, n)` | Repeat string n times | `repeat("ab", 3)` → `"ababab"` |
| `snatch(s, start, end?)` | Substring by index | `snatch("hello", 1, 3)` → `"el"` |

---

## Built-in List Functions

| Function | Description | Example |
|----------|-------------|---------|
| `measure(list)` | Length of list | `measure([1,2,3])` → `3` |
| `gather(list, item)` | Append item (mutates) | `gather([1,2], 3)` → `[1,2,3]` |
| `pluck(list)` | Remove and return last item | `pluck([1,2,3])` → `3` |
| `snatch(list, idx)` | Remove item at index | `snatch([1,2,3], 1)` → removes `2` |
| `insert(list, idx, item)` | Insert at index | `insert([1,3], 1, 2)` → `[1,2,3]` |
| `portion(list, start, end?)` | Slice | `portion([1,2,3,4], 1, 3)` → `[2,3]` |
| `reverse(list)` | Return reversed copy | `reverse([1,2,3])` → `[3,2,1]` |
| `sort(list)` | Sort ascending copy | `sort([3,1,2])` → `[1,2,3]` |
| `sortDesc(list)` | Sort descending copy | `sortDesc([1,3,2])` → `[3,2,1]` |
| `unique(list)` | Remove duplicates | `unique([1,1,2,2,3])` → `[1,2,3]` |
| `flatten(list)` | Flatten nested lists | `flatten([[1,2],[3,4]])` → `[1,2,3,4]` |
| `concat(a, b)` | Concatenate two lists | `concat([1,2],[3,4])` → `[1,2,3,4]` |
| `contains(list, item)` | Check membership | `contains([1,2,3], 2)` → `yep` |
| `first(list)` | First element | `first([1,2,3])` → `1` |
| `last(list)` | Last element | `last([1,2,3])` → `3` |
| `clone(list)` | Deep copy | `clone([1,[2,3]])` |

---

## Built-in Tome (Dict) Functions

| Function | Description |
|----------|-------------|
| `inscriptions(tome)` | Get all keys as a list |
| `contents(tome)` | Get all values as a list |
| `entries(tome)` | Get `[[key, value], ...]` pairs |
| `contains(tome, key)` | Check if key exists |
| `merge(t1, t2, ...)` | Merge dicts (later overrides earlier) |
| `erase(tome, key)` | Remove key |

```sdev
forge a be :: "x": 1, "y": 2 ;;
forge b be :: "y": 99, "z": 3 ;;
forge c be merge(a, b)
speak(c)  // {"x": 1, "y": 99, "z": 3}
```

---

## Input / Output

### `input(prompt?)` — Read User Input

Prompts the user for input and returns the entered text:

```sdev
forge name be input("What is your name? ")
speak("Hello, " + name + "!")

forge age be morph(input("Enter your age: "), "number")
speak("You are " + age + " years old")
```

### `print(...)` / `println(...)` — Print (Aliases)

Standard aliases for `speak()`:

```sdev
print("Hello")
println("World")
```

---

## Character & Code Point Functions

| Function | Description | Example |
|----------|-------------|---------|
| `chr(n)` | Number to character | `chr(65)` → `"A"` |
| `ord(c)` | Character to number | `ord("A")` → `65` |

```sdev
speak(chr(72) + chr(105))  // "Hi"
speak(ord("A"))             // 65

// Build a Caesar cipher
conjure encrypt(text, shift) ::
  forge result be ""
  iterate through text ::
    forge code be ord(item) + shift
    result be result + chr(code)
  ;;
  yield result
;;
speak(encrypt("ABC", 3))  // "DEF"
```

---

## Number Base Conversion

| Function | Description | Example |
|----------|-------------|---------|
| `hex(n)` | Number to hex string | `hex(255)` → `"0xFF"` |
| `oct(n)` | Number to octal | `oct(8)` → `"0o10"` |
| `bin(n)` | Number to binary | `bin(10)` → `"0b1010"` |
| `parseNum(str, base?)` | Parse string with base | `parseNum("FF", 16)` → `255` |

```sdev
speak(hex(255))        // "0xFF"
speak(bin(42))         // "0b101010"
speak(oct(64))         // "0o100"
speak(parseNum("1010", 2))  // 10
speak(parseNum("FF", 16))   // 255
```

---

## Number Formatting & Checking

| Function | Description | Example |
|----------|-------------|---------|
| `toFixed(n, digits)` | Format decimal places | `toFixed(3.14159, 2)` → `"3.14"` |
| `toPrecision(n, p)` | Format to precision | `toPrecision(123.456, 4)` → `"123.5"` |
| `isNaN(v)` | Check if NaN | `isNaN(0/0)` → `yep` |
| `isFinite(v)` | Check if finite | `isFinite(INFINITY)` → `nope` |
| `isInteger(v)` | Check if integer | `isInteger(3.0)` → `yep` |

```sdev
forge pi be 3.14159265
speak(toFixed(pi, 2))      // "3.14"
speak(toPrecision(pi, 4))  // "3.142"
speak(isInteger(42))       // yep
speak(isFinite(1/0))       // nope
```

---

## String Checking Functions

| Function | Description | Example |
|----------|-------------|---------|
| `capitalize(s)` | First char uppercase | `capitalize("hello")` → `"Hello"` |
| `title(s)` | Title Case | `title("hello world")` → `"Hello World"` |
| `center(s, width, char?)` | Center-pad | `center("hi", 10, "-")` → `"----hi----"` |
| `trimLeft(s)` | Trim left whitespace | `trimLeft("  hi")` → `"hi"` |
| `trimRight(s)` | Trim right whitespace | `trimRight("hi  ")` → `"hi"` |
| `isUpper(s)` | All uppercase? | `isUpper("ABC")` → `yep` |
| `isLower(s)` | All lowercase? | `isLower("abc")` → `yep` |
| `isDigit(s)` | All digits? | `isDigit("123")` → `yep` |
| `isAlpha(s)` | All alphabetic? | `isAlpha("abc")` → `yep` |
| `isAlphaNum(s)` | All alphanumeric? | `isAlphaNum("abc123")` → `yep` |
| `isSpace(s)` | All whitespace? | `isSpace("  ")` → `yep` |

```sdev
speak(capitalize("hello world"))  // "Hello world"
speak(title("the quick brown fox"))  // "The Quick Brown Fox"
speak(center("TITLE", 20, "="))  // "=======TITLE========"
speak(isDigit("42"))   // yep
speak(isAlpha("hello"))  // yep
```

---

## Regex / Pattern Matching

| Function | Description |
|----------|-------------|
| `match(text, pattern)` | First regex match (returns list or void) |
| `matchAll(text, pattern)` | All regex matches |
| `replaceRegex(text, pattern, replacement)` | Regex replace (global) |
| `test(text, pattern)` | Test if pattern matches |

```sdev
forge text be "Hello 123 World 456"
speak(match(text, "\\d+"))           // ["123"]
speak(matchAll(text, "\\d+"))        // [["123"], ["456"]]
speak(replaceRegex(text, "\\d+", "#"))  // "Hello # World #"
speak(test(text, "\\d+"))           // yep

// Validate email
conjure isEmail(s) ::
  yield test(s, "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$")
;;
speak(isEmail("user@example.com"))  // yep
```

---

## Bitwise Operations

| Function | Description | Example |
|----------|-------------|---------|
| `bitAnd(a, b)` | Bitwise AND | `bitAnd(5, 3)` → `1` |
| `bitOr(a, b)` | Bitwise OR | `bitOr(5, 3)` → `7` |
| `bitXor(a, b)` | Bitwise XOR | `bitXor(5, 3)` → `6` |
| `bitNot(a)` | Bitwise NOT | `bitNot(0)` → `-1` |
| `bitShiftLeft(a, n)` | Left shift | `bitShiftLeft(1, 3)` → `8` |
| `bitShiftRight(a, n)` | Right shift | `bitShiftRight(8, 2)` → `2` |

```sdev
// Flags / bitmask example
forge READ be 1
forge WRITE be 2
forge EXEC be 4

forge perms be bitOr(READ, WRITE)  // 3
speak(bitAnd(perms, READ) > 0)     // yep (has read)
speak(bitAnd(perms, EXEC) > 0)     // nope (no exec)
```

---

## Base64 Encoding

| Function | Description |
|----------|-------------|
| `base64encode(text)` | Encode text to base64 |
| `base64decode(text)` | Decode base64 to text |

```sdev
forge encoded be base64encode("Hello, World!")
speak(encoded)  // "SGVsbG8sIFdvcmxkIQ=="
speak(base64decode(encoded))  // "Hello, World!"
```

---

## Hash Function

```sdev
speak(hash("hello"))     // deterministic 32-bit integer hash
speak(hash([1, 2, 3]))   // works on any value
```

---

## Time & Date

| Function | Description |
|----------|-------------|
| `now()` | Current timestamp in milliseconds |
| `timestamp()` | ISO 8601 string |
| `time()` | Detailed time tome with year, month, day, etc. |
| `formatTime(ms)` | Format milliseconds to ISO string |

```sdev
forge t be time()
speak("Year: " + t.year)
speak("Month: " + t.month)
speak("Day: " + t.day)
speak("Hour: " + t.hour)
speak("ISO: " + t.iso)

forge start be now()
// ... do work ...
forge elapsed be now() - start
speak("Took " + elapsed + "ms")
```

---

## Functional Programming

| Function | Description |
|----------|-------------|
| `compose(f, g, ...)` | Right-to-left function composition |
| `pipe(value, f, g, ...)` | Left-to-right value piping |
| `curry(fn, arity)` | Currying |
| `memoize(fn)` | Cache function results |
| `tap(value, fn)` | Execute fn with value, return value |
| `times(n, fn)` | Call fn n times with index |
| `groupBy(list, fn)` | Group elements by key function |
| `chunk(list, size)` | Split list into chunks |

```sdev
// Compose
conjure double(x) :: yield x * 2 ;;
conjure addOne(x) :: yield x + 1 ;;
forge doubleAndAdd be compose(addOne, double)
speak(doubleAndAdd(5))  // 11

// Pipe
forge result be pipe(5, double, addOne, double)
speak(result)  // 22

// Memoize (cache expensive computations)
conjure fib(n) ::
  ponder n <= 1 :: yield n ;;
  yield fib(n - 1) + fib(n - 2)
;;
forge fastFib be memoize(fib)
speak(fastFib(10))  // 55

// Group and chunk
forge words be ["apple", "avocado", "banana", "blueberry", "cherry"]
speak(groupBy(words, w -> charAt(w, 0)))
// :: a: ["apple", "avocado"], b: ["banana", "blueberry"], c: ["cherry"] ;;

speak(chunk([1,2,3,4,5,6,7], 3))  // [[1,2,3], [4,5,6], [7]]

// Times
speak(times(5, i -> i * i))  // [0, 1, 4, 9, 16]
```

---

## Buffer / Memory Operations

sdev provides low-level byte buffer operations for systems programming:

### `buffer(size)` — Create Byte Buffer

```sdev
forge mem be buffer(1024)
mem.set(0, 255)
mem.set(1, 128)
speak(mem.get(0))    // 255
speak(mem.get(1))    // 128
speak(mem.size())    // 1024
```

### Buffer Methods

| Method | Description |
|--------|-------------|
| `buf.get(index)` | Read byte at index |
| `buf.set(index, value)` | Write byte at index (0-255) |
| `buf.fill(value)` | Fill entire buffer |
| `buf.slice(start, end)` | Get portion as list |
| `buf.toList()` | Convert to list of numbers |
| `buf.toText()` | Decode as UTF-8 text |
| `buf.fromString(text)` | Write UTF-8 text into buffer |
| `buf.copyTo(target)` | Copy data to another buffer |
| `buf.size()` | Get buffer size |

### `pointer(buffer, offset)` — Memory Pointer

```sdev
forge mem be buffer(256)
forge ptr be pointer(mem, 0)
ptr.write(42)
speak(ptr.read())        // 42

forge ptr2 be ptr.advance(4)
ptr2.writeU16(1024)
speak(ptr2.readU16())    // 1024

ptr2.writeU32(0xDEADBEEF)
speak(hex(ptr2.readU32()))  // "0xDEADBEEF"
```

### Pointer Methods

| Method | Description |
|--------|-------------|
| `ptr.read()` | Read byte |
| `ptr.write(v)` | Write byte |
| `ptr.advance(n?)` | Return new pointer at offset+n |
| `ptr.readU16()` | Read 16-bit unsigned (little-endian) |
| `ptr.readU32()` | Read 32-bit unsigned (little-endian) |
| `ptr.writeU16(v)` | Write 16-bit unsigned |
| `ptr.writeU32(v)` | Write 32-bit unsigned |

---

## Error Handling & Control Flow

| Function | Description |
|----------|-------------|
| `exit(code?)` | Terminate program with exit code |
| `panic(message)` | Fatal error (kernel panic) |
| `throw(message)` | Throw custom error |

```sdev
// Throw and catch
attempt ::
  forge x be input("Enter a number: ")
  forge n be morph(x, "number")
  ponder n < 0 ::
    throw("Negative numbers not allowed!")
  ;;
  speak("Square root: " + root(n))
rescue err ::
  speak("Error: " + err)
;;

// Exit
ponder badCondition ::
  exit(1)
;;
```

---

## Additional Aliases

| Alias | Original | Description |
|-------|----------|-------------|
| `print()` | `speak()` | Standard print |
| `range()` | `sequence()` | Standard range |
| `typeof()` | `gettype()` | Type checking |
| `sleep()` | `delay()` | Pause (no-op in browser) |
| `keys()` | `inscriptions()` | Dict keys |
| `values()` | `contents()` | Dict values |
| `freeze(obj)` | — | Make object immutable |
| `isFrozen(obj)` | — | Check if frozen |
| `hash(value)` | — | 32-bit hash code |

---

## Higher-Order Functions

### `each` — Transform (Map)

Apply a function to every element and return a new list:

```sdev
forge nums be [1, 2, 3, 4, 5]
speak(each(nums, x -> x ^ 2))          // [1, 4, 9, 16, 25]
speak(each(nums, (x, i) -> x + i))     // [1, 3, 5, 7, 9]  (value + index)
speak(each(["a","b","c"], upper))       // ["A", "B", "C"]
```

### `sift` — Filter

Keep only elements where the predicate returns `yep`:

```sdev
forge nums be [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
speak(sift(nums, x -> x % 2 equals 0))       // [2, 4, 6, 8, 10]
speak(sift(nums, x -> x > 5))                // [6, 7, 8, 9, 10]
speak(sift(["", "hi", "", "world"], x -> measure(x) > 0))  // ["hi", "world"]
```

### `fold` — Reduce

Reduce a list to a single value using an accumulator:

```sdev
forge nums be [1, 2, 3, 4, 5]
speak(fold(nums, 0, (acc, x) -> acc + x))   // 15 (sum)
speak(fold(nums, 1, (acc, x) -> acc * x))   // 120 (product)

// Build a string
speak(fold(["a","b","c"], "", (acc, x) -> acc + x + "-"))  // "a-b-c-"

// Find max
speak(fold(nums, nums[0], (a, b) -> a > b ~ a : b))   // 5
```

### `seek` — Find First

Return the first element matching a predicate, or `void`:

```sdev
forge people be [
  :: "name": "Alice", "age": 22 ;;,
  :: "name": "Bob", "age": 35 ;;,
  :: "name": "Carol", "age": 28 ;;
]

forge adult be seek(people, p -> p.age >= 30)
speak(adult.name)   // Bob

forge nobody be seek(people, p -> p.age > 100)
speak(nobody)   // void
```

### `every` — All Match

Returns `yep` if ALL elements satisfy the predicate:

```sdev
speak(every([2,4,6,8], x -> x % 2 equals 0))  // yep
speak(every([1,2,3], x -> x > 0))             // yep
speak(every([1,-2,3], x -> x > 0))            // nope
```

### `some` — Any Match

Returns `yep` if ANY element satisfies the predicate:

```sdev
speak(some([1,3,5,6], x -> x % 2 equals 0))  // yep (6 is even)
speak(some([1,3,5,7], x -> x % 2 equals 0))  // nope
```

### `enumerate` — Index + Value

Pairs each element with its index:

```sdev
speak(enumerate(["a","b","c"]))
// [[0,"a"], [1,"b"], [2,"c"]]

within pair be enumerate(["red","green","blue"]) ::
  speak(pair[0] + ": " + pair[1])
;;
// 0: red
// 1: green
// 2: blue
```

### `zip` — Pair Two Lists

Combine two lists element-by-element:

```sdev
forge keys be ["name", "age", "city"]
forge vals be ["Alice", 30, "NYC"]
speak(zip(keys, vals))
// [["name","Alice"], ["age",30], ["city","NYC"]]
```

---

## Type System & Conversion

### Getting Type — `essence()`

Returns the type name as a string:

```sdev
speak(essence(42))         // "number"
speak(essence("hi"))       // "text"
speak(essence(yep))        // "truth"
speak(essence(void))       // "void"
speak(essence([1,2,3]))    // "list"
speak(essence(::;;))       // "tome"
```

### Converting Types — `morph()`

```sdev
speak(morph("42", "number"))     // 42
speak(morph(42, "text"))         // "42"
speak(morph(1, "truth"))         // yep
speak(morph(0, "truth"))         // nope
speak(morph("3.14", "number"))   // 3.14
```

### Type Checking Helpers

```sdev
speak(essence(x) equals "number")      // Check if number
speak(essence(x) equals "text")        // Check if string
speak(essence(x) equals "list")        // Check if list
speak(essence(x) equals "tome")        // Check if dict
speak(x equals void)                   // Check if null
```

---

## Collections

### Set

A collection of unique elements. Duplicate additions are silently ignored.

```sdev
forge s be Set()
s.add(1)
s.add(2)
s.add(2)    // Duplicate ignored
s.add(3)

speak(s.size())     // 3
speak(s.has(2))     // yep
speak(s.has(99))    // nope
speak(s.values())   // [1, 2, 3]

s.remove(2)
speak(s.values())   // [1, 3]

s.clear()
speak(s.size())     // 0
speak(s.isEmpty())  // yep
```

**Set methods:** `add(v)`, `remove(v)`, `has(v)`, `values()`, `size()`, `isEmpty()`, `clear()`, `toList()`

### Map

A key-value store where keys can be any type (including objects):

```sdev
forge m be Map()
m.set("name", "Alice")
m.set("age", 30)
m.set("active", yep)

speak(m.get("name"))     // Alice
speak(m.has("age"))      // yep
speak(m.keys())          // ["name", "age", "active"]
speak(m.values())        // ["Alice", 30, yep]
speak(m.entries())       // [["name","Alice"], ["age",30], ["active",yep]]
speak(m.size())          // 3

m.delete("active")
speak(m.size())          // 2
m.clear()
```

**Map methods:** `set(k, v)`, `get(k)`, `has(k)`, `delete(k)`, `keys()`, `values()`, `entries()`, `size()`, `isEmpty()`, `clear()`

### Queue (FIFO)

First-in, first-out data structure:

```sdev
forge q be Queue()
q.enqueue("first")
q.enqueue("second")
q.enqueue("third")

speak(q.peek())      // first  (look without removing)
speak(q.dequeue())   // first  (remove and return)
speak(q.peek())      // second
speak(q.size())      // 2
speak(q.isEmpty())   // nope
```

**Queue methods:** `enqueue(v)`, `dequeue()`, `peek()`, `size()`, `isEmpty()`, `clear()`, `toList()`

### Stack (LIFO)

Last-in, first-out data structure:

```sdev
forge s be Stack()
s.push(10)
s.push(20)
s.push(30)

speak(s.peek())   // 30  (look without removing)
speak(s.pop())    // 30  (remove and return)
speak(s.pop())    // 20
speak(s.size())   // 1

// Stack-based undo system
forge history be Stack()
history.push("action1")
history.push("action2")
history.push("action3")

speak("Undoing:", history.pop())  // action3
speak("Undoing:", history.pop())  // action2
```

**Stack methods:** `push(v)`, `pop()`, `peek()`, `size()`, `isEmpty()`, `clear()`, `toList()`

### LinkedList

A doubly-linked list with O(1) front/back operations:

```sdev
forge list be LinkedList()
list.append(1)
list.append(2)
list.append(3)
list.prepend(0)

speak(list.toList())   // [0, 1, 2, 3]
speak(list.size())     // 4
speak(list.get(2))     // 2

list.remove(1)         // Remove element with value 1
speak(list.toList())   // [0, 2, 3]

speak(list.head())     // 0
speak(list.tail())     // 3
```

**LinkedList methods:** `append(v)`, `prepend(v)`, `remove(v)`, `get(idx)`, `size()`, `head()`, `tail()`, `toList()`, `clear()`

---

## Matrix Operations

sdev has a comprehensive built-in matrix math library useful for data science and machine learning.

### Creating Matrices

```sdev
// Matrix filled with a value
forge zeros be matrix(3, 3, 0)
// [[0,0,0], [0,0,0], [0,0,0]]

forge ones be matrix(2, 4, 1)
// [[1,1,1,1], [1,1,1,1]]

// Identity matrix
forge eye be identity(4)
// [[1,0,0,0], [0,1,0,0], [0,0,1,0], [0,0,0,1]]

// Reshape a flat list into a matrix
forge m be reshape([1,2,3,4,5,6], 2, 3)
// [[1,2,3], [4,5,6]]
```

### Matrix Arithmetic

```sdev
forge a be [[1, 2], [3, 4]]
forge b be [[5, 6], [7, 8]]

// Element-wise operations
speak(matadd(a, b))     // [[6,8], [10,12]]
speak(matsub(a, b))     // [[-4,-4], [-4,-4]]
speak(matscale(a, 2))   // [[2,4], [6,8]]

// Matrix multiplication
speak(matmul(a, b))
// [[1*5+2*7, 1*6+2*8], [3*5+4*7, 3*6+4*8]]
// = [[19,22], [43,50]]

// Transpose
speak(transpose(a))
// [[1,3], [2,4]]
```

### Vector Operations

```sdev
forge v1 be [1, 2, 3]
forge v2 be [4, 5, 6]

// Dot product
speak(dot(v1, v2))   // 1*4 + 2*5 + 3*6 = 32

// Element-wise multiply via each
forge elem be each(v1, (x, i) -> x * v2[i])
speak(elem)   // [4, 10, 18]
```

### Matrix Utilities

| Function | Description |
|----------|-------------|
| `matrix(rows, cols, fill)` | Create filled matrix |
| `identity(n)` | Create n×n identity matrix |
| `transpose(m)` | Transpose rows and columns |
| `matmul(a, b)` | Matrix multiplication |
| `matadd(a, b)` | Element-wise addition |
| `matsub(a, b)` | Element-wise subtraction |
| `matscale(m, s)` | Scalar multiplication |
| `dot(a, b)` | Dot product of two vectors |
| `reshape(list, rows, cols)` | Reshape list to 2D matrix |
| `flatten(m)` | Flatten 2D matrix to 1D list |
| `shape(m)` | Get `[rows, cols]` of matrix |
| `sum(m)` | Sum all elements |
| `mean(list)` | Mean of a 1D list |

### Neural Network Example

```sdev
// Sigmoid activation function
conjure sigmoid(x) ::
  yield 1 / (1 + exp(-x))
;;

// Feedforward neural network layer
conjure layer(inputs, weights, biases) ::
  // inputs: [1 x n], weights: [n x m], biases: [1 x m]
  forge z be matmul(inputs, weights)
  forge zb be matadd(z, biases)
  // Apply sigmoid element-wise
  yield each(zb, row -> each(row, x -> sigmoid(x)))
;;

forge input be [[0.5, 0.3, 0.2]]
forge w1 be [[0.1, 0.2], [0.3, 0.4], [0.5, 0.6]]
forge b1 be [[0.1, 0.1]]

forge output be layer(input, w1, b1)
speak("Layer output:", output)
```

---

## Graphics & Game Development

sdev has a built-in 2D graphics and turtle graphics API. Graphics commands render to the Canvas panel in the IDE.

### Canvas Setup

```sdev
canvas(800, 600)    // Set canvas dimensions (width, height)
clear("#1a1a2e")    // Clear with a background color
```

### Fill and Stroke

```sdev
fill("blue")          // Set fill color
noFill()              // Disable fill
stroke("red", 2)      // Set stroke: color, width
noStroke()            // Disable stroke
lineWidth(3)          // Set line width separately
alpha(0.5)            // Set global transparency (0–1)
lineCap("round")      // Line cap: "round", "square", "butt"
lineJoin("round")     // Line join: "round", "bevel", "miter"
```

### Basic Shapes

```sdev
// Rectangle: rect(x, y, width, height, cornerRadius?)
fill("steelblue")
rect(50, 50, 200, 100)
rect(300, 50, 200, 100, 20)    // Rounded corners

// Circle: circle(x, y, radius)
fill("tomato")
circle(150, 300, 60)

// Ellipse: ellipse(x, y, radiusX, radiusY, rotation?)
fill("gold")
ellipse(350, 300, 100, 50)
ellipse(550, 300, 100, 50, 45)   // Rotated 45°

// Line: line(x1, y1, x2, y2)
stroke("white", 2)
line(50, 400, 750, 400)

// Arc: arc(x, y, radius, startAngle, endAngle, counterclockwise?)
stroke("lime", 3)
arc(200, 500, 50, 0, 270)

// Triangle: triangle(x1, y1, x2, y2, x3, y3)
fill("orchid")
triangle(400, 450, 450, 550, 350, 550)

// Polygon: polygon([[x,y], ...])
fill("coral")
polygon([[600, 400], [650, 430], [640, 490], [560, 490], [550, 430]])

// Star: star(x, y, outerR, innerR, points?)
fill("gold")
star(150, 150, 50, 25)          // 5-pointed star
star(300, 150, 60, 25, 8)       // 8-pointed star

// Heart: heart(x, y, size)
fill("red")
heart(500, 150, 50)

// Point: point(x, y, size?)
fill("white")
point(100, 100)
point(150, 100, 8)
```

### Text Drawing

```sdev
fill("white")
text("Hello, World!", 100, 100)           // Basic text
text("Large Text", 100, 150, 36)          // With size
text("Bold Text", 100, 200, 24, "bold")   // With style

font("Arial", "bold")                     // Set font family and style
textAlign("center", "middle")             // Horizontal: left/center/right; Vertical: top/middle/bottom
```

### Gradients

```sdev
// Linear gradient: fill with gradient from (x1,y1) to (x2,y2)
// Color stops: [position, color] where position is 0.0 to 1.0
linearGradient(0, 0, 400, 0, [0, "red"], [0.5, "yellow"], [1, "green"])
rect(0, 0, 400, 100)

// Radial gradient: from inner circle to outer circle
radialGradient(200, 200, 0, 200, 200, 150, [0, "white"], [0.5, "cyan"], [1, "navy"])
circle(200, 200, 150)
```

### Shadows

```sdev
shadow("rgba(0,0,0,0.5)", 15, 5, 5)   // color, blur, offsetX, offsetY
fill("gold")
circle(200, 200, 80)
noShadow()
```

### Transformations

```sdev
save()                // Push current state
translate(200, 200)   // Move origin to (200, 200)
rotate(0.785)         // Rotate 45° (in radians)
scale(1.5)            // Scale uniformly
rect(-50, -50, 100, 100)   // Draw centered rectangle
restore()             // Pop saved state

resetTransform()      // Reset all transforms to identity
```

### Path Drawing

```sdev
// Custom polygon path
fill("purple")
beginPath()
moveTo(100, 100)
lineTo(200, 80)
lineTo(250, 150)
lineTo(200, 220)
lineTo(100, 200)
closePath()
fillPath()
strokePath()

// Bezier curve
stroke("cyan", 2)
beginPath()
moveTo(100, 300)
bezierTo(150, 200, 250, 400, 300, 300)   // cp1x, cp1y, cp2x, cp2y, x, y
strokePath()

// Quadratic curve
beginPath()
moveTo(100, 400)
quadraticTo(200, 350, 300, 400)           // cpx, cpy, x, y
strokePath()
```

### Turtle Graphics

The turtle graphics API lets you draw by commanding a turtle that moves and draws lines as it goes.

```sdev
canvas(500, 500)
clear("#0d0d20")
turtle()           // Create turtle at center, facing up

// Basic movement
forward(100)       // Move forward 100 units (drawing as it goes)
right(90)          // Turn right 90 degrees
forward(100)
right(90)
forward(100)
right(90)
forward(100)       // This draws a square!

// Pen control
penup()            // Lift pen — move without drawing
goto(250, 250)     // Jump to coordinates
pendown()          // Lower pen — start drawing again

// Pen style
pencolor("lime")   // Set pen color (any CSS color)
penwidth(3)        // Set pen width

// Advanced
setheading(45)     // Set absolute direction (degrees)
speak(heading())   // Get current heading
speak(pos())       // Get current [x, y] position
home()             // Return to start position

// Turtle circle
turtleCircle(50)        // Draw full circle
turtleCircle(50, 72)    // Polygon approximation (72 steps)

// Dot and stamp
dot(10, "red")     // Draw a filled dot
stamp()            // Leave a mark of the turtle shape

// EXAMPLE: Psychedelic spiral
canvas(600, 600)
clear("#000000")
turtle()
within i be sequence(0, 300) ::
  pencolor(hue(i * 1.2))
  penwidth(1 + i * 0.02)
  forward(i)
  right(91)
;;
```

### Sprites & Game Objects

```sdev
// Create sprite: createSprite(x, y, width, height, color?)
forge player be createSprite(100, 100, 40, 40, "blue")
forge enemy be createSprite(400, 300, 40, 40, "red")

// Access/set properties
player.x be 150
player.velocityX be 5
player.velocityY be -2

// Update position (applies velocity)
updateSprite(player)

// Draw sprite
drawSprite(player)
drawSprite(enemy)

// Collision detection
ponder spriteCollides(player, enemy) ::
  speak("HIT!")
;;

// Move by delta
moveSprite(player, 10, 5)
```

### Color Functions

```sdev
// CSS color names work directly
fill("red")
fill("steelblue")
fill("rgba(255, 0, 0, 0.5)")

// Helper functions
forge red be rgb(255, 0, 0)
forge transparent be rgba(0, 255, 0, 0.3)

// HSL color — hue(hue, saturation?, lightness?)
forge cyan be hue(180)              // Cyan (s=100, l=50 defaults)
forge purple be hue(270, 80, 60)    // Custom HSL
forge faded be hsla(240, 100, 50, 0.4)

// Rainbow cycle (great for spirals!)
within i be sequence(360) ::
  fill(hue(i))
  rect(i, 0, 1, 50)
;;

// Random color
fill(randomColor())
```

### Graphics Math

```sdev
// Convert degrees/radians
speak(radians(180))   // 3.14159...
speak(degrees(PI))    // 180

// Lerp (smooth transitions)
forge pos be lerp(0, 100, 0.25)   // 25

// Map value between ranges
forge brightness be mapRange(50, 0, 100, 0, 255)   // 127.5

// Clamp
forge safe be clamp(150, 0, 100)   // 100

// Distance between two points
speak(dist(0, 0, 3, 4))   // 5
```

### Complete 2D Graphics Example — Starfield

```sdev
canvas(800, 600)

// Create 200 stars
forge stars be each(sequence(200), i -> ::
  "x": randint(0, 800),
  "y": randint(0, 600),
  "r": chaos() * 2 + 0.5,
  "speed": chaos() * 2 + 0.5,
  "bright": chaos() * 0.7 + 0.3
;;)

clear("#000011")

within star be stars ::
  fill(rgba(255, 255, 255, star.bright))
  circle(star.x, star.y, star.r)
;;

// Draw nebula in center
radialGradient(400, 300, 0, 400, 300, 200,
  [0, "rgba(100,50,200,0.4)"],
  [0.5, "rgba(50,100,255,0.2)"],
  [1, "rgba(0,0,0,0)"]
)
circle(400, 300, 200)
```

---

## File I/O

> **Note:** File I/O is available in the Python standalone interpreter and native desktop builds. In the browser-based IDE, these functions are simulated.

### Reading Files

```sdev
// Read entire file as text
forge content be decipher("data.txt")
speak(content)

// Read and parse JSON
forge config be unetch(decipher("config.json"))
speak(config.version)
speak(config.name)
```

### Writing Files

```sdev
// Write text file
inscribe("output.txt", "Hello, World!\n")

// Write JSON with indentation
forge data be :: "score": 100, "name": "Alice", "level": 5 ;;
inscribe("save.json", etch(data))
```

### Append to File

```sdev
appendFile("log.txt", "User logged in\n")
appendFile("log.txt", "User viewed dashboard\n")
```

### File Utilities

| Function | Description |
|----------|-------------|
| `decipher(path)` | Read file as text |
| `inscribe(path, content)` | Write text to file |
| `appendFile(path, content)` | Append to file |
| `fileExists(path)` | Returns `yep`/`nope` |
| `deleteFile(path)` | Delete a file |
| `listDir(path)` | Get list of files in directory |

---

## Networking

> **Note:** Network functions are available in async contexts. In the browser they use `fetch`. In native builds they use Node.js http.

### HTTP GET

```sdev
async conjure getUsers() ::
  forge data be await fetch("https://jsonplaceholder.typicode.com/users")
  yield data
;;
```

### HTTP POST

```sdev
async conjure createUser(name, email) ::
  forge response be await fetch("https://api.example.com/users", ::
    "method": "POST",
    "headers": :: "Content-Type": "application/json" ;;,
    "body": :: "name": name, "email": email ;;
  ;;)
  yield response
;;
```

---

## Examples & Recipes

### FizzBuzz

```sdev
within i be sequence(1, 101) ::
  ponder i % 15 equals 0 ::
    speak("FizzBuzz")
  ;; otherwise ponder i % 3 equals 0 ::
    speak("Fizz")
  ;; otherwise ponder i % 5 equals 0 ::
    speak("Buzz")
  ;; otherwise ::
    speak(i)
  ;;
;;
```

### Fibonacci (Memoized)

```sdev
forge memo be :: ;;

conjure fib(n) ::
  ponder n <= 1 :: yield n ;;
  ponder contains(memo, morph(n, "text")) ::
    yield memo[morph(n, "text")]
  ;;
  forge result be fib(n - 1) + fib(n - 2)
  memo[morph(n, "text")] be result
  yield result
;;

within i be sequence(0, 30) ::
  speak("fib(" + morph(i, "text") + ") =", fib(i))
;;
```

### Binary Search

```sdev
conjure binarySearch(arr, target) ::
  forge lo be 0
  forge hi be measure(arr) - 1

  cycle lo <= hi ::
    forge mid be ground((lo + hi) / 2)
    ponder arr[mid] equals target ::
      yield mid
    ;; otherwise ponder arr[mid] < target ::
      lo be mid + 1
    ;; otherwise ::
      hi be mid - 1
    ;;
  ;;

  yield -1
;;

forge sorted be [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
speak(binarySearch(sorted, 23))   // 5
speak(binarySearch(sorted, 50))   // -1
```

### Quicksort

```sdev
conjure quicksort(arr) ::
  ponder measure(arr) <= 1 :: yield arr ;;

  forge pivot be arr[ground(measure(arr) / 2)]
  forge less be sift(arr, x -> x < pivot)
  forge equal be sift(arr, x -> x equals pivot)
  forge greater be sift(arr, x -> x > pivot)

  yield quicksort(less) + equal + quicksort(greater)
;;

speak(quicksort([3, 6, 8, 10, 1, 2, 1]))
// [1, 1, 2, 3, 6, 8, 10]
```

### Stack-Based Calculator

```sdev
conjure calculate(expression) ::
  forge tokens be shatter(expression, " ")
  forge stack be Stack()

  within token be tokens ::
    ponder token equals "+" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a + b)
    ;; otherwise ponder token equals "-" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a - b)
    ;; otherwise ponder token equals "*" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a * b)
    ;; otherwise ponder token equals "/" ::
      forge b be stack.pop()
      forge a be stack.pop()
      stack.push(a / b)
    ;; otherwise ::
      stack.push(morph(token, "number"))
    ;;
  ;;

  yield stack.pop()
;;

speak(calculate("3 4 + 2 *"))    // (3+4)*2 = 14
speak(calculate("5 1 2 + 4 * + 3 -"))  // 5+(1+2)*4-3 = 14
```

### Caesar Cipher

```sdev
conjure caesarEncode(text, shift) ::
  forge result be ""
  within ch be chars(text) ::
    forge code be locate("ABCDEFGHIJKLMNOPQRSTUVWXYZ", upper(ch))
    ponder code >= 0 ::
      forge shifted be (code + shift) % 26
      result be result + "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[shifted]
    ;; otherwise ::
      result be result + ch
    ;;
  ;;
  yield result
;;

speak(caesarEncode("HELLO WORLD", 3))   // KHOOR ZRUOG
speak(caesarEncode("KHOOR ZRUOG", 23))  // HELLO WORLD (decode with 26-3=23)
```

### Word Frequency Counter

```sdev
conjure wordFrequency(text) ::
  forge words be shatter(lower(trim(text)), " ")
  forge freq be ::;;

  within word be words ::
    forge w be replace(replace(word, ".", ""), ",", "")
    ponder measure(w) > 0 ::
      ponder contains(freq, w) ::
        freq[w] be freq[w] + 1
      ;; otherwise ::
        freq[w] be 1
      ;;
    ;;
  ;;

  yield freq
;;

forge text be "the quick brown fox jumps over the lazy dog the fox"
forge freq be wordFrequency(text)
speak(freq)
// Sort by frequency
forge sorted be sort(inscriptions(freq), k -> -freq[k])
```

### Prime Sieve

```sdev
conjure sieve(limit) ::
  forge primes be each(sequence(2, limit + 1), x -> x)
  forge result be []

  cycle measure(primes) > 0 ::
    forge p be primes[0]
    gather(result, p)
    primes be sift(primes, x -> x % p differs 0)
  ;;

  yield result
;;

speak(sieve(50))
// [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]
```

### Linked-List Graph Traversal (BFS)

```sdev
// BFS using a Queue
conjure bfs(graph, start) ::
  forge visited be Set()
  forge queue be Queue()
  forge order be []

  queue.enqueue(start)
  visited.add(start)

  cycle isnt queue.isEmpty() ::
    forge node be queue.dequeue()
    gather(order, node)

    within neighbor be graph[node] ::
      ponder isnt visited.has(neighbor) ::
        visited.add(neighbor)
        queue.enqueue(neighbor)
      ;;
    ;;
  ;;

  yield order
;;

forge graph be ::
  "A": ["B", "C"],
  "B": ["A", "D", "E"],
  "C": ["A", "F"],
  "D": ["B"],
  "E": ["B", "F"],
  "F": ["C", "E"]
;;

speak(bfs(graph, "A"))  // ["A", "B", "C", "D", "E", "F"]
```

### Turtle Mandala

```sdev
canvas(600, 600)
clear("#000000")
turtle()
penwidth(1.5)

forge petals be 12
forge petalAngle be 360 / petals

within i be sequence(petals) ::
  pencolor(hue(i * petalAngle))
  within j be sequence(60) ::
    forward(j * 0.5)
    right(6)
  ;;
  penup()
  home()
  pendown()
  setheading(i * petalAngle)
;;
```

---

## JavaScript Interop (JS Interpreter Only)

The browser-based interpreter includes a special `js` keyword for calling JavaScript functions directly from sdev code. This allows integration with browser APIs, DOM manipulation, and third-party JS libraries.

### Three Syntax Forms

```sdev
// 1. Single-line expression
js <expression>

// 2. Parenthesized form (for objects, multi-line expressions)
js (
  <expression>
)

// 3. Statement block
js {
  <statements>
}
```

### Basic Examples

```sdev
// Browser dialog
js alert("Hello from sdev!")

// Read browser properties
forge width be js window.innerWidth
speak("Width:", width)

// DOM manipulation
js document.body.style.backgroundColor = "#1a1a2e"
js document.title = "My sdev App"

// Math
forge angle be js Math.PI / 6
forge result be js Math.sin(0.5)
```

### Object Literals

```sdev
// Use parenthesized form for object literals
forge opts be js ({
  dragging: true,
  zoom: 12,
  center: [51.505, -0.09]
})

// Nested objects
forge config be js ({
  api: {
    url: "https://api.example.com",
    timeout: 5000
  },
  debug: false
})
```

### Arrow Functions

```sdev
// Map/filter in JS
forge doubled be js [1, 2, 3, 4].map(x => x * 2)
forge filtered be js [1, 2, 3, 4].filter(x => x > 2)

// Event handlers
js document.getElementById("btn").addEventListener("click", (e) => {
  console.log("Clicked!", e.target)
})

// Use sdev variables in JS arrows
forge multiplier be 5
forge result be js [1, 2, 3].map(x => x * multiplier)
```

### Multi-line JS Blocks

```sdev
js {
  const canvas = document.createElement("canvas")
  canvas.width = 400
  canvas.height = 300
  document.body.appendChild(canvas)

  const ctx = canvas.getContext("2d")
  ctx.fillStyle = "navy"
  ctx.fillRect(0, 0, 400, 300)
  ctx.fillStyle = "white"
  ctx.font = "24px monospace"
  ctx.fillText("Made in sdev!", 100, 150)
}
```

### Leaflet Map Integration

```sdev
// Initialize a Leaflet map
forge map be js L.map("map-container").setView([51.505, -0.09], 13)

js L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", ({
  attribution: "© OpenStreetMap contributors"
})).addTo(map)

// Add markers
conjure addMarker(lat, lng, label) ::
  js L.marker([lat, lng]).addTo(map).bindPopup(label)
;;

addMarker(51.505, -0.09, "London, UK")
addMarker(48.8566, 2.3522, "Paris, France")
addMarker(52.52, 13.405, "Berlin, Germany")
```

---

## Complete Reference Card

### Keywords

| Keyword | Purpose |
|---------|---------|
| `forge` | Declare a variable |
| `be` | Assign a value |
| `conjure` | Declare a function |
| `yield` | Return a value from a function |
| `ponder` | `if` statement |
| `otherwise` | `else` clause |
| `cycle` | `while` loop |
| `iterate` | `for-each` loop (iterate x through list) |
| `through` | Used with iterate |
| `within` | `for-in` loop (within x be list) |
| `yeet` | `break` — exit loop |
| `skip` | `continue` — skip iteration |
| `attempt` | `try` block |
| `rescue` | `catch` block |
| `yep` | Boolean `true` |
| `nope` | Boolean `false` |
| `void` | Null / absent value |
| `also` | Logical AND |
| `either` | Logical OR |
| `isnt` | Logical NOT |
| `equals` | Equality comparison |
| `differs` | Inequality comparison |
| `essence` | Define a class |
| `extend` | Class inheritance |
| `self` | Instance reference inside class methods |
| `super` | Parent class reference |
| `new` | Create class instance |
| `summon` | Import from Gist |
| `async` | Mark function as async |
| `await` | Wait for async operation |
| `spawn` | Run function concurrently |

### Special Symbols

| Symbol | Purpose |
|--------|---------|
| `::` | Start a block |
| `;;` | End a block |
| `->` | Lambda arrow |
| `\|>` | Pipe operator |
| `~` | Ternary condition operator |
| `:` | Ternary else / dict key-value separator |
| `//` | Line comment |
| `#` | Line comment (Python style) |
| `^` | Power operator |
| `<>` | Inequality (alternative to `differs`) |

### Built-in Constants

| Constant | Value |
|----------|-------|
| `PI` | 3.141592653589793 |
| `TAU` | 6.283185307179586 |
| `E` | 2.718281828459045 |
| `INFINITY` | Infinity |

### Quick Reference Examples

```sdev
// ── Variables ──
forge x be 42
forge name be "Alice"
forge active be yep

// ── Arithmetic ──
speak(2 ^ 10)     // 1024
speak(10 % 3)     // 1
speak(-5 + 8)     // 3

// ── String ──
speak("Hello" + " " + "World")
speak(upper("hello"))        // HELLO
speak(measure("hello"))      // 5

// ── List ──
forge nums be [1, 2, 3, 4, 5]
gather(nums, 6)              // [1,2,3,4,5,6]
speak(nums[-1])              // 6
speak(sort(nums))            // [1,2,3,4,5,6]

// ── Conditionals ──
ponder x > 0 ::
  speak("positive")
;; otherwise ::
  speak("non-positive")
;;

// ── Ternary ──
forge label be x > 0 ~ "pos" : "neg"

// ── Loop ──
within i be sequence(5) :: speak(i) ;;  // 0 1 2 3 4
cycle x > 0 :: x be x - 1 ;;

// ── Function ──
conjure add(a, b) :: yield a + b ;;
forge double be x -> x * 2

// ── Pipe ──
[1,2,3,4,5] |> each(x -> x * 2) |> sift(x -> x > 4) |> speak
// [6, 8, 10]

// ── OOP ──
essence Dog ::
  conjure init(self, name) :: self.name be name ;;
  conjure bark(self) :: speak(self.name + ": WOOF!") ;;
;;
forge rex be new Dog("Rex")
rex.bark()

// ── Error Handling ──
attempt ::
  forge n be morph("not a number", "number")
;; rescue err ::
  speak("Error:", err)
;;

// ── Higher-order ──
forge evens be sift(sequence(10), x -> x % 2 equals 0)
forge sum be fold(evens, 0, (a, b) -> a + b)
speak(sum)   // 20

// ── Collections ──
forge s be Set()
s.add(1) s.add(2) s.add(2)
speak(s.values())   // [1, 2]

forge q be Queue()
q.enqueue("a") q.enqueue("b")
speak(q.dequeue())   // a

// ── Matrix ──
forge a be [[1,2],[3,4]]
forge b be [[5,6],[7,8]]
speak(matmul(a, b))   // [[19,22],[43,50]]

// ── Graphics ──
canvas(400, 400)
clear("#111")
fill(hue(120))
circle(200, 200, 100)

// ── Turtle ──
turtle()
within i be sequence(4) ::
  forward(100)
  right(90)
;;
```

---

## Web Building (HTML / CSS / JavaScript)

sdev ships a full Web DSL: any program that calls `page(...)` produces a real
HTML document that opens in the IDE's **WEB** preview panel (with Reload,
Download as `.html`, and Open in new tab). You can mix the high-level DSL with
raw HTML/CSS/JS passthrough — everything HTML, CSS, and JavaScript can do is
available.

> Web builtins are part of the **JavaScript runtime** (web IDE and bundled
> JS interpreter). The Python/desktop CLI focuses on terminal output.

### Page lifecycle

| Builtin            | Purpose                                                           |
|--------------------|-------------------------------------------------------------------|
| `page(title)`      | Start a new HTML document. Auto-switches the IDE to the WEB tab.  |
| `endpage()`        | Finalize the page; auto-closes any still-open containers.         |
| `title(text)`      | Set/update the `<title>`.                                         |
| `meta({...})`      | Append a `<meta>` to `<head>`.                                    |
| `link(rel, href)`  | Append a `<link>` (stylesheet, icon, …) to `<head>`.              |

### Elements

Every HTML5 tag is available in three forms:

- **Self-closing helper:** `h1("Hello")`, `p("text", {class:"lead"})`,
  `a("Click", {href:"/x"})`, `img({src:"a.png", alt:"a"})`
- **Unambiguous form:** `html_div(...)`, `html_button(...)`, `html_input(...)` —
  use these when a tag name (e.g. `button`, `input`, `label`, `table`, `form`)
  collides with sdev's UI toolkit.
- **Containers:** `open_<tag>({attrs})` … nested children … `end_<tag>()`
  (e.g. `open_div`, `open_section`, `open_ul`, `open_form`).

Generic builders cover everything else:

```sdev
tag("custom-element", "text", { id: "x" })
open("nav", { class: "top" })
  a("Home", { href: "/" })
close()
```

### CSS

```sdev
style("body", { background: "#0b1220", color: "white", font_family: "system-ui" })
style(".btn", { padding: "12px 18px", border_radius: "8px", background: "#3b82f6" })
style(".btn:hover", { background: "#2563eb" })

keyframes("spin", {
  "0%":   { transform: "rotate(0deg)" },
  "100%": { transform: "rotate(360deg)" },
})

// Or drop in raw CSS
raw_css(".grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }")
```

Property names use `snake_case` and are auto-converted to `kebab-case`
(`font_size` → `font-size`).

### JavaScript

```sdev
onclick("#go",       "alert('hello from sdev')")
on("input", "#q",    "console.log(event.target.value)")
script("window.addEventListener('load', () => console.log('ready'))")
raw_js("fetch('/api').then(r => r.json()).then(console.log)")
```

### Raw passthrough

When the DSL doesn't cover something, drop straight to source:

```sdev
raw_html("<svg viewBox='0 0 10 10'><circle cx='5' cy='5' r='4'/></svg>")
raw_css("@media (max-width: 600px) { .grid { grid-template-columns: 1fr; } }")
raw_js("document.title = 'updated from sdev'")
```

### Full example

```sdev
page("Counter")
  style("body", { display: "grid", place_items: "center", height: "100vh",
                  font_family: "system-ui", background: "#0b1220", color: "#fff" })
  style(".btn", { padding: "12px 20px", border_radius: "10px",
                  background: "#3b82f6", color: "#fff", border: "none",
                  cursor: "pointer", font_size: "16px" })

  h1("Count: 0", { id: "label" })
  html_button("Tap me", { id: "btn", class: "btn" })

  onclick("#btn", "
    const el = document.querySelector('#label');
    const n = (+el.textContent.match(/\\\\d+/)[0]) + 1;
    el.textContent = 'Count: ' + n;
  ")
endpage()
```

Click **Run** → the WEB tab opens with a live, interactive page.
Use **Open in new tab** to pop it out, or **Download** to save the `.html` file.

---

## Hardware / Microcontrollers

sdev can program Arduino, ESP32, ESP8266, Raspberry Pi Pico, Teensy, and more via the `board { }` DSL. Full reference lives in **`SDEV_HARDWARE_DOCUMENTATION.md`**.

Quick blink:

```sdev
board "uno" {
  conjure setup() ::
    pin 13 be output
  ;;
  conjure loop() ::
    pin 13 write high
    wait 500
    pin 13 write low
    wait 500
  ;;
}
```

Open the IDE's Hardware panel (USB icon in the left sidebar) → **Detect Board** → **Upload**. Supports the full Arduino library ecosystem via the built-in Library Manager (backed by Arduino's official index).

Highlights added in this release:
- `board "<target>" { setup(), loop() }` blocks — targets: `uno`, `nano`, `nano-old`, `mega`, `leonardo`, `micro`, `esp32`, `esp32-s3`, `esp8266`, `pico`, `teensy41`.
- Hardware statements: `pin N be output|input|input_pullup`, `pin N write high|low`, `pin N read`, `analog N read/write`, `wait`, `wait_us`, `now()`, `serial begin/print/println/read/avail`, `tone`, `notone`, `pulsein`, `shiftout`, `attach`/`detach`.
- `use "LibraryName"` for any Arduino C++ library.
- `cpp { ... }` raw C++ escape hatch.
- Web Serial-based board detection (USB VID/PID lookup), STK500v1 flasher for AVR, `esptool-js` for ESP, UF2 drop for RP2040.
- Serial Monitor with baud selector (300 – 2 000 000).
- Library Manager mirroring `downloads.arduino.cc/libraries/library_index.json`.

### Bytecode compiler upgrades

Shipped alongside the hardware layer:
- Proper `break` / `continue` in `cycle` (while) and `iterate` (forEach / forIn) loops via a shared `LoopContext` stack — these previously compiled to `NOP`.
- Bitwise opcodes (`BIT_AND`/`OR`/`XOR`/`NOT`/`SHL`/`SHR`) for register-level firmware work.
- Systems opcodes: `SYSCALL`, `ALLOC`, `FREE`, `HEAP_LOAD`, `HEAP_STORE`, `INTERRUPT`.
- Task opcodes: `TASK_CREATE`, `TASK_YIELD`, `TASK_KILL`.
- Binary chunk format v2: `magic "SDEV" | version | len | JSON payload` (`serializeChunk` / `deserializeChunk`).

---

*This documentation covers sdev version 1.x. For the latest updates and additional examples, visit the sdev IDE.*



---

## Text-Tooling Functions

Added so programs that read and rewrite code (like sdev's own understander, `lang/agent/understander.sdev`) can be written in sdev. Identical in the JavaScript and Python interpreters.

| Function | Result |
|---|---|
| `lines(t)` / `unlines(list)` | split text into lines / join lines with newlines |
| `words(t)` | split on whitespace, no empty items |
| `char_at(t, i)` / `code_at(t, i)` | character / code point at `i` (`""` / `-1` when out of range) |
| `find_from(t, sub, from)` / `find_last(t, sub)` | index search from a position / from the end |
| `leading_space(t)` | the indentation at the start of `t` |
| `is_letter(t)` `is_digit(t)` `is_space(t)` `is_name(t)` | character-class tests (Unicode letters) |
| `regex_test(t, p, flags?)` | does the pattern match (flags: `i`, `m`, `s`) |
| `regex_capture(t, p, flags?)` | `[whole, group1, …]` or `void` |
| `regex_find_all(t, p, flags?)` | every match as a list |
| `regex_replace(t, p, r, flags?)` | replace every match; `$1` refers to groups |
| `quote_text(t)` | `t` as a quoted, escaped sdev text literal |

## The Self-Hosted Understander

The code understander now runs first as an sdev program (`lang/agent/understander.sdev`). It reads the file line by line and turns plain sentences (`print hello`, `calculate 23-21`, `set x to 5`, `add 2 to x`, `score becomes score * 2`) into canonical sdev. When it is not sure of every line, the original TypeScript understander handles the file instead, so nothing that worked before changes. Names defined in other project files can be passed in so cross-file references resolve.

### What the self-hosted understander handles

Questions (`ask "Name?" as name`, `ask for name`, `name = ask "…"`), yes/no answers (`when hungry is yes`, `hungry is yes:`), typed numbers (answers used in maths become numbers), placeholders (`say "Hello, [name]!"`), counted loops (`say hi 3 times`, `repeat 3 times`, `count from 0 to 10 by 5`, `print numbers from 3 to 1`, `count to 5`), conditions with automatic block closing, side-by-side text (`say "Hi " name`), and dialect words.

## sdev:ai — the dialect for AI models

Start a file with `!#ai`. Every statement says what it is in its first token, blocks always use `{ }`, and the operators are the ones models already know — fewer tokens, no guessed indentation, no forgotten closings. It is translated to canonical sdev by `lang/agent/ai-dialect.sdev` (written in sdev) before it runs, and canonical sdev can be turned back into it.

| sdev:ai | canonical sdev |
|---|---|
| `v x = 5` | `forge x be 5` |
| `x = x + 1` | `x be x + 1` |
| `p(x)` | `speak(x)` |
| `f add(a, b) {` … `r a + b` … `}` | `conjure add(a, b) ::` … `yield a + b` … `;;` |
| `? x > 3 {` / `} :? x > 1 {` / `} : {` | `ponder x > 3 ::` / `;; otherwise ponder x > 1 ::` / `;; otherwise ::` |
| `w i < 3 {` | `cycle i < 3 ::` |
| `each n in xs {` | `iterate n through xs ::` |
| `try {` / `} catch e {` | `attempt ::` / `;; rescue e ::` |
| `brk` / `next` | `yeet` / `skip` |
| `==` `!=` `&&` `\|\|` `!` `true` `false` `null` | `equals` `differs` `also` `either` `isnt` `yep` `nope` `void` |

```sdev
!#ai
f add(a, b) {
  r a + b
}
v x = add(2, 3)
? x == 5 {
  p("five")
} : {
  p("not five")
}
```

### Requests in plain words

A file that is a request — "make a window that is a calculator", "build a quiz game" — is not repaired line by line; the AI writes the whole working program (windows, buttons and inputs use the window toolkit). `evaluate("7 + 8 * 2")` safely computes arithmetic held in text, which is what calculators need. It works the same in the JavaScript and Python versions.
