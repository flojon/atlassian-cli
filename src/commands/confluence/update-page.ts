import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, requireConfluenceConfig } from '../../config.js';
import { createHttpClient } from '../../http.js';
import { createConfluenceClient } from '../../clients/confluence.js';
import { detectOutputMode, output, resolveBody } from '../../output.js';
import type { ConfluenceCreatePageResult } from '../../types/confluence.js';

function formatHuman(result: ConfluenceCreatePageResult): string {
  return [
    chalk.green('Page updated successfully'),
    '',
    `  ID:      ${result.id}`,
    `  Title:   ${result.title}`,
    `  Version: ${result.version}`,
    `  URL:     ${result.url}`,
  ].join('\n');
}

export function registerUpdatePageCommand(confluence: Command): void {
  confluence
    .command('update-page')
    .description('Update an existing Confluence page')
    .requiredOption('--id <pageId>', 'Page ID')
    .requiredOption('-b, --body <content>', 'New page body (use "-" to read from stdin)')
    .option('--title <title>', 'New page title')
    .option('--format <format>', 'Body format: markdown (default) or storage', 'markdown')
    .option('--version <n>', 'Version number (auto-detected if omitted)')
    .action(async (opts: {
      id: string;
      body: string;
      title?: string;
      format: string;
      version?: string;
    }, command: Command) => {
      const config = loadConfig();
      const confConfig = requireConfluenceConfig(config);
      const http = createHttpClient(confConfig);
      const client = createConfluenceClient(http, confConfig.baseUrl, confConfig.deployment);
      const ctx = detectOutputMode(command.optsWithGlobals().json);

      const body = await resolveBody(opts.body);
      const format = opts.format === 'storage' ? 'storage' as const : 'markdown' as const;
      const version = opts.version ? parseInt(opts.version, 10) : undefined;

      const result = await client.updatePage(opts.id, body, {
        title: opts.title,
        format,
        version,
      });

      output(result, formatHuman, ctx);
    });
}
