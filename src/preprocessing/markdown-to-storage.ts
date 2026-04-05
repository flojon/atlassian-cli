// Markdown to Confluence storage format (XHTML) converter
// Used for Confluence write operations (create-page, update-page)
// Handles common Markdown patterns — not exhaustive but covers typical usage

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function convertInline(text: string): string {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Images
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<ac:image><ri:url ri:value="$2" /></ac:image>');
  return text;
}

function processBlock(lines: string[]): string {
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;

    // Fenced code block
    const codeMatch = line.match(/^```(\w*)$/);
    if (codeMatch) {
      const lang = codeMatch[1] || '';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith('```')) {
        codeLines.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      const langAttr = lang ? `<ac:parameter ac:name="language">${escapeHtml(lang)}</ac:parameter>` : '';
      output.push(
        `<ac:structured-macro ac:name="code">${langAttr}` +
        `<ac:plain-text-body><![CDATA[${codeLines.join('\n')}]]></ac:plain-text-body>` +
        `</ac:structured-macro>`,
      );
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const text = convertInline(escapeHtml(headingMatch[2]!));
      output.push(`<h${level}>${text}</h${level}>`);
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      output.push('<hr />');
      i++;
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i]!)) {
        items.push(convertInline(escapeHtml(lines[i]!.replace(/^[-*+]\s+/, ''))));
        i++;
      }
      output.push('<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>');
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) {
        items.push(convertInline(escapeHtml(lines[i]!.replace(/^\d+\.\s+/, ''))));
        i++;
      }
      output.push('<ol>' + items.map(item => `<li>${item}</li>`).join('') + '</ol>');
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith('> ')) {
        quoteLines.push(lines[i]!.slice(2));
        i++;
      }
      output.push(`<blockquote><p>${convertInline(escapeHtml(quoteLines.join(' ')))}</p></blockquote>`);
      continue;
    }

    // Empty line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Regular paragraph — collect consecutive non-empty, non-special lines
    const paraLines: string[] = [];
    while (i < lines.length && lines[i]!.trim() !== '' && !/^(#{1,6}\s|[-*+]\s|\d+\.\s|>\s|```)/.test(lines[i]!)) {
      paraLines.push(lines[i]!);
      i++;
    }
    output.push(`<p>${convertInline(escapeHtml(paraLines.join(' ')))}</p>`);
  }

  return output.join('\n');
}

export function markdownToStorage(markdown: string): string {
  const lines = markdown.split('\n');
  return processBlock(lines);
}
