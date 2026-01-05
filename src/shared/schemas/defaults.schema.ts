import { z } from 'zod';
import { MediaTypeSchema, DefaultBlockSchema } from './common.schema.js';

// ============================================================================
// Defaults.json Schema
// ============================================================================

export const DefaultsSchema = z.object({
    schema_version: z.string().default('2.0.0'),

    // Global defaults for each content type
    content_types: z.object({
        dialogue: DefaultBlockSchema.optional(),
        music: DefaultBlockSchema.optional(),
        sfx: DefaultBlockSchema.optional(),
        image: DefaultBlockSchema.optional(),
        video: DefaultBlockSchema.optional(),
        text: DefaultBlockSchema.optional(),
    }),

    // Templates for creating new entities
    templates: z.object({
        actor: z.object({
            auto_add_blocks: z.array(MediaTypeSchema).default(['dialogue']),
        }).optional(),

        scene: z.object({
            auto_add_blocks: z.array(MediaTypeSchema).default([]),
        }).optional(),
    }).optional(),
});

// ============================================================================
// Type Inference
// ============================================================================

export type Defaults = z.infer<typeof DefaultsSchema>;
