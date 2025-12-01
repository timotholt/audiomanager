import { join } from 'path';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readJsonl, ensureJsonlFile, writeJsonlAll } from '../../utils/jsonl.js';
import type { Actor, Content, Section } from '../../types/index.js';

const DEBUG_SNAPSHOT = true;

interface Snapshot {
  id: string;
  timestamp: string;
  message: string;
  actors: Actor[];
  sections: Section[];
  content: Content[];
}

type ProjectContext = { projectRoot: string; paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths> };

const MAX_SNAPSHOTS = 50;

/**
 * Save a snapshot of all catalog files - call this before any mutation
 * @param paths - Project paths
 * @param message - Description of the operation about to happen (e.g., "Create actor: Tim")
 */
export async function saveSnapshotBeforeWrite(
  paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths>,
  message: string
): Promise<void> {
  const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
  const redoPath = join(paths.vof.dir, 'redo-snapshots.jsonl');
  
  try {
    // Clear redo stack on new mutation
    const fs = await import('fs-extra').then(m => m.default);
    await fs.writeFile(redoPath, '', 'utf8');
    
    // Read current state of all catalog files
    const [actors, sections, content] = await Promise.all([
      readJsonl<Actor>(paths.catalog.actors).catch(() => [] as Actor[]),
      readJsonl<Section>(paths.catalog.sections).catch(() => [] as Section[]),
      readJsonl<Content>(paths.catalog.content).catch(() => [] as Content[]),
    ]);

    const snapshot: Snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message,
      actors,
      sections,
      content,
    };

    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Saving snapshot before write:', message);
    }

    // Read existing snapshots
    await ensureJsonlFile(snapshotPath);
    let snapshots: Snapshot[] = await readJsonl<Snapshot>(snapshotPath).catch(() => [] as Snapshot[]);

    // Add new snapshot
    snapshots.push(snapshot);

    // Trim to max size
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots = snapshots.slice(-MAX_SNAPSHOTS);
    }

    // Write back (use fs directly to avoid recursion)
    const snapshotContent = snapshots.map(s => JSON.stringify(s)).join('\n') + '\n';
    await fs.writeFile(snapshotPath, snapshotContent, 'utf8');

    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Saved, total snapshots:', snapshots.length);
    }
  } catch (err) {
    console.error('[Snapshot] Failed to save snapshot:', err);
    // Don't throw - we don't want to block the actual write
  }
}

export function registerSnapshotRoutes(fastify: FastifyInstance, getProjectContext: () => ProjectContext | null) {
  
  // Get snapshot stack info
  fastify.get('/api/snapshots', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    
    const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
    const redoPath = join(paths.vof.dir, 'redo-snapshots.jsonl');
    await ensureJsonlFile(snapshotPath);
    await ensureJsonlFile(redoPath);
    
    const snapshots = await readJsonl<Snapshot>(snapshotPath);
    const redoSnapshots = await readJsonl<Snapshot>(redoPath);
    const lastSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    const lastRedoSnapshot = redoSnapshots.length > 0 ? redoSnapshots[redoSnapshots.length - 1] : null;
    
    return { 
      count: snapshots.length,
      canUndo: snapshots.length > 0,
      undoMessage: lastSnapshot?.message || null,
      canRedo: redoSnapshots.length > 0,
      redoMessage: lastRedoSnapshot?.message || null,
    };
  });

  // Undo - restore last snapshot, save current to redo
  fastify.post('/api/snapshots/undo', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    
    const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
    const redoPath = join(paths.vof.dir, 'redo-snapshots.jsonl');
    await ensureJsonlFile(snapshotPath);
    await ensureJsonlFile(redoPath);
    
    const snapshots = await readJsonl<Snapshot>(snapshotPath);
    
    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Undo requested, total snapshots:', snapshots.length);
    }
    
    if (snapshots.length === 0) {
      reply.code(400);
      return { error: 'Nothing to undo' };
    }
    
    // Save current state to redo stack before restoring
    const [currentActors, currentSections, currentContent] = await Promise.all([
      readJsonl<Actor>(paths.catalog.actors).catch(() => [] as Actor[]),
      readJsonl<Section>(paths.catalog.sections).catch(() => [] as Section[]),
      readJsonl<Content>(paths.catalog.content).catch(() => [] as Content[]),
    ]);
    
    // Pop the last snapshot (this is what we're undoing)
    const snapshot = snapshots.pop()!;
    
    // Create redo snapshot with the operation message (what was done, now being undone)
    const redoSnapshot: Snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: snapshot.message, // Same message - this is what we're undoing
      actors: currentActors,
      sections: currentSections,
      content: currentContent,
    };
    
    // Add to redo stack
    let redoSnapshots = await readJsonl<Snapshot>(redoPath).catch(() => [] as Snapshot[]);
    redoSnapshots.push(redoSnapshot);
    if (redoSnapshots.length > MAX_SNAPSHOTS) {
      redoSnapshots = redoSnapshots.slice(-MAX_SNAPSHOTS);
    }
    await writeJsonlAll(redoPath, redoSnapshots);
    
    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Undoing:', snapshot.message);
      console.log('[Snapshot] Restoring to:', snapshot.timestamp);
      console.log('[Snapshot] Actors:', snapshot.actors.length);
      console.log('[Snapshot] Sections:', snapshot.sections.length);
      console.log('[Snapshot] Content:', snapshot.content.length);
    }
    
    // Restore state from snapshot
    await writeJsonlAll(paths.catalog.actors, snapshot.actors);
    await writeJsonlAll(paths.catalog.sections, snapshot.sections);
    await writeJsonlAll(paths.catalog.content, snapshot.content);
    
    // Save remaining snapshots
    await writeJsonlAll(snapshotPath, snapshots);
    
    // Get next undo message
    const nextSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    
    // Return the restored state
    return {
      success: true,
      message: `Undid: ${snapshot.message}`,
      actors: snapshot.actors,
      sections: snapshot.sections,
      content: snapshot.content,
      canUndo: snapshots.length > 0,
      undoMessage: nextSnapshot?.message || null,
      canRedo: true,
      redoMessage: redoSnapshot.message,
    };
  });

  // Redo - restore from redo stack, save current to undo
  fastify.post('/api/snapshots/redo', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    
    const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
    const redoPath = join(paths.vof.dir, 'redo-snapshots.jsonl');
    await ensureJsonlFile(snapshotPath);
    await ensureJsonlFile(redoPath);
    
    const redoSnapshots = await readJsonl<Snapshot>(redoPath);
    
    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Redo requested, total redo snapshots:', redoSnapshots.length);
    }
    
    if (redoSnapshots.length === 0) {
      reply.code(400);
      return { error: 'Nothing to redo' };
    }
    
    // Save current state to undo stack before restoring
    const [currentActors, currentSections, currentContent] = await Promise.all([
      readJsonl<Actor>(paths.catalog.actors).catch(() => [] as Actor[]),
      readJsonl<Section>(paths.catalog.sections).catch(() => [] as Section[]),
      readJsonl<Content>(paths.catalog.content).catch(() => [] as Content[]),
    ]);
    
    // Pop the last redo snapshot
    const redoSnapshot = redoSnapshots.pop()!;
    
    // Create undo snapshot
    const undoSnapshot: Snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message: redoSnapshot.message,
      actors: currentActors,
      sections: currentSections,
      content: currentContent,
    };
    
    // Add to undo stack
    let snapshots = await readJsonl<Snapshot>(snapshotPath).catch(() => [] as Snapshot[]);
    snapshots.push(undoSnapshot);
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots = snapshots.slice(-MAX_SNAPSHOTS);
    }
    await writeJsonlAll(snapshotPath, snapshots);
    
    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Redoing:', redoSnapshot.message);
      console.log('[Snapshot] Restoring to:', redoSnapshot.timestamp);
    }
    
    // Restore state from redo snapshot
    await writeJsonlAll(paths.catalog.actors, redoSnapshot.actors);
    await writeJsonlAll(paths.catalog.sections, redoSnapshot.sections);
    await writeJsonlAll(paths.catalog.content, redoSnapshot.content);
    
    // Save remaining redo snapshots
    await writeJsonlAll(redoPath, redoSnapshots);
    
    // Get next redo message
    const nextRedoSnapshot = redoSnapshots.length > 0 ? redoSnapshots[redoSnapshots.length - 1] : null;
    
    // Return the restored state
    return {
      success: true,
      message: `Redid: ${redoSnapshot.message}`,
      actors: redoSnapshot.actors,
      sections: redoSnapshot.sections,
      content: redoSnapshot.content,
      canUndo: true,
      undoMessage: undoSnapshot.message,
      canRedo: redoSnapshots.length > 0,
      redoMessage: nextRedoSnapshot?.message || null,
    };
  });

  // Clear all snapshots
  fastify.delete('/api/snapshots', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    
    const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
    await writeJsonlAll(snapshotPath, []);
    
    return { success: true };
  });
}
