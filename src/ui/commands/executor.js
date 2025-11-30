import { CommandType } from './types.js';
import { createActor, deleteActor } from '../api/client.js';

const DEBUG_EXECUTOR = false;

/**
 * Execute a command and return the result with inverse command data
 * @param {object} command - { type, payload }
 * @param {object} state - Current app state { actors, sections, content }
 * @returns {Promise<{ success: boolean, result?: any, inverse?: object, error?: string, message: string }>}
 */
export async function executeCommand(command, state) {
  if (DEBUG_EXECUTOR) {
    console.log('[Executor] Executing:', command.type, command.payload);
  }

  switch (command.type) {
    case CommandType.CREATE_ACTOR:
      return executeCreateActor(command.payload);

    case CommandType.DELETE_ACTOR:
      return executeDeleteActor(command.payload, state);

    default:
      return {
        success: false,
        error: `Unknown command type: ${command.type}`,
        message: `Unknown command: ${command.type}`,
      };
  }
}

/**
 * Execute the inverse of a command (for undo)
 * @param {object} command - Original command with inverse data
 * @param {object} state - Current app state
 * @returns {Promise<{ success: boolean, result?: any, error?: string, message: string }>}
 */
export async function executeInverse(command, state) {
  if (DEBUG_EXECUTOR) {
    console.log('[Executor] Executing inverse of:', command.type, command.inverse);
  }

  switch (command.type) {
    case CommandType.CREATE_ACTOR:
      // Inverse of CREATE is DELETE - handle batch (actorIds) or single (actorId)
      if (command.inverse.actorIds && command.inverse.actorIds.length > 0) {
        return executeDeleteActors({ actorIds: command.inverse.actorIds }, state);
      }
      return executeDeleteActor({ actorId: command.inverse.actorId }, state);

    case CommandType.DELETE_ACTOR:
      // Inverse of DELETE is recreate with full data
      return executeRestoreActor(command.inverse);

    default:
      return {
        success: false,
        error: `Cannot undo command type: ${command.type}`,
        message: `Cannot undo: ${command.type}`,
      };
  }
}

// --- Individual command executors ---

async function executeCreateActor(payload) {
  const { displayName, baseFilename } = payload;
  
  try {
    const response = await createActor({ display_name: displayName, base_filename: baseFilename });
    
    // Handle both single actor and batch creation responses
    // Server returns { actor } for single, { actors } for batch (comma-separated names)
    if (response.actors && response.actors.length > 0) {
      // Batch creation - return first actor for now, but store all IDs for undo
      const actors = response.actors;
      return {
        success: true,
        result: { actor: actors[0], actors },
        inverse: { actorIds: actors.map(a => a.id) },
        message: `Created ${actors.length} actor(s): ${actors.map(a => a.display_name).join(', ')}`,
      };
    }
    
    const actor = response.actor;
    return {
      success: true,
      result: { actor },
      inverse: { actorId: actor.id },
      message: `Actor created: ${actor.display_name}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || String(err),
      message: `Failed to create actor: ${err.message || err}`,
    };
  }
}

async function executeDeleteActor(payload, state) {
  const { actorId } = payload;
  
  // Capture current state for inverse (restore)
  const actor = state.actors.find(a => a.id === actorId);
  const sections = state.sections.filter(s => s.actor_id === actorId);
  const content = state.content.filter(c => c.actor_id === actorId);
  
  if (!actor) {
    return {
      success: false,
      error: 'Actor not found',
      message: `Actor not found: ${actorId}`,
    };
  }
  
  try {
    await deleteActor(actorId);
    
    return {
      success: true,
      result: { actorId },
      inverse: { actor, sections, content },
      message: `Actor deleted: ${actor.display_name}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || String(err),
      message: `Failed to delete actor: ${err.message || err}`,
    };
  }
}

async function executeDeleteActors(payload, state) {
  const { actorIds } = payload;
  const deletedIds = [];
  
  for (const actorId of actorIds) {
    try {
      await deleteActor(actorId);
      deletedIds.push(actorId);
    } catch (err) {
      // Continue deleting others even if one fails
      console.error(`Failed to delete actor ${actorId}:`, err);
    }
  }
  
  return {
    success: deletedIds.length > 0,
    result: { actorIds: deletedIds },
    message: `Deleted ${deletedIds.length} actor(s)`,
  };
}

async function executeRestoreActor(inverse) {
  const { actor, sections, content } = inverse;
  
  try {
    // Call server to restore actor with all related data
    const response = await fetch('/api/actors/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actor, sections, content }),
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to restore actor');
    }
    
    const data = await response.json();
    
    return {
      success: true,
      result: { actor: data.actor, sections: data.sections, content: data.content },
      message: `Actor restored: ${actor.display_name}`,
    };
  } catch (err) {
    return {
      success: false,
      error: err.message || String(err),
      message: `Failed to restore actor: ${err.message || err}`,
    };
  }
}
