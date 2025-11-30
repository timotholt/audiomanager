import { useState, useCallback } from 'react';

const DEBUG_UNDO = true;

/**
 * Simple snapshot-based undo stack
 * Server automatically saves snapshots before mutations
 * This hook just provides undo functionality
 */
export function useUndoStack({ onStateRestored }) {
  const [canUndo, setCanUndo] = useState(false);
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const [undoing, setUndoing] = useState(false);

  /**
   * Undo the last operation by restoring the previous snapshot
   */
  const undo = useCallback(async () => {
    if (DEBUG_UNDO) {
      console.log('[Undo] Performing undo');
    }
    
    setUndoing(true);
    
    try {
      const response = await fetch('/api/snapshots/undo', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('[Undo] Failed:', data.error);
        return { success: false, error: data.error };
      }
      
      const data = await response.json();
      
      if (DEBUG_UNDO) {
        console.log('[Undo] Restored:', data.message);
      }
      
      // Update undo state
      setCanUndo(data.remainingSnapshots > 0);
      setLastMessage(null); // Will be refreshed on next check
      
      // Notify parent to update UI state
      if (onStateRestored) {
        onStateRestored({
          actors: data.actors,
          sections: data.sections,
          content: data.content,
          message: data.message,
        });
      }
      
      return { success: true, message: data.message };
    } catch (err) {
      console.error('[Undo] Error:', err);
      return { success: false, error: err.message };
    } finally {
      setUndoing(false);
    }
  }, [onStateRestored]);

  /**
   * Refresh undo state from server
   */
  const refreshUndoState = useCallback(async () => {
    try {
      if (DEBUG_UNDO) {
        console.log('[Undo] Refreshing state from server...');
      }
      const response = await fetch('/api/snapshots');
      if (response.ok) {
        const data = await response.json();
        if (DEBUG_UNDO) {
          console.log('[Undo] State refreshed:', data);
        }
        setCanUndo(data.canUndo);
        setLastTimestamp(data.lastTimestamp);
      } else {
        console.error('[Undo] Failed to refresh state:', response.status);
      }
    } catch (err) {
      console.error('[Undo] Error refreshing state:', err);
    }
  }, []);

  return {
    canUndo,
    lastTimestamp,
    undoing,
    undo,
    refreshUndoState,
  };
}
