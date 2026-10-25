/**
 * SDEV Studio State & Cloud Persistence Store (`src/studio/store.ts`)
 *
 * Manages Studio files, execution results (Chrono time-travel trace,
 * Live Lens inline annotations, Prism AST), target selection, and
 * bidirectional persistence:
 *   - Syncs with Supabase `code_files` when a user session is active.
 *   - Falls back cleanly to `localStorage` (or in-memory store in Node)
 *     for guest/offline sessions.
 */

import { useSyncExternalStore } from 'react';
import {
  readSignature,
  stripSignature,
  writeSignature,
} from '@/lang/dialect/signature';
import type { ApiTarget } from '@/lang/registry/api-registry';
import {
  runStudioCode,
  runStudioCodeAsync,
  type ChronoStep,
  type StudioRunResult,
} from './runner';

// ============================================================
// Types
// ============================================================

export interface StudioFile {
  id: string;
  cloudId?: string;
  name: string;
  content: string;
  language: string;
  runtime: 'v1' | 'v2';
  dialect?: string | null;
  updatedAt: string;
  dirty?: boolean;
}

export type CloudSyncStatus = 'local-only' | 'syncing' | 'synced' | 'error';

export interface StudioState {
  files: StudioFile[];
  activeFileId: string;
  runtime: 'v1' | 'v2';
  target: ApiTarget;
  lastRun: StudioRunResult | null;
  chronoIndex: number;
  liveLensEnabled: boolean;
  prismOpen: boolean;
  cloudStatus: CloudSyncStatus;
  cloudError?: string;
  userId: string | null;
  lastSyncedAt?: string;
}

/** Minimal interface matching Supabase client for `code_files` + `auth` */
export interface StudioSupabaseLike {
  auth: {
    getSession: () => Promise<{
      data: { session: { user: { id: string } } | null };
      error?: unknown;
    }>;
  };
  from: (table: 'code_files') => {
    select: (columns: string) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => Promise<{
        data: Array<{
          id: string;
          name: string;
          content: string;
          language: string;
          created_at: string;
          updated_at: string;
        }> | null;
        error: { message?: string } | null;
      }>;
    };
    insert: (row: {
      user_id: string;
      name: string;
      content: string;
      language: string;
    }) => {
      select: (columns: string) => {
        single: () => Promise<{
          data: {
            id: string;
            name: string;
            content: string;
            language: string;
            created_at: string;
            updated_at: string;
          } | null;
          error: { message?: string } | null;
        }>;
      };
    };
    update: (
      patch: Partial<{ name: string; content: string; language: string }>
    ) => {
      eq: (
        col: string,
        val: string
      ) => Promise<{ error: { message?: string } | null }>;
    };
    delete: () => {
      eq: (
        col: string,
        val: string
      ) => Promise<{ error: { message?: string } | null }>;
    };
  };
}

// ============================================================
// Default Starter Files & Local Storage Helpers
// ============================================================

const STORAGE_KEY = 'sdev.studio.workspace.v1';

const DEFAULT_STUDIO_CODE = `# SDEV Studio — Chrono, Live Lens & Prism Demo
forge total be 0
forge items be [10, 20, 30, 40]

for each n through items ::
  total be total + n
  speak("Step total: " + morph(total, "text"))
;;

conjure double(x) ::
  yield x * 2
;;

forge finalScore be double(total)
speak("Final score: " + morph(finalScore, "text"))
`;

function createDefaultFiles(): StudioFile[] {
  return [
    {
      id: 'studio-main',
      name: 'main.sdev',
      content: DEFAULT_STUDIO_CODE,
      language: 'sdev',
      runtime: 'v1',
      dialect: null,
      updatedAt: new Date().toISOString(),
      dirty: false,
    },
  ];
}

const memoryStorage = new Map<string, string>();

function readRawStorage(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
  } catch {
    /* ignore */
  }
  return memoryStorage.get(key) ?? null;
}

function writeRawStorage(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
      return;
    }
  } catch {
    /* ignore */
  }
  memoryStorage.set(key, value);
}

function loadLocalFiles(): StudioFile[] {
  const raw = readRawStorage(STORAGE_KEY);
  if (!raw) return createDefaultFiles();
  try {
    const parsed = JSON.parse(raw) as { files?: StudioFile[] };
    if (Array.isArray(parsed.files) && parsed.files.length > 0) {
      return parsed.files;
    }
  } catch {
    /* ignore corrupt storage */
  }
  return createDefaultFiles();
}

function persistLocalState(state: StudioState): void {
  const payload = JSON.stringify({
    files: state.files,
    activeFileId: state.activeFileId,
    runtime: state.runtime,
    target: state.target,
    liveLensEnabled: state.liveLensEnabled,
    prismOpen: state.prismOpen,
  });
  writeRawStorage(STORAGE_KEY, payload);
}

// ============================================================
// Lazy Supabase Client Resolution
// ============================================================

let customSupabaseClient: StudioSupabaseLike | null | undefined = undefined;

/**
 * Allows injecting a custom or mock Supabase client (or `null` to force local mode).
 */
export function setStudioSupabaseClient(
  client: StudioSupabaseLike | null | undefined
): void {
  customSupabaseClient = client;
}

async function resolveSupabaseClient(): Promise<StudioSupabaseLike | null> {
  if (customSupabaseClient !== undefined) {
    return customSupabaseClient;
  }
  try {
    // Only attempt dynamic import when VITE_SUPABASE_URL is configured
    const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (!metaEnv?.VITE_SUPABASE_URL) {
      return null;
    }
    const mod = await import('@/integrations/supabase/client');
    return (mod.supabase as unknown as StudioSupabaseLike) ?? null;
  } catch {
    return null;
  }
}

// ============================================================
// Store Singleton & Subscriptions
// ============================================================

const initialFiles = loadLocalFiles();

let state: StudioState = {
  files: initialFiles,
  activeFileId: initialFiles[0].id,
  runtime: initialFiles[0].runtime ?? 'v1',
  target: 'v1',
  lastRun: null,
  chronoIndex: 0,
  liveLensEnabled: true,
  prismOpen: false,
  cloudStatus: 'local-only',
  userId: null,
};

const listeners = new Set<() => void>();

function emitChange(): void {
  persistLocalState(state);
  for (const listener of listeners) {
    listener();
  }
}

export function getStudioState(): StudioState {
  return state;
}

export function subscribeStudio(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveStudioFile(): StudioFile {
  return (
    state.files.find((f) => f.id === state.activeFileId) ?? state.files[0]
  );
}

export function getActiveChronoStep(): ChronoStep | null {
  if (!state.lastRun || state.lastRun.chrono.length === 0) return null;
  const idx = Math.max(
    0,
    Math.min(state.chronoIndex, state.lastRun.chrono.length - 1)
  );
  return state.lastRun.chrono[idx] ?? null;
}

// ============================================================
// File & Execution Actions
// ============================================================

export function setActiveStudioFile(id: string): void {
  if (!state.files.some((f) => f.id === id)) return;
  state = { ...state, activeFileId: id };
  emitChange();
}

export function createStudioFile(
  name: string,
  content = '# New SDEV Studio file\nspeak("Hello from Studio!")\n',
  language = 'sdev'
): StudioFile {
  const cleanName = name.trim() || `untitled-${state.files.length + 1}.sdev`;
  const file: StudioFile = {
    id: `studio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: cleanName,
    content,
    language,
    runtime: state.runtime,
    dialect: null,
    updatedAt: new Date().toISOString(),
    dirty: true,
  };
  state = {
    ...state,
    files: [...state.files, file],
    activeFileId: file.id,
  };
  emitChange();
  void saveStudioFileToCloud(file.id);
  return file;
}

export function updateStudioFile(id: string, content: string): void {
  let updated = false;
  const files = state.files.map((f) => {
    if (f.id !== id) return f;
    updated = true;
    return {
      ...f,
      content,
      updatedAt: new Date().toISOString(),
      dirty: true,
    };
  });
  if (!updated) return;
  state = { ...state, files };
  emitChange();
}

export function renameStudioFile(id: string, newName: string): void {
  const clean = newName.trim();
  if (!clean) return;
  const files = state.files.map((f) =>
    f.id === id
      ? { ...f, name: clean, updatedAt: new Date().toISOString(), dirty: true }
      : f
  );
  state = { ...state, files };
  emitChange();
  void saveStudioFileToCloud(id);
}

export function deleteStudioFile(id: string): void {
  const target = state.files.find((f) => f.id === id);
  if (!target) return;
  const remaining = state.files.filter((f) => f.id !== id);
  const nextFiles = remaining.length > 0 ? remaining : createDefaultFiles();
  const nextActive =
    state.activeFileId === id ? nextFiles[0].id : state.activeFileId;
  state = {
    ...state,
    files: nextFiles,
    activeFileId: nextActive,
  };
  emitChange();
  if (target.cloudId) {
    void deleteStudioFileFromCloud(target.cloudId);
  }
}

export function setStudioRuntime(runtime: 'v1' | 'v2'): void {
  state = { ...state, runtime };
  emitChange();
}

export function setStudioTarget(target: ApiTarget): void {
  state = { ...state, target };
  emitChange();
}

export function setChronoStep(index: number): void {
  const maxIdx = state.lastRun ? Math.max(0, state.lastRun.chrono.length - 1) : 0;
  const clamped = Math.max(0, Math.min(index, maxIdx));
  state = { ...state, chronoIndex: clamped };
  emitChange();
}

export function toggleLiveLens(enabled?: boolean): void {
  state = {
    ...state,
    liveLensEnabled: enabled ?? !state.liveLensEnabled,
  };
  emitChange();
}

export function togglePrismPanel(open?: boolean): void {
  state = {
    ...state,
    prismOpen: open ?? !state.prismOpen,
  };
  emitChange();
}

/**
 * Executes the active Studio file synchronously and updates Chrono, Live Lens,
 * Prism AST, and linter diagnostics in the store.
 */
export function runActiveStudioFile(): StudioRunResult {
  const active = getActiveStudioFile();
  const result = runStudioCode(active.content, {
    runtime: state.runtime,
    target: state.target,
  });
  state = {
    ...state,
    lastRun: result,
    chronoIndex: Math.max(0, result.chrono.length - 1),
  };
  emitChange();
  return result;
}

/**
 * Executes the active Studio file asynchronously (supporting v2 WASM and
 * agent-assisted execution) and updates Chrono, Live Lens, and Prism in the store.
 */
export async function runActiveStudioFileAsync(): Promise<StudioRunResult> {
  const active = getActiveStudioFile();
  const result = await runStudioCodeAsync(active.content, {
    runtime: state.runtime,
    target: state.target,
  });
  state = {
    ...state,
    lastRun: result,
    chronoIndex: Math.max(0, result.chrono.length - 1),
  };
  emitChange();
  return result;
}

// ============================================================
// Cloud Persistence Sync (`code_files` table in Supabase)
// ============================================================

function serializeFileForCloud(file: StudioFile): string {
  return writeSignature(stripSignature(file.content), {
    rt: file.runtime,
    dialect: file.dialect ?? null,
    origin: 'ide',
  });
}

function hydrateFileFromCloud(row: {
  id: string;
  name: string;
  content: string;
  language: string;
  updated_at: string;
}): StudioFile {
  const sig = readSignature(row.content);
  return {
    id: `cloud-${row.id}`,
    cloudId: row.id,
    name: row.name,
    content: stripSignature(row.content),
    language: row.language || 'sdev',
    runtime: sig?.rt === 'v2' ? 'v2' : 'v1',
    dialect: sig?.dialect ?? null,
    updatedAt: row.updated_at,
    dirty: false,
  };
}

/**
 * Loads files from Supabase `code_files` when a user session is active.
 * If no user session is active, keeps local storage files and sets status to `local-only`.
 */
export async function loadStudioFilesFromCloud(): Promise<StudioFile[]> {
  const client = await resolveSupabaseClient();
  if (!client) {
    state = { ...state, cloudStatus: 'local-only', userId: null };
    emitChange();
    return state.files;
  }

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;
    if (!userId) {
      state = { ...state, cloudStatus: 'local-only', userId: null };
      emitChange();
      return state.files;
    }

    state = { ...state, cloudStatus: 'syncing', userId };
    emitChange();

    const { data, error } = await client
      .from('code_files')
      .select('id, name, content, language, created_at, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      state = {
        ...state,
        cloudStatus: 'error',
        cloudError: error.message ?? 'Failed to fetch cloud files',
      };
      emitChange();
      return state.files;
    }

    if (data && data.length > 0) {
      const cloudFiles = data.map(hydrateFileFromCloud);
      const activeExists = cloudFiles.some((f) => f.id === state.activeFileId);
      state = {
        ...state,
        files: cloudFiles,
        activeFileId: activeExists ? state.activeFileId : cloudFiles[0].id,
        cloudStatus: 'synced',
        cloudError: undefined,
        lastSyncedAt: new Date().toISOString(),
      };
      emitChange();
      return cloudFiles;
    }

    state = {
      ...state,
      cloudStatus: 'synced',
      cloudError: undefined,
      lastSyncedAt: new Date().toISOString(),
    };
    emitChange();
    return state.files;
  } catch (err) {
    state = {
      ...state,
      cloudStatus: 'error',
      cloudError: err instanceof Error ? err.message : String(err),
    };
    emitChange();
    return state.files;
  }
}

/**
 * Saves a single Studio file to Supabase `code_files` if signed in,
 * and always persists to `localStorage`.
 */
export async function saveStudioFileToCloud(fileId: string): Promise<boolean> {
  persistLocalState(state);
  const file = state.files.find((f) => f.id === fileId);
  if (!file) return false;

  const client = await resolveSupabaseClient();
  if (!client) return false;

  try {
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id ?? null;
    if (!userId) {
      state = { ...state, cloudStatus: 'local-only', userId: null };
      emitChange();
      return false;
    }

    state = { ...state, cloudStatus: 'syncing', userId };
    emitChange();

    const signedContent = serializeFileForCloud(file);

    if (file.cloudId) {
      const { error } = await client
        .from('code_files')
        .update({
          name: file.name,
          content: signedContent,
          language: file.language,
        })
        .eq('id', file.cloudId);

      if (error) {
        state = {
          ...state,
          cloudStatus: 'error',
          cloudError: error.message ?? 'Failed to update cloud file',
        };
        emitChange();
        return false;
      }

      state = {
        ...state,
        files: state.files.map((f) =>
          f.id === fileId ? { ...f, dirty: false } : f
        ),
        cloudStatus: 'synced',
        cloudError: undefined,
        lastSyncedAt: new Date().toISOString(),
      };
      emitChange();
      return true;
    } else {
      const { data, error } = await client
        .from('code_files')
        .insert({
          user_id: userId,
          name: file.name,
          content: signedContent,
          language: file.language,
        })
        .select('id, name, content, language, created_at, updated_at')
        .single();

      if (error || !data) {
        state = {
          ...state,
          cloudStatus: 'error',
          cloudError: error?.message ?? 'Failed to insert cloud file',
        };
        emitChange();
        return false;
      }

      state = {
        ...state,
        files: state.files.map((f) =>
          f.id === fileId
            ? {
                ...f,
                cloudId: data.id,
                updatedAt: data.updated_at,
                dirty: false,
              }
            : f
        ),
        cloudStatus: 'synced',
        cloudError: undefined,
        lastSyncedAt: new Date().toISOString(),
      };
      emitChange();
      return true;
    }
  } catch (err) {
    state = {
      ...state,
      cloudStatus: 'error',
      cloudError: err instanceof Error ? err.message : String(err),
    };
    emitChange();
    return false;
  }
}

/**
 * Deletes a file from Supabase `code_files` by its `cloudId`.
 */
export async function deleteStudioFileFromCloud(
  cloudId: string
): Promise<boolean> {
  const client = await resolveSupabaseClient();
  if (!client) return false;

  try {
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData?.session?.user?.id) return false;

    const { error } = await client.from('code_files').delete().eq('id', cloudId);
    if (error) {
      state = {
        ...state,
        cloudStatus: 'error',
        cloudError: error.message ?? 'Failed to delete cloud file',
      };
      emitChange();
      return false;
    }
    state = {
      ...state,
      cloudStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
    };
    emitChange();
    return true;
  } catch {
    return false;
  }
}

/**
 * Two-way sync between local Studio files and Supabase `code_files`:
 * pushes any dirty local files first, then pulls the canonical list from cloud.
 */
export async function syncStudioWithCloud(): Promise<StudioState> {
  const dirtyFiles = state.files.filter((f) => f.dirty || !f.cloudId);
  for (const dirty of dirtyFiles) {
    await saveStudioFileToCloud(dirty.id);
  }
  await loadStudioFilesFromCloud();
  return state;
}

// ============================================================
// React Hook (`useStudioStore`)
// ============================================================

export function useStudioStore() {
  const snapshot = useSyncExternalStore(
    subscribeStudio,
    getStudioState,
    getStudioState
  );

  const activeFile =
    snapshot.files.find((f) => f.id === snapshot.activeFileId) ??
    snapshot.files[0];

  const activeChronoStep = getActiveChronoStep();

  return {
    ...snapshot,
    activeFile,
    activeChronoStep,
    setActiveFile: setActiveStudioFile,
    createFile: createStudioFile,
    updateFile: updateStudioFile,
    renameFile: renameStudioFile,
    deleteFile: deleteStudioFile,
    setRuntime: setStudioRuntime,
    setTarget: setStudioTarget,
    setChronoStep,
    toggleLiveLens,
    togglePrismPanel,
    run: runActiveStudioFile,
    runAsync: runActiveStudioFileAsync,
    syncCloud: syncStudioWithCloud,
    saveToCloud: saveStudioFileToCloud,
    loadFromCloud: loadStudioFilesFromCloud,
  };
}
