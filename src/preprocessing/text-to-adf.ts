// Plain text to Atlassian Document Format (ADF) converter
// Used for Jira Cloud write operations (descriptions, comments)
// This is a minimal wrapper — splits text into paragraphs, not a full Markdown-to-ADF converter

export function textToAdf(text: string): object {
  const paragraphs = text.split(/\n\n+/).map(para => ({
    type: 'paragraph' as const,
    content: [{ type: 'text' as const, text: para.replace(/\n/g, ' ').trim() }],
  })).filter(p => p.content[0]!.text.length > 0);

  if (paragraphs.length === 0) {
    paragraphs.push({
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text: text.trim() || ' ' }],
    });
  }

  return { version: 1, type: 'doc', content: paragraphs };
}
