/**
 * Path Construction Utilities
 * 
 * Constructs file paths for media files based on the v2 schema:
 * {owner_folder}/{content_type}/{section_name}/{name}_{take_number}.{ext}
 */

import { join } from 'path';
import type { ContentType, OwnerType } from '../shared/schemas/index.js';
import type { Actor } from '../shared/schemas/actor.schema.js';
import type { Scene } from '../shared/schemas/scene.schema.js';
import type { Section } from '../shared/schemas/section.schema.js';
import type { Content } from '../shared/schemas/content.schema.js';

/**
 * Get file extension for content type
 */
export function getExtensionForType(contentType: ContentType): string {
    switch (contentType) {
        case 'dialogue':
        case 'music':
        case 'sfx':
            return 'mp3';
        case 'image':
            return 'png';
        case 'video':
            return 'mp4';
        default:
            return 'bin';
    }
}

/**
 * Get owner folder name based on owner type and ID
 */
export function getOwnerFolder(
    ownerType: OwnerType,
    ownerId: string | null,
    ownerBaseFilename?: string
): string {
    switch (ownerType) {
        case 'actor':
            return `actors/${ownerBaseFilename || ownerId || 'unknown'}`;
        case 'scene':
            return `scenes/${ownerId || 'unknown'}`;
        case 'global':
            return 'global';
        default:
            return 'unknown';
    }
}

/**
 * Sanitize filename component (remove special characters)
 */
export function sanitizeFilename(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

/**
 * Construct full path for a take file
 * 
 * @param content - Content object
 * @param section - Section object
 * @param takeNumber - Take number
 * @param ownerBaseFilename - Base filename for actor (optional)
 * @returns Relative path from project root
 * 
 * @example
 * constructTakePath(content, section, 1, 'john')
 * // → 'actors/john/dialogue/main/hello_001.mp3'
 */
export function constructTakePath(
    content: Content,
    section: Section,
    takeNumber: number,
    ownerBaseFilename?: string
): string {
    const ownerFolder = getOwnerFolder(
        content.owner_type,
        content.owner_id,
        ownerBaseFilename
    );

    const contentType = content.content_type;
    const sectionName = sanitizeFilename(section.name);
    const contentName = sanitizeFilename(content.name);
    const takeNum = String(takeNumber).padStart(3, '0');
    const ext = getExtensionForType(contentType);

    return join(ownerFolder, contentType, sectionName, `${contentName}_${takeNum}.${ext}`);
}

/**
 * Construct directory path for a section
 * 
 * @example
 * constructSectionPath(section, 'john')
 * // → 'actors/john/dialogue/main'
 */
export function constructSectionPath(
    section: Section,
    ownerBaseFilename?: string
): string {
    const ownerFolder = getOwnerFolder(
        section.owner_type,
        section.owner_id,
        ownerBaseFilename
    );

    const contentType = section.content_type;
    const sectionName = sanitizeFilename(section.name);

    return join(ownerFolder, contentType, sectionName);
}

/**
 * Construct directory path for an owner
 * 
 * @example
 * constructOwnerPath('actor', 'actor_john', 'john')
 * // → 'actors/john'
 */
export function constructOwnerPath(
    ownerType: OwnerType,
    ownerId: string | null,
    ownerBaseFilename?: string
): string {
    return getOwnerFolder(ownerType, ownerId, ownerBaseFilename);
}

/**
 * Parse take path to extract components
 * 
 * @example
 * parseTakePath('actors/john/dialogue/main/hello_001.mp3')
 * // → { ownerType: 'actor', ownerId: 'john', contentType: 'dialogue', 
 * //     sectionName: 'main', contentName: 'hello', takeNumber: 1, ext: 'mp3' }
 */
export function parseTakePath(path: string): {
    ownerType: OwnerType;
    ownerId: string;
    contentType: string;
    sectionName: string;
    contentName: string;
    takeNumber: number;
    ext: string;
} | null {
    const parts = path.split(/[/\\]/);

    if (parts.length < 5) return null;

    const [ownerTypeFolder, ownerId, contentType, sectionName, filename] = parts;

    const ownerType: OwnerType =
        ownerTypeFolder === 'actors' ? 'actor' :
            ownerTypeFolder === 'scenes' ? 'scene' :
                ownerTypeFolder === 'global' ? 'global' : 'actor';

    const filenameParts = filename.match(/^(.+)_(\d{3})\.([^.]+)$/);
    if (!filenameParts) return null;

    const [, contentName, takeNumStr, ext] = filenameParts;
    const takeNumber = parseInt(takeNumStr, 10);

    return {
        ownerType,
        ownerId,
        contentType,
        sectionName,
        contentName,
        takeNumber,
        ext,
    };
}
