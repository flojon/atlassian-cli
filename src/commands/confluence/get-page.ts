import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, requireConfluenceConfig } from '../../config.js';
import { createHttpClient } from '../../http.js';
import { createConfluenceClient } from '../../clients/confluence.js';
import { detectOutputMode, output } from '../../output.js';
import type { ConfluencePage } from '../../types/confluence.js';

function formatHuman(page: ConfluencePage): string {
  const lines: string[] = [];

  lines.push(chalk.bold(page.title));
  lines.push(chalk.dim(`Space: ${page.spaceKey} (${page.spaceName})  |  Version: ${page.version}  |  Modified: ${page.lastModified}`));
  if (page.lastModifiedBy) {
    lines.push(chalk.dim(`By: ${page.lastModifiedBy}`));
  }
  lines.push(chalk.dim(page.url));
  lines.push('');
  lines.push(page.body);

  if (page.images.length > 0) {
    lines.push('');
    lines.push(chalk.bold(`Images (${page.images.length}):`));
    for (const img of page.images) {
      const size = img.fileSize ? ` (${(img.fileSize / 1024).toFixed(1)} KB)` : '';
      const type = img.mediaType ? ` [${img.mediaType}]` : '';
      lines.push(`  - ${img.filename}${type}${size} — ${img.url}`);
    }
  }

  // Show non-image attachments (images are already listed above)
  const nonImageAttachments = page.attachments.filter(a => !a.mediaType.startsWith('image/'));
  if (nonImageAttachments.length > 0) {
    lines.push('');
    lines.push(chalk.bold(`Attachments (${nonImageAttachments.length}):`));
    for (const att of nonImageAttachments) {
      const size = att.fileSize > 0 ? ` (${(att.fileSize / 1024).toFixed(1)} KB)` : '';
      lines.push(`  - ${att.title} [${att.mediaType}]${size} — ${att.downloadUrl}`);
    }
  }

  return lines.join('\n');
}

export function registerGetPageCommand(confluence: Command): void {
  confluence
    .command('get-page')
    .description('Get a Confluence page by ID or title+space')
    .option('--id <pageId>', 'Page ID')
    .option('--title <title>', 'Page title (use with --space)')
    .option('--space <spaceKey>', 'Space key (use with --title)')
    .option('--raw', 'Return raw HTML instead of markdown')
    .action(async (opts: { id?: string; title?: string; space?: string; raw?: boolean }, command: Command) => {
      const config = loadConfig();
      const confConfig = requireConfluenceConfig(config);
      const http = createHttpClient(confConfig);
      const client = createConfluenceClient(http, confConfig.baseUrl, confConfig.deployment);
      const ctx = detectOutputMode(command.optsWithGlobals().json);

      const page = await client.getPage({
        id: opts.id,
        title: opts.title,
        spaceKey: opts.space,
        convertToMarkdown: !opts.raw,
      });

      output(page, formatHuman, ctx);
    });
}
