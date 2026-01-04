import { join } from 'path';
import fs from 'fs-extra';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Actor, Content, Section, Take, Defaults, Scene } from '../../types/index.js';
import { ContentSchema, TakeSchema, ActorSchema, SectionSchema, SceneSchema, DefaultsSchema } from '../../shared/schemas/index.js';
import { readJsonl, appendJsonl, ensureJsonlFile, writeJsonlAll } from '../../utils/jsonl.js';
import { generateId } from '../../utils/ids.js';
import { validate } from '../../utils/validation.js';
import { getAudioProvider } from '../../services/provider-factory.js';
import { writeMetadata, buildMetadataFromTake } from '../../services/audio/metadata.js';
import { resolveDefaultBlock } from '../../utils/defaultBlockResolver.js';
import { buildTemplateContext, resolveTemplate } from '../../utils/templateResolver.js';
import { constructTakePath, constructSectionPath, getExtensionForType } from '../../utils/pathConstruction.js';
import {
  readCatalog,
  saveSnapshot,
  snapshotMessageForContent,
  snapshotMessageForContentUpdate
} from './snapshots.js';

type ProjectContext = { projectRoot: string; paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths> };

export function registerContentRoutes(fastify: FastifyInstance, getProjectContext: () => ProjectContext | null) {
  fastify.get('/api/content', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    const contentItems = await readJsonl<Content>(paths.catalog.content, ContentSchema);

    const query = request.query as { ownerId?: string; ownerType?: string; type?: string; sectionId?: string };
    const ownerId = query.ownerId;
    const ownerType = query.ownerType;
    const type = query.type as Content['content_type'] | undefined;
    const sectionId = query.sectionId;

    const filtered = contentItems.filter((c: Content) => {
      if (ownerId && c.owner_id !== ownerId) return false;
      if (ownerType && c.owner_type !== ownerType) return false;
      if (type && c.content_type !== type) return false;
      if (sectionId && c.section_id !== sectionId) return false;
      return true;
    });

    return { content: filtered };
  });

  fastify.post('/api/content', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    await ensureJsonlFile(paths.catalog.content);

    const body = request.body as Partial<Content> & { names?: string } | null;

    if (!body || !body.owner_type || !body.content_type || !body.section_id || (!body.name && !body.names)) {
      reply.code(400);
      return { error: 'owner_type, content_type, section_id, and name/names are required' };
    }

    const now = new Date().toISOString();

    // Support batch creation
    const inputNames = body.names || body.name || '';
    const allNames = inputNames.split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0);

    if (allNames.length === 0) {
      reply.code(400);
      return { error: 'At least one valid name is required' };
    }

    // Read catalog for snapshots and duplicate checking
    const catalog = await readCatalog(paths);
    const displayNames = allNames.length === 1 ? allNames[0] : `${allNames.length} items`;

    await saveSnapshot(
      paths,
      snapshotMessageForContent('create', body.owner_type as any, body.owner_id ?? null, body.section_id, displayNames, catalog),
      catalog
    );

    // Check for existing content and filter out duplicates
    const existingNames = new Set(
      catalog.content
        .filter(c => c.owner_id === body.owner_id && c.owner_type === body.owner_type as any && c.section_id === body.section_id)
        .map(c => c.name.toLowerCase())
    );

    const names = allNames.filter((n: string) => !existingNames.has(n.toLowerCase()));
    const duplicateNames = allNames.filter((n: string) => existingNames.has(n.toLowerCase()));

    if (names.length === 0) {
      reply.code(400);
      return { error: 'All provided names already exist for this section', duplicates: duplicateNames };
    }

    const createdContent: Content[] = [];

    for (const name of names) {
      const content: Content = {
        id: generateId(),
        owner_type: body.owner_type as any,
        owner_id: body.owner_id ?? null,
        content_type: body.content_type as any,
        section_id: body.section_id,
        name: name,
        prompt: body.prompt || (name.charAt(0).toUpperCase() + name.slice(1)),
        all_approved: false,
        created_at: now,
        updated_at: now,
      };

      const validation = validate('content', content);
      if (!validation.valid) {
        reply.code(400);
        return { error: `Invalid content for name "${name}"`, details: validation.errors };
      }

      await appendJsonl(paths.catalog.content, content, ContentSchema);
      createdContent.push(content);
    }

    const result: { content: Content | Content[]; duplicates_skipped?: string[]; message?: string } = names.length === 1 ? { content: createdContent[0] } : { content: createdContent };

    if (duplicateNames.length > 0) {
      result.duplicates_skipped = duplicateNames;
      result.message = `Created ${names.length} items. Skipped ${duplicateNames.length} duplicates: ${duplicateNames.join(', ')}`;
    }

    return result;
  });

  fastify.put('/api/content/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;

    const { id } = request.params;
    const body = request.body as Partial<Content>;

    if (!body) {
      reply.code(400);
      return { error: 'Request body is required' };
    }

    const catalog = await readCatalog(paths);
    const contentIndex = catalog.content.findIndex(c => c.id === id);

    if (contentIndex === -1) {
      reply.code(404);
      return { error: 'Content not found' };
    }

    const currentContent = catalog.content[contentIndex];

    const updatedContent: Content = {
      ...currentContent,
      ...body,
      id,
      updated_at: new Date().toISOString(),
    };

    // Save snapshot
    const snapshotMessage = snapshotMessageForContentUpdate(
      currentContent.owner_type as any,
      currentContent.owner_id ?? null,
      currentContent.section_id,
      currentContent.name,
      catalog,
      currentContent as unknown as Record<string, unknown>,
      updatedContent as unknown as Record<string, unknown>
    );
    await saveSnapshot(paths, snapshotMessage, catalog);

    const validation = validate('content', updatedContent);
    if (!validation.valid) {
      reply.code(400);
      return { error: 'Invalid content data', details: validation.errors };
    }

    catalog.content[contentIndex] = updatedContent;
    await writeJsonlAll(paths.catalog.content, catalog.content, ContentSchema);

    return { content: updatedContent };
  });

  fastify.delete('/api/content/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    const { id } = request.params;

    const catalog = await readCatalog(paths);
    const contentToDelete = catalog.content.find(c => c.id === id);
    if (!contentToDelete) {
      reply.code(404);
      return { error: 'Content not found' };
    }

    await saveSnapshot(
      paths,
      snapshotMessageForContent('delete', contentToDelete.owner_type as any, contentToDelete.owner_id ?? null, contentToDelete.section_id, contentToDelete.name, catalog),
      catalog
    );

    const remainingContent = catalog.content.filter((c) => c.id !== id);

    const takes = await readJsonl<Take>(paths.catalog.takes);
    const remainingTakes = takes.filter((t) => t.content_id !== id);

    await writeJsonlAll(paths.catalog.content, remainingContent, ContentSchema);
    await writeJsonlAll(paths.catalog.takes, remainingTakes, TakeSchema);

    reply.code(204);
    return null;
  });

  // Generate takes for a specific content item
  // Refactored to use resolveDefaultBlock and constructTakePath
  fastify.post('/api/content/:id/generate', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { projectRoot, paths } = ctx;
    const { id } = request.params;
    const body = request.body as { count?: number } | undefined;
    const count = body?.count || 1;

    try {
      // 1. Load context data
      const catalog = await readCatalog(paths);
      const content = catalog.content.find(c => c.id === id);
      if (!content) {
        reply.code(404);
        return { error: 'Content not found' };
      }

      const section = catalog.sections.find(s => s.id === content.section_id);
      if (!section) {
        reply.code(404);
        return { error: 'Section not found' };
      }

      let owner: Actor | Scene | null = null;
      if (content.owner_type === 'actor' && content.owner_id) {
        owner = catalog.actors.find(a => a.id === content.owner_id) || null;
      } else if (content.owner_type === 'scene' && content.owner_id) {
        owner = catalog.scenes.find(s => s.id === content.owner_id) || null;
      }

      // Load global defaults
      const defaultsPath = join(paths.root, 'defaults.json');
      let globalDefaults: Defaults | null = null;
      if (await fs.pathExists(defaultsPath)) {
        globalDefaults = await fs.readJson(defaultsPath);
      }

      // 2. Resolve Settings
      const resolved = resolveDefaultBlock(content.content_type, content, section, owner, globalDefaults);
      const settings = resolved.settings;

      // 3. Setup Generation
      const provider = await getAudioProvider(projectRoot);
      const takes = await readJsonl<Take>(paths.catalog.takes, TakeSchema);
      const takesForContent = takes.filter(t => t.content_id === content.id);
      let nextTakeNumber = takesForContent.reduce((max, t) => Math.max(max, t.take_number), 0) + 1;

      const generatedTakes: Take[] = [];

      for (let i = 0; i < count; i++) {
        const takeNumber = nextTakeNumber++;

        // 4. Resolve Template Variables
        const templateContext = buildTemplateContext({
          content,
          section,
          owner,
          takeNumber
        });

        const promptTemplate = settings.templates?.prompt || '{prompt}';
        const prompt = resolveTemplate(promptTemplate, templateContext) || content.name;

        // Generate buffer
        let buffer: Buffer;
        if (content.content_type === 'dialogue') {
          if (!settings.voice_id) throw new Error('No voice_id resolved for dialogue');
          buffer = await provider.generateDialogue(prompt, settings.voice_id, {
            stability: settings.stability,
            similarity_boost: settings.similarity_boost
          }, settings.model_id);
        } else if (content.content_type === 'music') {
          buffer = await provider.generateMusic(prompt, { duration_seconds: settings.duration_seconds || 30 });
        } else if (content.content_type === 'sfx') {
          buffer = await provider.generateSFX(prompt, {});
        } else {
          throw new Error(`Generation not supported for ${content.content_type}`);
        }

        // Construct path
        const actorBaseFilename = (owner && 'base_filename' in owner) ? (owner as any).base_filename : undefined;
        const relativePath = constructTakePath(content, section, takeNumber, actorBaseFilename);
        const fullFilePath = join(paths.root, relativePath);
        const folderPath = join(projectRoot, join(paths.root, relativePath), '..');

        // Save file
        await fs.ensureDir(folderPath);
        await fs.writeFile(fullFilePath, buffer);

        // Analyze file
        const { probeAudio } = await import('../../services/audio/ffprobe.js');
        const { hashFile } = await import('../../services/audio/hash.js');
        const probeResult = await probeAudio(fullFilePath);
        const hash = await hashFile(fullFilePath);

        const now = new Date().toISOString();
        const primaryStream = probeResult.streams[0];

        // Create Take object with full provenance
        const take: Take = {
          id: generateId(),
          content_id: content.id,
          take_number: takeNumber,
          filename: join(relativePath).split(/[/\\]/).pop() || 'file.mp3',
          path: relativePath,
          status: 'new',
          format: getExtensionForType(content.content_type) as any,
          size_bytes: buffer.length,
          duration_sec: probeResult.format.duration || 0,
          hash_sha256: hash,
          sample_rate: (primaryStream?.sample_rate ? Number(primaryStream.sample_rate) : 41000) as any,
          channels: (primaryStream?.channels || 1) as any,
          bit_depth: 16, // Default
          lufs_integrated: 0,
          peak_dbfs: 0,
          generation_params: {
            provider: settings.provider as any,
            resolved_from: resolved.resolvedFrom as any,
            full_settings: settings,
            prompt: prompt,
            owner_type: content.owner_type,
            owner_id: content.owner_id ?? null,
            owner_name: owner ? (('display_name' in owner) ? (owner as any).display_name : (owner as any).name) : 'Global',
            section_name: section.name,
            generated_at: now
          },
          created_at: now,
          updated_at: now,
        };

        const takeValidation = validate('take', take);
        if (!takeValidation.valid) {
          console.error('Generated invalid take:', takeValidation.errors);
        }

        await appendJsonl(paths.catalog.takes, take, TakeSchema);

        // Write metadata
        try {
          const metadata = buildMetadataFromTake(take as any, content as any, {
            actor_name: owner ? (('display_name' in owner) ? (owner as any).display_name : (owner as any).name) : 'Global',
            section_name: section.name,
          });
          await writeMetadata(fullFilePath, fullFilePath, metadata);
        } catch (mErr) {
          fastify.log.warn(mErr, 'Failed to write metadata');
        }

        generatedTakes.push(take);
      }

      return { takes: generatedTakes };
    } catch (err) {
      request.log.error(err);
      reply.code(500);
      return { error: (err as Error).message };
    }
  });
}
