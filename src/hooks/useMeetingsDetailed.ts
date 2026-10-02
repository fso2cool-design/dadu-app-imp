import { useCallback, useEffect, useState } from 'react';
import { useApplication } from '../application/ApplicationContext';
import type { Meeting } from '../types';

export function useMeetingsList(uid: string | undefined, filters?: { academicYearId?: string; classId?: string; subjectId?: string }) {
  const app = useApplication();
  const [data, setData] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const fetch = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await app.meetings.getAll(uid, filters);
      setData(list);
    } finally { setLoading(false); }
  }, [app, uid, JSON.stringify(filters)]);
  useEffect(() => { fetch(); }, [fetch]);
  const remove = useCallback(async (id: string) => {
    await app.meetings.delete(uid!, id);
    setData(prev => prev.filter(m => m.id !== id));
  }, [app, uid]);
  return { data, loading, reload: fetch, remove };
}
