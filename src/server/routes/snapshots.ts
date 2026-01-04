import { join } from 'path';
import fs from 'fs-extra';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { readJsonl, ensureJsonlFile, writeJsonlAll } from '../../utils/jsonl.js';
import type { Actor, Content, Section, Scene } from '../../types/index.js';
import {
  buildActorPath,
  buildScenePath,
  buildSectionPath,
  buildContentPath,
  type PathContext
} from '../../utils/pathBuilder.js';
import { describeChanges } from '../../utils/diffDescriber.js';
import {
  ActorSchema,
  SectionSchema,
  ContentSchema,
  SceneSchema
} from '../../shared/schemas/index.js';
import type { OwnerType } from '../../shared/schemas/common.schema.js';

const DEBUG_SNAPSHOT = false;

interface Snapshot {
  id: string;
  timestamp: string;
  message: string;
  actors: Actor[];
  sections: Section[];
  content: Content[];
  scenes: Scene[];
}

/** Cached catalog data to avoid redundant reads */
export interface CatalogCache {
  actors: Actor[];
  sections: Section[];
  content: Content[];
  scenes: Scene[];
}

type ProjectPaths = ReturnType<typeof import('../../utils/paths.js').getProjectPaths>;
type ProjectContext = { projectRoot: string; paths: ProjectPaths };

const MAX_SNAPSHOTS = 50;

/**
 * Read all catalog files and return cached data
 */
export async function readCatalog(paths: ProjectPaths): Promise<CatalogCache> {
  const [actors, sections, content, scenes] = await Promise.all([
    readJsonl<Actor>(paths.catalog.actors, ActorSchema).catch(() => [] as Actor[]),
    readJsonl<Section>(paths.catalog.sections, SectionSchema).catch(() => [] as Section[]),
    readJsonl<Content>(paths.catalog.content, ContentSchema).catch(() => [] as Content[]),
    readJsonl<Scene>(paths.catalog.scenes, SceneSchema).catch(() => [] as Scene[]),
  ]);
  return { actors, sections, content, scenes };
}

/**
 * Build snapshot message for actor operations
 */
export function snapshotMessageForActor(
  operation: 'create' | 'delete' | 'update' | 'rename',
  actorName: string,
  newName?: string
): string {
  switch (operation) {
    case 'create': return `Create actor: ${actorName}`;
    case 'delete': return `Delete actor: ${actorName}`;
    case 'rename': return `Rename actor: ${actorName} → ${newName}`;
    case 'update': return `Update actor: ${actorName}`;
  }
}

/**
 * Build snapshot message for scene operations
 */
export function snapshotMessageForScene(
  operation: 'create' | 'delete' | 'update' | 'rename',
  sceneName: string,
  newName?: string
): string {
  switch (operation) {
    case 'create': return `Create scene: ${sceneName}`;
    case 'delete': return `Delete scene: ${sceneName}`;
    case 'rename': return `Rename scene: ${sceneName} → ${newName}`;
    case 'update': return `Update scene: ${sceneName}`;
  }
}

/**
 * Build snapshot message for section operations
 */
export function snapshotMessageForSection(
  operation: 'create' | 'delete' | 'update' | 'rename',
  ownerType: OwnerType,
  ownerId: string | null,
  sectionName: string,
  ctx: PathContext,
  newName?: string
): string {
  const path = buildSectionPath(ownerType, ownerId, sectionName, ctx);
  switch (operation) {
    case 'create': return `Create section: ${path}`;
    case 'delete': return `Delete section: ${path}`;
    case 'rename': return `Rename section: ${path} → ${newName}`;
    case 'update': return `Update section: ${path}`;
  }
}

/**
 * Build snapshot message for content operations
 */
export function snapshotMessageForContent(
  operation: 'create' | 'delete' | 'update' | 'rename',
  ownerType: OwnerType,
  ownerId: string | null,
  sectionId: string,
  contentName: string,
  ctx: PathContext,
  newName?: string
): string {
  const path = buildContentPath(ownerType, ownerId, sectionId, contentName, ctx);
  switch (operation) {
    case 'create': return `Create content: ${path}`;
    case 'delete': return `Delete content: ${path}`;
    case 'rename': return `Rename cue: ${path} → ${newName}`;
    case 'update': return `Update content: ${path}`;
  }
}

/**
 * Build snapshot message for section update with diff details
 */
export function snapshotMessageForSectionUpdate(
  ownerType: OwnerType,
  ownerId: string | null,
  sectionName: string,
  ctx: PathContext,
  oldSection: Record<string, unknown>,
  newSection: Record<string, unknown>
): string {
  const path = buildSectionPath(ownerType, ownerId, sectionName, ctx);
  const diff = describeChanges(oldSection, newSection);
  return `${path} updated: ${diff.changes.join(', ')}`;
}

/**
 * Build snapshot message for actor update with diff details
 */
export function snapshotMessageForActorUpdate(
  actorName: string,
  oldActor: Record<string, unknown>,
  newActor: Record<string, unknown>
): string {
  const path = `actor → ${actorName}`;
  const diff = describeChanges(oldActor, newActor);
  return `${path} updated: ${diff.changes.join(', ')}`;
}

/**
 * Build snapshot message for content update with diff details
 */
export function snapshotMessageForContentUpdate(
  ownerType: OwnerType,
  ownerId: string | null,
  sectionId: string,
  contentName: string,
  ctx: PathContext,
  oldContent: Record<string, unknown>,
  newContent: Record<string, unknown>
): string {
  const path = buildContentPath(ownerType, ownerId, sectionId, contentName, ctx);
  const diff = describeChanges(oldContent, newContent);
  return `${path} updated: ${diff.changes.join(', ')}`;
}

/**
 * Save a snapshot using pre-read catalog data
 */
export async function saveSnapshot(
  paths: ProjectPaths,
  message: string,
  catalog: CatalogCache
): Promise<void> {
  const snapshotPath = paths.catalog.snapshots;
  const redoPath = paths.catalog.redoSnapshots;

  try {
    await fs.writeFile(redoPath, '', 'utf8');

    const snapshot: Snapshot = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      message,
      actors: catalog.actors,
      sections: catalog.sections,
      content: catalog.content,
      scenes: catalog.scenes,
    };

    await ensureJsonlFile(snapshotPath);
    let snapshots = await readJsonl<Snapshot>(snapshotPath).catch(() => []);

    snapshots.push(snapshot);
    if (snapshots.length > MAX_SNAPSHOTS) {
      snapshots = snapshots.slice(-MAX_SNAPSHOTS);
    }

    await fs.writeFile(snapshotPath, snapshots.map(s => JSON.stringify(s)).join('\n') + '\n', 'utf8');
  } catch (err) {
    console.error('[Snapshot] Failed to save snapshot:', err);
  }
}

export function registerSnapshotRoutes(fastify: FastifyInstance, getProjectContext: () => ProjectContext | null) {
  fastify.get('/api/snapshots', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;

    const snapshots = await readJsonl<Snapshot>(paths.catalog.snapshots);
    const redoSnapshots = await readJsonl<Snapshot>(paths.catalog.redoSnapshots);
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

  fastify.post('/api/snapshots/undo', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;

    const snapshots = await readJsonl<Snapshot>(paths.catalog.snapshots);
    if (snapshots.length === 0) {
      reply.code(400);
      return { error: 'Nothing to undo' };
    }

    const currentCatalog = await readCatalog(paths);
    const snapshot = snapshots.pop()!;

    // Save current to redo
    const redoSnapshot: Snapshot = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      message: snapshot.message,
      ...currentCatalog
    };

    const redoSnapshots = await readJsonl<Snapshot>(paths.catalog.redoSnapshots);
    redoSnapshots.push(redoSnapshot);
    await writeJsonlAll(paths.catalog.redoSnapshots, redoSnapshots.slice(-MAX_SNAPSHOTS));

    // Restore catalog
    await writeJsonlAll(paths.catalog.actors, snapshot.actors, ActorSchema);
    await writeJsonlAll(paths.catalog.sections, snapshot.sections, SectionSchema);
    await writeJsonlAll(paths.catalog.content, snapshot.content, ContentSchema);
    await writeJsonlAll(paths.catalog.scenes, snapshot.scenes, SceneSchema);
    await writeJsonlAll(paths.catalog.snapshots, snapshots);

    return {
      success: true,
      message: `UNDO: ${snapshot.message}`,
      ...snapshot,
      canUndo: snapshots.length > 0,
      canRedo: true,
    };
  });

  fastify.post('/api/snapshots/redo', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;

    const redoSnapshots = await readJsonl<Snapshot>(paths.catalog.redoSnapshots);
    if (redoSnapshots.length === 0) {
      reply.code(400);
      return { error: 'Nothing to redo' };
    }

    const currentCatalog = await readCatalog(paths);
    const redoSnapshot = redoSnapshots.pop()!;

    // Save current to undo
    const undoSnapshot: Snapshot = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      message: redoSnapshot.message,
      ...currentCatalog
    };

    const snapshots = await readJsonl<Snapshot>(paths.catalog.snapshots);
    snapshots.push(undoSnapshot);
    await writeJsonlAll(paths.catalog.snapshots, snapshots.slice(-MAX_SNAPSHOTS));

    // Restore from redo
    await writeJsonlAll(paths.catalog.actors, redoSnapshot.actors, ActorSchema);
    await writeJsonlAll(paths.catalog.sections, redoSnapshot.sections, SectionSchema);
    await writeJsonlAll(paths.catalog.content, redoSnapshot.content, ContentSchema);
    await writeJsonlAll(paths.catalog.scenes, redoSnapshot.scenes, SceneSchema);
    await writeJsonlAll(paths.catalog.redoSnapshots, redoSnapshots);

    return {
      success: true,
      message: `REDO: ${redoSnapshot.message}`,
      ...redoSnapshot,
      canUndo: true,
      canRedo: redoSnapshots.length > 0,
    };
  });
}
