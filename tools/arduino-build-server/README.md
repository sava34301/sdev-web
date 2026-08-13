# sdev Arduino build server

The Hardware panel needs a compiler to turn the generated `.ino` into a
flashable `.hex`. Browsers can't run `arduino-cli`, so run this tiny bridge
on your own machine — the IDE talks to it over `http://localhost:8765`.

## 1. Install arduino-cli

- macOS: `brew install arduino-cli`
- Linux: `curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh`
- Windows: `winget install ArduinoSA.CLI`

Then once: `arduino-cli config init && arduino-cli core update-index`

## 2. Start the server

```bash
node tools/arduino-build-server/server.mjs
# or: PORT=9000 ARDUINO_CLI=/opt/arduino-cli/arduino-cli node tools/arduino-build-server/server.mjs
```

Health check: `curl http://localhost:8765` → `{"ok":true,"arduinoCli":"..."}`

## 3. Use it

In the IDE, open **Hardware → Build server**, keep `http://localhost:8765`
(the default) and press **Test**. Compile + Upload now work end to end.
Cores and libraries are installed automatically on first build.

## Hosted alternative

If you'd rather build in the cloud, deploy this same server anywhere that has
`arduino-cli` (a small VM or container) and either:

- paste its URL into the Hardware panel's **Build server** field, or
- set the backend secret `ARDUINO_BUILD_URL` (plus optional `ARDUINO_BUILD_KEY`)
  so the `compile-firmware` function forwards builds to it for everyone.

The request/response contract is identical in both cases:

```
POST /  { fqbn, ino, libraries[] }
   ->   { ok: true, hex, format: "ihex" | "base64-bin" }
   ->   { ok: false, error, log }
```
