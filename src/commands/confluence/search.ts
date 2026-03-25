import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, requireConfluenceConfig } from '../../config.js';
import { createHttpClient } from '../../http.js';
import { createConfluenceClient } from '../../clients/confluence.js';
import { detectOutputMode, output, formatTable } from '../../output.js';
import type { ConfluenceSearchResult } from '../../types/confluence.js';

function formatHuman(result: ConfluenceSearchResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold(`Found ${result.total} result(s)`) + (result.hasMore ? ' (more available)' : ''));
  lines.push('');

  if (result.results.length === 0) {
    lines.push('No results found.');
    return lines.join('\n');
  }

  const headers = ['Title', 'Space', 'Type', 'Last Modified'];
  const rows = result.results.map(entry => [
    chalk.cyan(entry.title.length > 50 ? entry.title.slice(0, 47) + '...' : entry.title),
    entry.spaceKey,
    entry.type,
    entry.lastModified ? new Date(entry.lastModified).toLocaleDateString() : '-',
  ]);

  lines.push(formatTable(headers, rows));
  return lines.join('\n');
}

export function registerSearchCommand(confluence: Command): void {
  confluence
    .command('search <query>')
    .description('Search Confluence pages using CQL or text')
    .option('-l, --limit <n>', 'Maximum results to return', '10')
    .option('--offset <n>', 'Start at this result index', '0')
    .option('-s, --spaces <spaces>', 'Comma-separated space keys to filter')
    .option('--json', 'Output as JSON')
    .action(async (query: string, opts: { limit: string; offset: string; spaces?: string; json?: boolean }) => {
      const config = loadConfig();
      const confConfig = requireConfluenceConfig(config);
      const http = createHttpClient(confConfig);
      const client = createConfluenceClient(http, confConfig.baseUrl, confConfig.deployment);
      const ctx = detectOutputMode(opts.json);

      const spaces = opts.spaces ? opts.spaces.split(',').map(s => s.trim()) : undefined;
      const result = await client.search(query, {
        limit: parseInt(opts.limit, 10),
        offset: parseInt(opts.offset, 10),
        spaces,
      });

      output(result, formatHuman, ctx);
    });
}
