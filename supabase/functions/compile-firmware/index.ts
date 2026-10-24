// supabase/functions/compile-firmware/index.ts
// Compiles a transpiled Arduino sketch into a flashable .hex/.bin.
//
// Strategy:
//   1. If ARDUINO_BUILD_URL is configured, forward the sketch to the self-hosted
//      arduino-cli build server (supports all 30+ boards).
//   2. Otherwise, if the FQBN maps to a verified Wokwi Hexi board, compile via
//      https://hexi.wokwi.com/build so zero-setup cloud compilation works out of the box.
//   3. Otherwise, return a structured `build_unavailable` response carrying the .ino
//      so the IDE can offer one-click .ino download or local build server instructions.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3';

const Body = z.object({
  fqbn: z.string().min(1).max(200),
  ino: z.string().min(1).max(500_000),
  libraries: z.array(z.string().min(1).max(120)).max(64).default([]),
  wokwiBoard: z.string().min(1).max(80).optional(),
});

const VERIFIED_WOKWI_BY_FQBN: Record<string, string> = {
  'arduino:avr:uno': 'uno',
  'arduino:avr:nano:cpu=atmega328': 'nano',
  'arduino:avr:mega:cpu=atmega2560': 'mega',
  'arduino:mbed_nano:nanorp2040connect': 'nano-rp2040-connect',
  'esp32:esp32:esp32': 'esp32',
  'esp32:esp32:esp32c3': 'esp32-c3-devkitm-1',
  'esp32:esp32:esp32s2': 'esp32-s2-devkitm-1',
  'esp8266:esp8266:nodemcuv2': 'esp8266',
  'rp2040:rp2040:rpipico': 'pi-pico',
  'attiny:avr:ATtinyX5:cpu=attiny85': 'attiny85',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return json({ error: 'invalid json' }, 400);
  }
  if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
  const { fqbn, ino, libraries, wokwiBoard } = parsed.data;

  const buildUrl = Deno.env.get('ARDUINO_BUILD_URL');
  if (buildUrl) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const key = Deno.env.get('ARDUINO_BUILD_KEY');
    if (key) headers['Authorization'] = `Bearer ${key}`;

    try {
      const upstream = await fetch(buildUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fqbn, ino, libraries }),
      });
      const text = await upstream.text();
      let payload: unknown;
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { ok: false, message: text };
      }
      return new Response(JSON.stringify(payload), {
        status: upstream.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      // Fall through to Wokwi Hexi if available for this board
      console.warn('ARDUINO_BUILD_URL unreachable:', e);
    }
  }

  // Cloud fallback ONLY for verified Wokwi boards (never send Uno R4 / Uno Q to Wokwi)
  const targetWokwi = wokwiBoard ?? VERIFIED_WOKWI_BY_FQBN[fqbn];
  if (targetWokwi && Object.values(VERIFIED_WOKWI_BY_FQBN).includes(targetWokwi)) {
    try {
      const hexiRes = await fetch('https://hexi.wokwi.com/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sketch: ino,
          files: [],
          board: targetWokwi,
          libraries,
        }),
      });
      if (hexiRes.ok) {
        const data = (await hexiRes.json()) as { hex?: string; stdout?: string; stderr?: string };
        const log = [data.stdout, data.stderr].filter(Boolean).join('\n').trim();
        if (data.hex && data.hex.trim().length > 0) {
          const isIhex = data.hex.trim().startsWith(':');
          return json({
            ok: true,
            hex: data.hex,
            format: isIhex ? 'ihex' : 'base64-bin',
            log,
            provider: 'wokwi-cloud',
          });
        }
        return json({
          ok: false,
          reason: 'compile_error',
          error: data.stderr?.trim() || 'Compilation failed',
          log,
          ino,
        });
      }
    } catch (e) {
      console.warn('Hexi fallback error:', e);
    }
  }

  return json(
    {
      ok: false,
      reason: 'build_unavailable',
      message:
        fqbn === 'arduino:zephyr:unoq'
          ? 'Arduino Uno Q uses a Linux + Zephyr MCU architecture and is compiled/deployed via Arduino App Lab or local arduino-cli.'
          : `Board ${fqbn} requires the local arduino-cli build server (\`node tools/arduino-build-server/server.mjs\`) or opening the exported .ino in Arduino IDE.`,
      ino,
      fqbn,
      libraries,
    },
    200
  );
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
