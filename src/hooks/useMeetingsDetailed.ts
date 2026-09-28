import { useCallback, useEffect, useState } from 'react';
import { container } from '../application/ports/container';
import type { Meeting } from '../types';
export function useMeetingsList(uid: string | undefined, filters?: { academicYearId?: string; classId?: string; subjectId?: string }) {
  const [data, setData] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const fetch = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const list = await container.repos.meeting.getAll(uid, filters);
      setData(list);
    } finally { setLoading(false); }
  }, [uid, JSON.stringify(filters)]);
  useEffect(()=>{fetch()},[fetch]);
  const remove = useCallback(async (id: string) => {
    await container.repos.meeting.delete(uid!, id);
    setData(prev => prev.filter(m => m.id !== id));
  }, [uid]);
  return { data, loading, reload: fetch, remove };
}
