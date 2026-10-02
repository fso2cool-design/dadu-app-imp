import { useCallback, useEffect, useState } from 'react';
import { useApplication } from '../application/ApplicationContext';
import type { Meeting } from '../types';

export function useMeetings(uid: string | undefined, options?: any) {
  const app = useApplication();
  const [data, setData] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetch = useCallback(async () => {
    if (!uid) return;
    setLoading(true); setError(null);
    try { const list = await app.meetings.getAll(uid, options); setData(list); }
    catch (e: any) { setError(e?.message || 'Gagal memuat meetings'); }
    finally { setLoading(false); }
  }, [app, uid, JSON.stringify(options)]);
  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, error, reload: fetch };
}
