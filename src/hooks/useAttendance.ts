import { useCallback, useEffect, useState } from 'react';
import { container } from '../application/ports/container';
import type { AttendanceRecord, DailyAttendanceRecord } from '../types';
export function useAttendance(uid: string | undefined, ayId?: string, sem?: string, classId?: string, subjectId?: string) {
  const [data, setData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const fetch = useCallback(async () => {
    if (!uid || !ayId || !classId) { setData([]); return; }
    setLoading(true);
    try {
      const list = await (container.repos.attendance as any).getByMeeting
        ? (container.repos.attendance as any).getByMeeting(uid, ayId, sem, classId)
        : [];
      setData(list);
    } finally { setLoading(false); }
  }, [uid, ayId, sem, classId, subjectId]);
  useEffect(()=>{fetch()},[fetch]);
  return { data, loading, reload: fetch };
}
