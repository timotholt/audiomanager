import { Command } from 'commander';
import fs from 'fs-extra';
import { importActorsService } from '../../services/importer.js';

export const importActorsCommand = new Command('actors')
    .description('Import actors from a CSV file')
    .argument('<file>', 'Path to CSV file')
    .action(async (file) => {
        if (!fs.existsSync(file)) {
            console.error(`File not found: ${file}`);
            process.exit(1);
        }

        const projectRoot = process.cwd();
        const inputStream = fs.createReadStream(file);

        try {
            const count = await importActorsService(projectRoot, inputStream);
            console.log(`Imported ${count} actors.`);
        } catch (error) {
            console.error('Import failed:', error);
            process.exit(1);
        }
    });
