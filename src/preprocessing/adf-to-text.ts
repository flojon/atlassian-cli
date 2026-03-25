// Atlassian Document Format (ADF) to Markdown converter
// ADF is used by Jira Cloud for rich text fields (description, comments)
// See: https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
  attrs?: Record<string, unknown>;
  marks?: AdfMark[];
}

interface AdfMark {
  type: string;
  attrs?: Record<string, unknown>;
}

function applyMarks(text: string, marks?: AdfMark[]): string {
  if (!marks?.length) return text;

  let result = text;
  for (const mark of marks) {
    switch (mark.type) {
      case 'strong':
        result = `**${result}**`;
        break;
      case 'em':
        result = `*${result}*`;
        break;
      case 'code':
        result = `\`${result}\``;
        break;
      case 'strike':
        result = `~~${result}~~`;
        break;
      case 'link': {
        const href = mark.attrs?.href as string | undefined;
        if (href) result = `[${result}](${href})`;
        break;
      }
      case 'underline':
        result = `<u>${result}</u>`;
        break;
      case 'subsup': {
        const supType = mark.attrs?.type as string | undefined;
        if (supType === 'sup') result = `<sup>${result}</sup>`;
        else if (supType === 'sub') result = `<sub>${result}</sub>`;
        break;
      }
    }
  }
  return result;
}

function convertNode(node: AdfNode): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(convertNode).join('\n\n');

    case 'paragraph':
      return (node.content ?? []).map(convertNode).join('');

    case 'text':
      return applyMarks(node.text ?? '', node.marks);

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      const prefix = '#'.repeat(level);
      const text = (node.content ?? []).map(convertNode).join('');
      return `${prefix} ${text}`;
    }

    case 'bulletList':
      return (node.content ?? []).map(convertNode).join('\n');

    case 'orderedList':
      return (node.content ?? []).map((child, i) => {
        const text = convertNode(child);
        // Replace leading "- " with "N. "
        return text.replace(/^- /, `${i + 1}. `);
      }).join('\n');

    case 'listItem': {
      const parts = (node.content ?? []).map(convertNode);
      return `- ${parts.join('\n  ')}`;
    }

    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? '';
      const code = (node.content ?? []).map(c => c.text ?? '').join('');
      return `\`\`\`${lang}\n${code}\n\`\`\``;
    }

    case 'blockquote': {
      const text = (node.content ?? []).map(convertNode).join('\n');
      return text.split('\n').map(line => `> ${line}`).join('\n');
    }

    case 'rule':
      return '---';

    case 'hardBreak':
      return '\n';

    case 'mention': {
      const mentionText = node.attrs?.text as string | undefined;
      return mentionText ?? '@unknown';
    }

    case 'emoji': {
      const shortName = node.attrs?.shortName as string | undefined;
      return shortName ?? '';
    }

    case 'inlineCard': {
      const url = node.attrs?.url as string | undefined;
      return url ? `[${url}](${url})` : '';
    }

    case 'mediaGroup':
    case 'mediaSingle':
      return (node.content ?? []).map(convertNode).join('\n');

    case 'media': {
      const mediaType = node.attrs?.type as string | undefined;
      const alt = (node.attrs?.alt as string) ?? 'attachment';
      if (mediaType === 'external') {
        const url = node.attrs?.url as string;
        return `![${alt}](${url})`;
      }
      return `[${alt}]`;
    }

    case 'table':
      return convertTable(node);

    case 'tableRow':
    case 'tableHeader':
    case 'tableCell':
      return (node.content ?? []).map(convertNode).join('');

    case 'panel': {
      const panelType = (node.attrs?.panelType as string) ?? 'info';
      const text = (node.content ?? []).map(convertNode).join('\n');
      return `> **${panelType.toUpperCase()}:** ${text}`;
    }

    case 'expand': {
      const title = (node.attrs?.title as string) ?? 'Details';
      const text = (node.content ?? []).map(convertNode).join('\n');
      return `**${title}**\n${text}`;
    }

    default:
      // For unknown types, try to extract text from children
      if (node.content) {
        return node.content.map(convertNode).join('');
      }
      return node.text ?? '';
  }
}

function convertTable(node: AdfNode): string {
  const rows = node.content ?? [];
  if (rows.length === 0) return '';

  const tableData: string[][] = rows.map(row =>
    (row.content ?? []).map(cell =>
      (cell.content ?? []).map(convertNode).join(' ').trim(),
    ),
  );

  if (tableData.length === 0) return '';

  const colCount = Math.max(...tableData.map(r => r.length));
  const colWidths = Array.from({ length: colCount }, (_, i) =>
    Math.max(...tableData.map(r => (r[i] ?? '').length), 3),
  );

  const formatRow = (row: string[]) =>
    '| ' + Array.from({ length: colCount }, (_, i) =>
      (row[i] ?? '').padEnd(colWidths[i]!),
    ).join(' | ') + ' |';

  const separator = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';

  const lines = [formatRow(tableData[0]!), separator];
  for (let i = 1; i < tableData.length; i++) {
    lines.push(formatRow(tableData[i]!));
  }
  return lines.join('\n');
}

export function adfToMarkdown(adf: unknown): string {
  if (!adf || typeof adf !== 'object') return '';

  const node = adf as AdfNode;
  if (node.type !== 'doc') {
    // If it's not a doc node, try to treat it as one
    return convertNode({ type: 'doc', content: [node] });
  }

  return convertNode(node);
}
