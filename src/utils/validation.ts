import { z } from 'zod';
import * as Schemas from '../shared/schemas/index.js';

/**
 * Validation result interface
 */
export interface ValidationResult {
    valid: boolean;
    errors?: string[];
}

/**
 * Validates data against a specific Zod schema identified by key
 */
export function validate(schemaKey: string, data: unknown): ValidationResult {
    let schema: z.ZodSchema | undefined;

    switch (schemaKey) {
        case 'actor':
            schema = Schemas.ActorSchema;
            break;
        case 'createActor':
            schema = Schemas.CreateActorSchema;
            break;
        case 'scene':
            schema = Schemas.SceneSchema;
            break;
        case 'section':
            schema = Schemas.SectionSchema;
            break;
        case 'content':
            schema = Schemas.ContentSchema;
            break;
        case 'take':
            schema = Schemas.TakeSchema;
            break;
        case 'defaults':
            schema = Schemas.DefaultsSchema;
            break;
        default:
            throw new Error(`Schema not found for key: ${schemaKey}`);
    }

    const result = schema.safeParse(data);

    if (!result.success) {
        return {
            valid: false,
            errors: result.error.issues.map(err => `${err.path.join('.')}: ${err.message}`)
        };
    }

    return { valid: true };
}
