import { z } from 'zod';
import {
  ActorSchema,
  SceneSchema,
  SectionSchema,
  ContentSchema,
  TakeSchema,
  DefaultsSchema
} from '../../shared/schemas/index.js';

export async function fetchJson(path: string) {
  const res = await fetch(path);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * Actors
 */
export async function getActors() {
  const data = await fetchJson('/api/actors');
  return {
    actors: z.array(ActorSchema).parse(data.actors)
  };
}

export async function createActor(payload: any) {
  const res = await fetch('/api/actors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  });
  if (!res.ok) throw new Error(`Failed to create actor: ${await res.text()}`);
  const data = await res.json();
  return {
    actor: ActorSchema.parse(data.actor),
    actors: data.actors ? z.array(ActorSchema).parse(data.actors) : undefined,
    duplicates_skipped: data.duplicates_skipped as string[] | undefined,
    message: data.message as string | undefined
  };
}

export async function updateActor(id: string, payload: any) {
  const res = await fetch(`/api/actors/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update actor: ${await res.text()}`);
  const data = await res.json();
  return { actor: ActorSchema.parse(data.actor) };
}

export async function deleteActor(id: string) {
  const res = await fetch(`/api/actors/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete actor`);
}

/**
 * Scenes
 */
export async function getScenes() {
  const data = await fetchJson('/api/scenes');
  return {
    scenes: z.array(SceneSchema).parse(data.scenes)
  };
}

export async function createScene(payload: any) {
  const res = await fetch('/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create scene`);
  const data = await res.json();
  return { scene: SceneSchema.parse(data.scene) };
}

export async function updateScene(id: string, payload: any) {
  const res = await fetch(`/api/scenes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update scene`);
  const data = await res.json();
  return { scene: SceneSchema.parse(data.scene) };
}

export async function deleteScene(id: string) {
  const res = await fetch(`/api/scenes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete scene`);
}

/**
 * Sections
 */
export async function getSections() {
  const data = await fetchJson('/api/sections');
  return {
    sections: z.array(SectionSchema).parse(data.sections)
  };
}

export async function createSection(payload: any) {
  const res = await fetch('/api/sections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create section`);
  const data = await res.json();
  return { section: SectionSchema.parse(data.section) };
}

export async function updateSection(id: string, payload: any) {
  const res = await fetch(`/api/sections/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update section`);
  const data = await res.json();
  return { section: SectionSchema.parse(data.section) };
}

export async function deleteSection(id: string) {
  const res = await fetch(`/api/sections/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete section`);
}

/**
 * Content
 */
export async function getContent(params: { ownerId?: string, ownerType?: string, type?: string, sectionId?: string } = {}) {
  const urlParams = new URLSearchParams();
  if (params.ownerId) urlParams.set('ownerId', params.ownerId);
  if (params.ownerType) urlParams.set('ownerType', params.ownerType);
  if (params.type) urlParams.set('type', params.type);
  if (params.sectionId) urlParams.set('sectionId', params.sectionId);

  const data = await fetchJson(`/api/content${urlParams.toString() ? '?' + urlParams : ''}`);
  return {
    content: z.array(ContentSchema).parse(data.content)
  };
}

export async function createContent(payload: any) {
  const res = await fetch('/api/content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to create content`);
  const data = await res.json();
  return {
    content: Array.isArray(data.content)
      ? z.array(ContentSchema).parse(data.content)
      : ContentSchema.parse(data.content),
    duplicates_skipped: data.duplicates_skipped as string[] | undefined,
    message: data.message as string | undefined
  };
}

export async function updateContent(id: string, payload: any) {
  const res = await fetch(`/api/content/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update content`);
  const data = await res.json();
  return { content: ContentSchema.parse(data.content) };
}

export async function deleteContent(id: string) {
  const res = await fetch(`/api/content/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete content`);
}

/**
 * Takes
 */
export async function getTakes(contentId?: string) {
  const params = contentId ? `?contentId=${encodeURIComponent(contentId)}` : '';
  const data = await fetchJson(`/api/takes${params}`);
  return {
    takes: z.array(TakeSchema).parse(data.takes)
  };
}

export async function updateTake(id: string, payload: any) {
  const res = await fetch(`/api/takes/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update take`);
  const data = await res.json();
  return { take: TakeSchema.parse(data.take) };
}

export async function deleteTake(id: string) {
  const res = await fetch(`/api/takes/${encodeURIComponent(id)}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 204) throw new Error(`Failed to delete take`);
}

export async function generateTakes(contentId: string, count = 1) {
  const res = await fetch(`/api/content/${encodeURIComponent(contentId)}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });
  if (!res.ok) throw new Error(`Failed to generate takes`);
  const data = await res.json();
  return {
    takes: z.array(TakeSchema).parse(data.takes)
  };
}

/**
 * Defaults
 */
export async function getGlobalDefaults() {
  const data = await fetchJson('/api/defaults');
  return {
    defaults: DefaultsSchema.parse(data.defaults)
  };
}

export async function updateGlobalDefaults(payload: any) {
  const res = await fetch('/api/defaults', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to update defaults`);
  const data = await res.json();
  return { defaults: DefaultsSchema.parse(data.defaults) };
}

export async function updateContentTypeDefaults(contentType: string, settings: any) {
  const res = await fetch(`/api/defaults/${encodeURIComponent(contentType)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to update content type defaults`);
  const data = await res.json();
  return { defaults: DefaultsSchema.parse(data.defaults) };
}

/**
 * Provider & Voices
 */
export function getProviderCredits() {
  return fetchJson('/api/provider/credits');
}

export async function getVoices() {
  return fetchJson('/api/voices');
}

export async function previewVoice(voiceId: string, text: string, stability?: number, similarityBoost?: number, modelId?: string) {
  const res = await fetch('/api/voices/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      voice_id: voiceId,
      text: text,
      stability,
      similarity_boost: similarityBoost,
      model_id: modelId
    }),
  });
  if (!res.ok) throw new Error(`Failed to preview voice`);
  return res.json();
}

/**
 * Projects
 */
export function getProjects() {
  return fetchJson('/api/projects');
}

export async function createProject(name: string) {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to create project`);
  return res.json();
}

export function getCurrentProject() {
  return fetchJson('/api/projects/current');
}

export async function switchProject(name: string) {
  const res = await fetch('/api/projects/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) throw new Error(`Failed to switch project`);
  return res.json();
}

/**
 * Batch operations
 */
export async function previewBackfillTakes(options: { ownerId?: string, ownerType?: string, sectionId?: string, contentId?: string } = {}) {
  const params = new URLSearchParams();
  if (options.ownerId) params.set('owner_id', options.ownerId);
  if (options.ownerType) params.set('owner_type', options.ownerType);
  if (options.sectionId) params.set('section_id', options.sectionId);
  if (options.contentId) params.set('content_id', options.contentId);

  return fetchJson(`/api/batch/backfill-takes/preview?${params}`);
}

export async function backfillTakes(options: { ownerId?: string, ownerType?: string, sectionId?: string, contentId?: string } = {}) {
  const params = new URLSearchParams();
  if (options.ownerId) params.set('owner_id', options.ownerId);
  if (options.ownerType) params.set('owner_type', options.ownerType);
  if (options.sectionId) params.set('section_id', options.sectionId);
  if (options.contentId) params.set('content_id', options.contentId);

  const res = await fetch(`/api/batch/backfill-takes?${params}`, { method: 'POST' });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || `Failed to backfill takes`);
  }
  return res.json();
}
