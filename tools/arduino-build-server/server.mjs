#!/usr/bin/env node
// Local HTTP bridge around `arduino-cli` for the SDEV IDE Hardware panel.
// Protocol (matches supabase/functions/compile-firmware):
//   POST /        { fqbn, ino, libraries[] } -> { ok, hex?, format?, error?, log }
//   GET  /health  -> { ok, arduinoCli? }
import http from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const PORT = Number(process.env.PORT || 8765);
const HOST = process.env.HOST || '127.0.0.1';
const CLI = process.env.ARDUINO_CLI || 'arduino-cli';
const API_KEY = (process.env.ARDUINO_BUILD_KEY || '').trim();
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization, x-api-key',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { ...CORS, 'Content-Type': 'application/json' });
  res.end(payload);
}

function authorized(req) {
  if (!API_KEY) return true;
  const auth = String(req.headers.authorization || '');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  const xKey = String(req.headers['x-api-key'] || '').trim();
  return bearer === API_KEY || xKey === API_KEY;
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

async function ensureCore(fqbn, log) {
  const core = fqbn.split(':').slice(0, 2).join(':');
  const r = await run(CLI, ['core', 'install', core]);
  log.push(`$ arduino-cli core install ${core}\n${r.stdout}${r.stderr}`);
  if (r.code !== 0) return `failed to install core ${core} (exit ${r.code})`;
  return null;
}

async function ensureLibraries(libraries, log) {
  for (const lib of libraries) {
    const r = await run(CLI, ['lib', 'install', lib]);
    log.push(`$ arduino-cli lib install ${lib}\n${r.stdout}${r.stderr}`);
    if (r.code !== 0) return `failed to install library ${lib} (exit ${r.code})`;
  }
  return null;
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
    const coreErr = await ensureCore(fqbn, log);
    if (coreErr) return { ok: false, error: coreErr, log: log.join('\n') };

    const libErr = await ensureLibraries(libraries, log);
    if (libErr) return { ok: false, error: libErr, log: log.join('\n') };

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
  if (!authorized(req)) return send(res, 401, { ok: false, error: 'unauthorized' });

  if (req.method === 'GET') {
    const v = cliVersion();
    return send(res, v ? 200 : 503, v
      ? { ok: true, arduinoCli: v }
      : { ok: false, error: `arduino-cli not found (looked for "${CLI}"). Install it from https://arduino.github.io/arduino-cli/latest/installation/` });
  }

  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'method not allowed' });

  const chunks = [];
  let totalBytes = 0;
  let tooLarge = false;
  req.on('data', (chunk) => {
    totalBytes += chunk.length;
    if (totalBytes > MAX_BODY_BYTES) {
      if (!tooLarge) {
        tooLarge = true;
        send(res, 413, { ok: false, error: 'request body exceeds 8 MiB limit' });
      }
      return;
    }
    chunks.push(chunk);
  });
  req.on('end', async () => {
    if (tooLarge) return;
    let payload;
    try { payload = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { ok: false, error: 'invalid json' }); }
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

server.listen(PORT, HOST, () => {
  const v = cliVersion();
  console.log(`sdev arduino build server -> http://${HOST}:${PORT}`);
  console.log(v ? `arduino-cli: ${v}` : `WARNING: arduino-cli not found (set ARDUINO_CLI=/path/to/arduino-cli)`);
});
