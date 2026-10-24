// ============================================================
// Generate public/SDEV_HARDWARE_DOCUMENTATION.md from
// src/lang/hardware/board-db.ts, src/lang/hardware/arduino-api.ts,
// and public/arduino/library-index.json
// ============================================================
import { writeFileSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOARDS, canCompileInCloud, canFlashInBrowser } from '../src/lang/hardware/board-db';
import {
  ARDUINO_FUNCTIONS,
  ARDUINO_CONSTANTS,
  ARDUINO_TYPES,
  SERIAL_METHODS,
  STRING_METHODS,
  ARDUINO_LIBRARIES,
} from '../src/lang/hardware/arduino-api';
import { extractBoardBlock, transpileBoard } from '../src/lang/hardware/transpile';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexJsonPath = resolve(root, 'public/arduino/library-index.json');
const outDocPath = resolve(root, 'public/SDEV_HARDWARE_DOCUMENTATION.md');

const libIndex = JSON.parse(readFileSync(indexJsonPath, 'utf8')) as {
  count: number;
  libraries: [string, string, string[], string, string, string[], string][];
};

const uno = BOARDS[0];

const md: string[] = [];

md.push('# SDEV Hardware & Arduino Reference Documentation');
md.push('');
md.push(
  `Program **${BOARDS.length} microcontrollers** (Arduino Uno R3 / R4 Minima / R4 WiFi / Uno Q, Nano family, Mega 2560, Leonardo, Micro, MKR family, Zero, Due, Giga R1, Portenta H7, ESP32 / C3 / S2 / S3, ESP8266, Raspberry Pi Pico / Pico W, ATtiny85, and Teensy 4.1) directly in **sdev**.`
);
md.push('');
md.push('This reference covers:');
md.push('1. **Block Syntax**: `board "<id>" :: ... ;;` and `board "<id>" { ... }`');
md.push(`2. **Supported Boards (${BOARDS.length})**: FQBNs, MCUs, memory, cloud vs. local compilation, and USB IDs`);
md.push('3. **SDEV Hardware DSL & Statements**: pins, PWM, timing, serial, interrupts, tone, shiftOut, raw `cpp { ... }`');
md.push(`4. **Complete Arduino Core Reference (${ARDUINO_FUNCTIONS.length} functions, ${ARDUINO_CONSTANTS.length} constant groups, ${ARDUINO_TYPES.length} types, Serial & String APIs)**`);
md.push(`5. **Curated Libraries (${ARDUINO_LIBRARIES.length})** with SDEV ` + '`device`' + ' declarations, methods, and transpiled C++ examples');
md.push(`6. **Arduino Library Manager Integration (${libIndex.count.toLocaleString()} indexed libraries)**`);
md.push('7. **Browser Flashing Protocols (7 uploaders)**: STK500v1, STK500v2, AVR109, SAM-BA / BOSSA, WebUSB DFU 1.1, ESP32/ESP8266 SLIP, and RP2040 UF2');
md.push('');
md.push('---');
md.push('');

// Section 1: Syntax Overview
md.push('## 1. The `board` Block');
md.push('');
md.push(
  'A `board` block embeds a hardware sketch inside any `.sdev` file. When you run the file in the desktop/browser sdev interpreter, `stripBoardBlocks()` strips all `board` blocks automatically so desktop code and microcontroller firmware can live side-by-side in one file.'
);
md.push('');
md.push('Both sdev `:: ... ;;` delimiters and brace `{ ... }` delimiters are supported:');
md.push('');
md.push('```sdev');
md.push('board "uno" ::');
md.push('  conjure setup() ::');
md.push('    pin led be output');
md.push('    speak("Arduino Uno ready!")');
md.push('  ;;');
md.push('');
md.push('  conjure loop() ::');
md.push('    pin led toggle');
md.push('    wait 500');
md.push('  ;;');
md.push(';;');
md.push('```');
md.push('');
md.push('Or with `{ ... }`:');
md.push('');
md.push('```sdev');
md.push('board "uno" {');
md.push('  conjure setup() {');
md.push('    pin 13 be output');
md.push('    serial begin 9600');
md.push('  }');
md.push('  conjure loop() {');
md.push('    pin 13 write high');
md.push('    wait 500');
md.push('    pin 13 write low');
md.push('    wait 500');
md.push('  }');
md.push('}');
md.push('```');
md.push('');
md.push('---');
md.push('');

// Section 2: Supported Boards
md.push(`## 2. Supported Boards (${BOARDS.length})`);
md.push('');
md.push('| ID (`board "<id>"`) | Board | FQBN | MCU | Flash / RAM | Uploader | Browser Flash | Zero-Install Cloud Build |');
md.push('|---|---|---|---|---|---|---|---|');
for (const b of BOARDS) {
  const flashRam = `${b.flashKb} KB / ${b.ramKb} KB`;
  const browserFlash = canFlashInBrowser(b) ? `Yes (\`${b.uploader}\`)` : `No (\`${b.uploader}\`)`;
  const cloud = canCompileInCloud(b) ? `Yes (\`${b.wokwiBoard}\`)` : 'Local CLI';
  md.push(`| \`${b.id}\` | ${b.label} | \`${b.fqbn}\` | ${b.mcu} | ${flashRam} | \`${b.uploader}\` | ${browserFlash} | ${cloud} |`);
}
md.push('');
md.push('### Special Board Notes');
md.push('- **Arduino Uno R4 Minima (`uno-r4-minima`)**: Uses the Renesas RA4M1 (48 MHz Cortex-M4F) and flashes directly from the browser over **WebUSB DFU 1.1** (`0x2341:0x0369`).');
md.push('- **Arduino Uno R4 WiFi (`uno-r4-wifi`)**: Uses the Renesas RA4M1 + ESP32-S3 co-processor and flashes over **SAM-BA / BOSSA** (`flashSamba`) after a 1200-baud touch reset.');
md.push('- **Arduino Uno Q (`uno-q`)**: Hybrid Qualcomm Dragonwing QRB2210 Linux SBC + STM32U585 real-time MCU running Zephyr (`arduino:zephyr:unoq`). Sketches are deployed via **Arduino App Lab** or `arduino-cli` over ADB/network rather than browser Web Serial; use **Export .ino** in the Hardware panel.');
md.push('- **Raspberry Pi Pico / Pico W / Nano RP2040 Connect (`pico`, `pico-w`, `nano-rp2040`)**: Compiles to an RP2040 **UF2** image (`0x0A324655` / `0x9E5D5157` / family `0xE48BFF56`) and writes directly to the mounted `RPI-RP2` drive via the File System Access API (or downloads `.uf2`).');
md.push('');
md.push('---');
md.push('');

// Section 3: SDEV Hardware DSL
md.push('## 3. SDEV Hardware DSL Cheat Sheet');
md.push('');
md.push('| SDEV Statement / Expression | Generated Arduino C++ |');
md.push('|---|---|');
md.push('| `use "Servo"` | `#include <Servo.h>` |');
md.push('| `use "Ethernet"` | `#include <SPI.h>` + `#include <Ethernet.h>` |');
md.push('| `device arm be Servo` | `Servo arm;` |');
md.push('| `device lcd be LiquidCrystal_I2C(0x27, 16, 2)` | `LiquidCrystal_I2C lcd(0x27, 16, 2);` |');
md.push('| `conjure setup() :: ... ;;` / `to setup` | `void setup() { ... }` (auto-inserts `Serial.begin(9600);` when `speak`/`say` is used) |');
md.push('| `conjure loop() :: ... ;;` / `to loop` | `void loop() { ... }` |');
md.push('| `conjure blink(pin: int, ms: long) :: ... ;;` | `auto blink(int pin, long ms) { ... }` |');
md.push('| `forge x: float be 3.14` | `float x = 3.14;` |');
md.push('| `forge notes be [262, 294, 330]` | `auto notes[] = {262, 294, 330};` |');
md.push('| `fixed forge LED: int be 13` | `const int LED = 13;` |');
md.push('| `keep forge counter: long be 0` | `static long counter = 0;` |');
md.push('| `volatile forge ticks: long be 0` | `volatile long ticks = 0;` |');
md.push('| `pin 13 be output` / `input` / `input_pullup` / `input_pulldown` | `pinMode(13, OUTPUT / INPUT / INPUT_PULLUP / INPUT_PULLDOWN);` |');
md.push('| `pin led on` / `pin led off` | `digitalWrite(LED_BUILTIN, HIGH / LOW);` |');
md.push('| `pin 13 toggle` | `digitalWrite(13, !digitalRead(13));` |');
md.push('| `pin 13 write high` / `pin 13 write low` | `digitalWrite(13, HIGH / LOW);` |');
md.push('| `pin 9 analog 128` / `pin 9 pwm 128` / `analog 9 write 128` | `analogWrite(9, 128);` |');
md.push('| `analog reference internal` | `analogReference(INTERNAL);` |');
md.push('| `pin 2 read` / `read pin 2` | `digitalRead(2)` |');
md.push('| `analog 0 read` / `read analog A0` | `analogRead(A0)` |');
md.push('| `wait 500` | `delay(500);` |');
md.push('| `wait 2 seconds` | `delay((2) * 1000);` |');
md.push('| `wait 50 us` / `wait_us 50` | `delayMicroseconds(50);` |');
md.push('| `now()` / `nowus()` | `millis()` / `micros()` |');
md.push('| `serial begin 115200` | `Serial.begin(115200);` |');
md.push('| `speak("Value:", x)` | `Serial.print("Value:"); Serial.print(" "); Serial.println(x);` |');
md.push('| `say "hello"` | `Serial.println("hello");` |');
md.push('| `serial read` / `serial avail` | `Serial.read()` / `Serial.available()` |');
md.push('| `tone 8 440 200` / `notone 8` | `tone(8, 440, 200);` / `noTone(8);` |');
md.push('| `pulsein 7 high` | `pulseIn(7, HIGH)` |');
md.push('| `shiftout 11 12 msbfirst 0xAA` | `shiftOut(11, 12, MSBFIRST, 0xAA);` |');
md.push('| `attach 2 rising onPress` / `detach 2` | `attachInterrupt(digitalPinToInterrupt(2), onPress, RISING);` / `detachInterrupt(...)` |');
md.push('| `ponder x equals 0 :: ... otherwise :: ... ;;` | `if (x == 0) { ... } else { ... }` |');
md.push('| `within i be sequence(8) :: ... ;;` | `for (long i = 0; i < 8; i++) { ... }` |');
md.push('| `within i be sequence(1, 127) :: ... ;;` | `for (long i = 1; i < 127; i++) { ... }` |');
md.push('| `within a be sequence(0, 181, 5) :: ... ;;` | `for (long a = 0; (5) >= 0 ? a < 181 : a > 181; a += (5)) { ... }` |');
md.push('| `cycle x < 10 :: ... ;;` | `while (x < 10) { ... }` |');
md.push('| `yeet` / `skip` / `yield val` | `break;` / `continue;` / `return val;` |');
md.push('| `randint(1, 6)` | `random(1, (6) + 1)` |');
md.push('| `equals` / `differs` / `also` / `either` / `isnt` / `yep` / `nope` | `==` / `!=` / `&&` / `||` / `!` / `true` / `false` |');
md.push('| `cpp { ... }` | Raw C/C++ copied verbatim without line translation |');
md.push('');
md.push('---');
md.push('');

// Section 4: Complete Arduino Core Reference
md.push(`## 4. Arduino Core Functions (${ARDUINO_FUNCTIONS.length})`);
md.push('');
const categories = [...new Set(ARDUINO_FUNCTIONS.map((f) => f.category))];
for (const cat of categories) {
  md.push(`### ${cat}`);
  md.push('');
  md.push('| Function | Signature | Returns | SDEV Form | Description |');
  md.push('|---|---|---|---|---|');
  for (const fn of ARDUINO_FUNCTIONS.filter((f) => f.category === cat)) {
    const sdevForm = fn.sdev ? `\`${fn.sdev}\`` : `\`${fn.signature}\``;
    const notes = fn.boards ? ` *(Boards: ${fn.boards})*` : '';
    md.push(`| \`${fn.name}\` | \`${fn.signature}\` | \`${fn.returns}\` | ${sdevForm} | ${fn.summary}${notes} |`);
  }
  md.push('');
}

md.push('### Constants');
md.push('');
md.push('| Constant | SDEV Alias | Description |');
md.push('|---|---|---|');
for (const c of ARDUINO_CONSTANTS) {
  md.push(`| \`${c.name}\` | ${c.sdev ? `\`${c.sdev}\`` : '—'} | ${c.summary} |`);
}
md.push('');

md.push('### Types & Qualifiers');
md.push('');
md.push('| C++ Type | SDEV Type | Summary |');
md.push('|---|---|---|');
for (const t of ARDUINO_TYPES) {
  md.push(`| \`${t.name}\` | ${t.sdev ? `\`${t.sdev}\`` : '—'} | ${t.summary} |`);
}
md.push('');

md.push('### `Serial` / `Stream` Methods');
md.push('');
md.push('| Method | Description |');
md.push('|---|---|');
for (const sm of SERIAL_METHODS) {
  md.push(`| \`Serial.${sm.signature}\` | ${sm.summary} |`);
}
md.push('');

md.push('### `String` Methods');
md.push('');
md.push('| Method | Description |');
md.push('|---|---|');
for (const stm of STRING_METHODS) {
  md.push(`| \`str.${stm.signature}\` | ${stm.summary} |`);
}
md.push('');
md.push('---');
md.push('');

// Section 5: Curated Libraries
md.push(`## 5. Curated Libraries (${ARDUINO_LIBRARIES.length})`);
md.push('');
md.push(
  'Every curated library below has pre-mapped headers (including multi-header libraries like `Ethernet`, `Adafruit SSD1306`, `DallasTemperature`, `MFRC522`, `ArduinoModbus`, and `ArduinoIoTCloud`) so `use "<Name>"` emits the exact `#include` directives needed.'
);
md.push('');

for (const l of ARDUINO_LIBRARIES) {
  md.push(`### ${l.name} (\`use "${l.name}"\`)`);
  md.push('');
  md.push(`- **Category**: ${l.category}`);
  md.push(`- **Headers**: ${l.headers.map((h) => `\`#include <${h}>\``).join(', ')}`);
  md.push(`- **Delivery**: ${l.bundled ? 'Bundled with board core' : 'Arduino Library Manager'}`);
  if (l.boards) md.push(`- **Supported Boards**: ${l.boards}`);
  md.push(`- **Summary**: ${l.summary}`);
  md.push('');
  for (const cls of l.classes) {
    md.push(`**Class \`${cls.name}\`**${cls.create ? ` — \`${cls.create}\`` : ''}`);
    md.push('');
    if (cls.methods.length > 0) {
      md.push('| Method | Summary |');
      md.push('|---|---|');
      for (const m of cls.methods) {
        md.push(`| \`${m.signature}\` | ${m.summary} |`);
      }
      md.push('');
    }
  }
  if (l.example) {
    md.push('**SDEV Sketch:**');
    md.push('```sdev');
    md.push(`board "uno" ::`);
    for (const ln of l.example.split('\n')) {
      md.push(`  ${ln}`);
    }
    md.push(';;');
    md.push('```');
    const block = extractBoardBlock(`board "uno" ::\n${l.example}\n;;`);
    if (block) {
      const res = transpileBoard(block, uno);
      md.push('**Transpiled Arduino C++ (`.ino`):**');
      md.push('```cpp');
      md.push(res.ino.trimEnd());
      md.push('```');
    }
    md.push('');
  }
}

md.push('---');
md.push('');

// Section 6: Full Library Manager Index
md.push(`## 6. Arduino Library Manager Index (${libIndex.count.toLocaleString()} Libraries)`);
md.push('');
md.push(
  `The IDE bundles the complete Arduino Library Manager catalogue at \`/arduino/library-index.json\` (**${libIndex.count.toLocaleString()} libraries**). Any library in the index can be searched offline in **Hardware → Library Manager** and included with \`use "<LibraryName>"\` or \`use "<HeaderName.h>"\`.`
);
md.push('');

// Count by category
const byCategory = new Map<string, number>();
for (const row of libIndex.libraries) {
  const cat = row[4] || 'Uncategorized';
  byCategory.set(cat, (byCategory.get(cat) ?? 0) + 1);
}
md.push('| Category | Indexed Libraries |');
md.push('|---|---|');
for (const [cat, count] of [...byCategory.entries()].sort((a, b) => b[1] - a[1])) {
  md.push(`| ${cat} | ${count.toLocaleString()} |`);
}
md.push('');
md.push('---');
md.push('');

// Section 7: Upload Protocols
md.push('## 7. Browser Upload Protocols & Architecture');
md.push('');
md.push('`src/lang/hardware/web-serial.ts` implements 7 distinct browser flashing protocols dispatched by `flashBoard(board, port, firmware, onProgress)`:');
md.push('');
md.push('1. **`stk500v1` (`flashAvr`)**: Optiboot / AVR061 protocol (`GET_SYNC=0x30`, `ENTER_PROGMODE=0x50`, `LOAD_ADDRESS=0x55`, `PROG_PAGE=0x64`, `LEAVE_PROGMODE=0x51`, `CRC_EOP=0x20` -> `IN_SYNC=0x14, OK=0x10`). Used by Arduino Uno R3, Nano (ATmega328P @ 115200 & ATmega168 @ 57600), and ATtiny85.');
md.push('2. **`stk500v2` (`flashStk500v2`)**: AVR068 framed protocol (`MESSAGE_START=0x1B`, sequence number, 16-bit length, `TOKEN=0x0E`, XOR checksum, `CMD_SIGN_ON=0x01`, `CMD_ENTER_PROGMODE_ISP=0x10`, `CMD_LOAD_ADDRESS=0x06`, `CMD_PROGRAM_FLASH_ISP=0x13`, `CMD_LEAVE_PROGMODE_ISP=0x11`). Used by Arduino Mega 2560.');
md.push('3. **`avr109` (`flashAvr109`)**: Caterina bootloader protocol with 1200-baud touch reset (`\'S\'` software ID, `\'P\'` enter prog mode, `\'A\'` word address, `\'B\'` block load, `\'L\'` leave, `\'E\'` exit). Used by Arduino Leonardo and Arduino Micro (ATmega32U4).');
md.push('4. **`samba` (`flashSamba`)**: Atmel/Microchip SAM-BA & BOSSA monitor over Web Serial (`N#` binary mode, `V#` version, `X<addr>#` erase, `S<sram>,<len>#` + `Y<sram>,0#` + `Y<flash>,<len>#` applet page write, `K#` reset). Used by Arduino Uno R4 WiFi, Zero, Due, MKR family, Nano 33 IoT/BLE, and Nano Every.');
md.push('5. **`dfu` (`flashDfuWebUsb`)**: USB DFU 1.1 & DfuSe over **WebUSB** (`DFU_DNLOAD=1`, `DFU_GETSTATUS=3`, `DFU_CLRSTATUS=4`, DfuSe Set Address Pointer `0x21` to `flashBase`, 1024-byte blocks starting at `wValue=2`, zero-length manifest). Used by Arduino Uno R4 Minima, Giga R1 WiFi, and Portenta H7.');
md.push('6. **`esptool` (`flashEsp`)**: Espressif ROM bootloader SLIP framing (`0xC0` frame end, `0xDB 0xDC` / `0xDB 0xDD` escapes, `SYNC=0x08`, `FLASH_BEGIN=0x02`, `FLASH_DATA=0x03`, `FLASH_END=0x04`) with DTR/RTS auto-reset. Used by ESP32, ESP32-C3, ESP32-S2, ESP32-S3, Nano ESP32, and ESP8266.');
md.push('7. **`uf2` (`buildUf2FromHexOrBin` + `flashUf2`)**: Generates 512-byte RP2040 UF2 blocks (`magicStart0=0x0A324655`, `magicStart1=0x9E5D5157`, `familyId=0xE48BFF56`, `magicEnd=0x0AB16F30`, 256-byte payloads at `0x10000000`) and writes directly to the `RPI-RP2` USB volume via `showDirectoryPicker` or downloads `.uf2`. Used by Raspberry Pi Pico, Pico W, and Arduino Nano RP2040 Connect.');
md.push('');

writeFileSync(outDocPath, md.join('\n'), 'utf8');
console.log(`Generated ${outDocPath} (${md.length} lines)`);
