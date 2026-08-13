#!/usr/bin/env node
// ------------------------------------------------------------------
// sdev Arduino build server
// ------------------------------------------------------------------
// A tiny, dependency-free HTTP bridge around `arduino-cli` so the sdev
// IDE's Hardware panel can compile firmware.
//
//   node tools/arduino-build-server/server.mjs            # port 8765
//   PORT=9000 ARDUINO_CLI=/usr/bin/arduino-cli node ... 
//
// Protocol (matches supabase/functions/compile-firmware):
//   POST /              { fqbn, ino, libraries[] }
//     -> 200 { ok: true, hex, format: "ihex" | "base64-bin" }
//     -> 200 { ok: false, error, log }
//   GET  /health        -> { ok: true, arduinoCli: "<version>" }
//
// CORS is wide open on purpose: this runs on localhost and is only ever
// reached from the browser IDE on your own machine.
import http from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8765);
const CLI = process.env.ARDUINO_CLI || 'arduino-cli';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(payload);
}

function cliVersion() {
  try {
    return execFileSync(CLI, ['version'], { encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { maxBuffer: 32 * 1024 * 1024, ...opts }, (err, stdout, stderr) => {
      resolve({ code: err ? (err.code ?? 1) : 0, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

/** Make sure the core for a given fqbn (e.g. arduino:avr:uno) is installed. */
async function ensureCore(fqbn, log) {
  const core = fqbn.split(':').slice(0, 2).join(':');
  const r = await run(CLI, ['core', 'install', core]);
  log.push(`$ arduino-cli core install ${core}\n${r.stdout}${r.stderr}`);
}

async function ensureLibraries(libraries, log) {
  for (const lib of libraries) {
    const r = await run(CLI, ['lib', 'install', lib]);
    log.push(`$ arduino-cli lib install ${lib}\n${r.stdout}${r.stderr}`);
  }
}

async function compile({ fqbn, ino, libraries = [] }) {
  const log = [];
  const root = mkdtempSync(path.join(tmpdir(), 'sdev-build-'));
  const sketchName = 'sketch';
  const sketchDir = path.join(root, sketchName);
  mkdirSync(sketchDir, { recursive: true });
  writeFileSync(path.join(sketchDir, `${sketchName}.ino`), ino, 'utf8');
  const outDir = path.join(root, 'out');

  try {
    await ensureCore(fqbn, log);
    await ensureLibraries(libraries, log);

    const r = await run(CLI, ['compile', '--fqbn', fqbn, '--output-dir', outDir, sketchDir]);
    log.push(`$ arduino-cli compile --fqbn ${fqbn}\n${r.stdout}${r.stderr}`);
    if (r.code !== 0) return { ok: false, error: 'compile failed', log: log.join('\n') };

    const files = readdirSync(outDir);
    const hexFile = files.find((f) => f.endsWith('.hex') && !f.includes('with_bootloader'));
    if (hexFile) {
      return { ok: true, hex: readFileSync(path.join(outDir, hexFile), 'utf8'), format: 'ihex', log: log.join('\n') };
    }
    const binFile = files.find((f) => f.endsWith('.bin'));
    if (binFile) {
      return {
        ok: true,
        hex: readFileSync(path.join(outDir, binFile)).toString('base64'),
        format: 'base64-bin',
        log: log.join('\n'),
      };
    }
    return { ok: false, error: `no .hex/.bin produced (got: ${files.join(', ')})`, log: log.join('\n') };
  } finally {
    try { rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); res.end(); return; }

  if (req.method === 'GET') {
    const v = cliVersion();
    return send(res, v ? 200 : 503, v
      ? { ok: true, arduinoCli: v }
      : { ok: false, error: `arduino-cli not found (looked for "${CLI}"). Install it from https://arduino.github.io/arduino-cli/latest/installation/` });
  }

  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });

  let body = '';
  req.on('data', (c) => {
    body += c;
    if (body.length > 8 * 1024 * 1024) { req.destroy(); }
  });
  req.on('end', async () => {
    let payload;
    try { payload = JSON.parse(body); } catch { return send(res, 400, { ok: false, error: 'invalid json' }); }
    if (!payload?.fqbn || !payload?.ino) return send(res, 400, { ok: false, error: 'fqbn and ino are required' });
    if (!cliVersion()) {
      return send(res, 503, { ok: false, error: `arduino-cli not found (looked for "${CLI}").` });
    }
    try {
      const result = await compile(payload);
      send(res, 200, result);
    } catch (e) {
      send(res, 500, { ok: false, error: String(e) });
    }
  });
});

server.listen(PORT, () => {
  const v = cliVersion();
  console.log(`sdev arduino build server → http://localhost:${PORT}`);
  console.log(v ? `arduino-cli: ${v}` : `WARNING: arduino-cli not found (set ARDUINO_CLI=/path/to/arduino-cli)`);
});
