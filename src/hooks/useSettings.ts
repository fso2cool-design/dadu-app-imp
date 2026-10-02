import { useCallback, useEffect, useState } from 'react';
import { useApplication } from '../application/ApplicationContext';

export function useSettings(uid: string | undefined) {
  const app = useApplication();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const fetch = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try { const s = await app.settings.getSettings(uid); setSettings(s); } finally { setLoading(false); }
  }, [app, uid]);
  useEffect(() => { fetch(); }, [fetch]);
  return { settings, loading, reload: fetch };
}
