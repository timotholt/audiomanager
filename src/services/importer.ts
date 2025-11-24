
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import { getProjectPaths } from '../utils/paths.js';
import { generateId } from '../utils/ids.js';
import { appendJsonl, ensureJsonlFile } from '../utils/jsonl.js';
import { validate } from '../utils/validation.js';

export async function importActorsService(projectRoot: string, inputStream: Readable): Promise<number> {
    const paths = getProjectPaths(projectRoot);
    await ensureJsonlFile(paths.catalog.actors);

    const parser = inputStream.pipe(
        parse({
            columns: true,
            trim: true,
            skip_empty_lines: true,
        })
    );

    let count = 0;
    const now = new Date().toISOString();

    for await (const record of parser) {
        const actor = {
            id: generateId(),
            display_name: record.display_name,
            aliases: record.aliases ? record.aliases.split(';').map((s: string) => s.trim()) : [],
            notes: record.notes || '',
            created_at: now,
            updated_at: now,
        };

        const validation = validate('actor', actor);
        if (!validation.valid) {
            console.error(`Invalid actor record: ${JSON.stringify(record)}`);
            console.error(validation.errors);
            continue;
        }

        await appendJsonl(paths.catalog.actors, actor);
        count++;
    }

    return count;
}

export async function importDialoguesService(projectRoot: string, inputStream: Readable): Promise<number> {
    const paths = getProjectPaths(projectRoot);
    await ensureJsonlFile(paths.catalog.dialogues);

    const parser = inputStream.pipe(
        parse({
            columns: true,
            trim: true,
            skip_empty_lines: true,
        })
    );

    let count = 0;
    const now = new Date().toISOString();

    for await (const record of parser) {
        const dialogue = {
            id: generateId(),
            scene: record.scene,
            line_number: record.line_number,
            character: record.character,
            text: record.text,
            context: record.context || '',
            direction: record.direction || '',
            tags: record.tags ? record.tags.split(';').map((s: string) => s.trim()) : [],
            created_at: now,
            updated_at: now,
        };

        const validation = validate('dialogue', dialogue);
        if (!validation.valid) {
            console.error(`Invalid dialogue record: ${JSON.stringify(record)}`);
            console.error(validation.errors);
            continue;
        }

        await appendJsonl(paths.catalog.dialogues, dialogue);
        count++;
    }

    return count;
}
