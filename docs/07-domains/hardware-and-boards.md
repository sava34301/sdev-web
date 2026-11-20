# SDEV Hardware & Arduino Reference Documentation

Program **30 microcontrollers** (Arduino Uno R3 / R4 Minima / R4 WiFi / Uno Q, Nano family, Mega 2560, Leonardo, Micro, MKR family, Zero, Due, Giga R1, Portenta H7, ESP32 / C3 / S2 / S3, ESP8266, Raspberry Pi Pico / Pico W, ATtiny85, and Teensy 4.1) directly in **sdev**.

This reference covers:
1. **Block Syntax**: `board "<id>" :: ... ;;` and `board "<id>" { ... }`
2. **Supported Boards (30)**: FQBNs, MCUs, memory, cloud vs. local compilation, and USB IDs
3. **SDEV Hardware DSL & Statements**: pins, PWM, timing, serial, interrupts, tone, shiftOut, raw `cpp { ... }`
4. **Complete Arduino Core Reference (75 functions, 14 constant groups, 16 types, Serial & String APIs)**
5. **Curated Libraries (61)** with SDEV `device` declarations, methods, and transpiled C++ examples
6. **Arduino Library Manager Integration (10,232 indexed libraries)**
7. **Browser Flashing Protocols (7 uploaders)**: STK500v1, STK500v2, AVR109, SAM-BA / BOSSA, WebUSB DFU 1.1, ESP32/ESP8266 SLIP, and RP2040 UF2

---

## 1. The `board` Block

A `board` block embeds a hardware sketch inside any `.sdev` file. When you run the file in the desktop/browser sdev interpreter, `stripBoardBlocks()` strips all `board` blocks automatically so desktop code and microcontroller firmware can live side-by-side in one file.

Both sdev `:: ... ;;` delimiters and brace `{ ... }` delimiters are supported:

```sdev
board "uno" ::
  conjure setup() ::
    pin led be output
    speak("Arduino Uno ready!")
  ;;

  conjure loop() ::
    pin led toggle
    wait 500
  ;;
;;
```

Or with `{ ... }`:

```sdev
board "uno" {
  conjure setup() {
    pin 13 be output
    serial begin 9600
  }
  conjure loop() {
    pin 13 write high
    wait 500
    pin 13 write low
    wait 500
  }
}
```

---

## 2. Supported Boards (30)

| ID (`board "<id>"`) | Board | FQBN | MCU | Flash / RAM | Uploader | Browser Flash | Zero-Install Cloud Build |
|---|---|---|---|---|---|---|---|
| `uno` | Arduino Uno (R3) | `arduino:avr:uno` | ATmega328P | 32 KB / 2 KB | `stk500v1` | Yes (`stk500v1`) | Yes (`uno`) |
| `uno-r4-minima` | Arduino Uno R4 Minima | `arduino:renesas_uno:minima` | RA4M1 | 256 KB / 32 KB | `dfu` | Yes (`dfu`) | Local CLI |
| `uno-r4-wifi` | Arduino Uno R4 WiFi | `arduino:renesas_uno:unor4wifi` | RA4M1 + ESP32-S3 | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `uno-q` | Arduino Uno Q | `arduino:zephyr:unoq` | Qualcomm Dragonwing QRB2210 + STM32U585 | 2048 KB / 786 KB | `app-lab` | No (`app-lab`) | Local CLI |
| `nano` | Arduino Nano (ATmega328P) | `arduino:avr:nano:cpu=atmega328` | ATmega328P | 32 KB / 2 KB | `stk500v1` | Yes (`stk500v1`) | Yes (`nano`) |
| `nano-old` | Arduino Nano (ATmega168 / Old Bootloader) | `arduino:avr:nano:cpu=atmega168` | ATmega168 | 16 KB / 1 KB | `stk500v1` | Yes (`stk500v1`) | Local CLI |
| `nano-every` | Arduino Nano Every | `arduino:megaavr:nona4809` | ATmega4809 | 48 KB / 6 KB | `samba` | Yes (`samba`) | Local CLI |
| `nano-33-iot` | Arduino Nano 33 IoT | `arduino:samd:nano_33_iot` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `nano-33-ble` | Arduino Nano 33 BLE / Sense | `arduino:mbed_nano:nano33ble` | nRF52840 | 1024 KB / 256 KB | `samba` | Yes (`samba`) | Local CLI |
| `nano-rp2040` | Arduino Nano RP2040 Connect | `arduino:mbed_nano:nanorp2040connect` | RP2040 | 16384 KB / 264 KB | `uf2` | Yes (`uf2`) | Yes (`nano-rp2040-connect`) |
| `nano-esp32` | Arduino Nano ESP32 | `arduino:esp32:nano_nora` | ESP32-S3 | 16384 KB / 512 KB | `esptool` | Yes (`esptool`) | Local CLI |
| `mega` | Arduino Mega 2560 | `arduino:avr:mega:cpu=atmega2560` | ATmega2560 | 256 KB / 8 KB | `stk500v2` | Yes (`stk500v2`) | Yes (`mega`) |
| `leonardo` | Arduino Leonardo | `arduino:avr:leonardo` | ATmega32U4 | 32 KB / 2.5 KB | `avr109` | Yes (`avr109`) | Local CLI |
| `micro` | Arduino Micro | `arduino:avr:micro` | ATmega32U4 | 32 KB / 2.5 KB | `avr109` | Yes (`avr109`) | Local CLI |
| `mkr-wifi-1010` | Arduino MKR WiFi 1010 | `arduino:samd:mkrwifi1010` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `mkr-zero` | Arduino MKR Zero | `arduino:samd:mkrzero` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `mkr-wan-1310` | Arduino MKR WAN 1310 | `arduino:samd:mkrwan1310` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `zero` | Arduino Zero | `arduino:samd:arduino_zero_native` | SAMD21G18A | 256 KB / 32 KB | `samba` | Yes (`samba`) | Local CLI |
| `due` | Arduino Due | `arduino:sam:arduino_due_x` | AT91SAM3X8E | 512 KB / 96 KB | `samba` | Yes (`samba`) | Local CLI |
| `giga` | Arduino Giga R1 WiFi | `arduino:mbed_giga:giga` | STM32H747XI | 2048 KB / 1024 KB | `dfu` | Yes (`dfu`) | Local CLI |
| `portenta-h7` | Arduino Portenta H7 | `arduino:mbed_portenta:envie_m7` | STM32H747XI | 2048 KB / 1024 KB | `dfu` | Yes (`dfu`) | Local CLI |
| `esp32` | ESP32 DevKit (generic) | `esp32:esp32:esp32` | ESP32 | 4096 KB / 520 KB | `esptool` | Yes (`esptool`) | Yes (`esp32`) |
| `esp32-c3` | ESP32-C3 DevKit | `esp32:esp32:esp32c3` | ESP32-C3 | 4096 KB / 400 KB | `esptool` | Yes (`esptool`) | Yes (`esp32-c3-devkitm-1`) |
| `esp32-s2` | ESP32-S2 DevKit | `esp32:esp32:esp32s2` | ESP32-S2 | 4096 KB / 320 KB | `esptool` | Yes (`esptool`) | Yes (`esp32-s2-devkitm-1`) |
| `esp32-s3` | ESP32-S3 DevKit | `esp32:esp32:esp32s3` | ESP32-S3 | 8192 KB / 512 KB | `esptool` | Yes (`esptool`) | Local CLI |
| `esp8266` | ESP8266 NodeMCU | `esp8266:esp8266:nodemcuv2` | ESP8266 | 4096 KB / 80 KB | `esptool` | Yes (`esptool`) | Yes (`esp8266`) |
| `pico` | Raspberry Pi Pico (RP2040) | `rp2040:rp2040:rpipico` | RP2040 | 2048 KB / 264 KB | `uf2` | Yes (`uf2`) | Yes (`pi-pico`) |
| `pico-w` | Raspberry Pi Pico W (RP2040) | `rp2040:rp2040:rpipicow` | RP2040 | 2048 KB / 264 KB | `uf2` | Yes (`uf2`) | Local CLI |
| `attiny85` | ATtiny85 | `attiny:avr:ATtinyX5:cpu=attiny85` | ATtiny85 | 8 KB / 0.5 KB | `stk500v1` | Yes (`stk500v1`) | Yes (`attiny85`) |
| `teensy41` | Teensy 4.1 | `teensy:avr:teensy41` | iMXRT1062 | 8192 KB / 1024 KB | `arduino-cli` | No (`arduino-cli`) | Local CLI |

### Special Board Notes
- **Arduino Uno R4 Minima (`uno-r4-minima`)**: Uses the Renesas RA4M1 (48 MHz Cortex-M4F) and flashes directly from the browser over **WebUSB DFU 1.1** (`0x2341:0x0369`).
- **Arduino Uno R4 WiFi (`uno-r4-wifi`)**: Uses the Renesas RA4M1 + ESP32-S3 co-processor and flashes over **SAM-BA / BOSSA** (`flashSamba`) after a 1200-baud touch reset.
- **Arduino Uno Q (`uno-q`)**: Hybrid Qualcomm Dragonwing QRB2210 Linux SBC + STM32U585 real-time MCU running Zephyr (`arduino:zephyr:unoq`). Sketches are deployed via **Arduino App Lab** or `arduino-cli` over ADB/network rather than browser Web Serial; use **Export .ino** in the Hardware panel.
- **Raspberry Pi Pico / Pico W / Nano RP2040 Connect (`pico`, `pico-w`, `nano-rp2040`)**: Compiles to an RP2040 **UF2** image (`0x0A324655` / `0x9E5D5157` / family `0xE48BFF56`) and writes directly to the mounted `RPI-RP2` drive via the File System Access API (or downloads `.uf2`).

---

## 3. SDEV Hardware DSL Cheat Sheet

| SDEV Statement / Expression | Generated Arduino C++ |
|---|---|
| `use "Servo"` | `#include <Servo.h>` |
| `use "Ethernet"` | `#include <SPI.h>` + `#include <Ethernet.h>` |
| `device arm be Servo` | `Servo arm;` |
| `device lcd be LiquidCrystal_I2C(0x27, 16, 2)` | `LiquidCrystal_I2C lcd(0x27, 16, 2);` |
| `conjure setup() :: ... ;;` / `to setup` | `void setup() { ... }` (auto-inserts `Serial.begin(9600);` when `speak`/`say` is used) |
| `conjure loop() :: ... ;;` / `to loop` | `void loop() { ... }` |
| `conjure blink(pin: int, ms: long) :: ... ;;` | `auto blink(int pin, long ms) { ... }` |
| `forge x: float be 3.14` | `float x = 3.14;` |
| `forge notes be [262, 294, 330]` | `auto notes[] = {262, 294, 330};` |
| `fixed forge LED: int be 13` | `const int LED = 13;` |
| `keep forge counter: long be 0` | `static long counter = 0;` |
| `volatile forge ticks: long be 0` | `volatile long ticks = 0;` |
| `pin 13 be output` / `input` / `input_pullup` / `input_pulldown` | `pinMode(13, OUTPUT / INPUT / INPUT_PULLUP / INPUT_PULLDOWN);` |
| `pin led on` / `pin led off` | `digitalWrite(LED_BUILTIN, HIGH / LOW);` |
| `pin 13 toggle` | `digitalWrite(13, !digitalRead(13));` |
| `pin 13 write high` / `pin 13 write low` | `digitalWrite(13, HIGH / LOW);` |
| `pin 9 analog 128` / `pin 9 pwm 128` / `analog 9 write 128` | `analogWrite(9, 128);` |
| `analog reference internal` | `analogReference(INTERNAL);` |
| `pin 2 read` / `read pin 2` | `digitalRead(2)` |
| `analog 0 read` / `read analog A0` | `analogRead(A0)` |
| `wait 500` | `delay(500);` |
| `wait 2 seconds` | `delay((2) * 1000);` |
| `wait 50 us` / `wait_us 50` | `delayMicroseconds(50);` |
| `now()` / `nowus()` | `millis()` / `micros()` |
| `serial begin 115200` | `Serial.begin(115200);` |
| `speak("Value:", x)` | `Serial.print("Value:"); Serial.print(" "); Serial.println(x);` |
| `say "hello"` | `Serial.println("hello");` |
| `serial read` / `serial avail` | `Serial.read()` / `Serial.available()` |
| `tone 8 440 200` / `notone 8` | `tone(8, 440, 200);` / `noTone(8);` |
| `pulsein 7 high` | `pulseIn(7, HIGH)` |
| `shiftout 11 12 msbfirst 0xAA` | `shiftOut(11, 12, MSBFIRST, 0xAA);` |
| `attach 2 rising onPress` / `detach 2` | `attachInterrupt(digitalPinToInterrupt(2), onPress, RISING);` / `detachInterrupt(...)` |
| `ponder x equals 0 :: ... otherwise :: ... ;;` | `if (x == 0) { ... } else { ... }` |
| `within i be sequence(8) :: ... ;;` | `for (long i = 0; i < 8; i++) { ... }` |
| `within i be sequence(1, 127) :: ... ;;` | `for (long i = 1; i < 127; i++) { ... }` |
| `within a be sequence(0, 181, 5) :: ... ;;` | `for (long a = 0; (5) >= 0 ? a < 181 : a > 181; a += (5)) { ... }` |
| `cycle x < 10 :: ... ;;` | `while (x < 10) { ... }` |
| `yeet` / `skip` / `yield val` | `break;` / `continue;` / `return val;` |
| `randint(1, 6)` | `random(1, (6) + 1)` |
| `equals` / `differs` / `also` / `either` / `isnt` / `yep` / `nope` | `==` / `!=` / `&&` / `||` / `!` / `true` / `false` |
| `cpp { ... }` | Raw C/C++ copied verbatim without line translation |

---

## 4. Arduino Core Functions (75)

### Digital I/O

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `pinMode` | `pinMode(pin, mode)` | `void` | `pin 13 be output` | Configure a pin as INPUT, OUTPUT, INPUT_PULLUP (or INPUT_PULLDOWN on boards that have it). |
| `digitalWrite` | `digitalWrite(pin, value)` | `void` | `pin 13 write high · pin 13 on · pin 13 off · pin 13 toggle` | Set a digital pin HIGH or LOW. |
| `digitalRead` | `digitalRead(pin)` | `int` | `pin 2 read · read pin 2` | Read a digital pin: HIGH or LOW. |

### Analog I/O

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `analogRead` | `analogRead(pin)` | `int` | `analog 0 read · read analog A0` | Read an analog pin (0–1023 at the default 10-bit resolution). |
| `analogWrite` | `analogWrite(pin, value)` | `void` | `pin 9 analog 128 · pin 9 pwm 128` | Write a PWM value (0–255) to a PWM pin, or a voltage to a DAC pin. |
| `analogReference` | `analogReference(type)` | `void` | `analog reference internal` | Choose the reference voltage for analogRead (DEFAULT, INTERNAL, EXTERNAL, …). |
| `analogReadResolution` | `analogReadResolution(bits)` | `void` | `analogReadResolution(bits)` | Set the number of bits analogRead returns. *(Boards: Zero, Due, MKR, Nano 33, Uno R4, Giga, Portenta, ESP32, RP2040)* |
| `analogWriteResolution` | `analogWriteResolution(bits)` | `void` | `analogWriteResolution(bits)` | Set the number of bits analogWrite accepts. *(Boards: Zero, Due, MKR, Nano 33, Uno R4, Giga, Portenta, RP2040)* |

### Advanced I/O

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `tone` | `tone(pin, frequency[, duration])` | `void` | `tone 8 440 200` | Play a square wave of the given frequency (Hz) on a pin. |
| `noTone` | `noTone(pin)` | `void` | `notone 8` | Stop a tone started with tone(). |
| `pulseIn` | `pulseIn(pin, value[, timeout])` | `unsigned long` | `pulsein 7 high` | Measure how long (µs) a pin stays HIGH or LOW. |
| `pulseInLong` | `pulseInLong(pin, value[, timeout])` | `unsigned long` | `pulseInLong(pin, value[, timeout])` | Like pulseIn, but works with interrupts and long pulses. |
| `shiftOut` | `shiftOut(dataPin, clockPin, bitOrder, value)` | `void` | `shiftout 11 12 msbfirst 0xAA` | Send a byte one bit at a time (for shift registers). |
| `shiftIn` | `shiftIn(dataPin, clockPin, bitOrder)` | `byte` | `shiftIn(dataPin, clockPin, bitOrder)` | Read a byte one bit at a time. |

### Time

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `delay` | `delay(ms)` | `void` | `wait 500 · wait 2 seconds` | Pause the program for a number of milliseconds. |
| `delayMicroseconds` | `delayMicroseconds(us)` | `void` | `wait 50 us · wait_us 50` | Pause for a number of microseconds. |
| `millis` | `millis()` | `unsigned long` | `now()` | Milliseconds since the board started. |
| `micros` | `micros()` | `unsigned long` | `nowus()` | Microseconds since the board started. |

### Math

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `abs` | `abs(x)` | `number` | `abs(x)` | Absolute value. |
| `constrain` | `constrain(x, low, high)` | `number` | `constrain(x, low, high)` | Limit a number to a range. |
| `map` | `map(value, fromLow, fromHigh, toLow, toHigh)` | `long` | `map(value, fromLow, fromHigh, toLow, toHigh)` | Re-map a number from one range to another. |
| `max` | `max(a, b)` | `number` | `max(a, b)` | Larger of two numbers. |
| `min` | `min(a, b)` | `number` | `min(a, b)` | Smaller of two numbers. |
| `pow` | `pow(base, exponent)` | `double` | `pow(base, exponent)` | Raise a number to a power. |
| `sq` | `sq(x)` | `number` | `sq(x)` | Square of a number. |
| `sqrt` | `sqrt(x)` | `double` | `sqrt(x)` | Square root. |
| `floor` | `floor(x)` | `double` | `floor(x)` | Round down. |
| `ceil` | `ceil(x)` | `double` | `ceil(x)` | Round up. |
| `round` | `round(x)` | `long` | `round(x)` | Round to the nearest whole number. |
| `fabs` | `fabs(x)` | `double` | `fabs(x)` | Absolute value of a decimal number. |
| `fmod` | `fmod(x, y)` | `double` | `fmod(x, y)` | Remainder of a decimal division. |
| `log` | `log(x)` | `double` | `log(x)` | Natural logarithm. |
| `log10` | `log10(x)` | `double` | `log10(x)` | Base-10 logarithm. |
| `exp` | `exp(x)` | `double` | `exp(x)` | e raised to x. |

### Trigonometry

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `sin` | `sin(rad)` | `double` | `sin(rad)` | Sine of an angle in radians. |
| `cos` | `cos(rad)` | `double` | `cos(rad)` | Cosine of an angle in radians. |
| `tan` | `tan(rad)` | `double` | `tan(rad)` | Tangent of an angle in radians. |
| `asin` | `asin(x)` | `double` | `asin(x)` | Arc sine. |
| `acos` | `acos(x)` | `double` | `acos(x)` | Arc cosine. |
| `atan` | `atan(x)` | `double` | `atan(x)` | Arc tangent. |
| `atan2` | `atan2(y, x)` | `double` | `atan2(y, x)` | Angle of the point (x, y). |
| `radians` | `radians(deg)` | `double` | `radians(deg)` | Degrees to radians. |
| `degrees` | `degrees(rad)` | `double` | `degrees(rad)` | Radians to degrees. |

### Characters

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `isAlpha` | `isAlpha(c)` | `bool` | `isAlpha(c)` | Is the character a letter? |
| `isAlphaNumeric` | `isAlphaNumeric(c)` | `bool` | `isAlphaNumeric(c)` | Is the character a letter or digit? |
| `isAscii` | `isAscii(c)` | `bool` | `isAscii(c)` | Is the character ASCII? |
| `isControl` | `isControl(c)` | `bool` | `isControl(c)` | Is the character a control character? |
| `isDigit` | `isDigit(c)` | `bool` | `isDigit(c)` | Is the character a digit? |
| `isGraph` | `isGraph(c)` | `bool` | `isGraph(c)` | Is the character printable and not a space? |
| `isHexadecimalDigit` | `isHexadecimalDigit(c)` | `bool` | `isHexadecimalDigit(c)` | Is the character 0-9, a-f or A-F? |
| `isLowerCase` | `isLowerCase(c)` | `bool` | `isLowerCase(c)` | Is the character lower case? |
| `isPrintable` | `isPrintable(c)` | `bool` | `isPrintable(c)` | Is the character printable? |
| `isPunct` | `isPunct(c)` | `bool` | `isPunct(c)` | Is the character punctuation? |
| `isSpace` | `isSpace(c)` | `bool` | `isSpace(c)` | Is the character white space (space, tab, newline…)? |
| `isUpperCase` | `isUpperCase(c)` | `bool` | `isUpperCase(c)` | Is the character upper case? |
| `isWhitespace` | `isWhitespace(c)` | `bool` | `isWhitespace(c)` | Is the character a space or tab? |

### Random numbers

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `random` | `random([min,] max)` | `long` | `randint(1, 6)  (inclusive)` | Random number from min up to (not including) max. |
| `randomSeed` | `randomSeed(seed)` | `void` | `randomSeed(seed)` | Start the random generator from a seed, e.g. analogRead of a floating pin. |

### Bits and bytes

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `bit` | `bit(n)` | `number` | `bit(n)` | The value of bit n (1, 2, 4, 8, …). |
| `bitClear` | `bitClear(x, n)` | `void` | `bitClear(x, n)` | Set bit n of x to 0. |
| `bitRead` | `bitRead(x, n)` | `int` | `bitRead(x, n)` | Read bit n of x. |
| `bitSet` | `bitSet(x, n)` | `void` | `bitSet(x, n)` | Set bit n of x to 1. |
| `bitWrite` | `bitWrite(x, n, b)` | `void` | `bitWrite(x, n, b)` | Write 0 or 1 to bit n of x. |
| `highByte` | `highByte(x)` | `byte` | `highByte(x)` | The high (left) byte of a word. |
| `lowByte` | `lowByte(x)` | `byte` | `lowByte(x)` | The low (right) byte of a word. |
| `word` | `word(high, low)` | `word` | `word(high, low)` | Combine two bytes into a word. |

### External interrupts

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `attachInterrupt` | `attachInterrupt(digitalPinToInterrupt(pin), handler, mode)` | `void` | `attach 2 rising onPress` | Run a function when a pin changes (RISING, FALLING, CHANGE, LOW, HIGH). |
| `detachInterrupt` | `detachInterrupt(digitalPinToInterrupt(pin))` | `void` | `detach 2` | Stop running the interrupt handler. |
| `digitalPinToInterrupt` | `digitalPinToInterrupt(pin)` | `int` | `digitalPinToInterrupt(pin)` | The interrupt number for a pin. |

### Interrupts

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `interrupts` | `interrupts()` | `void` | `interrupts()` | Re-enable interrupts. |
| `noInterrupts` | `noInterrupts()` | `void` | `noInterrupts()` | Disable interrupts (for timing-critical code). |

### Utilities

| Function | Signature | Returns | SDEV Form | Description |
|---|---|---|---|---|
| `sizeof` | `sizeof(x)` | `size_t` | `sizeof(x)` | Size of a variable or array in bytes. |
| `F` | `F("text")` | `text` | `F("text")` | Keep a string in flash memory instead of RAM. |
| `PROGMEM` | `const int table[] PROGMEM = {…}` | `modifier` | `const int table[] PROGMEM = {…}` | Store data in flash memory. |
| `yield` | `yield()` | `void` | `yield()` | Let background tasks run (ESP32/ESP8266/RP2040). In sdev, `yield x` inside a function means return. |

### Constants

| Constant | SDEV Alias | Description |
|---|---|---|
| `HIGH` | `high` | Pin is on (5 V or 3.3 V). |
| `LOW` | `low` | Pin is off (0 V). |
| `INPUT` | `input` | Pin mode: read a signal. |
| `OUTPUT` | `output` | Pin mode: drive a signal. |
| `INPUT_PULLUP` | `input_pullup` | Pin mode: input with the internal pull-up resistor. |
| `INPUT_PULLDOWN` | `input_pulldown` | Pin mode: input with a pull-down resistor (SAMD, ESP32, RP2040, Renesas). |
| `LED_BUILTIN` | `led` | The pin of the on-board LED. |
| `A0 … A7` | — | Analog input pins. |
| `RISING / FALLING / CHANGE` | `rising · falling · change` | Interrupt modes. |
| `MSBFIRST / LSBFIRST` | `msbfirst · lsbfirst` | Bit order for shiftIn/shiftOut and SPI. |
| `DEC / HEX / OCT / BIN` | — | Number formats for print(). |
| `DEFAULT / INTERNAL / INTERNAL1V1 / INTERNAL2V56 / EXTERNAL` | — | analogReference() options (depend on the board). |
| `true / false` | `yep · nope` | Booleans. |
| `PI, HALF_PI, TWO_PI, DEG_TO_RAD, RAD_TO_DEG` | — | Math constants. |

### Types & Qualifiers

| C++ Type | SDEV Type | Summary |
|---|---|---|
| `bool` | `bool` | true or false. |
| `byte` | `byte` | 0–255. |
| `char` | `char` | One character. |
| `int` | `int` | Whole number (16-bit on AVR, 32-bit on ARM/ESP). |
| `unsigned int` | — | Non-negative whole number. |
| `long` | `long` | 32-bit whole number (default for untyped sdev parameters). |
| `unsigned long` | `ulong` | 32-bit non-negative — use for millis() values. |
| `short` | — | 16-bit whole number. |
| `word` | — | 16-bit non-negative. |
| `float` | `float · decimal` | Decimal number. |
| `double` | `double` | Decimal number (same as float on AVR). |
| `String` | `text · string` | Text object. |
| `size_t` | — | Size in bytes. |
| `uint8_t … int64_t` | — | Fixed-size integers. |
| `arrays` | `forge notes be [262, 294, 330]` | Fixed list of values. |
| `const / static / volatile` | `fixed · keep · volatile` | Qualifiers. |

### `Serial` / `Stream` Methods

| Method | Description |
|---|---|
| `Serial.begin(speed[, config])` | Open the port at a baud rate (9600, 115200, …). |
| `Serial.end()` | Close the port. |
| `Serial.available()` | Number of bytes waiting to be read. |
| `Serial.availableForWrite()` | Bytes that can be written without blocking. |
| `Serial.read()` | Read one byte (-1 if none). |
| `Serial.peek()` | Look at the next byte without removing it. |
| `Serial.write(value | buffer, len)` | Send raw bytes. |
| `Serial.print(value[, format])` | Send text (format: DEC, HEX, OCT, BIN or decimal places). |
| `Serial.println(value[, format])` | Send text followed by a new line. |
| `Serial.flush()` | Wait until all outgoing data is sent. |
| `Serial.find(target)` | Read until the target text is found. |
| `Serial.findUntil(target, terminal)` | Read until target or terminal text is found. |
| `Serial.parseInt()` | Read the next whole number. |
| `Serial.parseFloat()` | Read the next decimal number. |
| `Serial.readBytes(buffer, length)` | Read bytes into a buffer. |
| `Serial.readBytesUntil(char, buffer, length)` | Read bytes until a character. |
| `Serial.readString()` | Read everything into a String. |
| `Serial.readStringUntil(char)` | Read into a String until a character, e.g. '\n'. |
| `Serial.setTimeout(ms)` | How long the read/parse functions wait. |
| `Serial.if (Serial)` | True once a USB serial port is open (Leonardo, Zero, R4, …). |
| `Serial.serialEvent()` | Define this function to run when data arrives. |

### `String` Methods

| Method | Description |
|---|---|
| `str.charAt(n)` | Character at a position. |
| `str.compareTo(other)` | Compare alphabetically. |
| `str.concat(value)` | Append a value. |
| `str.c_str()` | C string pointer. |
| `str.endsWith(text)` | Ends with the text? |
| `str.equals(other)` | Same text? |
| `str.equalsIgnoreCase(other)` | Same text ignoring case? |
| `str.getBytes(buf, len)` | Copy bytes into a buffer. |
| `str.indexOf(text[, from])` | Position of text (-1 if missing). |
| `str.lastIndexOf(text[, from])` | Last position of text. |
| `str.length()` | Number of characters. |
| `str.remove(index[, count])` | Remove characters. |
| `str.replace(find, with)` | Replace text. |
| `str.reserve(size)` | Reserve memory. |
| `str.setCharAt(index, c)` | Change one character. |
| `str.startsWith(text)` | Starts with the text? |
| `str.substring(from[, to])` | Part of the text. |
| `str.toCharArray(buf, len)` | Copy into a char array. |
| `str.toDouble()` | Convert to a decimal number. |
| `str.toFloat()` | Convert to a decimal number. |
| `str.toInt()` | Convert to a whole number. |
| `str.toLowerCase()` | Make lower case. |
| `str.toUpperCase()` | Make upper case. |
| `str.trim()` | Remove spaces at both ends. |

---

## 5. Curated Libraries (61)

Every curated library below has pre-mapped headers (including multi-header libraries like `Ethernet`, `Adafruit SSD1306`, `DallasTemperature`, `MFRC522`, `ArduinoModbus`, and `ArduinoIoTCloud`) so `use "<Name>"` emits the exact `#include` directives needed.

### Wire (`use "Wire"`)

- **Category**: Communication
- **Headers**: `#include <Wire.h>`
- **Delivery**: Bundled with board core
- **Summary**: I²C / TWI bus — talk to sensors, displays and other boards.

**Class `Wire`**

| Method | Summary |
|---|---|
| `begin([address])` | Join the bus (as controller, or as peripheral with an address). |
| `end()` | Leave the bus. |
| `setClock(hz)` | Bus speed (100000 or 400000). |
| `beginTransmission(address)` | Start writing to a device. |
| `write(value)` | Queue bytes. |
| `endTransmission([stop])` | Send the queued bytes (0 = success). |
| `requestFrom(address, count)` | Ask a device for bytes. |
| `available()` | Bytes waiting. |
| `read()` | Read a byte. |
| `onReceive(handler)` | Peripheral: run when data arrives. |
| `onRequest(handler)` | Peripheral: run when data is requested. |
| `setWireTimeout(us, reset)` | Avoid hanging on a stuck bus. |
| `getWireTimeoutFlag()` | Did a timeout happen? |
| `clearWireTimeoutFlag()` | Clear the timeout flag. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Wire"
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
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Wire.h>



void setup() {
  Serial.begin(9600);
  Wire.begin();
  Serial.println("I2C scan");
  for (long a = 1; a < 127; a++) {
    Wire.beginTransmission(a);
    if (Wire.endTransmission() == 0) {
      Serial.print("found device at"); Serial.print(" "); Serial.println(a);
    }
  }
}
void loop() {
}
```

### SPI (`use "SPI"`)

- **Category**: Communication
- **Headers**: `#include <SPI.h>`
- **Delivery**: Bundled with board core
- **Summary**: Serial Peripheral Interface bus.

**Class `SPI`**

| Method | Summary |
|---|---|
| `begin()` | Start the bus. |
| `end()` | Stop the bus. |
| `beginTransaction(SPISettings(speed, MSBFIRST, SPI_MODE0))` | Claim the bus with settings. |
| `endTransaction()` | Release the bus. |
| `transfer(value)` | Send and receive one byte. |
| `transfer16(value)` | Send and receive 16 bits. |
| `transfer(buffer, size)` | Send and receive a buffer. |
| `usingInterrupt(n)` | Make SPI interrupt-safe. |
| `setBitOrder(order)` | Deprecated: use SPISettings. |
| `setClockDivider(div)` | Deprecated: use SPISettings. |
| `setDataMode(mode)` | Deprecated: use SPISettings. |

### EEPROM (`use "EEPROM"`)

- **Category**: Data storage
- **Headers**: `#include <EEPROM.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: AVR, Uno R4, ESP32/ESP8266 (emulated), RP2040 (emulated)
- **Summary**: Memory that keeps its value when the power is off.

**Class `EEPROM`**

| Method | Summary |
|---|---|
| `read(address)` | Read a byte. |
| `write(address, value)` | Write a byte. |
| `update(address, value)` | Write only if different (saves wear). |
| `get(address, variable)` | Read any type. |
| `put(address, variable)` | Write any type. |
| `length()` | Size in bytes. |
| `EEPROM[address]` | Read/write like an array. |
| `begin(size) / commit()` | ESP32/ESP8266/RP2040 only: open and save the emulated EEPROM. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "EEPROM"
  conjure setup() ::
    forge boots be EEPROM.read(0) + 1
    EEPROM.update(0, boots)
    speak("This board has started", boots, "times")
  ;;
  conjure loop() ::
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <EEPROM.h>



void setup() {
  Serial.begin(9600);
  auto boots = EEPROM.read(0) + 1;
  EEPROM.update(0, boots);
  Serial.print("This board has started"); Serial.print(" "); Serial.print(boots); Serial.print(" "); Serial.println("times");
}
void loop() {
}
```

### SoftwareSerial (`use "SoftwareSerial"`)

- **Category**: Communication
- **Headers**: `#include <SoftwareSerial.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: AVR, Uno R4, ESP8266
- **Summary**: Extra serial ports on any digital pins.

**Class `SoftwareSerial`** — `device bt be SoftwareSerial(10, 11)`

| Method | Summary |
|---|---|
| `begin(speed)` | Same as Serial. |
| `available()` | Same as Serial. |
| `read()` | Same as Serial. |
| `peek()` | Same as Serial. |
| `write(value)` | Same as Serial. |
| `print(value)` | Same as Serial. |
| `println(value)` | Same as Serial. |
| `end()` | Same as Serial. |
| `listen()` | Make this port the one that receives. |
| `isListening()` | Is this port receiving? |
| `overflow()` | Did the buffer overflow? |

### HID (`use "HID"`)

- **Category**: Device control
- **Headers**: `#include <HID.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Leonardo, Micro, Zero, MKR, Due, Uno R4
- **Summary**: Low-level USB HID (used by Keyboard and Mouse).

### Servo (`use "Servo"`)

- **Category**: Device control
- **Headers**: `#include <Servo.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Control hobby servo motors.

**Class `Servo`** — `device arm be Servo`

| Method | Summary |
|---|---|
| `attach(pin[, min, max])` | Connect the servo to a pin. |
| `write(angle)` | Move to an angle (0–180). |
| `writeMicroseconds(us)` | Set the pulse width directly. |
| `read()` | Last angle written. |
| `attached()` | Is it attached? |
| `detach()` | Release the pin. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Servo"
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
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Servo.h>



Servo arm;
void setup() {
  arm.attach(9);
}
void loop() {
  for (long angle = 0; (5) >= 0 ? angle < 181 : angle > 181; angle += (5)) {
    arm.write(angle);
    delay(15);
  }
  for (long angle = 180; (-5) >= 0 ? angle < -1 : angle > -1; angle += (-5)) {
    arm.write(angle);
    delay(15);
  }
}
```

### Stepper (`use "Stepper"`)

- **Category**: Device control
- **Headers**: `#include <Stepper.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Unipolar and bipolar stepper motors.

**Class `Stepper`** — `device motor be Stepper(200, 8, 9, 10, 11)`

| Method | Summary |
|---|---|
| `setSpeed(rpm)` | Speed in turns per minute. |
| `step(steps)` | Turn a number of steps (negative = backwards). |

### LiquidCrystal (`use "LiquidCrystal"`)

- **Category**: Display
- **Headers**: `#include <LiquidCrystal.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Character LCDs (HD44780) wired directly to pins.

**Class `LiquidCrystal`** — `device lcd be LiquidCrystal(12, 11, 5, 4, 3, 2)`

| Method | Summary |
|---|---|
| `begin(cols, rows)` | Start the display. |
| `clear()` | Clear the screen. |
| `home()` | Cursor to top-left. |
| `setCursor(col, row)` | Move the cursor. |
| `print(value)` | Show text. |
| `write(char)` | Show one character. |
| `cursor() / noCursor()` | Show or hide the cursor. |
| `blink() / noBlink()` | Blinking cursor. |
| `display() / noDisplay()` | Turn text on/off. |
| `scrollDisplayLeft() / scrollDisplayRight()` | Scroll. |
| `autoscroll() / noAutoscroll()` | Automatic scrolling. |
| `leftToRight() / rightToLeft()` | Text direction. |
| `createChar(n, bytes)` | Define a custom character. |

### LiquidCrystal I2C (`use "LiquidCrystal I2C"`)

- **Category**: Display
- **Headers**: `#include <LiquidCrystal_I2C.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Character LCDs with an I²C backpack (2 wires).

**Class `LiquidCrystal_I2C`** — `device lcd be LiquidCrystal_I2C(0x27, 16, 2)`

| Method | Summary |
|---|---|
| `init()` | Start the display. |
| `backlight() / noBacklight()` | Backlight on/off. |
| `clear()` | Clear. |
| `setCursor(col, row)` | Move the cursor. |
| `print(value)` | Show text. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "LiquidCrystal I2C"
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
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <LiquidCrystal_I2C.h>



LiquidCrystal_I2C lcd(0x27, 16, 2);
void setup() {
  lcd.init();
  lcd.backlight();
  lcd.print("Hello from sdev");
}
void loop() {
  lcd.setCursor(0, 1);
  lcd.print(millis() / 1000);
  delay(500);
}
```

### SD (`use "SD"`)

- **Category**: Data storage
- **Headers**: `#include <SD.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Read and write files on SD cards.

**Class `SD`**

| Method | Summary |
|---|---|
| `begin(csPin)` | Start the card. |
| `exists(path)` | Does a file exist? |
| `mkdir(path)` | Make a folder. |
| `open(path, FILE_READ | FILE_WRITE)` | Open a file. |
| `remove(path)` | Delete a file. |
| `rmdir(path)` | Delete a folder. |

**Class `File`**

| Method | Summary |
|---|---|
| `available()` | File operation. |
| `close()` | File operation. |
| `flush()` | File operation. |
| `peek()` | File operation. |
| `position()` | File operation. |
| `print(v)` | File operation. |
| `println(v)` | File operation. |
| `seek(pos)` | File operation. |
| `size()` | File operation. |
| `read()` | File operation. |
| `write(v)` | File operation. |
| `isDirectory()` | File operation. |
| `openNextFile()` | File operation. |
| `rewindDirectory()` | File operation. |
| `name()` | File operation. |

### Keyboard (`use "Keyboard"`)

- **Category**: Device control
- **Headers**: `#include <Keyboard.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Leonardo, Micro, Zero, MKR, Due, Uno R4, Nano 33 IoT, Giga
- **Summary**: Act as a USB keyboard.

**Class `Keyboard`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `end()` | Stop. |
| `press(key)` | Hold a key. |
| `release(key)` | Let go of a key. |
| `releaseAll()` | Let go of all keys. |
| `write(key)` | Press and release. |
| `print(text)` | Type text. |
| `println(text)` | Type text + Enter. |

### Mouse (`use "Mouse"`)

- **Category**: Device control
- **Headers**: `#include <Mouse.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Leonardo, Micro, Zero, MKR, Due, Uno R4, Nano 33 IoT, Giga
- **Summary**: Act as a USB mouse.

**Class `Mouse`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `end()` | Stop. |
| `click([button])` | Click. |
| `move(x, y[, wheel])` | Move the pointer. |
| `press([button])` | Hold a button. |
| `release([button])` | Release a button. |
| `isPressed([button])` | Is a button held? |

### Ethernet (`use "Ethernet"`)

- **Category**: Communication
- **Headers**: `#include <SPI.h>`, `#include <Ethernet.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Wired networking with the Ethernet shield (W5100/W5500).

**Class `Ethernet`**

| Method | Summary |
|---|---|
| `begin(mac[, ip])` | Connect (DHCP if no ip). |
| `localIP()` | Our address. |
| `maintain()` | Renew DHCP. |
| `hardwareStatus()` | Which chip. |
| `linkStatus()` | Cable connected? |

**Class `EthernetClient`**

| Method | Summary |
|---|---|
| `connect(host, port)` | Open a connection. |
| `print/println/write` | Send. |
| `available() / read()` | Receive. |
| `stop()` | Close. |
| `connected()` | Still connected? |

**Class `EthernetServer`**

| Method | Summary |
|---|---|
| `begin()` | Listen. |
| `available()` | Next client. |

### WiFiS3 (`use "WiFiS3"`)

- **Category**: Communication
- **Headers**: `#include <WiFiS3.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Uno R4 WiFi
- **Summary**: Wi-Fi on the Uno R4 WiFi.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | WL_CONNECTED when connected. |
| `localIP()` | Our address. |
| `RSSI()` | Signal strength. |
| `disconnect()` | Disconnect. |
| `scanNetworks()` | List networks. |
| `beginAP(ssid, pass)` | Make a hotspot. |

**Class `WiFiClient / WiFiServer / WiFiUDP / WiFiSSLClient`**

| Method | Summary |
|---|---|
| `connect(host, port)` | Open a connection. |
| `available() / read()` | Receive. |
| `print/write` | Send. |
| `stop()` | Close. |

### WiFiNINA (`use "WiFiNINA"`)

- **Category**: Communication
- **Headers**: `#include <WiFiNINA.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Nano 33 IoT, MKR WiFi 1010, Uno WiFi Rev2, Nano RP2040 Connect
- **Summary**: Wi-Fi on Nano 33 IoT, MKR WiFi 1010, Uno WiFi Rev2, Nano RP2040 Connect.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | Connection state. |
| `localIP()` | Our address. |
| `RSSI()` | Signal. |

### WiFi (`use "WiFi"`)

- **Category**: Communication
- **Headers**: `#include <WiFi.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: ESP32, Nano ESP32, Giga, Portenta, Pico W
- **Summary**: Wi-Fi on ESP32, Nano ESP32, Pico W, Giga and Portenta.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | WL_CONNECTED when connected. |
| `localIP()` | Our address. |
| `softAP(ssid, pass)` | Make a hotspot. |
| `scanNetworks()` | List networks. |
| `disconnect()` | Disconnect. |

### ESP8266WiFi (`use "ESP8266WiFi"`)

- **Category**: Communication
- **Headers**: `#include <ESP8266WiFi.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: ESP8266
- **Summary**: Wi-Fi on ESP8266 boards.

**Class `WiFi`**

| Method | Summary |
|---|---|
| `begin(ssid, pass)` | Connect. |
| `status()` | Connection state. |
| `localIP()` | Our address. |

### ArduinoBLE (`use "ArduinoBLE"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoBLE.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Uno R4 WiFi, Nano 33 BLE, Nano 33 IoT, Nano RP2040 Connect, Nano ESP32, MKR WiFi 1010, Giga, Portenta
- **Summary**: Bluetooth Low Energy.

**Class `BLE`**

| Method | Summary |
|---|---|
| `begin()` | Start BLE. |
| `setLocalName(name)` | Advertised name. |
| `advertise()` | Start advertising. |
| `scan()` | Look for devices. |
| `available()` | Next found device. |
| `central()` | Connected central device. |
| `poll()` | Process BLE events. |

**Class `BLEService / BLECharacteristic`**

| Method | Summary |
|---|---|
| `BLEService(uuid)` | A service. |
| `BLEIntCharacteristic(uuid, BLERead | BLENotify)` | A value. |
| `writeValue(v)` | Update the value. |
| `value()` | Read the value. |
| `written()` | Was it written? |

### Arduino_LED_Matrix (`use "Arduino_LED_Matrix"`)

- **Category**: Display
- **Headers**: `#include <Arduino_LED_Matrix.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Uno R4 WiFi
- **Summary**: The 12×8 LED matrix on the Uno R4 WiFi.

**Class `ArduinoLEDMatrix`** — `device matrix be ArduinoLEDMatrix`

| Method | Summary |
|---|---|
| `begin()` | Start the matrix. |
| `loadFrame(frame)` | Show a frame (3 × uint32_t). |
| `renderBitmap(bitmap, 8, 12)` | Show a byte[8][12] bitmap. |
| `loadSequence(frames)` | Load an animation. |
| `play([loop])` | Play the animation. |
| `autoscroll(ms)` | Scroll text drawn with ArduinoGraphics. |
| `beginDraw() / endDraw()` | Draw with ArduinoGraphics. |
| `textScrollSpeed(ms)` | Scroll speed. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Arduino_LED_Matrix"
  device matrix be ArduinoLEDMatrix
  conjure setup() ::
    matrix.begin()
  ;;
  conjure loop() ::
    matrix.loadFrame(LEDMATRIX_HEART_BIG)
    wait 500
    matrix.loadFrame(LEDMATRIX_HEART_SMALL)
    wait 500
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Arduino_LED_Matrix.h>



ArduinoLEDMatrix matrix;
void setup() {
  matrix.begin();
}
void loop() {
  matrix.loadFrame(LEDMATRIX_HEART_BIG);
  delay(500);
  matrix.loadFrame(LEDMATRIX_HEART_SMALL);
  delay(500);
}
```

### ArduinoGraphics (`use "ArduinoGraphics"`)

- **Category**: Display
- **Headers**: `#include <ArduinoGraphics.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Draw text and shapes (used with the R4 LED matrix and displays).

**Class `ArduinoGraphics`**

| Method | Summary |
|---|---|
| `beginDraw() / endDraw()` | Start/finish drawing. |
| `stroke(r, g, b)` | Line color. |
| `textFont(Font_5x7)` | Choose a font. |
| `text(str, x, y)` | Draw text. |
| `beginText(x, y, color) / endText(SCROLL_LEFT)` | Scrolling text. |
| `point / line / rect / circle` | Shapes. |

### RTC (`use "RTC"`)

- **Category**: Timing
- **Headers**: `#include <RTC.h>`
- **Delivery**: Bundled with board core
- **Supported Boards**: Uno R4 Minima, Uno R4 WiFi
- **Summary**: Real-time clock of the Uno R4.

**Class `RTC`**

| Method | Summary |
|---|---|
| `begin()` | Start the clock. |
| `setTime(RTCTime)` | Set the date and time. |
| `getTime(RTCTime&)` | Read the date and time. |
| `setPeriodicCallback(fn, Period::ONCE_EVERY_1_SEC)` | Run a function periodically. |
| `setAlarmCallback(fn, time, match)` | Alarm. |

### Firmata (`use "Firmata"`)

- **Category**: Communication
- **Headers**: `#include <Firmata.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Control the board from a computer with the Firmata protocol.

**Class `Firmata`**

| Method | Summary |
|---|---|
| `begin(speed)` | Start. |
| `processInput()` | Handle incoming messages. |
| `sendAnalog(pin, value)` | Report a value. |
| `attach(command, handler)` | Handle a command. |

### Adafruit NeoPixel (`use "Adafruit NeoPixel"`)

- **Category**: Display
- **Headers**: `#include <Adafruit_NeoPixel.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: WS2812 / NeoPixel RGB LED strips and rings.

**Class `Adafruit_NeoPixel`** — `device strip be Adafruit_NeoPixel(8, 6, NEO_GRB + NEO_KHZ800)`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `show()` | Send colors to the LEDs. |
| `clear()` | All off. |
| `setPixelColor(i, r, g, b)` | Color one LED. |
| `Color(r, g, b)` | Pack a color. |
| `ColorHSV(hue)` | Color from a hue. |
| `setBrightness(0-255)` | Overall brightness. |
| `numPixels()` | How many LEDs. |
| `fill(color, first, count)` | Fill a range. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "Adafruit NeoPixel"
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
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <Adafruit_NeoPixel.h>



Adafruit_NeoPixel strip(8, 6, NEO_GRB + NEO_KHZ800);
void setup() {
  strip.begin();
  strip.setBrightness(40);
}
void loop() {
  for (long i = 0; i < 8; i++) {
    strip.clear();
    strip.setPixelColor(i, strip.Color(0, 80, 255));
    strip.show();
    delay(80);
  }
}
```

### FastLED (`use "FastLED"`)

- **Category**: Display
- **Headers**: `#include <FastLED.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Fast control of many kinds of LED strips.

**Class `FastLED`**

| Method | Summary |
|---|---|
| `addLeds<WS2812B, PIN, GRB>(leds, count)` | Register a strip. |
| `show()` | Send colors. |
| `clear()` | All off. |
| `setBrightness(v)` | Brightness. |
| `CRGB(r, g, b) / CHSV(h, s, v)` | Colors. |

### DHT sensor library (`use "DHT sensor library"`)

- **Category**: Sensors
- **Headers**: `#include <DHT.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: DHT11 / DHT22 temperature and humidity sensors (also install "Adafruit Unified Sensor").

**Class `DHT`** — `device dht be DHT(2, DHT22)`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `readTemperature([fahrenheit])` | Temperature. |
| `readHumidity()` | Humidity %. |
| `computeHeatIndex(t, h)` | Feels-like temperature. |

**SDEV Sketch:**
```sdev
board "uno" ::
  use "DHT sensor library"
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
  ;;
;;
```
**Transpiled Arduino C++ (`.ino`):**
```cpp
// auto-generated from sdev for Arduino Uno (R3) (arduino:avr:uno)
// do not edit by hand

#include <DHT.h>
#include <Adafruit_Sensor.h>




DHT dht(2, DHT22);
void setup() {
  Serial.begin(9600);
  dht.begin();
}
void loop() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  Serial.print("Temperature:"); Serial.print(" "); Serial.print(t); Serial.print(" "); Serial.print("C  Humidity:"); Serial.print(" "); Serial.print(h); Serial.print(" "); Serial.println("%");
  delay((2) * 1000);
}
```

### Adafruit Unified Sensor (`use "Adafruit Unified Sensor"`)

- **Category**: Sensors
- **Headers**: `#include <Adafruit_Sensor.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Common base used by Adafruit sensor libraries.

### Adafruit GFX Library (`use "Adafruit GFX Library"`)

- **Category**: Display
- **Headers**: `#include <Adafruit_GFX.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Shapes, text and bitmaps for displays.

**Class `Adafruit_GFX`**

| Method | Summary |
|---|---|
| `drawPixel(x, y, c)` | Drawing. |
| `drawLine(x0, y0, x1, y1, c)` | Drawing. |
| `drawRect(x, y, w, h, c)` | Drawing. |
| `fillRect(x, y, w, h, c)` | Drawing. |
| `drawCircle(x, y, r, c)` | Drawing. |
| `fillCircle(x, y, r, c)` | Drawing. |
| `setCursor(x, y)` | Drawing. |
| `setTextSize(n)` | Drawing. |
| `setTextColor(c)` | Drawing. |
| `print(v)` | Drawing. |
| `drawBitmap(x, y, bmp, w, h, c)` | Drawing. |

### Adafruit SSD1306 (`use "Adafruit SSD1306"`)

- **Category**: Display
- **Headers**: `#include <Adafruit_GFX.h>`, `#include <Adafruit_SSD1306.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: 128×64 / 128×32 OLED displays.

**Class `Adafruit_SSD1306`** — `device oled be Adafruit_SSD1306(128, 64, &Wire, -1)`

| Method | Summary |
|---|---|
| `begin(SSD1306_SWITCHCAPVCC, 0x3C)` | Start. |
| `clearDisplay()` | Clear. |
| `display()` | Show what was drawn. |
| `…all Adafruit GFX methods` | Drawing. |

### U8g2 (`use "U8g2"`)

- **Category**: Display
- **Headers**: `#include <U8g2lib.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Monochrome displays of almost every kind.

**Class `U8G2_*`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `clearBuffer() / sendBuffer()` | Frame. |
| `setFont(font)` | Font. |
| `drawStr(x, y, text)` | Text. |

### TM1637 (`use "TM1637"`)

- **Category**: Display
- **Headers**: `#include <TM1637Display.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: 4-digit 7-segment displays.

**Class `TM1637Display`** — `device digits be TM1637Display(2, 3)`

| Method | Summary |
|---|---|
| `setBrightness(0-7)` | Brightness. |
| `showNumberDec(n)` | Show a number. |
| `clear()` | Clear. |

### LedControl (`use "LedControl"`)

- **Category**: Display
- **Headers**: `#include <LedControl.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MAX7219 LED matrices and 7-segment displays.

**Class `LedControl`** — `device leds be LedControl(12, 11, 10, 1)`

| Method | Summary |
|---|---|
| `shutdown(dev, false)` | Wake up. |
| `setIntensity(dev, 0-15)` | Brightness. |
| `setLed(dev, row, col, on)` | One LED. |
| `clearDisplay(dev)` | Clear. |

### NewPing (`use "NewPing"`)

- **Category**: Sensors
- **Headers**: `#include <NewPing.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: HC-SR04 ultrasonic distance sensors.

**Class `NewPing`** — `device sonar be NewPing(9, 10, 200)`

| Method | Summary |
|---|---|
| `ping_cm()` | Distance in cm. |
| `ping_in()` | Distance in inches. |
| `ping_median(n)` | Median of n pings (µs). |

### AccelStepper (`use "AccelStepper"`)

- **Category**: Device control
- **Headers**: `#include <AccelStepper.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Steppers with acceleration.

**Class `AccelStepper`** — `device motor be AccelStepper(AccelStepper::DRIVER, 2, 3)`

| Method | Summary |
|---|---|
| `setMaxSpeed(s)` | Top speed. |
| `setAcceleration(a)` | Acceleration. |
| `moveTo(pos)` | Target position. |
| `run()` | Call often to move. |
| `distanceToGo()` | Steps left. |

### IRremote (`use "IRremote"`)

- **Category**: Communication
- **Headers**: `#include <IRremote.hpp>`
- **Delivery**: Arduino Library Manager
- **Summary**: Send and receive infrared remote codes.

**Class `IrReceiver / IrSender`**

| Method | Summary |
|---|---|
| `IrReceiver.begin(pin)` | Start receiving. |
| `IrReceiver.decode()` | Got a code? |
| `IrReceiver.decodedIRData.command` | The code. |
| `IrReceiver.resume()` | Ready for the next one. |
| `IrSender.sendNEC(addr, cmd, repeats)` | Send. |

### PubSubClient (`use "PubSubClient"`)

- **Category**: Communication
- **Headers**: `#include <PubSubClient.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MQTT messaging.

**Class `PubSubClient`**

| Method | Summary |
|---|---|
| `setServer(host, port)` | Broker. |
| `connect(id)` | Connect. |
| `publish(topic, msg)` | Send. |
| `subscribe(topic)` | Listen. |
| `setCallback(fn)` | Handle messages. |
| `loop()` | Call often. |

### ArduinoJson (`use "ArduinoJson"`)

- **Category**: Data processing
- **Headers**: `#include <ArduinoJson.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Read and write JSON.

**Class `JsonDocument`**

| Method | Summary |
|---|---|
| `deserializeJson(doc, input)` | Parse. |
| `serializeJson(doc, output)` | Write. |
| `doc["key"]` | Get/set values. |

### OneWire (`use "OneWire"`)

- **Category**: Communication
- **Headers**: `#include <OneWire.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: 1-Wire bus (DS18B20 and more).

**Class `OneWire`** — `device bus be OneWire(4)`

| Method | Summary |
|---|---|
| `reset()` | Reset. |
| `search(addr)` | Find devices. |
| `write(b)` | Send. |
| `read()` | Receive. |

### DallasTemperature (`use "DallasTemperature"`)

- **Category**: Sensors
- **Headers**: `#include <OneWire.h>`, `#include <DallasTemperature.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: DS18B20 temperature sensors (also install "OneWire").

**Class `DallasTemperature`** — `device temps be DallasTemperature(&bus)`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `requestTemperatures()` | Measure. |
| `getTempCByIndex(0)` | Temperature in °C. |

### MFRC522 (`use "MFRC522"`)

- **Category**: Sensors
- **Headers**: `#include <SPI.h>`, `#include <MFRC522.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: RFID card readers.

**Class `MFRC522`** — `device rfid be MFRC522(10, 9)`

| Method | Summary |
|---|---|
| `PCD_Init()` | Start. |
| `PICC_IsNewCardPresent()` | Card near? |
| `PICC_ReadCardSerial()` | Read its id. |
| `uid.uidByte[i]` | Id bytes. |

### TinyGPSPlus (`use "TinyGPSPlus"`)

- **Category**: Sensors
- **Headers**: `#include <TinyGPSPlus.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Read GPS modules.

**Class `TinyGPSPlus`**

| Method | Summary |
|---|---|
| `encode(c)` | Feed a character. |
| `location.lat() / lng()` | Position. |
| `location.isValid()` | Have a fix? |

### RTClib (`use "RTClib"`)

- **Category**: Timing
- **Headers**: `#include <RTClib.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: DS1307 / DS3231 / PCF8523 clock modules.

**Class `RTC_DS3231`** — `device clock be RTC_DS3231`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `now()` | Current DateTime. |
| `adjust(DateTime(F(__DATE__), F(__TIME__)))` | Set the time. |

### Bounce2 (`use "Bounce2"`)

- **Category**: Signal input/output
- **Headers**: `#include <Bounce2.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Clean button presses.

**Class `Bounce`** — `device button be Bounce`

| Method | Summary |
|---|---|
| `attach(pin, INPUT_PULLUP)` | Connect. |
| `interval(ms)` | Debounce time. |
| `update()` | Call each loop. |
| `fell() / rose()` | Pressed / released. |

### Keypad (`use "Keypad"`)

- **Category**: Signal input/output
- **Headers**: `#include <Keypad.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Matrix keypads.

**Class `Keypad`**

| Method | Summary |
|---|---|
| `getKey()` | Pressed key or 0. |
| `waitForKey()` | Wait for a key. |

### HX711 (`use "HX711"`)

- **Category**: Sensors
- **Headers**: `#include <HX711.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Load-cell (scale) amplifiers.

**Class `HX711`** — `device scale be HX711`

| Method | Summary |
|---|---|
| `begin(dout, sck)` | Start. |
| `read()` | Raw value. |
| `get_units(n)` | Weight. |
| `tare()` | Zero. |
| `set_scale(f)` | Calibrate. |

### Adafruit BME280 Library (`use "Adafruit BME280 Library"`)

- **Category**: Sensors
- **Headers**: `#include <Adafruit_BME280.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: BME280 temperature, pressure and humidity.

**Class `Adafruit_BME280`** — `device bme be Adafruit_BME280`

| Method | Summary |
|---|---|
| `begin(0x76)` | Start. |
| `readTemperature()` | °C. |
| `readPressure()` | Pa. |
| `readHumidity()` | %. |

### Adafruit MPU6050 (`use "Adafruit MPU6050"`)

- **Category**: Sensors
- **Headers**: `#include <Adafruit_MPU6050.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MPU-6050 accelerometer and gyroscope.

**Class `Adafruit_MPU6050`** — `device imu be Adafruit_MPU6050`

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `getEvent(&a, &g, &temp)` | Read all values. |

### Encoder (`use "Encoder"`)

- **Category**: Signal input/output
- **Headers**: `#include <Encoder.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Rotary encoders.

**Class `Encoder`** — `device knob be Encoder(2, 3)`

| Method | Summary |
|---|---|
| `read()` | Position. |
| `write(n)` | Set position. |

### CapacitiveSensor (`use "CapacitiveSensor"`)

- **Category**: Sensors
- **Headers**: `#include <CapacitiveSensor.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Touch sensing with a resistor and foil.

**Class `CapacitiveSensor`** — `device touch be CapacitiveSensor(4, 2)`

| Method | Summary |
|---|---|
| `capacitiveSensor(samples)` | Touch value. |

### ArduinoHttpClient (`use "ArduinoHttpClient"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoHttpClient.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: HTTP and WebSocket client.

**Class `HttpClient`**

| Method | Summary |
|---|---|
| `get(path)` | GET request. |
| `post(path, type, body)` | POST request. |
| `responseStatusCode()` | Status. |
| `responseBody()` | Body. |

### ArduinoMqttClient (`use "ArduinoMqttClient"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoMqttClient.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: MQTT client from Arduino.

**Class `MqttClient`**

| Method | Summary |
|---|---|
| `connect(broker, port)` | Connect. |
| `beginMessage(topic) / print / endMessage()` | Publish. |
| `subscribe(topic)` | Listen. |
| `poll()` | Call often. |

### Arduino_JSON (`use "Arduino_JSON"`)

- **Category**: Data processing
- **Headers**: `#include <Arduino_JSON.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Simple JSON from Arduino.

**Class `JSON`**

| Method | Summary |
|---|---|
| `JSON.parse(text)` | Parse. |
| `JSON.stringify(value)` | Write. |

### ArduinoModbus (`use "ArduinoModbus"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoRS485.h>`, `#include <ArduinoModbus.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Modbus RTU/TCP (also install "ArduinoRS485").

### ArduinoRS485 (`use "ArduinoRS485"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoRS485.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: RS-485 serial.

### Arduino_LSM9DS1 (`use "Arduino_LSM9DS1"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_LSM9DS1.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Nano 33 BLE
- **Summary**: IMU of the Nano 33 BLE.

**Class `IMU`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `readAcceleration(x, y, z)` | Acceleration. |
| `readGyroscope(x, y, z)` | Rotation. |
| `readMagneticField(x, y, z)` | Compass. |

### Arduino_LSM6DS3 (`use "Arduino_LSM6DS3"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_LSM6DS3.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Nano 33 IoT, Uno WiFi Rev2
- **Summary**: IMU of the Nano 33 IoT and Uno WiFi Rev2.

**Class `IMU`**

| Method | Summary |
|---|---|
| `begin()` | Start. |
| `readAcceleration(x, y, z)` | Acceleration. |
| `readGyroscope(x, y, z)` | Rotation. |

### Arduino_APDS9960 (`use "Arduino_APDS9960"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_APDS9960.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Gesture, color and proximity (Nano 33 BLE Sense).

### Arduino_HTS221 (`use "Arduino_HTS221"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_HTS221.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Temperature and humidity (Nano 33 BLE Sense).

### Arduino_LPS22HB (`use "Arduino_LPS22HB"`)

- **Category**: Sensors
- **Headers**: `#include <Arduino_LPS22HB.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Barometric pressure (Nano 33 BLE Sense).

### ArduinoIoTCloud (`use "ArduinoIoTCloud"`)

- **Category**: Communication
- **Headers**: `#include <ArduinoIoTCloud.h>`, `#include <Arduino_ConnectionHandler.h>`
- **Delivery**: Arduino Library Manager
- **Summary**: Connect to Arduino Cloud.

### Scheduler (`use "Scheduler"`)

- **Category**: Timing
- **Headers**: `#include <Scheduler.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: Due, Zero, MKR
- **Summary**: Run several loops at once.

**Class `Scheduler`**

| Method | Summary |
|---|---|
| `startLoop(fn)` | Run another loop. |

### Arduino_FreeRTOS (`use "Arduino_FreeRTOS"`)

- **Category**: Timing
- **Headers**: `#include <Arduino_FreeRTOS.h>`
- **Delivery**: Arduino Library Manager
- **Supported Boards**: AVR
- **Summary**: FreeRTOS tasks on AVR boards.

---

## 6. Arduino Library Manager Index (10,232 Libraries)

The IDE bundles the complete Arduino Library Manager catalogue at `/arduino/library-index.json` (**10,232 libraries**). Any library in the index can be searched offline in **Hardware → Library Manager** and included with `use "<LibraryName>"` or `use "<HeaderName.h>"`.

| Category | Indexed Libraries |
|---|---|
| Communication | 2,326 |
| Sensors | 2,025 |
| Device Control | 1,708 |
| Display | 882 |
| Other | 842 |
| Signal Input/Output | 800 |
| Data Processing | 618 |
| Uncategorized | 385 |
| Timing | 372 |
| Data Storage | 274 |

---

## 7. Browser Upload Protocols & Architecture

`src/lang/hardware/web-serial.ts` implements 7 distinct browser flashing protocols dispatched by `flashBoard(board, port, firmware, onProgress)`:

1. **`stk500v1` (`flashAvr`)**: Optiboot / AVR061 protocol (`GET_SYNC=0x30`, `ENTER_PROGMODE=0x50`, `LOAD_ADDRESS=0x55`, `PROG_PAGE=0x64`, `LEAVE_PROGMODE=0x51`, `CRC_EOP=0x20` -> `IN_SYNC=0x14, OK=0x10`). Used by Arduino Uno R3, Nano (ATmega328P @ 115200 & ATmega168 @ 57600), and ATtiny85.
2. **`stk500v2` (`flashStk500v2`)**: AVR068 framed protocol (`MESSAGE_START=0x1B`, sequence number, 16-bit length, `TOKEN=0x0E`, XOR checksum, `CMD_SIGN_ON=0x01`, `CMD_ENTER_PROGMODE_ISP=0x10`, `CMD_LOAD_ADDRESS=0x06`, `CMD_PROGRAM_FLASH_ISP=0x13`, `CMD_LEAVE_PROGMODE_ISP=0x11`). Used by Arduino Mega 2560.
3. **`avr109` (`flashAvr109`)**: Caterina bootloader protocol with 1200-baud touch reset (`'S'` software ID, `'P'` enter prog mode, `'A'` word address, `'B'` block load, `'L'` leave, `'E'` exit). Used by Arduino Leonardo and Arduino Micro (ATmega32U4).
4. **`samba` (`flashSamba`)**: Atmel/Microchip SAM-BA & BOSSA monitor over Web Serial (`N#` binary mode, `V#` version, `X<addr>#` erase, `S<sram>,<len>#` + `Y<sram>,0#` + `Y<flash>,<len>#` applet page write, `K#` reset). Used by Arduino Uno R4 WiFi, Zero, Due, MKR family, Nano 33 IoT/BLE, and Nano Every.
5. **`dfu` (`flashDfuWebUsb`)**: USB DFU 1.1 & DfuSe over **WebUSB** (`DFU_DNLOAD=1`, `DFU_GETSTATUS=3`, `DFU_CLRSTATUS=4`, DfuSe Set Address Pointer `0x21` to `flashBase`, 1024-byte blocks starting at `wValue=2`, zero-length manifest). Used by Arduino Uno R4 Minima, Giga R1 WiFi, and Portenta H7.
6. **`esptool` (`flashEsp`)**: Espressif ROM bootloader SLIP framing (`0xC0` frame end, `0xDB 0xDC` / `0xDB 0xDD` escapes, `SYNC=0x08`, `FLASH_BEGIN=0x02`, `FLASH_DATA=0x03`, `FLASH_END=0x04`) with DTR/RTS auto-reset. Used by ESP32, ESP32-C3, ESP32-S2, ESP32-S3, Nano ESP32, and ESP8266.
7. **`uf2` (`buildUf2FromHexOrBin` + `flashUf2`)**: Generates 512-byte RP2040 UF2 blocks (`magicStart0=0x0A324655`, `magicStart1=0x9E5D5157`, `familyId=0xE48BFF56`, `magicEnd=0x0AB16F30`, 256-byte payloads at `0x10000000`) and writes directly to the `RPI-RP2` USB volume via `showDirectoryPicker` or downloads `.uf2`. Used by Raspberry Pi Pico, Pico W, and Arduino Nano RP2040 Connect.

---

## 8. In-Browser Hardware Simulator

When physical hardware is not connected, `src/lang/hardware/simulator.ts` and the IDE canvas component (`src/components/ide/HardwareSimulatorCanvas.tsx`) simulate `board "<id>"` blocks and transpiled Arduino C++ sketches directly in the browser:

- **Pin state & modes (`PinMode`, `PinState`)**: Tracks `UNSET`, `INPUT`, `OUTPUT`, `INPUT_PULLUP`, `PWM` (`0..255`), `SERVO` (`servoAngle` `0..180`), `analog` (`0..1023` on `A0..A5`), and buzzer `toneHz`.
- **Interactive virtual breadboard (`HardwareSimState`)**: Interactive `analogInputs` sliders, digital `buttonStates` toggles, built-in LED indicator, `neopixels` RGB strip state, servo angle, serial log + `serialRxQueue` monitor, and cycle/timing event trace (`SimulatorEvent`: `pin`, `serial`, `wait`, `tone`, `servo`, `neopixel`, `setup`, `loop`).
