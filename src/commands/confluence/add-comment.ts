import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, requireConfluenceConfig } from '../../config.js';
import { createHttpClient } from '../../http.js';
import { createConfluenceClient } from '../../clients/confluence.js';
import { detectOutputMode, output, resolveBody } from '../../output.js';
import type { ConfluenceAddCommentResult } from '../../types/confluence.js';

function formatHuman(result: ConfluenceAddCommentResult): string {
  return [
    chalk.green('Comment added successfully'),
    '',
    `  ID:      ${result.id}`,
    `  Author:  ${result.author}`,
    `  Created: ${result.created}`,
  ].join('\n');
}

export function registerAddCommentCommand(confluence: Command): void {
  confluence
    .command('add-comment <body>')
    .description('Add a comment to a Confluence page (use "-" as body to read from stdin)')
    .requiredOption('--page-id <id>', 'Page ID')
    .option('--parent-comment-id <id>', 'Parent comment ID (for threaded replies)')
    .action(async (bodyArg: string, opts: {
      pageId: string;
      parentCommentId?: string;
    }, command: Command) => {
      const config = loadConfig();
      const confConfig = requireConfluenceConfig(config);
      const http = createHttpClient(confConfig);
      const client = createConfluenceClient(http, confConfig.baseUrl, confConfig.deployment);
      const ctx = detectOutputMode(command.optsWithGlobals().json);

      const body = await resolveBody(bodyArg);
      const result = await client.addComment(opts.pageId, body, {
        parentCommentId: opts.parentCommentId,
      });

      output(result, formatHuman, ctx);
    });
}
