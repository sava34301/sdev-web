# `src/lang/hardware/`

Microcontroller & Arduino toolchain: 30-board database (`board-db.ts`), Arduino core & library catalogue (`arduino-api.ts`), `board` block stripper (`strip.ts`), natural-language hardware reader (`understand.ts`), sdev-to-Arduino `.ino` C++ transpiler (`transpile.ts`), zero-install cloud/local firmware compiler (`cloud-compile.ts`), 7-protocol Web Serial / WebUSB / UF2 flasher (`web-serial.ts`), and virtual breadboard simulator (`simulator.ts`).

<!-- FOLDER_INVENTORY_START -->
## Folder Contents

### Files

| File | Purpose |
| :--- | :--- |
| `arduino-api.ts` | Arduino command catalogue — the single source of truth for. |
| `board-db.ts` | sdev hardware — board catalogue. |
| `cloud-compile.ts` | Zero-install cloud & local firmware compiler. |
| `README.md` | Folder documentation and complete inventory of files and subfolders in this directory. |
| `simulator.ts` | In-Browser Hardware Simulator (Virtual Breadboard & MCU Engine). |
| `strip.ts` | Strip every `board "<id>" { ... }` or `board "<id>" :: ... ;;` block from. |
| `transpile.ts` | sdev → Arduino C/C++ (.ino) transpiler. |
| `understand.ts` | Understanding hardware code — the code understander's reader for. |
| `web-serial.ts` | Web Serial / WebUSB / UF2 — typed helpers + 7 board uploaders. |

<!-- FOLDER_INVENTORY_END -->
