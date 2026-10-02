import { useCallback, useEffect, useState } from 'react';
import { useApplication } from '../application/ApplicationContext';
import type { Enrollment } from '../types';

export function useEnrollments(uid: string | undefined, academicYearId?: string, classId?: string) {
  const app = useApplication();
  const [data, setData] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!uid || !academicYearId || !classId) { setData([]); return; }
    setLoading(true); setError(null);
    try {
      const list = await app.enrollment.getByClass(uid, academicYearId, classId);
      setData(list);
    } catch (e: any) { setError(e?.message || 'Gagal memuat enrollment'); }
    finally { setLoading(false); }
  }, [app, uid, academicYearId, classId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, reload: fetch };
}
