import { join } from 'path';
import fs from 'fs-extra';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Take, Content } from '../../types/index.js';
import { TakeSchema } from '../../shared/schemas/index.js';
import { readJsonl, appendJsonl, ensureJsonlFile, writeJsonlAll } from '../../utils/jsonl.js';
import { generateId } from '../../utils/ids.js';
import { validate } from '../../utils/validation.js';
import { readCatalog, saveSnapshot } from './snapshots.js';
import { describeChanges } from '../../utils/diffDescriber.js';
import { updateMetadata } from '../../services/audio/metadata.js';
import { buildContentPath } from '../../utils/pathBuilder.js';

type ProjectContext = { projectRoot: string; paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths> };

export function registerTakeRoutes(fastify: FastifyInstance, getProjectContext: () => ProjectContext | null) {
  fastify.get('/api/takes', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    const takes = await readJsonl<Take>(paths.catalog.takes, TakeSchema);

    const query = request.query as { contentId?: string };
    const contentId = query.contentId;

    const filtered = contentId ? takes.filter((t) => t.content_id === contentId) : takes;

    return { takes: filtered };
  });

  fastify.put('/api/takes/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;

    const { id } = request.params;
    const body = request.body as Partial<Take>;

    if (!body) {
      reply.code(400);
      return { error: 'Request body is required' };
    }

    const catalog = await readCatalog(paths);
    const takes = await readJsonl<Take>(paths.catalog.takes, TakeSchema);
    const takeIndex = takes.findIndex(t => t.id === id);

    if (takeIndex === -1) {
      reply.code(404);
      return { error: 'Take not found' };
    }

    const currentTake = takes[takeIndex];
    const updatedTake: Take = {
      ...currentTake,
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };

    // Find context for snapshot message
    const content = catalog.content.find(c => c.id === currentTake.content_id);
    let snapshotMessage = '';

    if (content) {
      const displayPath = buildContentPath(content.owner_type, content.owner_id || null, content.section_id, content.name, catalog);
      const diff = describeChanges(currentTake as any, updatedTake as any);
      const changeDesc = diff.changes.length > 0 ? diff.changes[0] : 'updated';
      snapshotMessage = `${displayPath} → Take ${currentTake.take_number}: ${changeDesc}`;
    } else {
      snapshotMessage = `Take ${currentTake.id}: updated`;
    }

    await saveSnapshot(paths, snapshotMessage, catalog);

    const validation = validate('take', updatedTake);
    if (!validation.valid) {
      reply.code(400);
      return { error: 'Invalid take data', details: validation.errors };
    }

    takes[takeIndex] = updatedTake;
    await writeJsonlAll(paths.catalog.takes, takes, TakeSchema);

    // Update metadata in audio file
    try {
      const fullPath = join(ctx.projectRoot, updatedTake.path);
      if (await fs.pathExists(fullPath)) {
        await updateMetadata(fullPath, {
          status: updatedTake.status,
          updated_at: updatedTake.updated_at,
        });
      }
    } catch (metaErr) {
      request.log.warn({ err: metaErr, takeId: id }, 'Failed to update metadata in audio file');
    }

    return { take: updatedTake };
  });

  fastify.delete('/api/takes/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    const { id } = request.params;

    const takes = await readJsonl<Take>(paths.catalog.takes, TakeSchema);
    const takeIndex = takes.findIndex(t => t.id === id);

    if (takeIndex === -1) {
      reply.code(404);
      return { error: 'Take not found' };
    }

    const deletedTake = takes[takeIndex];
    takes.splice(takeIndex, 1);
    await writeJsonlAll(paths.catalog.takes, takes, TakeSchema);

    // Optional: Delete physical file
    try {
      const fullPath = join(ctx.projectRoot, deletedTake.path);
      if (await fs.pathExists(fullPath)) {
        await fs.remove(fullPath);
      }
    } catch (err) {
      console.error('Failed to delete physical take file:', err);
    }

    reply.code(204);
    return;
  });
}
