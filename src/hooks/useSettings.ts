import { useCallback, useEffect, useState } from 'react';
import { container } from '../application/ports/container';
export function useSettings(uid) {
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const fetch = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try { const s = await container.repos.settings.get(uid); setSettings(s); } finally { setLoading(false); }
  }, [uid]);
  useEffect(()=>{fetch()},[fetch]);
  return { settings, loading, reload: fetch };
}
