import TurndownService from 'turndown';

let turndownInstance: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (!turndownInstance) {
    turndownInstance = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });

    // Strip Confluence-specific macro elements
    turndownInstance.addRule('confluenceMacros', {
      filter: (node) => {
        const tagName = node.tagName?.toLowerCase() ?? '';
        return tagName.startsWith('ac:') || tagName.startsWith('ri:');
      },
      replacement: (_content, node) => {
        const el = node as HTMLElement;
        const macroName = el.getAttribute('ac:name');
        if (macroName) {
          return `[macro: ${macroName}]`;
        }
        return '';
      },
    });

    // Strip style and script tags
    turndownInstance.addRule('stripStyleScript', {
      filter: ['style', 'script'],
      replacement: () => '',
    });

    // Handle Confluence emoticons
    turndownInstance.addRule('emoticons', {
      filter: (node) => {
        return node.tagName?.toLowerCase() === 'img' &&
          (node.getAttribute('class') ?? '').includes('emoticon');
      },
      replacement: (_content, node) => {
        const el = node as HTMLElement;
        return el.getAttribute('alt') ?? '';
      },
    });
  }

  return turndownInstance;
}

export function htmlToMarkdown(html: string): string {
  if (!html || !html.trim()) return '';

  const turndown = getTurndown();

  try {
    return turndown.turndown(html).trim();
  } catch {
    // If turndown fails (e.g., malformed HTML), strip tags as fallback
    return html.replace(/<[^>]*>/g, '').trim();
  }
}
