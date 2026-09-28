import { useCallback, useEffect, useState } from 'react';
import { container } from '../application/ports/container';
import type { Student } from '../types';

export function useStudents(uid: string | undefined, opts?: { status?: string }) {
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!uid) return;
    setLoading(true); setError(null);
    try {
      const list = await container.repos.student.getAll(uid, opts?.status as any);
      setData(list);
    } catch (e: any) { setError(e?.message || 'Gagal memuat siswa'); }
    finally { setLoading(false); }
  }, [uid, opts?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const search = useCallback(async (q: string) => {
    if (!uid) return [] as Student[];
    return container.useCases.searchStudents(uid, q);
  }, [uid]);

  return { data, loading, error, reload: fetch, search };
}
