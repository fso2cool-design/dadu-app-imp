import { useCallback, useEffect, useState } from 'react';
import { useApplication } from '../application/ApplicationContext';
import type { Student } from '../types';

export function useStudents(uid: string | undefined, opts?: { status?: string }) {
  const app = useApplication();
  const [data, setData] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!uid) return;
    setLoading(true); setError(null);
    try {
      const list = await app.students.getAll(uid, opts?.status as any);
      setData(list);
    } catch (e: any) { setError(e?.message || 'Gagal memuat siswa'); }
    finally { setLoading(false); }
  }, [app, uid, opts?.status]);

  useEffect(() => { fetch(); }, [fetch]);

  const search = useCallback(async (q: string) => {
    if (!uid) return [] as Student[];
    return app.students.search(uid, q);
  }, [app, uid]);

  return { data, loading, error, reload: fetch, search };
}
