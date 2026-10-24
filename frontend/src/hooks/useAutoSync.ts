import { useEffect, useRef } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../lib/api';

/**
 * useAutoSync silently triggers background syncs for connected platforms
 * every `intervalMs` milliseconds.
 */
export const useAutoSync = (token: string | null, intervalMs: number = 3 * 60 * 1000) => {
  const syncTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!token) return;

    const performSync = async () => {
      const headers = { Authorization: `Bearer ${token}` };
      
      // Sync each connected platform silently (each fails safely if not connected)
      for (const platform of ['github', 'leetcode', 'gfg']) {
        await axios.post(`${API_BASE_URL}/api/${platform}/sync`, {}, { headers }).catch(() => {});
      }

      // Emit custom event so pages know they can refresh their data
      window.dispatchEvent(new Event('personalos-sync-complete'));
    };

    // Set interval to sync silently in the background
    syncTimer.current = setInterval(performSync, intervalMs);

    return () => {
      if (syncTimer.current) clearInterval(syncTimer.current);
    };
  }, [token, intervalMs]);
};
