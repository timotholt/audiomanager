import { useState } from 'react';
import { createActor, updateActor, deleteActor } from '../api/client.js';
import { CommandType } from '../commands/types.js';

export function useActorOperations({ onActorCreated, onActorUpdated, onActorDeleted, expandNode, dispatch }) {
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const createActorWithExpansion = async (actorData) => {
    // If dispatch is available, use command pattern for single actor creation
    if (dispatch && actorData.display_name && !actorData.actors) {
      try {
        setCreating(true);
        setError(null);
        
        const result = await dispatch({
          type: CommandType.CREATE_ACTOR,
          payload: {
            displayName: actorData.display_name,
            baseFilename: actorData.base_filename,
          },
        });
        
        if (result.success && expandNode) {
          expandNode('actors');
        }
        
        if (!result.success) {
          setError(result.error);
        }
        
        return result.success ? { actor: result.result?.actor } : null;
      } catch (err) {
        setError(err.message || String(err));
        throw err;
      } finally {
        setCreating(false);
      }
    }
    
    // Fallback to legacy behavior for batch creation or when dispatch not available
    try {
      setCreating(true);
      setError(null);
      const result = await createActor(actorData);
      
      // Handle batch creation (multiple actors) or single actor
      if (result && onActorCreated) {
        if (result.actors && Array.isArray(result.actors)) {
          // Batch creation - multiple actors
          result.actors.forEach(actor => onActorCreated(actor));
        } else if (result.actor) {
          // Single actor creation
          onActorCreated(result.actor);
        }
        
        // Auto-expand Actors to show the new actor(s)
        if (expandNode) {
          expandNode('actors');
        }
      }
      
      // Show message about duplicates if any were skipped
      if (result.message) {
        setError(result.message);
      }
      
      return result;
    } catch (err) {
      setError(err.message || String(err));
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const updateActorData = async (actorId, updates) => {
    try {
      setError(null);
      const result = await updateActor(actorId, updates);
      if (result && result.actor && onActorUpdated) {
        onActorUpdated(result.actor);
      }
      return result;
    } catch (err) {
      setError(err.message || String(err));
      throw err;
    }
  };

  const deleteActorById = async (actorId) => {
    try {
      setDeleting(true);
      setError(null);
      await deleteActor(actorId);
      if (onActorDeleted) {
        onActorDeleted(actorId);
      }
    } catch (err) {
      setError(err.message || String(err));
      throw err;
    } finally {
      setDeleting(false);
    }
  };

  return {
    creating,
    deleting,
    error,
    setError,
    createActor: createActorWithExpansion,
    updateActor: updateActorData,
    deleteActor: deleteActorById
  };
}
