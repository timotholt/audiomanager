import { join } from 'path';
import fs from 'fs-extra';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Bin, Media, Take } from '../../types/index.js';
import { readJsonl } from '../../utils/jsonl.js';
import { validateReferences } from '../../utils/validation.js';
import { readCatalog } from './snapshots.js';

type ProjectContext = { projectRoot: string; paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths> };

interface BackfillResult {
  media_id: string;
  actor_name: string;
  bin_name: string;
  current_undecided: number;
  min_candidates: number;
  needed: number;
  generated: number;
  error?: string;
}

interface BackfillResponse {
  success: boolean;
  total_generated: number;
  items: BackfillResult[];
  errors: string[];
}

export function registerBatchRoutes(fastify: FastifyInstance, getProjectContext: () => ProjectContext | null) {
  /**
   * POST /api/batch/backfill-takes
   * 
   * For each media item that is not yet complete (all_approved = false):
   * - Count undecided takes (status = 'new')
   * - If undecided < min_candidates, generate (min_candidates - undecided) new takes
   * 
   * Query params:
   * - actor_id: optional, limit to specific actor
   * - bin_id: optional, limit to specific bin
   * - media_id: optional, limit to specific media item
   * - dry_run: if true, just return what would be generated without generating
   */
  fastify.post('/api/batch/backfill-takes', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;

    const query = request.query as {
      actor_id?: string;
      bin_id?: string;
      media_id?: string;
      dry_run?: string;
    };
    const filterActorId = query.actor_id;
    const filterBinId = query.bin_id;
    const filterMediaId = query.media_id;
    const dryRun = query.dry_run === 'true';

    // Load full catalog for validation and processing
    const catalog = await readCatalog(paths);

    // Validate filters
    const ri = validateReferences(query, catalog);
    if (!ri.valid) {
      reply.code(400);
      return { error: 'Invalid filter ID', details: ri.errors };
    }

    // Load global defaults if needed for resolution
    const defaultsPath = join(paths.root, 'defaults.json');
    let globalDefaults: any = null;
    if (await fs.pathExists(defaultsPath)) {
      globalDefaults = await fs.readJson(defaultsPath);
    }

    // Filter media to process
    let targetMedia = catalog.media.filter(m => !m.all_approved);

    if (filterMediaId) {
      targetMedia = targetMedia.filter(m => m.id === filterMediaId);
    }
    if (filterBinId) {
      targetMedia = targetMedia.filter(m => m.bin_id === filterBinId);
    }
    if (filterActorId) {
      targetMedia = targetMedia.filter(m => m.owner_id === filterActorId && m.owner_type === 'actor');
    }

    const results: BackfillResult[] = [];
    const errors: string[] = [];
    let totalGenerated = 0;

    const takes = await readJsonl<Take>(paths.catalog.takes);

    const actorsById = new Map(catalog.actors.map(a => [a.id, a]));
    const binsById = new Map(catalog.bins.map(b => [b.id, b]));
    const scenesById = new Map(catalog.scenes.map(s => [s.id, s]));

    for (const media of targetMedia) {
      let owner: any = null;
      if (media.owner_type === 'actor') owner = actorsById.get(media.owner_id!);
      else if (media.owner_type === 'scene') owner = scenesById.get(media.owner_id!);

      const bin = binsById.get(media.bin_id);

      if (!bin) {
        errors.push(`Media ${media.id}: Missing bin`);
        continue;
      }

      // Use the standard block resolver to determine needed counts
      const { resolveDefaultBlock } = await import('../../utils/defaultBlockResolver.js');
      const resolved = resolveDefaultBlock(media.media_type, media, bin, owner, globalDefaults);
      const settings = resolved.settings;

      const minCandidates = settings.min_candidates ?? 1;
      const minApprovedTakes = settings.approval_count_default ?? 1;

      // Count takes by status
      const mediaTakes = takes.filter(t => t.media_id === media.id);
      const undecidedCount = mediaTakes.filter(t => t.status === 'new').length;
      const approvedCount = mediaTakes.filter(t => t.status === 'approved').length;

      // Don't backfill if we already have enough approved takes
      let needed = 0;
      if (approvedCount < minApprovedTakes) {
        needed = Math.max(0, minCandidates - undecidedCount);
      }

      const ownerName = owner ? (owner.display_name || owner.name) : 'Global';

      const result: BackfillResult = {
        media_id: media.id,
        actor_name: ownerName,
        bin_name: bin.name || bin.media_type,
        current_undecided: undecidedCount,
        min_candidates: minCandidates,
        needed,
        generated: 0,
      };

      if (needed > 0 && !dryRun) {
        try {
          const generateResponse = await fastify.inject({
            method: 'POST',
            url: `/api/media/${media.id}/generate`,
            payload: { count: needed },
          });

          if (generateResponse.statusCode === 200) {
            const generateResult = JSON.parse(generateResponse.body);
            result.generated = generateResult.takes?.length || 0;
            totalGenerated += result.generated;
          } else {
            const errorBody = JSON.parse(generateResponse.body);
            result.error = errorBody.error || `HTTP ${generateResponse.statusCode}`;
            errors.push(`${ownerName} → ${bin.name || bin.media_type} → ${media.id}: ${result.error}`);
          }
        } catch (err) {
          result.error = (err as Error).message;
          errors.push(`${ownerName} → ${bin.name || bin.media_type} → ${media.id}: ${result.error}`);
        }
      } else if (needed > 0 && dryRun) {
        result.generated = needed;
        totalGenerated += needed;
      }

      results.push(result);
    }

    const response: BackfillResponse = {
      success: errors.length === 0,
      total_generated: totalGenerated,
      items: results,
      errors,
    };

    return response;
  });

  fastify.get('/api/batch/backfill-takes/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }

    const query = request.query as {
      actor_id?: string;
      bin_id?: string;
      media_id?: string;
    };

    const response = await fastify.inject({
      method: 'POST',
      url: '/api/batch/backfill-takes',
      query: { ...query, dry_run: 'true' },
    });

    reply.code(response.statusCode);
    return JSON.parse(response.body);
  });
}
