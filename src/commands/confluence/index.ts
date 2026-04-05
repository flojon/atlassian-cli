import type { Command } from 'commander';
import { registerSearchCommand } from './search.js';
import { registerGetPageCommand } from './get-page.js';
import { registerDownloadAttachmentsCommand } from './download-attachments.js';
import { registerCreatePageCommand } from './create-page.js';
import { registerUpdatePageCommand } from './update-page.js';
import { registerAddCommentCommand } from './add-comment.js';

export function registerConfluenceCommands(program: Command): void {
  const confluence = program
    .command('confluence')
    .alias('conf')
    .description('Confluence commands');

  registerSearchCommand(confluence);
  registerGetPageCommand(confluence);
  registerDownloadAttachmentsCommand(confluence);
  registerCreatePageCommand(confluence);
  registerUpdatePageCommand(confluence);
  registerAddCommentCommand(confluence);
}
