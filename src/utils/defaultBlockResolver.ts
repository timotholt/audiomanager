/**
 * Default Block Resolution
 * 
 * Resolves provider settings for content generation by walking up the
 * inheritance chain: Section → Owner (Actor/Scene) → Global → Hardcoded
 */

import type { ContentType, DefaultBlock, DefaultBlocks } from '../shared/schemas/index.js';
import type { Content } from '../shared/schemas/content.schema.js';
import type { Actor } from '../shared/schemas/actor.schema.js';
import type { Scene } from '../shared/schemas/scene.schema.js';
import type { Section } from '../shared/schemas/section.schema.js';
import type { Defaults } from '../shared/schemas/defaults.schema.js';

/**
 * Hardcoded fallback defaults (used when nothing else is configured)
 */
const HARDCODED_DEFAULTS: Record<ContentType, DefaultBlock> = {
    dialogue: {
        provider: 'elevenlabs',
        model_id: 'eleven_multilingual_v2',
        stability: 0.5,
        similarity_boost: 0.75,
        min_candidates: 1,
        approval_count_default: 1,
    },
    music: {
        provider: 'elevenlabs',
        duration_seconds: 30,
        min_candidates: 1,
        approval_count_default: 1,
    },
    sfx: {
        provider: 'elevenlabs',
        min_candidates: 1,
        approval_count_default: 1,
    },
    image: {
        provider: 'openai',
        model: 'dall-e-3',
        style: 'natural',
        quality: 'standard',
        size: '1024x1024',
        min_candidates: 1,
        approval_count_default: 1,
    },
    video: {
        provider: 'runway',
        model: 'gen-3-alpha',
        duration_seconds: 5,
        aspect_ratio: '16:9',
        fps: 24,
        min_candidates: 1,
        approval_count_default: 1,
    },
};

export type ResolvedBlock = {
    settings: DefaultBlock;
    resolvedFrom: 'content' | 'section' | 'owner' | 'global' | 'hardcoded';
    sourceName?: string;
};

/**
 * Deep merge templates object
 */
function mergeTemplates(base: any, overrides: any) {
    if (!overrides) return base;
    return {
        ...(base || {}),
        ...overrides
    };
}

/**
 * Resolve default block for a content type using property-level inheritance
 * 
 * Resolution Order:
 * 1. Hardcoded Fallback (Base)
 * 2. Global Defaults
 * 3. Owner (Actor/Scene) Overrides
 * 4. Section Overrides
 * 5. Content Overrides
 * 
 * A property is only overridden if it is explicitly defined and not set to "inherit"
 * (Note: "inherit" primarily applies to the "provider" field in this version)
 * 
 * @param contentType - Type of content being generated
 * @param content - Specific content item (optional overrides)
 * @param section - Section containing the content
 * @param owner - Owner (Actor or Scene) of the section
 * @param globalDefaults - Global defaults from defaults.json
 * @returns Resolved settings and provenance info
 */
export function resolveDefaultBlock(
    contentType: ContentType,
    content?: Content | null,
    section?: Section | null,
    owner?: Actor | Scene | null,
    globalDefaults?: Defaults | null
): ResolvedBlock {
    let settings = { ...HARDCODED_DEFAULTS[contentType] };
    let resolvedFrom: ResolvedBlock['resolvedFrom'] = 'hardcoded';
    let sourceName = 'System Defaults';

    // 1. Global Defaults
    if (globalDefaults?.content_types?.[contentType]) {
        const globalBlock = globalDefaults.content_types[contentType];
        const { templates, ...rest } = globalBlock;
        settings = {
            ...settings,
            ...rest,
            templates: mergeTemplates(settings.templates, templates)
        };
        resolvedFrom = 'global';
        sourceName = 'Global Defaults';
    }

    // 2. Owner Overrides
    if (owner?.default_blocks?.[contentType]) {
        const ownerBlock = owner.default_blocks[contentType];
        if (ownerBlock.provider !== 'inherit') {
            const { templates, ...rest } = ownerBlock;
            settings = {
                ...settings,
                ...rest,
                templates: mergeTemplates(settings.templates, templates)
            };
            resolvedFrom = 'owner';
            sourceName = 'display_name' in owner ? owner.display_name : owner.name;
        } else {
            // Inherit provider from global, but merge other fields
            const { provider, templates, ...rest } = ownerBlock;
            settings = {
                ...settings,
                ...rest,
                templates: mergeTemplates(settings.templates, templates)
            };
        }
    }

    // 3. Section Overrides
    if (section?.default_blocks?.[contentType]) {
        const sectionBlock = section.default_blocks[contentType];
        if (sectionBlock.provider !== 'inherit') {
            const { templates, ...rest } = sectionBlock;
            settings = {
                ...settings,
                ...rest,
                templates: mergeTemplates(settings.templates, templates)
            };
            resolvedFrom = 'section';
            sourceName = section.name;
        } else {
            const { provider, templates, ...rest } = sectionBlock;
            settings = {
                ...settings,
                ...rest,
                templates: mergeTemplates(settings.templates, templates)
            };
        }
    }

    // 4. Content Overrides
    if (content?.default_blocks?.[contentType]) {
        const contentBlock = content.default_blocks[contentType];
        if (contentBlock.provider !== 'inherit') {
            const { templates, ...rest } = contentBlock;
            settings = {
                ...settings,
                ...rest,
                templates: mergeTemplates(settings.templates, templates)
            };
            resolvedFrom = 'content';
            sourceName = content.name;
        } else {
            const { provider, templates, ...rest } = contentBlock;
            settings = {
                ...settings,
                ...rest,
                templates: mergeTemplates(settings.templates, templates)
            };
        }
    }

    return {
        settings,
        resolvedFrom,
        sourceName,
    };
}

/**
 * Merge default block with overrides
 * Useful for applying content-specific overrides on top of inherited settings
 */
export function mergeDefaultBlocks(
    base: DefaultBlock,
    overrides: Partial<DefaultBlock>
): DefaultBlock {
    return {
        ...base,
        ...overrides,
    };
}

/**
 * Check if a default block is set to inherit
 */
export function isInheritBlock(block?: DefaultBlock | null): boolean {
    return block?.provider === 'inherit';
}

/**
 * Get all content types that have default blocks configured
 */
export function getConfiguredContentTypes(
    defaultBlocks?: DefaultBlocks | null
): ContentType[] {
    if (!defaultBlocks) return [];
    return Object.keys(defaultBlocks).filter(
        (key) => !isInheritBlock(defaultBlocks[key as ContentType])
    ) as ContentType[];
}
