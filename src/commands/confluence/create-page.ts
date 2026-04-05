import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, requireConfluenceConfig } from '../../config.js';
import { createHttpClient } from '../../http.js';
import { createConfluenceClient } from '../../clients/confluence.js';
import { detectOutputMode, output, resolveBody } from '../../output.js';
import type { ConfluenceCreatePageResult } from '../../types/confluence.js';

function formatHuman(result: ConfluenceCreatePageResult): string {
  return [
    chalk.green('Page created successfully'),
    '',
    `  ID:      ${result.id}`,
    `  Title:   ${result.title}`,
    `  Version: ${result.version}`,
    `  URL:     ${result.url}`,
  ].join('\n');
}

export function registerCreatePageCommand(confluence: Command): void {
  confluence
    .command('create-page')
    .description('Create a new Confluence page')
    .requiredOption('-s, --space <key>', 'Space key')
    .requiredOption('--title <title>', 'Page title')
    .requiredOption('-b, --body <content>', 'Page body content (use "-" to read from stdin)')
    .option('--parent-id <id>', 'Parent page ID')
    .option('--format <format>', 'Body format: markdown (default) or storage', 'markdown')
    .action(async (opts: {
      space: string;
      title: string;
      body: string;
      parentId?: string;
      format: string;
    }, command: Command) => {
      const config = loadConfig();
      const confConfig = requireConfluenceConfig(config);
      const http = createHttpClient(confConfig);
      const client = createConfluenceClient(http, confConfig.baseUrl, confConfig.deployment);
      const ctx = detectOutputMode(command.optsWithGlobals().json);

      const body = await resolveBody(opts.body);
      const format = opts.format === 'storage' ? 'storage' as const : 'markdown' as const;

      const result = await client.createPage({
        spaceKey: opts.space,
        title: opts.title,
        body,
        parentId: opts.parentId,
        format,
      });

      output(result, formatHuman, ctx);
    });
}
