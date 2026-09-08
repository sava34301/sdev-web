import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { getActiveDialect } from './useDialects';
import { readSignature, stripSignature, writeSignature } from '@/lang/dialect/signature';


export interface CloudFile {
  id: string;
  name: string;
  content: string;
  language: string;
  updated_at: string;
}

export function useCloudFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setFiles([]);
      return [] as CloudFile[];
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('code_files')
      .select('id, name, content, language, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setLoading(false);
    if (error) throw error;
    const nextFiles = (data ?? []) as CloudFile[];
    setFiles(nextFiles);
    return nextFiles;
  }, [user]);

  useEffect(() => {
    refresh().catch(() => undefined);
  }, [refresh]);

  const saveFile = useCallback(async (name: string, content: string, id?: string) => {
    if (!user) return null;
    if (id) {
      const { data, error } = await supabase
        .from('code_files')
        .update({ name, content })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .limit(1);
      if (error) throw error;
      if (data?.[0]) {
        await refresh();
        return data[0];
      }
    }
    const { data, error } = await supabase
      .from('code_files')
      .insert({ user_id: user.id, name, content })
      .select()
      .single();
    if (error) throw error;
    await refresh();
    return data;
  }, [user, refresh]);

  const deleteFile = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from('code_files').delete().eq('id', id).eq('user_id', user.id);
    await refresh();
  }, [user, refresh]);

  const recordRun = useCallback(async (fileName: string | null, code: string, output: string, status: 'success' | 'error', durationMs: number) => {
    if (!user) return;
    await supabase.from('run_history').insert({
      user_id: user.id,
      file_name: fileName,
      code_snippet: code.slice(0, 10000),
      output: output.slice(0, 10000),
      status,
      duration_ms: durationMs,
    });
  }, [user]);

  const createGist = useCallback(async (title: string, content: string, description?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('gists')
      .insert({ user_id: user.id, title, content, description })
      .select()
      .single();
    if (error) throw error;
    return data;
  }, [user]);

  return { files, loading, refresh, saveFile, deleteFile, recordRun, createGist };
}
