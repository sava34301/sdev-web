// ============================================================
// sdev hardware — board catalogue
// ============================================================
// FQBN (Fully Qualified Board Name) matches arduino-cli conventions.

export type BoardUploader =
  | 'stk500v1'
  | 'stk500v2'
  | 'avr109'
  | 'samba'
  | 'dfu'
  | 'esptool'
  | 'uf2'
  | 'app-lab'
  | 'arduino-cli'
  | 'avrdude-stk500'; // legacy alias for stk500v1

export interface BoardDescriptor {
  id: string;            // sdev short id ("uno", "nano", "esp32", ...)
  label: string;         // human-readable
  fqbn: string;          // arduino-cli FQBN
  vendor: string;
  mcu: string;
  flashKb: number;
  ramKb: number;
  uploader: BoardUploader;
  baudRate?: number;     // default bootloader baud rate
  pageSize?: number;     // flash page size in bytes
  flashBase?: number;    // application flash start address
  wokwiBoard?: string;   // Wokwi Hexi cloud compiler board id (only when verified supported)
  notes?: string;        // special workflow notes (e.g. Uno Q App Lab)
  // USB ids reported by the bootloader / built-in USB-serial bridge.
  usb: { vid: number; pid: number; note?: string }[];
}

export const BOARDS: BoardDescriptor[] = [
  {
    id: 'uno',
    label: 'Arduino Uno (R3)',
    fqbn: 'arduino:avr:uno',
    vendor: 'Arduino',
    mcu: 'ATmega328P',
    flashKb: 32,
    ramKb: 2,
    uploader: 'stk500v1',
    baudRate: 115200,
    pageSize: 128,
    wokwiBoard: 'uno',
    usb: [
      { vid: 0x2341, pid: 0x0043 },
      { vid: 0x2341, pid: 0x0001 },
      { vid: 0x2A03, pid: 0x0043 },
      { vid: 0x1A86, pid: 0x7523, note: 'CH340 clone' },
      { vid: 0x10C4, pid: 0xEA60, note: 'CP210x clone' },
    ],
  },
  {
    id: 'uno-r4-minima',
    label: 'Arduino Uno R4 Minima',
    fqbn: 'arduino:renesas_uno:minima',
    vendor: 'Arduino',
    mcu: 'RA4M1',
    flashKb: 256,
    ramKb: 32,
    uploader: 'dfu',
    flashBase: 0x00004000,
    usb: [
      { vid: 0x2341, pid: 0x0069, note: 'Uno R4 Minima CDC' },
      { vid: 0x2341, pid: 0x0369, note: 'Uno R4 Minima DFU bootloader' },
    ],
  },
  {
    id: 'uno-r4-wifi',
    label: 'Arduino Uno R4 WiFi',
    fqbn: 'arduino:renesas_uno:unor4wifi',
    vendor: 'Arduino',
    mcu: 'RA4M1 + ESP32-S3',
    flashKb: 256,
    ramKb: 32,
    uploader: 'samba',
    flashBase: 0x00004000,
    usb: [
      { vid: 0x2341, pid: 0x1002, note: 'Uno R4 WiFi CDC' },
      { vid: 0x2341, pid: 0x006D, note: 'Uno R4 WiFi BOSSA bootloader' },
    ],
  },
  {
    id: 'uno-q',
    label: 'Arduino Uno Q',
    fqbn: 'arduino:zephyr:unoq',
    vendor: 'Arduino',
    mcu: 'Qualcomm Dragonwing QRB2210 + STM32U585',
    flashKb: 2048,
    ramKb: 786,
    uploader: 'app-lab',
    notes: 'Hybrid Linux SBC + STM32U585 MCU running Zephyr. Programmed via Arduino App Lab or arduino-cli over ADB/network; cannot be flashed over browser Web Serial.',
    usb: [
      { vid: 0x2341, pid: 0x0078, note: 'Uno Q USB bridge' },
    ],
  },
  {
    id: 'nano',
    label: 'Arduino Nano (ATmega328P)',
    fqbn: 'arduino:avr:nano:cpu=atmega328',
    vendor: 'Arduino',
    mcu: 'ATmega328P',
    flashKb: 32,
    ramKb: 2,
    uploader: 'stk500v1',
    baudRate: 115200,
    pageSize: 128,
    wokwiBoard: 'nano',
    usb: [
      { vid: 0x0403, pid: 0x6001, note: 'FTDI' },
      { vid: 0x1A86, pid: 0x7523, note: 'CH340' },
    ],
  },
  {
    id: 'nano-old',
    label: 'Arduino Nano (ATmega168 / Old Bootloader)',
    fqbn: 'arduino:avr:nano:cpu=atmega168',
    vendor: 'Arduino',
    mcu: 'ATmega168',
    flashKb: 16,
    ramKb: 1,
    uploader: 'stk500v1',
    baudRate: 57600,
    pageSize: 128,
    usb: [{ vid: 0x1A86, pid: 0x7523 }],
  },
  {
    id: 'nano-every',
    label: 'Arduino Nano Every',
    fqbn: 'arduino:megaavr:nona4809',
    vendor: 'Arduino',
    mcu: 'ATmega4809',
    flashKb: 48,
    ramKb: 6,
    uploader: 'samba',
    usb: [{ vid: 0x2341, pid: 0x0058 }],
  },
  {
    id: 'nano-33-iot',
    label: 'Arduino Nano 33 IoT',
    fqbn: 'arduino:samd:nano_33_iot',
    vendor: 'Arduino',
    mcu: 'SAMD21G18A',
    flashKb: 256,
    ramKb: 32,
    uploader: 'samba',
    flashBase: 0x00002000,
    usb: [
      { vid: 0x2341, pid: 0x8057 },
      { vid: 0x2341, pid: 0x0057, note: 'bootloader' },
    ],
  },
  {
    id: 'nano-33-ble',
    label: 'Arduino Nano 33 BLE / Sense',
    fqbn: 'arduino:mbed_nano:nano33ble',
    vendor: 'Arduino',
    mcu: 'nRF52840',
    flashKb: 1024,
    ramKb: 256,
    uploader: 'samba',
    flashBase: 0x00010000,
    usb: [
      { vid: 0x2341, pid: 0x805A },
      { vid: 0x2341, pid: 0x005A, note: 'bootloader' },
    ],
  },
  {
    id: 'nano-rp2040',
    label: 'Arduino Nano RP2040 Connect',
    fqbn: 'arduino:mbed_nano:nanorp2040connect',
    vendor: 'Arduino',
    mcu: 'RP2040',
    flashKb: 16384,
    ramKb: 264,
    uploader: 'uf2',
    wokwiBoard: 'nano-rp2040-connect',
    usb: [
      { vid: 0x2341, pid: 0x005E },
      { vid: 0x2E8A, pid: 0x0003, note: 'RP2040 UF2 bootloader' },
    ],
  },
  {
    id: 'nano-esp32',
    label: 'Arduino Nano ESP32',
    fqbn: 'arduino:esp32:nano_nora',
    vendor: 'Arduino',
    mcu: 'ESP32-S3',
    flashKb: 16384,
    ramKb: 512,
    uploader: 'esptool',
    usb: [
      { vid: 0x2341, pid: 0x0070 },
      { vid: 0x303A, pid: 0x1001, note: 'ESP32-S3 USB JTAG/serial' },
    ],
  },
  {
    id: 'mega',
    label: 'Arduino Mega 2560',
    fqbn: 'arduino:avr:mega:cpu=atmega2560',
    vendor: 'Arduino',
    mcu: 'ATmega2560',
    flashKb: 256,
    ramKb: 8,
    uploader: 'stk500v2',
    baudRate: 115200,
    pageSize: 256,
    wokwiBoard: 'mega',
    usb: [
      { vid: 0x2341, pid: 0x0042 },
      { vid: 0x2341, pid: 0x0010 },
      { vid: 0x2A03, pid: 0x0042 },
    ],
  },
  {
    id: 'leonardo',
    label: 'Arduino Leonardo',
    fqbn: 'arduino:avr:leonardo',
    vendor: 'Arduino',
    mcu: 'ATmega32U4',
    flashKb: 32,
    ramKb: 2.5,
    uploader: 'avr109',
    baudRate: 57600,
    pageSize: 128,
    usb: [
      { vid: 0x2341, pid: 0x8036 },
      { vid: 0x2341, pid: 0x0036, note: 'Caterina bootloader' },
    ],
  },
  {
    id: 'micro',
    label: 'Arduino Micro',
    fqbn: 'arduino:avr:micro',
    vendor: 'Arduino',
    mcu: 'ATmega32U4',
    flashKb: 32,
    ramKb: 2.5,
    uploader: 'avr109',
    baudRate: 57600,
    pageSize: 128,
    usb: [
      { vid: 0x2341, pid: 0x8037 },
      { vid: 0x2341, pid: 0x0037, note: 'Caterina bootloader' },
    ],
  },
  {
    id: 'mkr-wifi-1010',
    label: 'Arduino MKR WiFi 1010',
    fqbn: 'arduino:samd:mkrwifi1010',
    vendor: 'Arduino',
    mcu: 'SAMD21G18A',
    flashKb: 256,
    ramKb: 32,
    uploader: 'samba',
    flashBase: 0x00002000,
    usb: [
      { vid: 0x2341, pid: 0x8054 },
      { vid: 0x2341, pid: 0x0054, note: 'bootloader' },
    ],
  },
  {
    id: 'mkr-zero',
    label: 'Arduino MKR Zero',
    fqbn: 'arduino:samd:mkrzero',
    vendor: 'Arduino',
    mcu: 'SAMD21G18A',
    flashKb: 256,
    ramKb: 32,
    uploader: 'samba',
    flashBase: 0x00002000,
    usb: [
      { vid: 0x2341, pid: 0x804F },
      { vid: 0x2341, pid: 0x004F, note: 'bootloader' },
    ],
  },
  {
    id: 'mkr-wan-1310',
    label: 'Arduino MKR WAN 1310',
    fqbn: 'arduino:samd:mkrwan1310',
    vendor: 'Arduino',
    mcu: 'SAMD21G18A',
    flashKb: 256,
    ramKb: 32,
    uploader: 'samba',
    flashBase: 0x00002000,
    usb: [
      { vid: 0x2341, pid: 0x8059 },
      { vid: 0x2341, pid: 0x0059, note: 'bootloader' },
    ],
  },
  {
    id: 'zero',
    label: 'Arduino Zero',
    fqbn: 'arduino:samd:arduino_zero_native',
    vendor: 'Arduino',
    mcu: 'SAMD21G18A',
    flashKb: 256,
    ramKb: 32,
    uploader: 'samba',
    flashBase: 0x00002000,
    usb: [
      { vid: 0x2341, pid: 0x804D },
      { vid: 0x2341, pid: 0x004D, note: 'bootloader' },
    ],
  },
  {
    id: 'due',
    label: 'Arduino Due',
    fqbn: 'arduino:sam:arduino_due_x',
    vendor: 'Arduino',
    mcu: 'AT91SAM3X8E',
    flashKb: 512,
    ramKb: 96,
    uploader: 'samba',
    flashBase: 0x00080000,
    usb: [
      { vid: 0x2341, pid: 0x003D, note: 'Programming port' },
      { vid: 0x2341, pid: 0x003E, note: 'Native USB port' },
    ],
  },
  {
    id: 'giga',
    label: 'Arduino Giga R1 WiFi',
    fqbn: 'arduino:mbed_giga:giga',
    vendor: 'Arduino',
    mcu: 'STM32H747XI',
    flashKb: 2048,
    ramKb: 1024,
    uploader: 'dfu',
    flashBase: 0x08040000,
    usb: [
      { vid: 0x2341, pid: 0x0266 },
      { vid: 0x2341, pid: 0x0366, note: 'DFU bootloader' },
    ],
  },
  {
    id: 'portenta-h7',
    label: 'Arduino Portenta H7',
    fqbn: 'arduino:mbed_portenta:envie_m7',
    vendor: 'Arduino',
    mcu: 'STM32H747XI',
    flashKb: 2048,
    ramKb: 1024,
    uploader: 'dfu',
    flashBase: 0x08040000,
    usb: [
      { vid: 0x2341, pid: 0x025B },
      { vid: 0x2341, pid: 0x035B, note: 'DFU bootloader' },
    ],
  },
  {
    id: 'esp32',
    label: 'ESP32 DevKit (generic)',
    fqbn: 'esp32:esp32:esp32',
    vendor: 'Espressif',
    mcu: 'ESP32',
    flashKb: 4096,
    ramKb: 520,
    uploader: 'esptool',
    baudRate: 115200,
    wokwiBoard: 'esp32',
    usb: [
      { vid: 0x10C4, pid: 0xEA60, note: 'CP2102' },
      { vid: 0x1A86, pid: 0x7523, note: 'CH340' },
      { vid: 0x1A86, pid: 0x55D4, note: 'CH9102' },
    ],
  },
  {
    id: 'esp32-c3',
    label: 'ESP32-C3 DevKit',
    fqbn: 'esp32:esp32:esp32c3',
    vendor: 'Espressif',
    mcu: 'ESP32-C3',
    flashKb: 4096,
    ramKb: 400,
    uploader: 'esptool',
    baudRate: 115200,
    wokwiBoard: 'esp32-c3-devkitm-1',
    usb: [
      { vid: 0x303A, pid: 0x1001, note: 'Native USB JTAG/serial' },
      { vid: 0x10C4, pid: 0xEA60, note: 'CP2102' },
    ],
  },
  {
    id: 'esp32-s2',
    label: 'ESP32-S2 DevKit',
    fqbn: 'esp32:esp32:esp32s2',
    vendor: 'Espressif',
    mcu: 'ESP32-S2',
    flashKb: 4096,
    ramKb: 320,
    uploader: 'esptool',
    baudRate: 115200,
    wokwiBoard: 'esp32-s2-devkitm-1',
    usb: [
      { vid: 0x303A, pid: 0x0002, note: 'ESP32-S2 Native USB' },
      { vid: 0x10C4, pid: 0xEA60, note: 'CP2102' },
    ],
  },
  {
    id: 'esp32-s3',
    label: 'ESP32-S3 DevKit',
    fqbn: 'esp32:esp32:esp32s3',
    vendor: 'Espressif',
    mcu: 'ESP32-S3',
    flashKb: 8192,
    ramKb: 512,
    uploader: 'esptool',
    baudRate: 115200,
    usb: [{ vid: 0x303A, pid: 0x1001 }],
  },
  {
    id: 'esp8266',
    label: 'ESP8266 NodeMCU',
    fqbn: 'esp8266:esp8266:nodemcuv2',
    vendor: 'Espressif',
    mcu: 'ESP8266',
    flashKb: 4096,
    ramKb: 80,
    uploader: 'esptool',
    baudRate: 115200,
    wokwiBoard: 'esp8266',
    usb: [
      { vid: 0x1A86, pid: 0x7523, note: 'CH340' },
      { vid: 0x10C4, pid: 0xEA60, note: 'CP2102' },
    ],
  },
  {
    id: 'pico',
    label: 'Raspberry Pi Pico (RP2040)',
    fqbn: 'rp2040:rp2040:rpipico',
    vendor: 'Raspberry Pi',
    mcu: 'RP2040',
    flashKb: 2048,
    ramKb: 264,
    uploader: 'uf2',
    wokwiBoard: 'pi-pico',
    usb: [
      { vid: 0x2E8A, pid: 0x0003, note: 'RPI-RP2 bootloader' },
      { vid: 0x2E8A, pid: 0x000A },
    ],
  },
  {
    id: 'pico-w',
    label: 'Raspberry Pi Pico W (RP2040)',
    fqbn: 'rp2040:rp2040:rpipicow',
    vendor: 'Raspberry Pi',
    mcu: 'RP2040',
    flashKb: 2048,
    ramKb: 264,
    uploader: 'uf2',
    usb: [
      { vid: 0x2E8A, pid: 0x0003, note: 'RPI-RP2 bootloader' },
      { vid: 0x2E8A, pid: 0x000A },
      { vid: 0x2E8A, pid: 0xF00A, note: 'Pico W CDC' },
    ],
  },
  {
    id: 'attiny85',
    label: 'ATtiny85',
    fqbn: 'attiny:avr:ATtinyX5:cpu=attiny85',
    vendor: 'Microchip / Atmel',
    mcu: 'ATtiny85',
    flashKb: 8,
    ramKb: 0.5,
    uploader: 'stk500v1',
    baudRate: 19200,
    pageSize: 64,
    wokwiBoard: 'attiny85',
    usb: [{ vid: 0x1781, pid: 0x0C9F, note: 'USBtiny / Micronucleus / Arduino as ISP' }],
  },
  {
    id: 'teensy41',
    label: 'Teensy 4.1',
    fqbn: 'teensy:avr:teensy41',
    vendor: 'PJRC',
    mcu: 'iMXRT1062',
    flashKb: 8192,
    ramKb: 1024,
    uploader: 'arduino-cli',
    notes: 'Uses PJRC HalfKay HID bootloader; flash via Teensy Loader or local arduino-cli.',
    usb: [{ vid: 0x16C0, pid: 0x0478 }, { vid: 0x16C0, pid: 0x0483 }],
  },
];

export function findBoardById(id: string): BoardDescriptor | undefined {
  return BOARDS.find(b => b.id === id);
}

export function detectBoardByUsb(vid: number, pid: number): BoardDescriptor | undefined {
  // Exact vid+pid first, then vid-only fallback for shared USB-serial bridges.
  const exact = BOARDS.find(b => b.usb.some(u => u.vid === vid && u.pid === pid));
  if (exact) return exact;
  return BOARDS.find(b => b.usb.some(u => u.vid === vid));
}

export function canFlashInBrowser(board: BoardDescriptor): boolean {
  return board.uploader !== 'app-lab' && board.uploader !== 'arduino-cli';
}

export function canCompileInCloud(board: BoardDescriptor): boolean {
  return Boolean(board.wokwiBoard);
}
