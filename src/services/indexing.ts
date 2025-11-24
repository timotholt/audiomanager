import fs from 'fs-extra';
import { join } from 'path';
import { getProjectPaths } from '../utils/paths.js';
import { readJsonl } from '../utils/jsonl.js';
import { Actor, Dialogue, Pair } from '../types/index.js';

export async function rebuildIndexesService(projectRoot: string): Promise<void> {
    const paths = getProjectPaths(projectRoot);

    // Clear existing indexes
    await fs.emptyDir(paths.catalog.indexes.dir);
    await fs.ensureDir(join(paths.catalog.indexes.dir, 'by_actor'));
    await fs.ensureDir(join(paths.catalog.indexes.dir, 'by_dialogue'));
    await fs.ensureDir(join(paths.catalog.indexes.dir, 'by_pair'));

    // Read all data
    const actors = await readJsonl<Actor>(paths.catalog.actors);
    const dialogues = await readJsonl<Dialogue>(paths.catalog.dialogues);
    const pairs = await readJsonl<Pair>(paths.catalog.pairs);

    // Build Actor Index
    for (const actor of actors) {
        const actorPairs = pairs.filter((p) => p.actor_id === actor.id);
        const indexData = {
            actor_id: actor.id,
            pair_ids: actorPairs.map((p) => p.id),
            pair_count: actorPairs.length,
            last_updated: new Date().toISOString(),
        };
        await fs.writeJson(paths.catalog.indexes.byActor(actor.id), indexData, { spaces: 2 });
    }

    // Build Dialogue Index
    for (const dialogue of dialogues) {
        const dialoguePairs = pairs.filter((p) => p.dialogue_id === dialogue.id);
        const indexData = {
            dialogue_id: dialogue.id,
            pair_ids: dialoguePairs.map((p) => p.id),
            pair_count: dialoguePairs.length,
            last_updated: new Date().toISOString(),
        };
        await fs.writeJson(paths.catalog.indexes.byDialogue(dialogue.id), indexData, { spaces: 2 });
    }

    // Build Pair Index
    for (const pair of pairs) {
        const indexData = {
            pair_id: pair.id,
            actor_id: pair.actor_id,
            dialogue_id: pair.dialogue_id,
            state: pair.state,
            complete: pair.complete,
            approved_take_ids: pair.approved_take_ids,
            last_updated: new Date().toISOString(),
        };
        await fs.writeJson(paths.catalog.indexes.byPair(pair.id), indexData, { spaces: 2 });
    }

    console.log('Indexes rebuilt.');
}
