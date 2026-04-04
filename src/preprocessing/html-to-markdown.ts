import TurndownService from 'turndown';
import type { ConfluenceImageInfo } from '../types/confluence.js';

export interface HtmlToMarkdownResult {
  markdown: string;
  images: ConfluenceImageInfo[];
}

interface ConversionContext {
  contentId?: string;
  baseUrl?: string;
}

function getMacroName(node: HTMLElement): string | null {
  return node.getAttribute('ac:name') ?? null;
}

function getParameterValue(node: HTMLElement, paramName: string): string | null {
  const params = node.querySelectorAll('ac\\:parameter, [ac\\:name]');
  for (const param of params) {
    if (param.getAttribute('ac:name') === paramName) {
      return param.textContent ?? null;
    }
  }
  return null;
}

function getRichTextBody(node: HTMLElement): string {
  const body = node.querySelector('ac\\:rich-text-body');
  return body?.innerHTML ?? '';
}

function getPlainTextBody(node: HTMLElement): string {
  const body = node.querySelector('ac\\:plain-text-body');
  return body?.textContent ?? '';
}

function isStructuredMacro(node: HTMLElement, ...names: string[]): boolean {
  const tagName = node.tagName?.toLowerCase() ?? '';
  if (tagName !== 'ac:structured-macro') return false;
  if (names.length === 0) return true;
  const name = getMacroName(node);
  return name !== null && names.includes(name);
}

function createTurndownService(images: ConfluenceImageInfo[], context: ConversionContext): TurndownService {
  const td = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
    bulletListMarker: '-',
  });

  // --- Rule 1: Catch-all fallback for unhandled ac:structured-macro (lowest priority, added first) ---
  td.addRule('confluenceFallbackMacro', {
    filter: (node) => {
      const tagName = node.tagName?.toLowerCase() ?? '';
      return tagName === 'ac:structured-macro';
    },
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const name = getMacroName(el);
      return name ? `[macro: ${name}]` : '';
    },
  });

  // --- Rule 2: Remaining ri:* tags (cleanup) ---
  td.addRule('riTags', {
    filter: (node) => {
      const tagName = node.tagName?.toLowerCase() ?? '';
      return tagName.startsWith('ri:');
    },
    replacement: () => '',
  });

  // --- Rule 3: Layout cell → pass through content ---
  td.addRule('confluenceLayoutCell', {
    filter: (node) => node.tagName?.toLowerCase() === 'ac:layout-cell',
    replacement: (content) => content,
  });

  // --- Rule 4: Layout section → render columns sequentially ---
  td.addRule('confluenceLayoutSection', {
    filter: (node) => node.tagName?.toLowerCase() === 'ac:layout-section',
    replacement: (content, node) => {
      const el = node as HTMLElement;
      const cells = el.querySelectorAll(':scope > ac\\:layout-cell');

      if (cells.length <= 1) {
        // Single column — just return content
        return '\n\n' + content.trim() + '\n\n';
      }

      // Multi-column — render each cell with column markers
      const parts: string[] = [];
      cells.forEach((cell, i) => {
        parts.push(`<!-- Column ${i + 1} -->`);
        // Use innerHTML to get content, then convert via turndown
        const cellHtml = (cell as HTMLElement).innerHTML;
        if (cellHtml) {
          parts.push(td.turndown(cellHtml).trim());
        }
      });
      return '\n\n' + parts.join('\n\n') + '\n\n';
    },
  });

  // --- Rule 5: Layout container → pass through ---
  td.addRule('confluenceLayout', {
    filter: (node) => node.tagName?.toLowerCase() === 'ac:layout',
    replacement: (content) => '\n\n' + content.trim() + '\n\n',
  });

  // --- Rule 6: Code blocks ---
  td.addRule('confluenceCodeBlock', {
    filter: (node) => isStructuredMacro(node as HTMLElement, 'code'),
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const language = getParameterValue(el, 'language') ?? '';
      const code = getPlainTextBody(el);
      return `\n\n\`\`\`${language}\n${code}\n\`\`\`\n\n`;
    },
  });

  // --- Rule 7: Panels (panel, info, warning, note, tip) ---
  td.addRule('confluencePanel', {
    filter: (node) => isStructuredMacro(node as HTMLElement, 'panel', 'info', 'warning', 'note', 'tip'),
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const type = getMacroName(el) ?? 'note';
      const title = getParameterValue(el, 'title');
      const bodyHtml = getRichTextBody(el);
      const body = bodyHtml ? td.turndown(bodyHtml).trim() : '';

      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const header = title ? `**${label}: ${title}**` : `**${label}**`;
      const quotedBody = body.split('\n').map(line => `> ${line}`).join('\n');

      return `\n\n> ${header}\n${quotedBody}\n\n`;
    },
  });

  // --- Rule 8: Expand sections ---
  td.addRule('confluenceExpand', {
    filter: (node) => isStructuredMacro(node as HTMLElement, 'expand'),
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const title = getParameterValue(el, 'title') ?? 'Click to expand';
      const bodyHtml = getRichTextBody(el);
      const body = bodyHtml ? td.turndown(bodyHtml).trim() : '';

      return `\n\n<details><summary>${title}</summary>\n\n${body}\n\n</details>\n\n`;
    },
  });

  // --- Rule 9: Confluence images (ac:image with ri:attachment or ri:url) ---
  td.addRule('confluenceImage', {
    filter: (node) => node.tagName?.toLowerCase() === 'ac:image',
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      const width = el.getAttribute('ac:width') ? parseInt(el.getAttribute('ac:width')!, 10) : undefined;
      const height = el.getAttribute('ac:height') ? parseInt(el.getAttribute('ac:height')!, 10) : undefined;

      // Check for ri:attachment (page attachment)
      const attachment = el.querySelector('ri\\:attachment');
      if (attachment) {
        const filename = attachment.getAttribute('ri:filename') ?? 'image';
        let url: string;
        if (context.baseUrl && context.contentId) {
          url = `${context.baseUrl}/download/attachments/${context.contentId}/${encodeURIComponent(filename)}`;
        } else {
          url = filename;
        }

        images.push({ filename, url, width, height });
        return `![${filename}](${url})`;
      }

      // Check for ri:url (external image)
      const riUrl = el.querySelector('ri\\:url');
      if (riUrl) {
        const url = riUrl.getAttribute('ri:value') ?? '';
        const filename = url.split('/').pop() ?? 'image';
        images.push({ filename, url, width, height });
        return `![${filename}](${url})`;
      }

      return '';
    },
  });

  // --- Strip style/script tags ---
  td.addRule('stripStyleScript', {
    filter: ['style', 'script'],
    replacement: () => '',
  });

  // --- Confluence emoticons ---
  td.addRule('emoticons', {
    filter: (node) => {
      return node.tagName?.toLowerCase() === 'img' &&
        (node.getAttribute('class') ?? '').includes('emoticon');
    },
    replacement: (_content, node) => {
      const el = node as HTMLElement;
      return el.getAttribute('alt') ?? '';
    },
  });

  return td;
}

export function htmlToMarkdown(html: string, context?: ConversionContext): HtmlToMarkdownResult {
  if (!html || !html.trim()) return { markdown: '', images: [] };

  const images: ConfluenceImageInfo[] = [];
  const td = createTurndownService(images, context ?? {});

  try {
    const markdown = td.turndown(html).trim();
    return { markdown, images };
  } catch {
    // If turndown fails, strip tags as fallback
    return {
      markdown: html.replace(/<[^>]*>/g, '').trim(),
      images: [],
    };
  }
}
