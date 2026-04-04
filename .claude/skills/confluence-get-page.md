---
name: confluence-get-page
description: Get a Confluence page content by ID or title+space, with layout-aware markdown and image extraction
---

# Confluence Get Page

Get full Confluence page content, converted to markdown by default. Supports multi-column layouts, code blocks, panels, expand sections, and embedded images.

## Usage

```bash
atl confluence get-page --id <PAGE_ID>
atl confluence get-page --title "<title>" --space <SPACE_KEY>
```

## Examples

```bash
# Get page by ID
atl confluence get-page --id 12345

# Get page by title and space
atl confluence get-page --title "API Documentation" --space DEV

# Get raw HTML instead of markdown
atl confluence get-page --id 12345 --raw

# JSON output for programmatic use
atl confluence get-page --id 12345 --json
```

## JSON Output Schema

```json
{
  "id": "12345",
  "title": "API Documentation",
  "spaceKey": "DEV",
  "spaceName": "Development",
  "body": "# API Documentation\n\nPage content in markdown...",
  "images": [
    {
      "filename": "architecture-diagram.png",
      "url": "https://confluence.example.com/download/attachments/12345/architecture-diagram.png",
      "width": 800,
      "height": 600,
      "mediaType": "application/octet-stream",
      "fileSize": 245760
    }
  ],
  "version": 5,
  "lastModified": "2024-01-16T14:20:00.000Z",
  "lastModifiedBy": "John Doe",
  "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
}
```

## Content Conversion Features

The markdown conversion handles these Confluence-specific elements:

- **Multi-column layouts** — Columns are rendered sequentially with `<!-- Column N -->` markers
- **Code blocks** — Converted to fenced code blocks with language annotation
- **Panels** (info, warning, note, tip) — Rendered as blockquotes with type prefix
- **Expand sections** — Converted to `<details><summary>` HTML
- **Images** — Converted to `![filename](url)` with full download URLs
- **Emoticons** — Converted to alt text

## LLM Workflow: Summarizing a Page with Images

When a user asks to summarize or understand a Confluence page that contains images, follow this multi-step workflow:

1. **Get the page content:**
   ```bash
   atl confluence get-page --id <PAGE_ID> --json
   ```
   This returns the text content as markdown plus an `images` array listing all embedded images.

2. **Check if images exist:** Look at the `images` array in the response. If empty, summarize from the text content alone.

3. **Download the images:**
   ```bash
   atl confluence download-attachments --page-id <PAGE_ID> --filter images --json
   ```
   This downloads all image attachments to a local directory and returns the file paths.

4. **Analyze each image:** Read each downloaded image file to understand diagrams, screenshots, charts, etc.

5. **Synthesize:** Combine understanding of the text content, the placement of images within the markdown (look for `![filename](url)` references), and the image analysis to produce a comprehensive summary.

## Environment Variables Required

- `CONFLUENCE_URL` - Confluence instance URL
- `CONFLUENCE_USERNAME` + `CONFLUENCE_API_TOKEN` (Cloud) or `CONFLUENCE_PERSONAL_TOKEN` (Server/DC)
