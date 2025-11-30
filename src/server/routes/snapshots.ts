import { join } from 'path';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readJsonl, ensureJsonlFile, writeJsonlAll } from '../../utils/jsonl.js';
import type { Actor, Content, Section } from '../../types/index.js';

const DEBUG_SNAPSHOT = true;

interface Snapshot {
  id: string;
  timestamp: string;
  actors: Actor[];
  sections: Section[];
  content: Content[];
}

type ProjectContext = { projectRoot: string; paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths> };

const MAX_SNAPSHOTS = 50;

/**
 * Save a snapshot of all catalog files - call this before any mutation
 */
export async function saveSnapshotBeforeWrite(paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths>): Promise<void> {
  const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
  
  try {
    // Read current state of all catalog files
    const [actors, sections, content] = await Promise.all([
      readJsonl<Actor>(paths.catalog.actors).catch(() => [] as Actor[]),
      readJsonl<Section>(paths.catalog.sections).catch(() => [] as Section[]),
      readJsonl<Content>(paths.catalog.content).catch(() => [] as Content[]),
    ]);

    const snapshot: Snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      actors,
      sections,
      content,
    };

    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Saving snapshot before write');
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
    const fs = await import('fs-extra').then(m => m.default);
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
  
  // Get snapshot stack info (count and last message)
  fastify.get('/api/snapshots', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    
    const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
    await ensureJsonlFile(snapshotPath);
    
    const snapshots = await readJsonl<Snapshot>(snapshotPath);
    const lastSnapshot = snapshots.length > 0 ? snapshots[snapshots.length - 1] : null;
    
    return { 
      count: snapshots.length,
      canUndo: snapshots.length > 0,
      lastTimestamp: lastSnapshot?.timestamp || null,
    };
  });

  // Undo - restore last snapshot
  fastify.post('/api/snapshots/undo', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    
    const snapshotPath = join(paths.vof.dir, 'snapshots.jsonl');
    await ensureJsonlFile(snapshotPath);
    
    const snapshots = await readJsonl<Snapshot>(snapshotPath);
    
    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Undo requested, total snapshots:', snapshots.length);
    }
    
    if (snapshots.length === 0) {
      reply.code(400);
      return { error: 'Nothing to undo' };
    }
    
    // Pop the last snapshot
    const snapshot = snapshots.pop()!;
    
    if (DEBUG_SNAPSHOT) {
      console.log('[Snapshot] Restoring snapshot from:', snapshot.timestamp);
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
    
    // Return the restored state
    return {
      success: true,
      message: `Restored to ${new Date(snapshot.timestamp).toLocaleTimeString()}`,
      actors: snapshot.actors,
      sections: snapshot.sections,
      content: snapshot.content,
      remainingSnapshots: snapshots.length,
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
