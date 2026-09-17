import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';
import type { IdeFile, IdeFolder } from '@/components/ide/types';

interface SnapshotInput {
  files: IdeFile[];
  folders: IdeFolder[];
  openIds: string[];
  activeId: string | null;
}

interface HydratedWorkspace {
  files: IdeFile[];
  folders: IdeFolder[];
  openIds: string[];
  activeId: string | null;
  hasRemoteData: boolean;
}

/**
 * Cloud workspace sync.
 * - On login, hydrate the user's files + folders + open tabs from cloud.
 * - On any change, debounce-write the entire workspace back.
 *
 * Cloud is the source of truth WHEN a user is signed in. Guests keep using
 * localStorage (handled separately in the IDE page).
 */
export function useWorkspaceSync(snapshot: SnapshotInput | null, enabled: boolean) {
  const { user } = useAuth();
  const [hydrated, setHydrated] = useState<HydratedWorkspace | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const warnedRef = useRef(false);
  const [hydrationDone, setHydrationDone] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Maps local id → cloud uuid so updates target the same row
  const fileCloudMap = useRef<Map<string, string>>(new Map());
  const folderCloudMap = useRef<Map<string, string>>(new Map());

  // ──────────────────── Hydrate on login ────────────────────
  useEffect(() => {
    if (!user) {
      fileCloudMap.current.clear();
      folderCloudMap.current.clear();
      setHydrated(null);
      setHydrationDone(false);
      return;
    }
    fileCloudMap.current.clear();
    folderCloudMap.current.clear();
    setHydrationDone(false);
    (async () => {
      const [{ data: foldersData }, { data: filesData }] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', user.id).order('created_at'),
        supabase.from('code_files').select('*').eq('user_id', user.id).order('sort_order'),
      ]);
      const folders: IdeFolder[] = (foldersData ?? []).map(f => {
        const localId = `cf-${f.id}`;
        folderCloudMap.current.set(localId, f.id);
        return { id: localId, name: f.name, parentId: f.parent_id ? `cf-${f.parent_id}` : null, cloudId: f.id, expanded: true };
      });
      const files: IdeFile[] = (filesData ?? []).map(f => {
        const localId = `c-${f.id}`;
        fileCloudMap.current.set(localId, f.id);
        return {
          id: localId,
          name: f.name,
          content: f.content,
          folderId: f.folder_id ? `cf-${f.folder_id}` : null,
          cloudId: f.id,
        };
      });
      const openIds = files.filter(f => filesData!.find(x => x.id === f.cloudId)?.is_open).map(f => f.id);
      const activeRow = filesData?.find(x => x.is_active);
      const activeId = activeRow ? `c-${activeRow.id}` : (files[0]?.id ?? null);
      setHydrated({
        files,
        folders,
        openIds: openIds.length ? openIds : (files.length ? [files[0].id] : []),
        activeId,
        hasRemoteData: files.length > 0 || folders.length > 0,
      });
      setHydrationDone(true);
    })();
  }, [user]);

  // ──────────────────── Debounced full snapshot upsert ────────────────────
  const flush = useCallback(async (snap: SnapshotInput) => {
    if (!user) return;
    // A cached `user` object is not proof of a live session: if the token has
    // expired (or a refresh was replayed), every write is rejected by the
    // database. Confirm the session first and tell the user when it is gone.
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setSyncError('Your session expired — sign in again to keep saving to the cloud.');
      if (!warnedRef.current) {
        warnedRef.current = true;
        toast({
          title: 'Not saved to the cloud',
          description: 'Your sign-in expired. Sign in again to keep your files backed up.',
          variant: 'destructive',
        });
      }
      return;
    }
    setIsSyncing(true);
    const failures: string[] = [];
    const fail = (error: { message: string } | null) => { if (error) failures.push(error.message); };
    try {
      // 1) Upsert folders (new ones get cloud ids, existing get updated)
      for (const folder of snap.folders) {
        const cloudId = folder.cloudId ?? folderCloudMap.current.get(folder.id);
        const parentCloudId = folder.parentId ? (snap.folders.find(f => f.id === folder.parentId)?.cloudId ?? folderCloudMap.current.get(folder.parentId) ?? null) : null;
        if (cloudId) {
          const { data, error } = await supabase
            .from('folders')
            .update({ name: folder.name, parent_id: parentCloudId })
            .eq('id', cloudId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle();
          fail(error);
          if (!data && !error) {
            const { data: inserted, error: insErr } = await supabase
              .from('folders')
              .insert({ user_id: user.id, name: folder.name, parent_id: parentCloudId })
              .select('id')
              .single();
            fail(insErr);
            if (inserted) folderCloudMap.current.set(folder.id, inserted.id);
          }
        } else {
          const { data, error } = await supabase.from('folders').insert({ user_id: user.id, name: folder.name, parent_id: parentCloudId }).select('id').single();
          fail(error);
          if (data) folderCloudMap.current.set(folder.id, data.id);
        }
      }
      // 2) Upsert files
      for (let i = 0; i < snap.files.length; i++) {
        const file = snap.files[i];
        const cloudId = file.cloudId ?? fileCloudMap.current.get(file.id);
        const folderCloudId = file.folderId ? (snap.folders.find(f => f.id === file.folderId)?.cloudId ?? folderCloudMap.current.get(file.folderId) ?? null) : null;
        const row = {
          name: file.name,
          content: file.content,
          folder_id: folderCloudId,
          is_open: snap.openIds.includes(file.id),
          is_active: file.id === snap.activeId,
          sort_order: i,
        };
        if (cloudId) {
          const { data, error } = await supabase
            .from('code_files')
            .update(row)
            .eq('id', cloudId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle();
          fail(error);
          if (!data && !error) {
            const { data: inserted, error: insErr } = await supabase
              .from('code_files')
              .insert({ ...row, user_id: user.id })
              .select('id')
              .single();
            fail(insErr);
            if (inserted) fileCloudMap.current.set(file.id, inserted.id);
          }
        } else {
          const { data, error } = await supabase.from('code_files').insert({ ...row, user_id: user.id }).select('id').single();
          fail(error);
          if (data) fileCloudMap.current.set(file.id, data.id);
        }
      }
      // 3) Delete only TRACKED cloud rows that no longer exist locally.
      //    Never touch rows we don't know about — those may be created by the
      //    manual "Save to cloud" dialog or other tabs and must be preserved.
      const trackedFileIds = new Set(fileCloudMap.current.values());
      const localFileCloudIds = new Set(snap.files.map(f => f.cloudId ?? fileCloudMap.current.get(f.id)).filter(Boolean) as string[]);
      for (const cid of trackedFileIds) {
        if (!localFileCloudIds.has(cid)) {
          await supabase.from('code_files').delete().eq('id', cid);
          // forget the mapping so we don't try again
          for (const [local, cloud] of fileCloudMap.current.entries()) {
            if (cloud === cid) fileCloudMap.current.delete(local);
          }
        }
      }
      const trackedFolderIds = new Set(folderCloudMap.current.values());
      const localFolderCloudIds = new Set(snap.folders.map(f => f.cloudId ?? folderCloudMap.current.get(f.id)).filter(Boolean) as string[]);
      for (const cid of trackedFolderIds) {
        if (!localFolderCloudIds.has(cid)) {
          await supabase.from('folders').delete().eq('id', cid);
          for (const [local, cloud] of folderCloudMap.current.entries()) {
            if (cloud === cid) folderCloudMap.current.delete(local);
          }
        }
      }
      if (failures.length) {
        setSyncError('Some files could not be saved to the cloud.');
        if (!warnedRef.current) {
          warnedRef.current = true;
          toast({
            title: 'Some files were not saved',
            description: 'The cloud rejected the save. Try signing out and back in; your work stays in this browser meanwhile.',
            variant: 'destructive',
          });
        }
      } else {
        setSyncError(null);
        warnedRef.current = false;
        setLastSavedAt(Date.now());
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!enabled || !user || !snapshot || !hydrationDone) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => flush(snapshot), 1200);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [snapshot, enabled, user, flush, hydrationDone]);

  return { hydrated, isSyncing, lastSavedAt, syncError };
}
