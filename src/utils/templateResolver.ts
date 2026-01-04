/**
 * Template Resolver
 * 
 * Performs variable substitution in string patterns using a standardized context.
 * Supported variables: {name}, {prompt}, {owner_name}, {owner_type}, {section_name}, {content_type}, {take_number}
 */

export type TemplateContext = {
    name: string;
    prompt?: string;
    owner_name: string;
    owner_type: string;
    owner_id?: string | null;
    section_name: string;
    content_type: string;
    take_number?: number;
    actor_base_filename?: string;
};

/**
 * Resolve a template string using the provided context
 * 
 * @param template - String with {curly_braces} variables
 * @param context - Data object for substitution
 * @returns Resolved string
 */
export function resolveTemplate(template: string, context: TemplateContext): string {
    if (!template) return '';

    return template.replace(/{([^{}]+)}/g, (match, key) => {
        const value = context[key as keyof TemplateContext];

        // Handle special formatting for take_number
        if (key === 'take_number' && typeof value === 'number') {
            return String(value).padStart(3, '0');
        }

        return value !== undefined && value !== null ? String(value) : match;
    });
}

/**
 * Build a template context for a specific item
 */
export function buildTemplateContext(
    data: {
        content: any;
        section: any;
        owner: any;
        takeNumber?: number;
    }
): TemplateContext {
    const { content, section, owner, takeNumber } = data;

    const ownerName = owner ? (('display_name' in owner) ? owner.display_name : owner.name) : 'Global';
    const actorBaseFilename = (owner && 'base_filename' in owner) ? owner.base_filename : undefined;

    return {
        name: content.name,
        prompt: content.prompt,
        owner_name: ownerName,
        owner_type: content.owner_type,
        owner_id: content.owner_id,
        section_name: section.name,
        content_type: content.content_type,
        take_number: takeNumber,
        actor_base_filename: actorBaseFilename,
    };
}
