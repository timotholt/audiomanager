import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Actor, Section, Content, Take } from '../../types/index.js';
import { readJsonl, appendJsonl, ensureJsonlFile, writeJsonlAll } from '../../utils/jsonl.js';
import { generateId } from '../../utils/ids.js';
import { saveSnapshotBeforeWrite } from './snapshots.js';

type ProjectContext = { projectRoot: string; paths: ReturnType<typeof import('../../utils/paths.js').getProjectPaths> };

export function registerSectionRoutes(fastify: FastifyInstance, getProjectContext: () => ProjectContext | null) {
  fastify.get('/api/sections', async (_request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    const sections = await readJsonl<Section>(paths.catalog.sections);
    return { sections };
  });

  fastify.post('/api/sections', async (request: FastifyRequest, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    await ensureJsonlFile(paths.catalog.sections);

    const body = request.body as {
      actor_id: string;
      content_type: 'dialogue' | 'music' | 'sfx';
      name?: string;
    };
    
    if (!body || !body.actor_id || !body.content_type) {
      reply.code(400);
      return { error: 'actor_id and content_type are required' };
    }

    // Get actor name for message
    const actors = await readJsonl<Actor>(paths.catalog.actors);
    const actor = actors.find(a => a.id === body.actor_id);
    const actorName = actor?.display_name || 'Unknown';
    const sectionName = body.name || body.content_type;

    // Save snapshot before mutation
    await saveSnapshotBeforeWrite(paths, `Create section: ${actorName} → ${sectionName}`);

    const now = new Date().toISOString();
    const section: Section = {
      id: generateId(),
      actor_id: body.actor_id,
      content_type: body.content_type,
      name: body.name,
      created_at: now,
      updated_at: now,
    };

    await appendJsonl(paths.catalog.sections, section);
    return { section };
  });

  fastify.put('/api/sections/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;
    
    const { id } = request.params as { id: string };
    const body = request.body as Partial<Section>;
    
    if (!body) {
      reply.code(400);
      return { error: 'Request body is required' };
    }

    const sections = await readJsonl<Section>(paths.catalog.sections);
    const sectionIndex = sections.findIndex(s => s.id === id);
    
    if (sectionIndex === -1) {
      reply.code(404);
      return { error: 'Section not found' };
    }

    // Check for duplicate section names if name is being updated
    const currentSection = sections[sectionIndex];
    if (body.name) {
      const duplicateSection = sections.find(s => 
        s.id !== id && 
        s.actor_id === currentSection.actor_id && 
        s.name === body.name
      );
      
      if (duplicateSection) {
        reply.code(400);
        return { error: `A section with the name "${body.name}" already exists for this actor` };
      }
    }

    // Build descriptive message
    const actors = await readJsonl<Actor>(paths.catalog.actors);
    const actor = actors.find(a => a.id === currentSection.actor_id);
    const actorName = actor?.display_name || 'Unknown';
    let snapshotMessage = `Update section: ${actorName} → ${currentSection.name || currentSection.content_type}`;
    if (body.name && body.name !== currentSection.name) {
      snapshotMessage = `Rename section: ${actorName} → ${currentSection.name || currentSection.content_type} → ${body.name}`;
    }

    // Save snapshot before mutation
    await saveSnapshotBeforeWrite(paths, snapshotMessage);

    // Update the section with new data
    const updatedSection: Section = {
      ...sections[sectionIndex],
      ...body,
      id, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };

    // Replace the section in the array
    sections[sectionIndex] = updatedSection;

    // Write back to file
    await writeJsonlAll(paths.catalog.sections, sections);

    return { section: updatedSection };
  });

  fastify.delete('/api/sections/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const ctx = getProjectContext();
    if (!ctx) {
      reply.code(400);
      return { error: 'No project selected' };
    }
    const { paths } = ctx;

    const { id } = request.params as { id: string };

    const sections = await readJsonl<Section>(paths.catalog.sections);
    const section = sections.find(s => s.id === id);
    if (!section) {
      reply.code(404);
      return { error: 'Section not found' };
    }

    // Build descriptive message
    const actors = await readJsonl<Actor>(paths.catalog.actors);
    const actor = actors.find(a => a.id === section.actor_id);
    const actorName = actor?.display_name || 'Unknown';
    const sectionName = section.name || section.content_type;

    // Save snapshot before mutation
    await saveSnapshotBeforeWrite(paths, `Delete section: ${actorName} → ${sectionName}`);

    const contentItems = await readJsonl<Content>(paths.catalog.content);
    const takes = await readJsonl<Take>(paths.catalog.takes);

    // Remove section
    const remainingSections = sections.filter(s => s.id !== id);
    
    // Remove all content in this section (now keyed by section_id)
    const removedContent = contentItems.filter(c => c.section_id === section.id);
    const removedContentIds = new Set(removedContent.map(c => c.id));
    const remainingContent = contentItems.filter(c => !removedContentIds.has(c.id));
    
    // Remove all takes for removed content
    const remainingTakes = takes.filter(t => !removedContentIds.has(t.content_id));

    await ensureJsonlFile(paths.catalog.sections);
    await ensureJsonlFile(paths.catalog.content);
    await ensureJsonlFile(paths.catalog.takes);

    await writeJsonlAll(paths.catalog.sections, remainingSections);
    await writeJsonlAll(paths.catalog.content, remainingContent);
    await writeJsonlAll(paths.catalog.takes, remainingTakes);

    reply.code(204);
    return null;
  });
}
