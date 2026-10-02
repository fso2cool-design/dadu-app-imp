import { useCallback, useEffect, useState } from 'react';
import { useApplication } from '../application/ApplicationContext';
import type { AttendanceRecord } from '../types';

export function useAttendance(uid: string | undefined, ayId?: string, sem?: string, classId?: string, subjectId?: string) {
  const app = useApplication();
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const fetch = useCallback(async () => {
    if (!uid || !ayId || !classId) { setData([]); return; }
    setLoading(true);
    try {
      const list = await (app.attendance as any).getByMeeting
        ? (app.attendance as any).getByMeeting(uid, ayId, sem, classId)
        : [];
      setData(list);
    } finally { setLoading(false); }
  }, [app, uid, ayId, sem, classId, subjectId]);
  useEffect(() => { fetch(); }, [fetch]);
  return { data, loading, reload: fetch };
}
