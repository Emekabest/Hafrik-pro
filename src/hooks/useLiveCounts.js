// src/hooks/useLiveCounts.js
// Wraps the store's badge-polling system with focus-aware lifecycle.
// Usage: call useLiveCounts() once inside any screen that needs live badges.

import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import useStore from '../repository/store';
import { useAuth } from '../AuthContext';

export function useLiveCounts() {
  const { token } = useAuth();
  const startBadgePolling = useStore((s) => s.startBadgePolling);
  const stopBadgePolling  = useStore((s) => s.stopBadgePolling);

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      // Start polling (immediately fetches + re-fetches every 20 s)
      startBadgePolling(token);
      // Stop polling when screen loses focus to avoid leaks
      return () => stopBadgePolling();
    }, [token, startBadgePolling, stopBadgePolling]),
  );
}
