import type { Command } from 'commander';
import { registerSearchCommand } from './search.js';
import { registerGetPageCommand } from './get-page.js';
import { registerDownloadAttachmentsCommand } from './download-attachments.js';

export function registerConfluenceCommands(program: Command): void {
  const confluence = program
    .command('confluence')
    .alias('conf')
    .description('Confluence commands');

  registerSearchCommand(confluence);
  registerGetPageCommand(confluence);
  registerDownloadAttachmentsCommand(confluence);
}
