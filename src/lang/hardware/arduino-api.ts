// ============================================================
// Arduino command catalogue — the single source of truth for
// every Arduino core function, constant, type and library the
// `board "..." { }` block understands.
//
// Used by: the transpiler (library headers), the IDE (autocomplete
// inside board blocks), the documentation generator
// (scripts/gen-hardware-docs.ts) and the tests.
//
// Everything here is the real Arduino API (arduino.cc/reference).
// `sdev` shows the readable sdev form when one exists; every
// function can always be called by its Arduino name as well.
// ============================================================

export interface ArduinoFunction {
  name: string;
  signature: string;
  returns: string;
  summary: string;
  category: string;
  sdev?: string;          // readable sdev form
  boards?: string;        // when not available everywhere
}

export interface ArduinoMethod { signature: string; summary: string }

export interface ArduinoClass {
  name: string;           // C++ type, e.g. "Servo"
  create?: string;        // sdev declaration example
  methods: ArduinoMethod[];
}

export interface ArduinoLibrary {
  name: string;           // Library Manager name (what `use "..."` takes)
  headers: string[];      // #include lines produced
  bundled: boolean;       // ships with the board core (nothing to download)
  category: string;
  summary: string;
  boards?: string;
  classes: ArduinoClass[];
  example?: string;       // runnable sdev board block body
}

const f = (category: string) =>
  (name: string, signature: string, returns: string, summary: string, sdev?: string, boards?: string): ArduinoFunction =>
    ({ name, signature, returns, summary, category, ...(sdev ? { sdev } : {}), ...(boards ? { boards } : {}) });

const dio = f('Digital I/O');
const aio = f('Analog I/O');
const adv = f('Advanced I/O');
const time = f('Time');
const math = f('Math');
const trig = f('Trigonometry');
const chr = f('Characters');
const rnd = f('Random numbers');
const bits = f('Bits and bytes');
const ext = f('External interrupts');
const irq = f('Interrupts');
const util = f('Utilities');

export const ARDUINO_FUNCTIONS: ArduinoFunction[] = [
  dio('pinMode', 'pinMode(pin, mode)', 'void', 'Configure a pin as INPUT, OUTPUT, INPUT_PULLUP (or INPUT_PULLDOWN on boards that have it).', 'pin 13 be output'),
  dio('digitalWrite', 'digitalWrite(pin, value)', 'void', 'Set a digital pin HIGH or LOW.', 'pin 13 write high · pin 13 on · pin 13 off · pin 13 toggle'),
  dio('digitalRead', 'digitalRead(pin)', 'int', 'Read a digital pin: HIGH or LOW.', 'pin 2 read · read pin 2'),

  aio('analogRead', 'analogRead(pin)', 'int', 'Read an analog pin (0–1023 at the default 10-bit resolution).', 'analog 0 read · read analog A0'),
  aio('analogWrite', 'analogWrite(pin, value)', 'void', 'Write a PWM value (0–255) to a PWM pin, or a voltage to a DAC pin.', 'pin 9 analog 128 · pin 9 pwm 128'),
  aio('analogReference', 'analogReference(type)', 'void', 'Choose the reference voltage for analogRead (DEFAULT, INTERNAL, EXTERNAL, …).', 'analog reference internal'),
  aio('analogReadResolution', 'analogReadResolution(bits)', 'void', 'Set the number of bits analogRead returns.', undefined, 'Zero, Due, MKR, Nano 33, Uno R4, Giga, Portenta, ESP32, RP2040'),
  aio('analogWriteResolution', 'analogWriteResolution(bits)', 'void', 'Set the number of bits analogWrite accepts.', undefined, 'Zero, Due, MKR, Nano 33, Uno R4, Giga, Portenta, RP2040'),

  adv('tone', 'tone(pin, frequency[, duration])', 'void', 'Play a square wave of the given frequency (Hz) on a pin.', 'tone 8 440 200'),
  adv('noTone', 'noTone(pin)', 'void', 'Stop a tone started with tone().', 'notone 8'),
  adv('pulseIn', 'pulseIn(pin, value[, timeout])', 'unsigned long', 'Measure how long (µs) a pin stays HIGH or LOW.', 'pulsein 7 high'),
  adv('pulseInLong', 'pulseInLong(pin, value[, timeout])', 'unsigned long', 'Like pulseIn, but works with interrupts and long pulses.'),
  adv('shiftOut', 'shiftOut(dataPin, clockPin, bitOrder, value)', 'void', 'Send a byte one bit at a time (for shift registers).', 'shiftout 11 12 msbfirst 0xAA'),
  adv('shiftIn', 'shiftIn(dataPin, clockPin, bitOrder)', 'byte', 'Read a byte one bit at a time.'),

  time('delay', 'delay(ms)', 'void', 'Pause the program for a number of milliseconds.', 'wait 500 · wait 2 seconds'),
  time('delayMicroseconds', 'delayMicroseconds(us)', 'void', 'Pause for a number of microseconds.', 'wait 50 us · wait_us 50'),
  time('millis', 'millis()', 'unsigned long', 'Milliseconds since the board started.', 'now()'),
  time('micros', 'micros()', 'unsigned long', 'Microseconds since the board started.', 'nowus()'),

  math('abs', 'abs(x)', 'number', 'Absolute value.'),
  math('constrain', 'constrain(x, low, high)', 'number', 'Limit a number to a range.'),
  math('map', 'map(value, fromLow, fromHigh, toLow, toHigh)', 'long', 'Re-map a number from one range to another.'),
  math('max', 'max(a, b)', 'number', 'Larger of two numbers.'),
  math('min', 'min(a, b)', 'number', 'Smaller of two numbers.'),
  math('pow', 'pow(base, exponent)', 'double', 'Raise a number to a power.'),
  math('sq', 'sq(x)', 'number', 'Square of a number.'),
  math('sqrt', 'sqrt(x)', 'double', 'Square root.'),
  math('floor', 'floor(x)', 'double', 'Round down.'),
  math('ceil', 'ceil(x)', 'double', 'Round up.'),
  math('round', 'round(x)', 'long', 'Round to the nearest whole number.'),
  math('fabs', 'fabs(x)', 'double', 'Absolute value of a decimal number.'),
  math('fmod', 'fmod(x, y)', 'double', 'Remainder of a decimal division.'),
  math('log', 'log(x)', 'double', 'Natural logarithm.'),
  math('log10', 'log10(x)', 'double', 'Base-10 logarithm.'),
  math('exp', 'exp(x)', 'double', 'e raised to x.'),

  trig('sin', 'sin(rad)', 'double', 'Sine of an angle in radians.'),
  trig('cos', 'cos(rad)', 'double', 'Cosine of an angle in radians.'),
  trig('tan', 'tan(rad)', 'double', 'Tangent of an angle in radians.'),
  trig('asin', 'asin(x)', 'double', 'Arc sine.'),
  trig('acos', 'acos(x)', 'double', 'Arc cosine.'),
  trig('atan', 'atan(x)', 'double', 'Arc tangent.'),
  trig('atan2', 'atan2(y, x)', 'double', 'Angle of the point (x, y).'),
  trig('radians', 'radians(deg)', 'double', 'Degrees to radians.'),
  trig('degrees', 'degrees(rad)', 'double', 'Radians to degrees.'),

  chr('isAlpha', 'isAlpha(c)', 'bool', 'Is the character a letter?'),
  chr('isAlphaNumeric', 'isAlphaNumeric(c)', 'bool', 'Is the character a letter or digit?'),
  chr('isAscii', 'isAscii(c)', 'bool', 'Is the character ASCII?'),
  chr('isControl', 'isControl(c)', 'bool', 'Is the character a control character?'),
  chr('isDigit', 'isDigit(c)', 'bool', 'Is the character a digit?'),
  chr('isGraph', 'isGraph(c)', 'bool', 'Is the character printable and not a space?'),
  chr('isHexadecimalDigit', 'isHexadecimalDigit(c)', 'bool', 'Is the character 0-9, a-f or A-F?'),
  chr('isLowerCase', 'isLowerCase(c)', 'bool', 'Is the character lower case?'),
  chr('isPrintable', 'isPrintable(c)', 'bool', 'Is the character printable?'),
  chr('isPunct', 'isPunct(c)', 'bool', 'Is the character punctuation?'),
  chr('isSpace', 'isSpace(c)', 'bool', 'Is the character white space (space, tab, newline…)?'),
  chr('isUpperCase', 'isUpperCase(c)', 'bool', 'Is the character upper case?'),
  chr('isWhitespace', 'isWhitespace(c)', 'bool', 'Is the character a space or tab?'),

  rnd('random', 'random([min,] max)', 'long', 'Random number from min up to (not including) max.', 'randint(1, 6)  (inclusive)'),
  rnd('randomSeed', 'randomSeed(seed)', 'void', 'Start the random generator from a seed, e.g. analogRead of a floating pin.'),

  bits('bit', 'bit(n)', 'number', 'The value of bit n (1, 2, 4, 8, …).'),
  bits('bitClear', 'bitClear(x, n)', 'void', 'Set bit n of x to 0.'),
  bits('bitRead', 'bitRead(x, n)', 'int', 'Read bit n of x.'),
  bits('bitSet', 'bitSet(x, n)', 'void', 'Set bit n of x to 1.'),
  bits('bitWrite', 'bitWrite(x, n, b)', 'void', 'Write 0 or 1 to bit n of x.'),
  bits('highByte', 'highByte(x)', 'byte', 'The high (left) byte of a word.'),
  bits('lowByte', 'lowByte(x)', 'byte', 'The low (right) byte of a word.'),
  bits('word', 'word(high, low)', 'word', 'Combine two bytes into a word.'),

  ext('attachInterrupt', 'attachInterrupt(digitalPinToInterrupt(pin), handler, mode)', 'void', 'Run a function when a pin changes (RISING, FALLING, CHANGE, LOW, HIGH).', 'attach 2 rising onPress'),
  ext('detachInterrupt', 'detachInterrupt(digitalPinToInterrupt(pin))', 'void', 'Stop running the interrupt handler.', 'detach 2'),
  ext('digitalPinToInterrupt', 'digitalPinToInterrupt(pin)', 'int', 'The interrupt number for a pin.'),

  irq('interrupts', 'interrupts()', 'void', 'Re-enable interrupts.'),
  irq('noInterrupts', 'noInterrupts()', 'void', 'Disable interrupts (for timing-critical code).'),

  util('sizeof', 'sizeof(x)', 'size_t', 'Size of a variable or array in bytes.'),
  util('F', 'F("text")', 'text', 'Keep a string in flash memory instead of RAM.'),
  util('PROGMEM', 'const int table[] PROGMEM = {…}', 'modifier', 'Store data in flash memory.'),
  util('yield', 'yield()', 'void', 'Let background tasks run (ESP32/ESP8266/RP2040). In sdev, `yield x` inside a function means return.'),
];

/** Methods shared by Serial, Serial1…, SoftwareSerial and every Stream. */
export const SERIAL_METHODS: ArduinoMethod[] = [
  { signature: 'begin(speed[, config])', summary: 'Open the port at a baud rate (9600, 115200, …).' },
  { signature: 'end()', summary: 'Close the port.' },
  { signature: 'available()', summary: 'Number of bytes waiting to be read.' },
  { signature: 'availableForWrite()', summary: 'Bytes that can be written without blocking.' },
  { signature: 'read()', summary: 'Read one byte (-1 if none).' },
  { signature: 'peek()', summary: 'Look at the next byte without removing it.' },
  { signature: 'write(value | buffer, len)', summary: 'Send raw bytes.' },
  { signature: 'print(value[, format])', summary: 'Send text (format: DEC, HEX, OCT, BIN or decimal places).' },
  { signature: 'println(value[, format])', summary: 'Send text followed by a new line.' },
  { signature: 'flush()', summary: 'Wait until all outgoing data is sent.' },
  { signature: 'find(target)', summary: 'Read until the target text is found.' },
  { signature: 'findUntil(target, terminal)', summary: 'Read until target or terminal text is found.' },
  { signature: 'parseInt()', summary: 'Read the next whole number.' },
  { signature: 'parseFloat()', summary: 'Read the next decimal number.' },
  { signature: 'readBytes(buffer, length)', summary: 'Read bytes into a buffer.' },
  { signature: 'readBytesUntil(char, buffer, length)', summary: 'Read bytes until a character.' },
  { signature: 'readString()', summary: 'Read everything into a String.' },
  { signature: 'readStringUntil(char)', summary: 'Read into a String until a character, e.g. \'\\n\'.' },
  { signature: 'setTimeout(ms)', summary: 'How long the read/parse functions wait.' },
  { signature: 'if (Serial)', summary: 'True once a USB serial port is open (Leonardo, Zero, R4, …).' },
  { signature: 'serialEvent()', summary: 'Define this function to run when data arrives.' },
];

export const STRING_METHODS: ArduinoMethod[] = [
  'charAt(n)', 'compareTo(other)', 'concat(value)', 'c_str()', 'endsWith(text)', 'equals(other)', 'equalsIgnoreCase(other)',
  'getBytes(buf, len)', 'indexOf(text[, from])', 'lastIndexOf(text[, from])', 'length()', 'remove(index[, count])',
  'replace(find, with)', 'reserve(size)', 'setCharAt(index, c)', 'startsWith(text)', 'substring(from[, to])',
  'toCharArray(buf, len)', 'toDouble()', 'toFloat()', 'toInt()', 'toLowerCase()', 'toUpperCase()', 'trim()',
].map(signature => ({ signature, summary: STRING_SUMMARY?.[signature.split('(')[0]] ?? '' }));

// eslint-disable-next-line no-var
var STRING_SUMMARY: Record<string, string>;
STRING_SUMMARY = {
  charAt: 'Character at a position.', compareTo: 'Compare alphabetically.', concat: 'Append a value.', c_str: 'C string pointer.',
  endsWith: 'Ends with the text?', equals: 'Same text?', equalsIgnoreCase: 'Same text ignoring case?', getBytes: 'Copy bytes into a buffer.',
  indexOf: 'Position of text (-1 if missing).', lastIndexOf: 'Last position of text.', length: 'Number of characters.',
  remove: 'Remove characters.', replace: 'Replace text.', reserve: 'Reserve memory.', setCharAt: 'Change one character.',
  startsWith: 'Starts with the text?', substring: 'Part of the text.', toCharArray: 'Copy into a char array.',
  toDouble: 'Convert to a decimal number.', toFloat: 'Convert to a decimal number.', toInt: 'Convert to a whole number.',
  toLowerCase: 'Make lower case.', toUpperCase: 'Make upper case.', trim: 'Remove spaces at both ends.',
};
for (const m of STRING_METHODS) m.summary = STRING_SUMMARY[m.signature.split('(')[0]] ?? m.summary;

export interface ArduinoConstant { name: string; summary: string; sdev?: string }

export const ARDUINO_CONSTANTS: ArduinoConstant[] = [
  { name: 'HIGH', summary: 'Pin is on (5 V or 3.3 V).', sdev: 'high' },
  { name: 'LOW', summary: 'Pin is off (0 V).', sdev: 'low' },
  { name: 'INPUT', summary: 'Pin mode: read a signal.', sdev: 'input' },
  { name: 'OUTPUT', summary: 'Pin mode: drive a signal.', sdev: 'output' },
  { name: 'INPUT_PULLUP', summary: 'Pin mode: input with the internal pull-up resistor.', sdev: 'input_pullup' },
  { name: 'INPUT_PULLDOWN', summary: 'Pin mode: input with a pull-down resistor (SAMD, ESP32, RP2040, Renesas).', sdev: 'input_pulldown' },
  { name: 'LED_BUILTIN', summary: 'The pin of the on-board LED.', sdev: 'led' },
  { name: 'A0 … A7', summary: 'Analog input pins.' },
  { name: 'RISING / FALLING / CHANGE', summary: 'Interrupt modes.', sdev: 'rising · falling · change' },
  { name: 'MSBFIRST / LSBFIRST', summary: 'Bit order for shiftIn/shiftOut and SPI.', sdev: 'msbfirst · lsbfirst' },
  { name: 'DEC / HEX / OCT / BIN', summary: 'Number formats for print().' },
  { name: 'DEFAULT / INTERNAL / INTERNAL1V1 / INTERNAL2V56 / EXTERNAL', summary: 'analogReference() options (depend on the board).' },
  { name: 'true / false', summary: 'Booleans.', sdev: 'yep · nope' },
  { name: 'PI, HALF_PI, TWO_PI, DEG_TO_RAD, RAD_TO_DEG', summary: 'Math constants.' },
];

export const ARDUINO_TYPES: { name: string; sdev?: string; summary: string }[] = [
  { name: 'bool', sdev: 'bool', summary: 'true or false.' },
  { name: 'byte', sdev: 'byte', summary: '0–255.' },
  { name: 'char', sdev: 'char', summary: 'One character.' },
  { name: 'int', sdev: 'int', summary: 'Whole number (16-bit on AVR, 32-bit on ARM/ESP).' },
  { name: 'unsigned int', summary: 'Non-negative whole number.' },
  { name: 'long', sdev: 'long', summary: '32-bit whole number (default for untyped sdev parameters).' },
  { name: 'unsigned long', sdev: 'ulong', summary: '32-bit non-negative — use for millis() values.' },
  { name: 'short', summary: '16-bit whole number.' },
  { name: 'word', summary: '16-bit non-negative.' },
  { name: 'float', sdev: 'float · decimal', summary: 'Decimal number.' },
  { name: 'double', sdev: 'double', summary: 'Decimal number (same as float on AVR).' },
  { name: 'String', sdev: 'text · string', summary: 'Text object.' },
  { name: 'size_t', summary: 'Size in bytes.' },
  { name: 'uint8_t … int64_t', summary: 'Fixed-size integers.' },
  { name: 'arrays', sdev: 'forge notes be [262, 294, 330]', summary: 'Fixed list of values.' },
  { name: 'const / static / volatile', sdev: 'fixed · keep · volatile', summary: 'Qualifiers.' },
];

// ------------------------------------------------------------------
// Libraries. Bundled = ships with the board package; the rest come
// from the Arduino Library Manager (all ~10 000 of which also work —
// see public/arduino/library-index.json).
// ------------------------------------------------------------------
const lib = (l: ArduinoLibrary) => l;
const m = (signature: string, summary: string): ArduinoMethod => ({ signature, summary });

export const ARDUINO_LIBRARIES: ArduinoLibrary[] = [
  lib({
    name: 'Wire', headers: ['Wire.h'], bundled: true, category: 'Communication', summary: 'I²C / TWI bus — talk to sensors, displays and other boards.',
    classes: [{ name: 'Wire', methods: [
      m('begin([address])', 'Join the bus (as controller, or as peripheral with an address).'), m('end()', 'Leave the bus.'),
      m('setClock(hz)', 'Bus speed (100000 or 400000).'), m('beginTransmission(address)', 'Start writing to a device.'),
      m('write(value)', 'Queue bytes.'), m('endTransmission([stop])', 'Send the queued bytes (0 = success).'),
      m('requestFrom(address, count)', 'Ask a device for bytes.'), m('available()', 'Bytes waiting.'), m('read()', 'Read a byte.'),
      m('onReceive(handler)', 'Peripheral: run when data arrives.'), m('onRequest(handler)', 'Peripheral: run when data is requested.'),
      m('setWireTimeout(us, reset)', 'Avoid hanging on a stuck bus.'), m('getWireTimeoutFlag()', 'Did a timeout happen?'), m('clearWireTimeoutFlag()', 'Clear the timeout flag.'),
    ] }],
    example: `use "Wire"
conjure setup() ::
  Wire.begin()
  speak("I2C scan")
  within a be sequence(1, 127) ::
    Wire.beginTransmission(a)
    ponder Wire.endTransmission() equals 0 ::
      speak("found device at", a)
    ;;
  ;;
;;
conjure loop() ::
;;`,
  }),
  lib({
    name: 'SPI', headers: ['SPI.h'], bundled: true, category: 'Communication', summary: 'Serial Peripheral Interface bus.',
    classes: [{ name: 'SPI', methods: [
      m('begin()', 'Start the bus.'), m('end()', 'Stop the bus.'), m('beginTransaction(SPISettings(speed, MSBFIRST, SPI_MODE0))', 'Claim the bus with settings.'),
      m('endTransaction()', 'Release the bus.'), m('transfer(value)', 'Send and receive one byte.'), m('transfer16(value)', 'Send and receive 16 bits.'),
      m('transfer(buffer, size)', 'Send and receive a buffer.'), m('usingInterrupt(n)', 'Make SPI interrupt-safe.'),
      m('setBitOrder(order)', 'Deprecated: use SPISettings.'), m('setClockDivider(div)', 'Deprecated: use SPISettings.'), m('setDataMode(mode)', 'Deprecated: use SPISettings.'),
    ] }],
  }),
  lib({
    name: 'EEPROM', headers: ['EEPROM.h'], bundled: true, category: 'Data storage', summary: 'Memory that keeps its value when the power is off.', boards: 'AVR, Uno R4, ESP32/ESP8266 (emulated), RP2040 (emulated)',
    classes: [{ name: 'EEPROM', methods: [
      m('read(address)', 'Read a byte.'), m('write(address, value)', 'Write a byte.'), m('update(address, value)', 'Write only if different (saves wear).'),
      m('get(address, variable)', 'Read any type.'), m('put(address, variable)', 'Write any type.'), m('length()', 'Size in bytes.'), m('EEPROM[address]', 'Read/write like an array.'),
      m('begin(size) / commit()', 'ESP32/ESP8266/RP2040 only: open and save the emulated EEPROM.'),
    ] }],
    example: `use "EEPROM"
conjure setup() ::
  forge boots be EEPROM.read(0) + 1
  EEPROM.update(0, boots)
  speak("This board has started", boots, "times")
;;
conjure loop() ::
;;`,
  }),
  lib({
    name: 'SoftwareSerial', headers: ['SoftwareSerial.h'], bundled: true, category: 'Communication', summary: 'Extra serial ports on any digital pins.', boards: 'AVR, Uno R4, ESP8266',
    classes: [{ name: 'SoftwareSerial', create: 'device bt be SoftwareSerial(10, 11)', methods: [
      ...['begin(speed)', 'available()', 'read()', 'peek()', 'write(value)', 'print(value)', 'println(value)', 'end()'].map(s => m(s, 'Same as Serial.')),
      m('listen()', 'Make this port the one that receives.'), m('isListening()', 'Is this port receiving?'), m('overflow()', 'Did the buffer overflow?'),
    ] }],
  }),
  lib({
    name: 'HID', headers: ['HID.h'], bundled: true, category: 'Device control', summary: 'Low-level USB HID (used by Keyboard and Mouse).', boards: 'Leonardo, Micro, Zero, MKR, Due, Uno R4',
    classes: [],
  }),
  lib({
    name: 'Servo', headers: ['Servo.h'], bundled: false, category: 'Device control', summary: 'Control hobby servo motors.',
    classes: [{ name: 'Servo', create: 'device arm be Servo', methods: [
      m('attach(pin[, min, max])', 'Connect the servo to a pin.'), m('write(angle)', 'Move to an angle (0–180).'),
      m('writeMicroseconds(us)', 'Set the pulse width directly.'), m('read()', 'Last angle written.'), m('attached()', 'Is it attached?'), m('detach()', 'Release the pin.'),
    ] }],
    example: `use "Servo"
device arm be Servo
conjure setup() ::
  arm.attach(9)
;;
conjure loop() ::
  within angle be sequence(0, 181, 5) ::
    arm.write(angle)
    wait 15
  ;;
  within angle be sequence(180, -1, -5) ::
    arm.write(angle)
    wait 15
  ;;
;;`,
  }),
  lib({
    name: 'Stepper', headers: ['Stepper.h'], bundled: false, category: 'Device control', summary: 'Unipolar and bipolar stepper motors.',
    classes: [{ name: 'Stepper', create: 'device motor be Stepper(200, 8, 9, 10, 11)', methods: [m('setSpeed(rpm)', 'Speed in turns per minute.'), m('step(steps)', 'Turn a number of steps (negative = backwards).')] }],
  }),
  lib({
    name: 'LiquidCrystal', headers: ['LiquidCrystal.h'], bundled: false, category: 'Display', summary: 'Character LCDs (HD44780) wired directly to pins.',
    classes: [{ name: 'LiquidCrystal', create: 'device lcd be LiquidCrystal(12, 11, 5, 4, 3, 2)', methods: [
      m('begin(cols, rows)', 'Start the display.'), m('clear()', 'Clear the screen.'), m('home()', 'Cursor to top-left.'), m('setCursor(col, row)', 'Move the cursor.'),
      m('print(value)', 'Show text.'), m('write(char)', 'Show one character.'), m('cursor() / noCursor()', 'Show or hide the cursor.'),
      m('blink() / noBlink()', 'Blinking cursor.'), m('display() / noDisplay()', 'Turn text on/off.'), m('scrollDisplayLeft() / scrollDisplayRight()', 'Scroll.'),
      m('autoscroll() / noAutoscroll()', 'Automatic scrolling.'), m('leftToRight() / rightToLeft()', 'Text direction.'), m('createChar(n, bytes)', 'Define a custom character.'),
    ] }],
  }),
  lib({
    name: 'LiquidCrystal I2C', headers: ['LiquidCrystal_I2C.h'], bundled: false, category: 'Display', summary: 'Character LCDs with an I²C backpack (2 wires).',
    classes: [{ name: 'LiquidCrystal_I2C', create: 'device lcd be LiquidCrystal_I2C(0x27, 16, 2)', methods: [
      m('init()', 'Start the display.'), m('backlight() / noBacklight()', 'Backlight on/off.'), m('clear()', 'Clear.'), m('setCursor(col, row)', 'Move the cursor.'), m('print(value)', 'Show text.'),
    ] }],
    example: `use "LiquidCrystal I2C"
device lcd be LiquidCrystal_I2C(0x27, 16, 2)
conjure setup() ::
  lcd.init()
  lcd.backlight()
  lcd.print("Hello from sdev")
;;
conjure loop() ::
  lcd.setCursor(0, 1)
  lcd.print(now() / 1000)
  wait 500
;;`,
  }),
  lib({
    name: 'SD', headers: ['SD.h'], bundled: false, category: 'Data storage', summary: 'Read and write files on SD cards.',
    classes: [
      { name: 'SD', methods: [m('begin(csPin)', 'Start the card.'), m('exists(path)', 'Does a file exist?'), m('mkdir(path)', 'Make a folder.'), m('open(path, FILE_READ | FILE_WRITE)', 'Open a file.'), m('remove(path)', 'Delete a file.'), m('rmdir(path)', 'Delete a folder.')] },
      { name: 'File', methods: ['available()', 'close()', 'flush()', 'peek()', 'position()', 'print(v)', 'println(v)', 'seek(pos)', 'size()', 'read()', 'write(v)', 'isDirectory()', 'openNextFile()', 'rewindDirectory()', 'name()'].map(s => m(s, 'File operation.')) },
    ],
  }),
  lib({
    name: 'Keyboard', headers: ['Keyboard.h'], bundled: false, category: 'Device control', summary: 'Act as a USB keyboard.', boards: 'Leonardo, Micro, Zero, MKR, Due, Uno R4, Nano 33 IoT, Giga',
    classes: [{ name: 'Keyboard', methods: [m('begin()', 'Start.'), m('end()', 'Stop.'), m('press(key)', 'Hold a key.'), m('release(key)', 'Let go of a key.'), m('releaseAll()', 'Let go of all keys.'), m('write(key)', 'Press and release.'), m('print(text)', 'Type text.'), m('println(text)', 'Type text + Enter.')] }],
  }),
  lib({
    name: 'Mouse', headers: ['Mouse.h'], bundled: false, category: 'Device control', summary: 'Act as a USB mouse.', boards: 'Leonardo, Micro, Zero, MKR, Due, Uno R4, Nano 33 IoT, Giga',
    classes: [{ name: 'Mouse', methods: [m('begin()', 'Start.'), m('end()', 'Stop.'), m('click([button])', 'Click.'), m('move(x, y[, wheel])', 'Move the pointer.'), m('press([button])', 'Hold a button.'), m('release([button])', 'Release a button.'), m('isPressed([button])', 'Is a button held?')] }],
  }),
  lib({
    name: 'Ethernet', headers: ['SPI.h', 'Ethernet.h'], bundled: false, category: 'Communication', summary: 'Wired networking with the Ethernet shield (W5100/W5500).',
    classes: [
      { name: 'Ethernet', methods: [m('begin(mac[, ip])', 'Connect (DHCP if no ip).'), m('localIP()', 'Our address.'), m('maintain()', 'Renew DHCP.'), m('hardwareStatus()', 'Which chip.'), m('linkStatus()', 'Cable connected?')] },
      { name: 'EthernetClient', methods: [m('connect(host, port)', 'Open a connection.'), m('print/println/write', 'Send.'), m('available() / read()', 'Receive.'), m('stop()', 'Close.'), m('connected()', 'Still connected?')] },
      { name: 'EthernetServer', methods: [m('begin()', 'Listen.'), m('available()', 'Next client.')] },
    ],
  }),
  lib({
    name: 'WiFiS3', headers: ['WiFiS3.h'], bundled: true, category: 'Communication', summary: 'Wi-Fi on the Uno R4 WiFi.', boards: 'Uno R4 WiFi',
    classes: [
      { name: 'WiFi', methods: [m('begin(ssid, pass)', 'Connect.'), m('status()', 'WL_CONNECTED when connected.'), m('localIP()', 'Our address.'), m('RSSI()', 'Signal strength.'), m('disconnect()', 'Disconnect.'), m('scanNetworks()', 'List networks.'), m('beginAP(ssid, pass)', 'Make a hotspot.')] },
      { name: 'WiFiClient / WiFiServer / WiFiUDP / WiFiSSLClient', methods: [m('connect(host, port)', 'Open a connection.'), m('available() / read()', 'Receive.'), m('print/write', 'Send.'), m('stop()', 'Close.')] },
    ],
  }),
  lib({
    name: 'WiFiNINA', headers: ['WiFiNINA.h'], bundled: false, category: 'Communication', summary: 'Wi-Fi on Nano 33 IoT, MKR WiFi 1010, Uno WiFi Rev2, Nano RP2040 Connect.', boards: 'Nano 33 IoT, MKR WiFi 1010, Uno WiFi Rev2, Nano RP2040 Connect',
    classes: [{ name: 'WiFi', methods: [m('begin(ssid, pass)', 'Connect.'), m('status()', 'Connection state.'), m('localIP()', 'Our address.'), m('RSSI()', 'Signal.')] }],
  }),
  lib({
    name: 'WiFi', headers: ['WiFi.h'], bundled: true, category: 'Communication', summary: 'Wi-Fi on ESP32, Nano ESP32, Pico W, Giga and Portenta.', boards: 'ESP32, Nano ESP32, Giga, Portenta, Pico W',
    classes: [{ name: 'WiFi', methods: [m('begin(ssid, pass)', 'Connect.'), m('status()', 'WL_CONNECTED when connected.'), m('localIP()', 'Our address.'), m('softAP(ssid, pass)', 'Make a hotspot.'), m('scanNetworks()', 'List networks.'), m('disconnect()', 'Disconnect.')] }],
  }),
  lib({
    name: 'ESP8266WiFi', headers: ['ESP8266WiFi.h'], bundled: true, category: 'Communication', summary: 'Wi-Fi on ESP8266 boards.', boards: 'ESP8266',
    classes: [{ name: 'WiFi', methods: [m('begin(ssid, pass)', 'Connect.'), m('status()', 'Connection state.'), m('localIP()', 'Our address.')] }],
  }),
  lib({
    name: 'ArduinoBLE', headers: ['ArduinoBLE.h'], bundled: false, category: 'Communication', summary: 'Bluetooth Low Energy.', boards: 'Uno R4 WiFi, Nano 33 BLE, Nano 33 IoT, Nano RP2040 Connect, Nano ESP32, MKR WiFi 1010, Giga, Portenta',
    classes: [{ name: 'BLE', methods: [m('begin()', 'Start BLE.'), m('setLocalName(name)', 'Advertised name.'), m('advertise()', 'Start advertising.'), m('scan()', 'Look for devices.'), m('available()', 'Next found device.'), m('central()', 'Connected central device.'), m('poll()', 'Process BLE events.')] },
      { name: 'BLEService / BLECharacteristic', methods: [m('BLEService(uuid)', 'A service.'), m('BLEIntCharacteristic(uuid, BLERead | BLENotify)', 'A value.'), m('writeValue(v)', 'Update the value.'), m('value()', 'Read the value.'), m('written()', 'Was it written?')] }],
  }),
  lib({
    name: 'Arduino_LED_Matrix', headers: ['Arduino_LED_Matrix.h'], bundled: true, category: 'Display', summary: 'The 12×8 LED matrix on the Uno R4 WiFi.', boards: 'Uno R4 WiFi',
    classes: [{ name: 'ArduinoLEDMatrix', create: 'device matrix be ArduinoLEDMatrix', methods: [
      m('begin()', 'Start the matrix.'), m('loadFrame(frame)', 'Show a frame (3 × uint32_t).'), m('renderBitmap(bitmap, 8, 12)', 'Show a byte[8][12] bitmap.'),
      m('loadSequence(frames)', 'Load an animation.'), m('play([loop])', 'Play the animation.'), m('autoscroll(ms)', 'Scroll text drawn with ArduinoGraphics.'),
      m('beginDraw() / endDraw()', 'Draw with ArduinoGraphics.'), m('textScrollSpeed(ms)', 'Scroll speed.'),
    ] }],
    example: `use "Arduino_LED_Matrix"
device matrix be ArduinoLEDMatrix
conjure setup() ::
  matrix.begin()
;;
conjure loop() ::
  matrix.loadFrame(LEDMATRIX_HEART_BIG)
  wait 500
  matrix.loadFrame(LEDMATRIX_HEART_SMALL)
  wait 500
;;`,
  }),
  lib({
    name: 'ArduinoGraphics', headers: ['ArduinoGraphics.h'], bundled: false, category: 'Display', summary: 'Draw text and shapes (used with the R4 LED matrix and displays).',
    classes: [{ name: 'ArduinoGraphics', methods: [m('beginDraw() / endDraw()', 'Start/finish drawing.'), m('stroke(r, g, b)', 'Line color.'), m('textFont(Font_5x7)', 'Choose a font.'), m('text(str, x, y)', 'Draw text.'), m('beginText(x, y, color) / endText(SCROLL_LEFT)', 'Scrolling text.'), m('point / line / rect / circle', 'Shapes.')] }],
  }),
  lib({
    name: 'RTC', headers: ['RTC.h'], bundled: true, category: 'Timing', summary: 'Real-time clock of the Uno R4.', boards: 'Uno R4 Minima, Uno R4 WiFi',
    classes: [{ name: 'RTC', methods: [m('begin()', 'Start the clock.'), m('setTime(RTCTime)', 'Set the date and time.'), m('getTime(RTCTime&)', 'Read the date and time.'), m('setPeriodicCallback(fn, Period::ONCE_EVERY_1_SEC)', 'Run a function periodically.'), m('setAlarmCallback(fn, time, match)', 'Alarm.')] }],
  }),
  lib({
    name: 'Firmata', headers: ['Firmata.h'], bundled: false, category: 'Communication', summary: 'Control the board from a computer with the Firmata protocol.',
    classes: [{ name: 'Firmata', methods: [m('begin(speed)', 'Start.'), m('processInput()', 'Handle incoming messages.'), m('sendAnalog(pin, value)', 'Report a value.'), m('attach(command, handler)', 'Handle a command.')] }],
  }),
  lib({
    name: 'Adafruit NeoPixel', headers: ['Adafruit_NeoPixel.h'], bundled: false, category: 'Display', summary: 'WS2812 / NeoPixel RGB LED strips and rings.',
    classes: [{ name: 'Adafruit_NeoPixel', create: 'device strip be Adafruit_NeoPixel(8, 6, NEO_GRB + NEO_KHZ800)', methods: [
      m('begin()', 'Start.'), m('show()', 'Send colors to the LEDs.'), m('clear()', 'All off.'), m('setPixelColor(i, r, g, b)', 'Color one LED.'),
      m('Color(r, g, b)', 'Pack a color.'), m('ColorHSV(hue)', 'Color from a hue.'), m('setBrightness(0-255)', 'Overall brightness.'), m('numPixels()', 'How many LEDs.'), m('fill(color, first, count)', 'Fill a range.'),
    ] }],
    example: `use "Adafruit NeoPixel"
device strip be Adafruit_NeoPixel(8, 6, NEO_GRB + NEO_KHZ800)
conjure setup() ::
  strip.begin()
  strip.setBrightness(40)
;;
conjure loop() ::
  within i be sequence(8) ::
    strip.clear()
    strip.setPixelColor(i, strip.Color(0, 80, 255))
    strip.show()
    wait 80
  ;;
;;`,
  }),
  lib({
    name: 'FastLED', headers: ['FastLED.h'], bundled: false, category: 'Display', summary: 'Fast control of many kinds of LED strips.',
    classes: [{ name: 'FastLED', methods: [m('addLeds<WS2812B, PIN, GRB>(leds, count)', 'Register a strip.'), m('show()', 'Send colors.'), m('clear()', 'All off.'), m('setBrightness(v)', 'Brightness.'), m('CRGB(r, g, b) / CHSV(h, s, v)', 'Colors.')] }],
  }),
  lib({
    name: 'DHT sensor library', headers: ['DHT.h'], bundled: false, category: 'Sensors', summary: 'DHT11 / DHT22 temperature and humidity sensors (also install "Adafruit Unified Sensor").',
    classes: [{ name: 'DHT', create: 'device dht be DHT(2, DHT22)', methods: [m('begin()', 'Start.'), m('readTemperature([fahrenheit])', 'Temperature.'), m('readHumidity()', 'Humidity %.'), m('computeHeatIndex(t, h)', 'Feels-like temperature.')] }],
    example: `use "DHT sensor library"
use "Adafruit Unified Sensor"
device dht be DHT(2, DHT22)
conjure setup() ::
  dht.begin()
;;
conjure loop() ::
  forge t: float be dht.readTemperature()
  forge h: float be dht.readHumidity()
  speak("Temperature:", t, "C  Humidity:", h, "%")
  wait 2 seconds
;;`,
  }),
  lib({ name: 'Adafruit Unified Sensor', headers: ['Adafruit_Sensor.h'], bundled: false, category: 'Sensors', summary: 'Common base used by Adafruit sensor libraries.', classes: [] }),
  lib({
    name: 'Adafruit GFX Library', headers: ['Adafruit_GFX.h'], bundled: false, category: 'Display', summary: 'Shapes, text and bitmaps for displays.',
    classes: [{ name: 'Adafruit_GFX', methods: ['drawPixel(x, y, c)', 'drawLine(x0, y0, x1, y1, c)', 'drawRect(x, y, w, h, c)', 'fillRect(x, y, w, h, c)', 'drawCircle(x, y, r, c)', 'fillCircle(x, y, r, c)', 'setCursor(x, y)', 'setTextSize(n)', 'setTextColor(c)', 'print(v)', 'drawBitmap(x, y, bmp, w, h, c)'].map(s => m(s, 'Drawing.')) }],
  }),
  lib({
    name: 'Adafruit SSD1306', headers: ['Adafruit_GFX.h', 'Adafruit_SSD1306.h'], bundled: false, category: 'Display', summary: '128×64 / 128×32 OLED displays.',
    classes: [{ name: 'Adafruit_SSD1306', create: 'device oled be Adafruit_SSD1306(128, 64, &Wire, -1)', methods: [m('begin(SSD1306_SWITCHCAPVCC, 0x3C)', 'Start.'), m('clearDisplay()', 'Clear.'), m('display()', 'Show what was drawn.'), m('…all Adafruit GFX methods', 'Drawing.')] }],
  }),
  lib({ name: 'U8g2', headers: ['U8g2lib.h'], bundled: false, category: 'Display', summary: 'Monochrome displays of almost every kind.', classes: [{ name: 'U8G2_*', methods: [m('begin()', 'Start.'), m('clearBuffer() / sendBuffer()', 'Frame.'), m('setFont(font)', 'Font.'), m('drawStr(x, y, text)', 'Text.')] }] }),
  lib({ name: 'TM1637', headers: ['TM1637Display.h'], bundled: false, category: 'Display', summary: '4-digit 7-segment displays.', classes: [{ name: 'TM1637Display', create: 'device digits be TM1637Display(2, 3)', methods: [m('setBrightness(0-7)', 'Brightness.'), m('showNumberDec(n)', 'Show a number.'), m('clear()', 'Clear.')] }] }),
  lib({ name: 'LedControl', headers: ['LedControl.h'], bundled: false, category: 'Display', summary: 'MAX7219 LED matrices and 7-segment displays.', classes: [{ name: 'LedControl', create: 'device leds be LedControl(12, 11, 10, 1)', methods: [m('shutdown(dev, false)', 'Wake up.'), m('setIntensity(dev, 0-15)', 'Brightness.'), m('setLed(dev, row, col, on)', 'One LED.'), m('clearDisplay(dev)', 'Clear.')] }] }),
  lib({ name: 'NewPing', headers: ['NewPing.h'], bundled: false, category: 'Sensors', summary: 'HC-SR04 ultrasonic distance sensors.', classes: [{ name: 'NewPing', create: 'device sonar be NewPing(9, 10, 200)', methods: [m('ping_cm()', 'Distance in cm.'), m('ping_in()', 'Distance in inches.'), m('ping_median(n)', 'Median of n pings (µs).')] }] }),
  lib({ name: 'AccelStepper', headers: ['AccelStepper.h'], bundled: false, category: 'Device control', summary: 'Steppers with acceleration.', classes: [{ name: 'AccelStepper', create: 'device motor be AccelStepper(AccelStepper::DRIVER, 2, 3)', methods: [m('setMaxSpeed(s)', 'Top speed.'), m('setAcceleration(a)', 'Acceleration.'), m('moveTo(pos)', 'Target position.'), m('run()', 'Call often to move.'), m('distanceToGo()', 'Steps left.')] }] }),
  lib({ name: 'IRremote', headers: ['IRremote.hpp'], bundled: false, category: 'Communication', summary: 'Send and receive infrared remote codes.', classes: [{ name: 'IrReceiver / IrSender', methods: [m('IrReceiver.begin(pin)', 'Start receiving.'), m('IrReceiver.decode()', 'Got a code?'), m('IrReceiver.decodedIRData.command', 'The code.'), m('IrReceiver.resume()', 'Ready for the next one.'), m('IrSender.sendNEC(addr, cmd, repeats)', 'Send.')] }] }),
  lib({ name: 'PubSubClient', headers: ['PubSubClient.h'], bundled: false, category: 'Communication', summary: 'MQTT messaging.', classes: [{ name: 'PubSubClient', methods: [m('setServer(host, port)', 'Broker.'), m('connect(id)', 'Connect.'), m('publish(topic, msg)', 'Send.'), m('subscribe(topic)', 'Listen.'), m('setCallback(fn)', 'Handle messages.'), m('loop()', 'Call often.')] }] }),
  lib({ name: 'ArduinoJson', headers: ['ArduinoJson.h'], bundled: false, category: 'Data processing', summary: 'Read and write JSON.', classes: [{ name: 'JsonDocument', methods: [m('deserializeJson(doc, input)', 'Parse.'), m('serializeJson(doc, output)', 'Write.'), m('doc["key"]', 'Get/set values.')] }] }),
  lib({ name: 'OneWire', headers: ['OneWire.h'], bundled: false, category: 'Communication', summary: '1-Wire bus (DS18B20 and more).', classes: [{ name: 'OneWire', create: 'device bus be OneWire(4)', methods: [m('reset()', 'Reset.'), m('search(addr)', 'Find devices.'), m('write(b)', 'Send.'), m('read()', 'Receive.')] }] }),
  lib({ name: 'DallasTemperature', headers: ['OneWire.h', 'DallasTemperature.h'], bundled: false, category: 'Sensors', summary: 'DS18B20 temperature sensors (also install "OneWire").', classes: [{ name: 'DallasTemperature', create: 'device temps be DallasTemperature(&bus)', methods: [m('begin()', 'Start.'), m('requestTemperatures()', 'Measure.'), m('getTempCByIndex(0)', 'Temperature in °C.')] }] }),
  lib({ name: 'MFRC522', headers: ['SPI.h', 'MFRC522.h'], bundled: false, category: 'Sensors', summary: 'RFID card readers.', classes: [{ name: 'MFRC522', create: 'device rfid be MFRC522(10, 9)', methods: [m('PCD_Init()', 'Start.'), m('PICC_IsNewCardPresent()', 'Card near?'), m('PICC_ReadCardSerial()', 'Read its id.'), m('uid.uidByte[i]', 'Id bytes.')] }] }),
  lib({ name: 'TinyGPSPlus', headers: ['TinyGPSPlus.h'], bundled: false, category: 'Sensors', summary: 'Read GPS modules.', classes: [{ name: 'TinyGPSPlus', methods: [m('encode(c)', 'Feed a character.'), m('location.lat() / lng()', 'Position.'), m('location.isValid()', 'Have a fix?')] }] }),
  lib({ name: 'RTClib', headers: ['RTClib.h'], bundled: false, category: 'Timing', summary: 'DS1307 / DS3231 / PCF8523 clock modules.', classes: [{ name: 'RTC_DS3231', create: 'device clock be RTC_DS3231', methods: [m('begin()', 'Start.'), m('now()', 'Current DateTime.'), m('adjust(DateTime(F(__DATE__), F(__TIME__)))', 'Set the time.')] }] }),
  lib({ name: 'Bounce2', headers: ['Bounce2.h'], bundled: false, category: 'Signal input/output', summary: 'Clean button presses.', classes: [{ name: 'Bounce', create: 'device button be Bounce', methods: [m('attach(pin, INPUT_PULLUP)', 'Connect.'), m('interval(ms)', 'Debounce time.'), m('update()', 'Call each loop.'), m('fell() / rose()', 'Pressed / released.')] }] }),
  lib({ name: 'Keypad', headers: ['Keypad.h'], bundled: false, category: 'Signal input/output', summary: 'Matrix keypads.', classes: [{ name: 'Keypad', methods: [m('getKey()', 'Pressed key or 0.'), m('waitForKey()', 'Wait for a key.')] }] }),
  lib({ name: 'HX711', headers: ['HX711.h'], bundled: false, category: 'Sensors', summary: 'Load-cell (scale) amplifiers.', classes: [{ name: 'HX711', create: 'device scale be HX711', methods: [m('begin(dout, sck)', 'Start.'), m('read()', 'Raw value.'), m('get_units(n)', 'Weight.'), m('tare()', 'Zero.'), m('set_scale(f)', 'Calibrate.')] }] }),
  lib({ name: 'Adafruit BME280 Library', headers: ['Adafruit_BME280.h'], bundled: false, category: 'Sensors', summary: 'BME280 temperature, pressure and humidity.', classes: [{ name: 'Adafruit_BME280', create: 'device bme be Adafruit_BME280', methods: [m('begin(0x76)', 'Start.'), m('readTemperature()', '°C.'), m('readPressure()', 'Pa.'), m('readHumidity()', '%.')] }] }),
  lib({ name: 'Adafruit MPU6050', headers: ['Adafruit_MPU6050.h'], bundled: false, category: 'Sensors', summary: 'MPU-6050 accelerometer and gyroscope.', classes: [{ name: 'Adafruit_MPU6050', create: 'device imu be Adafruit_MPU6050', methods: [m('begin()', 'Start.'), m('getEvent(&a, &g, &temp)', 'Read all values.')] }] }),
  lib({ name: 'Encoder', headers: ['Encoder.h'], bundled: false, category: 'Signal input/output', summary: 'Rotary encoders.', classes: [{ name: 'Encoder', create: 'device knob be Encoder(2, 3)', methods: [m('read()', 'Position.'), m('write(n)', 'Set position.')] }] }),
  lib({ name: 'CapacitiveSensor', headers: ['CapacitiveSensor.h'], bundled: false, category: 'Sensors', summary: 'Touch sensing with a resistor and foil.', classes: [{ name: 'CapacitiveSensor', create: 'device touch be CapacitiveSensor(4, 2)', methods: [m('capacitiveSensor(samples)', 'Touch value.')] }] }),
  lib({ name: 'ArduinoHttpClient', headers: ['ArduinoHttpClient.h'], bundled: false, category: 'Communication', summary: 'HTTP and WebSocket client.', classes: [{ name: 'HttpClient', methods: [m('get(path)', 'GET request.'), m('post(path, type, body)', 'POST request.'), m('responseStatusCode()', 'Status.'), m('responseBody()', 'Body.')] }] }),
  lib({ name: 'ArduinoMqttClient', headers: ['ArduinoMqttClient.h'], bundled: false, category: 'Communication', summary: 'MQTT client from Arduino.', classes: [{ name: 'MqttClient', methods: [m('connect(broker, port)', 'Connect.'), m('beginMessage(topic) / print / endMessage()', 'Publish.'), m('subscribe(topic)', 'Listen.'), m('poll()', 'Call often.')] }] }),
  lib({ name: 'Arduino_JSON', headers: ['Arduino_JSON.h'], bundled: false, category: 'Data processing', summary: 'Simple JSON from Arduino.', classes: [{ name: 'JSON', methods: [m('JSON.parse(text)', 'Parse.'), m('JSON.stringify(value)', 'Write.')] }] }),
  lib({ name: 'ArduinoModbus', headers: ['ArduinoRS485.h', 'ArduinoModbus.h'], bundled: false, category: 'Communication', summary: 'Modbus RTU/TCP (also install "ArduinoRS485").', classes: [] }),
  lib({ name: 'ArduinoRS485', headers: ['ArduinoRS485.h'], bundled: false, category: 'Communication', summary: 'RS-485 serial.', classes: [] }),
  lib({ name: 'Arduino_LSM9DS1', headers: ['Arduino_LSM9DS1.h'], bundled: false, category: 'Sensors', summary: 'IMU of the Nano 33 BLE.', boards: 'Nano 33 BLE', classes: [{ name: 'IMU', methods: [m('begin()', 'Start.'), m('readAcceleration(x, y, z)', 'Acceleration.'), m('readGyroscope(x, y, z)', 'Rotation.'), m('readMagneticField(x, y, z)', 'Compass.')] }] }),
  lib({ name: 'Arduino_LSM6DS3', headers: ['Arduino_LSM6DS3.h'], bundled: false, category: 'Sensors', summary: 'IMU of the Nano 33 IoT and Uno WiFi Rev2.', boards: 'Nano 33 IoT, Uno WiFi Rev2', classes: [{ name: 'IMU', methods: [m('begin()', 'Start.'), m('readAcceleration(x, y, z)', 'Acceleration.'), m('readGyroscope(x, y, z)', 'Rotation.')] }] }),
  lib({ name: 'Arduino_APDS9960', headers: ['Arduino_APDS9960.h'], bundled: false, category: 'Sensors', summary: 'Gesture, color and proximity (Nano 33 BLE Sense).', classes: [] }),
  lib({ name: 'Arduino_HTS221', headers: ['Arduino_HTS221.h'], bundled: false, category: 'Sensors', summary: 'Temperature and humidity (Nano 33 BLE Sense).', classes: [] }),
  lib({ name: 'Arduino_LPS22HB', headers: ['Arduino_LPS22HB.h'], bundled: false, category: 'Sensors', summary: 'Barometric pressure (Nano 33 BLE Sense).', classes: [] }),
  lib({ name: 'ArduinoIoTCloud', headers: ['ArduinoIoTCloud.h', 'Arduino_ConnectionHandler.h'], bundled: false, category: 'Communication', summary: 'Connect to Arduino Cloud.', classes: [] }),
  lib({ name: 'Scheduler', headers: ['Scheduler.h'], bundled: false, category: 'Timing', summary: 'Run several loops at once.', boards: 'Due, Zero, MKR', classes: [{ name: 'Scheduler', methods: [m('startLoop(fn)', 'Run another loop.')] }] }),
  lib({ name: 'Arduino_FreeRTOS', headers: ['Arduino_FreeRTOS.h'], bundled: false, category: 'Timing', summary: 'FreeRTOS tasks on AVR boards.', boards: 'AVR', classes: [] }),
];

const LIB_BY_NAME = new Map(ARDUINO_LIBRARIES.map(l => [l.name.toLowerCase(), l]));
const LIB_BY_HEADER = new Map<string, ArduinoLibrary>();
for (const l of ARDUINO_LIBRARIES) for (const h of l.headers) if (!LIB_BY_HEADER.has(h.toLowerCase())) LIB_BY_HEADER.set(h.toLowerCase(), l);

export function findLibrary(name: string): ArduinoLibrary | undefined {
  const k = name.toLowerCase();
  return LIB_BY_NAME.get(k) ?? LIB_BY_HEADER.get(k) ?? LIB_BY_HEADER.get(k + '.h');
}

/** Headers that ship with board cores — never requested from the Library Manager. */
export const BUNDLED_HEADERS = new Set([
  'Wire.h', 'SPI.h', 'EEPROM.h', 'SoftwareSerial.h', 'HID.h', 'WiFiS3.h', 'WiFi.h', 'ESP8266WiFi.h', 'Arduino_LED_Matrix.h', 'RTC.h',
  'avr/pgmspace.h', 'avr/interrupt.h', 'avr/sleep.h', 'avr/wdt.h', 'avr/power.h', 'util/delay.h', 'Arduino.h', 'math.h', 'string.h', 'stdlib.h',
  'WebServer.h', 'HTTPClient.h', 'Preferences.h', 'ESPmDNS.h', 'BluetoothSerial.h', 'ESP8266WebServer.h', 'LittleFS.h', 'FS.h', 'SPIFFS.h', 'Update.h',
  'USB.h', 'PluggableUSB.h', 'I2S.h', 'PDM.h', 'Modem.h', 'OTAUpdate.h', 'Arduino_CAN.h', 'SoftwareATSE.h',
]);
