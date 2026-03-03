// src/hooks/useLiveCounts.js
// Ensures badge polling is running when a screen comes into focus.
// Polling is started from App.js and kept alive permanently — this hook
// just re-starts it if it was somehow stopped (e.g. after a token refresh).
// IMPORTANT: we deliberately do NOT stop polling on blur so counts stay
// live across all tabs.

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../repository/store';
import { useAuth } from '../AuthContext';

export function useLiveCounts() {
  const { token } = useAuth();
  const startBadgePolling = useStore((s) => s.startBadgePolling);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      // Read imperatively (no store subscription) to avoid re-rendering screens on every poll tick
      if (!useStore.getState()._badgeInterval) {
        startBadgePolling(token);
      }
      // No cleanup — App.js owns the interval lifecycle
    }, [token, startBadgePolling]),
  );
}
