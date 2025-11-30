// Command types for undoable operations
export const CommandType = {
  CREATE_ACTOR: 'CREATE_ACTOR',
  DELETE_ACTOR: 'DELETE_ACTOR',
  UPDATE_ACTOR: 'UPDATE_ACTOR',
  CREATE_SECTION: 'CREATE_SECTION',
  DELETE_SECTION: 'DELETE_SECTION',
  UPDATE_SECTION: 'UPDATE_SECTION',
  CREATE_CONTENT: 'CREATE_CONTENT',
  DELETE_CONTENT: 'DELETE_CONTENT',
  UPDATE_CONTENT: 'UPDATE_CONTENT',
};

// Entry types in history
export const EntryType = {
  OPERATION: 'operation',  // Undoable operation
  UNDO: 'undo',            // Log of an undo action (not undoable)
  REDO: 'redo',            // Log of a redo action (not undoable)
  LOG: 'log',              // Non-undoable log (errors, info, etc.)
};

// Log levels (same as before)
export const LogType = {
  INFO: 'info',
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
};
