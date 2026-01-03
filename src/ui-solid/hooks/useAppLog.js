import { createSignal, onMount } from 'solid-js';

const DEBUG_APP_LOG = false;

// Log entry types
export const LOG_TYPE = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
};

// Maximum number of log entries to keep
const MAX_LOG_ENTRIES = 500;

/**
 * Hook for managing application-wide logging
 * Persists log entries to server for display in the Console view
 */
export function useAppLog() {
  const [logs, setLogs] = createSignal([]);
  const [loading, setLoading] = createSignal(true);

  // Load logs from server on mount
  const loadLogs = async () => {
    try {
      const response = await fetch('/api/history');
      if (response.ok) {
        const data = await response.json();
        setLogs(data.history || []);
        if (DEBUG_APP_LOG) {
          console.log('[AppLog] Loaded', data.history?.length || 0, 'entries');
        }
      }
    } catch (err) {
      console.error('[AppLog] Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  onMount(() => {
    loadLogs();
  });

  const addLog = async (type, message, details = null) => {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
    };

    if (DEBUG_APP_LOG) {
      console.log('[AppLog]', type, message, details);
    }

    // Update local state immediately
    setLogs(prev => {
      const newLogs = [entry, ...prev];
      if (newLogs.length > MAX_LOG_ENTRIES) {
        return newLogs.slice(0, MAX_LOG_ENTRIES);
      }
      return newLogs;
    });

    // Persist to server
    try {
      await fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      console.error('[AppLog] Failed to save log:', err);
    }

    return entry.id;
  };

  const logInfo = (message, details = null) => {
    return addLog(LOG_TYPE.INFO, message, details);
  };

  const logSuccess = (message, details = null) => {
    return addLog(LOG_TYPE.SUCCESS, message, details);
  };

  const logError = (message, details = null) => {
    return addLog(LOG_TYPE.ERROR, message, details);
  };

  const logWarning = (message, details = null) => {
    return addLog(LOG_TYPE.WARNING, message, details);
  };

  const clearLogs = async () => {
    try {
      // Clear server-side history
      await fetch('/api/history', { method: 'DELETE' });
      // Clear local state
      setLogs([]);
      if (DEBUG_APP_LOG) {
        console.log('[AppLog] History cleared');
      }
    } catch (err) {
      console.error('[AppLog] Failed to clear history:', err);
    }
  };

  return {
    logs, // Signal accessor
    loading, // Signal accessor
    logInfo,
    logSuccess,
    logError,
    logWarning,
    clearLogs,
    reloadLogs: loadLogs,
  };
}
