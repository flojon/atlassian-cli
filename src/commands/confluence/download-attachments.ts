import { basename, join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, requireConfluenceConfig } from '../../config.js';
import { createHttpClient } from '../../http.js';
import { createConfluenceClient } from '../../clients/confluence.js';
import { detectOutputMode, output } from '../../output.js';
import type { ConfluenceAttachment } from '../../types/confluence.js';

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp', '.tiff']);

function isImage(filename: string): boolean {
  const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}

interface DownloadResult {
  pageId: string;
  outputDir: string;
  downloaded: Array<{
    filename: string;
    path: string;
    mediaType: string;
    fileSize: number;
  }>;
}

function formatHuman(result: DownloadResult): string {
  const lines: string[] = [];

  lines.push(chalk.bold(`Downloaded ${result.downloaded.length} attachment(s)`));
  lines.push(chalk.dim(`Page: ${result.pageId}  |  Directory: ${result.outputDir}`));
  lines.push('');

  if (result.downloaded.length === 0) {
    lines.push('No attachments matched the filter.');
    return lines.join('\n');
  }

  for (const file of result.downloaded) {
    const size = file.fileSize > 0
      ? ` (${(file.fileSize / 1024).toFixed(1)} KB)`
      : '';
    lines.push(`  ${chalk.green('✓')} ${file.filename}${size}`);
  }

  return lines.join('\n');
}

function filterAttachments(attachments: ConfluenceAttachment[], filter: string): ConfluenceAttachment[] {
  switch (filter) {
    case 'images':
      return attachments.filter(a => isImage(a.title));
    case 'documents':
      return attachments.filter(a => !isImage(a.title));
    default:
      return attachments;
  }
}

export function registerDownloadAttachmentsCommand(confluence: Command): void {
  confluence
    .command('download-attachments')
    .description('Download attachments from a Confluence page')
    .requiredOption('--page-id <id>', 'Page ID')
    .option('--output-dir <dir>', 'Output directory')
    .option('--filter <type>', 'Filter type: images, documents, or all', 'all')
    .action(async (opts: { pageId: string; outputDir?: string; filter: string }, command: Command) => {
      const config = loadConfig();
      const confConfig = requireConfluenceConfig(config);
      const http = createHttpClient(confConfig);
      const client = createConfluenceClient(http, confConfig.baseUrl, confConfig.deployment);
      const ctx = detectOutputMode(command.optsWithGlobals().json);

      const outputDir = opts.outputDir ?? join(tmpdir(), 'confluence-attachments', opts.pageId);

      const allAttachments = await client.getAttachments(opts.pageId);
      const attachments = filterAttachments(allAttachments, opts.filter);

      const downloaded: DownloadResult['downloaded'] = [];

      for (const attachment of attachments) {
        const safeName = basename(attachment.title);
        if (!safeName || safeName === '.' || safeName === '..') {
          throw new Error(`Refusing to download attachment with unsafe filename: ${attachment.title}`);
        }
        const destPath = join(outputDir, safeName);
        await client.downloadAttachment(attachment.downloadUrl, destPath);
        downloaded.push({
          filename: safeName,
          path: destPath,
          mediaType: attachment.mediaType,
          fileSize: attachment.fileSize,
        });
      }

      const result: DownloadResult = {
        pageId: opts.pageId,
        outputDir,
        downloaded,
      };

      output(result, formatHuman, ctx);
    });
}
