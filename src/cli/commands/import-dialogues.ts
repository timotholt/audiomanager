import { Command } from 'commander';
import fs from 'fs-extra';
import { importDialoguesService } from '../../services/importer.js';

export const importDialoguesCommand = new Command('dialogues')
    .description('Import dialogues from a CSV file')
    .argument('<file>', 'Path to CSV file')
    .action(async (file) => {
        if (!fs.existsSync(file)) {
            console.error(`File not found: ${file}`);
            process.exit(1);
        }

        const projectRoot = process.cwd();
        const inputStream = fs.createReadStream(file);

        try {
            const count = await importDialoguesService(projectRoot, inputStream);
            console.log(`Imported ${count} dialogues.`);
        } catch (error) {
            console.error('Import failed:', error);
            process.exit(1);
        }
    });
