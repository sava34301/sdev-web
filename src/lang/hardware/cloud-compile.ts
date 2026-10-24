// ============================================================
// Zero-install cloud & local firmware compiler
// ============================================================
// Strategy:
//   1. Try local / self-hosted `arduino-cli` bridge (`buildUrl`, e.g. http://localhost:8765)
//      which supports EVERY board core (including Uno R4, Giga, Portenta, MKR, Zero, Due, Teensy).
//   2. For boards with a verified `wokwiBoard` mapping (`canCompileInCloud(board)`),
//      compile directly via Wokwi Hexi (`https://hexi.wokwi.com/build`) with zero install.
//      (Never send unsupported boards like Uno R4 or Uno Q to Wokwi.)
//   3. Fall back to the Supabase `compile-firmware` edge function.

import { canCompileInCloud, type BoardDescriptor } from './board-db';
import { BUNDLED_HEADERS, findLibrary } from './arduino-api';
import { supabase } from '@/integrations/supabase/client';

export interface CloudCompileResult {
  ok: boolean;
  hex?: string;
  format?: 'ihex' | 'base64-bin';
  log?: string;
  error?: string;
  message?: string;
  reason?: string;
  ino?: string;
  provider?: 'local-cli' | 'wokwi-cloud' | 'edge-function';
}

const WOKWI_HEXI_URL = 'https://hexi.wokwi.com/build';

/**
 * Filter out libraries that ship inside the board's core package so cloud
 * builders only install external Library Manager dependencies.
 */
export function filterExternalLibraries(libraries: string[]): string[] {
  return libraries.filter((name) => {
    const known = findLibrary(name);
    if (known?.bundled) return false;
    if (BUNDLED_HEADERS.has(name) || BUNDLED_HEADERS.has(`${name}.h`)) return false;
    return true;
  });
}

export async function compileWithWokwiHexi(
  board: BoardDescriptor,
  ino: string,
  libraries: string[],
  fetchImpl: typeof fetch = fetch
): Promise<CloudCompileResult> {
  if (!canCompileInCloud(board) || !board.wokwiBoard) {
    return {
      ok: false,
      reason: 'unsupported_cloud_board',
      error: `${board.label} (${board.fqbn}) requires the local arduino-cli build server.`,
    };
  }

  const externalLibs = filterExternalLibraries(libraries);
  const res = await fetchImpl(WOKWI_HEXI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sketch: ino,
      files: [],
      board: board.wokwiBoard,
      libraries: externalLibs,
    }),
  });

  if (!res.ok) {
    return {
      ok: false,
      reason: 'http_error',
      error: `Cloud compiler returned HTTP ${res.status}`,
      provider: 'wokwi-cloud',
    };
  }

  const data = (await res.json()) as {
    hex?: string;
    stdout?: string;
    stderr?: string;
  };
  const log = [data.stdout, data.stderr].filter(Boolean).join('\n').trim();

  if (data.hex && data.hex.trim().length > 0) {
    const isIhex = data.hex.trim().startsWith(':');
    return {
      ok: true,
      hex: data.hex,
      format: isIhex ? 'ihex' : 'base64-bin',
      log,
      provider: 'wokwi-cloud',
    };
  }

  return {
    ok: false,
    reason: 'compile_error',
    error: data.stderr?.trim() || 'Cloud compilation failed',
    log,
    provider: 'wokwi-cloud',
  };
}

export async function compileSketch(opts: {
  board: BoardDescriptor;
  ino: string;
  libraries: string[];
  buildUrl?: string;
  onLog?: (line: string) => void;
}): Promise<CloudCompileResult> {
  const { board, ino, libraries, buildUrl, onLog } = opts;
  const externalLibs = filterExternalLibraries(libraries);

  // 1) Try local / self-hosted arduino-cli build server if configured.
  if (buildUrl && buildUrl.trim()) {
    const cleanUrl = buildUrl.trim().replace(/\/+$/, '') + '/';
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      let res: Response;
      try {
        res = await fetch(cleanUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fqbn: board.fqbn, ino, libraries: externalLibs }),
          signal: ctrl.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      const r = (await res.json()) as CloudCompileResult;
      if (r.ok && r.hex) {
        return { ...r, provider: 'local-cli' };
      }
      if (r.error || r.message) {
        return { ...r, ok: false, provider: 'local-cli' };
      }
    } catch {
      onLog?.(`[hw] local build server not running at ${buildUrl} — trying cloud compiler…`);
    }
  }

  // 2) Zero-install browser cloud compilation via Wokwi Hexi (ONLY for verified boards).
  if (canCompileInCloud(board) && board.wokwiBoard) {
    try {
      onLog?.(`[hw] compiling in cloud for ${board.label} (${board.wokwiBoard})…`);
      const cloudRes = await compileWithWokwiHexi(board, ino, externalLibs);
      if (cloudRes.ok && cloudRes.hex) {
        return cloudRes;
      }
      if (cloudRes.reason === 'compile_error') {
        return cloudRes;
      }
    } catch (e) {
      onLog?.(`[hw] cloud compiler unreachable (${(e as Error).message}) — trying backend…`);
    }
  }

  // 3) Fall back to Supabase `compile-firmware` edge function.
  try {
    const { data, error } = await supabase.functions.invoke('compile-firmware', {
      body: {
        fqbn: board.fqbn,
        ino,
        libraries: externalLibs,
        wokwiBoard: board.wokwiBoard,
      },
    });
    if (error) {
      return { ok: false, reason: 'edge_error', error: error.message, ino, provider: 'edge-function' };
    }
    const r = data as CloudCompileResult;
    return { ...r, ok: Boolean(r.ok && r.hex), provider: 'edge-function' };
  } catch (e) {
    return {
      ok: false,
      reason: 'build_unavailable',
      error: (e as Error).message,
      ino,
      provider: 'edge-function',
    };
  }
}
