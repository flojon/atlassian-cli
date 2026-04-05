---
name: atl-confluence
description: Confluence CLI commands — search pages, get page content, create/update pages, add comments, download attachments. Use for any Confluence task.
allowed-tools: Bash(atl:*)
---

# atl — Confluence Commands

## Quick start

```bash
# Search pages
atl confluence search "deployment guide"

# Read a page
atl confluence get-page --id 12345

# Create a page
atl confluence create-page --space DEV --title "New Guide" --body "# Hello\n\nContent here"

# Update a page
atl confluence update-page --id 12345 --body "# Updated content"

# Add a comment
atl confluence add-comment "Looks good!" --page-id 12345
```

---

## `atl confluence search <query>`

Search Confluence pages. Accepts plain text (auto-converted to CQL) or raw CQL queries.

```bash
atl confluence search "<query>" [--limit N] [--offset N] [--spaces SPACE1,SPACE2] [--json]
```

**Options:**
- `--limit N` (default: 10) — max results
- `--offset N` (default: 0) — skip N results
- `--spaces` — comma-separated space keys to filter
- `--json` — force JSON output

**Examples:**
```bash
atl confluence search "deployment guide"
atl confluence search "type = page AND space = DEV AND title ~ 'API'"
atl confluence search "architecture" --spaces DEV,PLATFORM
```

**JSON output:**
```json
{
  "results": [
    {
      "id": "12345",
      "title": "Page Title",
      "type": "page",
      "spaceKey": "DEV",
      "spaceName": "Development",
      "lastModified": "2024-01-16T14:20:00.000Z",
      "excerpt": "Matching excerpt...",
      "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
    }
  ],
  "total": 15,
  "hasMore": true
}
```

---

## `atl confluence get-page`

Get full page content, converted to layout-aware markdown. Handles multi-column layouts, code blocks, panels, expand sections, and embedded images.

```bash
atl confluence get-page --id <PAGE_ID> [--raw] [--json]
atl confluence get-page --title "<title>" --space <KEY> [--raw] [--json]
```

**Options:**
- `--id` — page ID (numeric)
- `--title` — page title (requires `--space`)
- `--space` — space key (requires `--title`)
- `--raw` — return raw HTML instead of markdown
- `--json` — force JSON output

**Examples:**
```bash
atl confluence get-page --id 12345
atl confluence get-page --title "API Documentation" --space DEV
```

**JSON output:**
```json
{
  "id": "12345",
  "title": "API Documentation",
  "spaceKey": "DEV",
  "spaceName": "Development",
  "body": "# API Documentation\n\nPage content in markdown...",
  "images": [
    {
      "filename": "diagram.png",
      "url": "https://confluence.example.com/download/attachments/12345/diagram.png",
      "mediaType": "image/png",
      "fileSize": 245760
    }
  ],
  "attachments": [
    {
      "id": "att67890",
      "title": "diagram.png",
      "mediaType": "image/png",
      "fileSize": 245760,
      "downloadUrl": "https://confluence.example.com/download/attachments/12345/diagram.png"
    }
  ],
  "version": 5,
  "lastModified": "2024-01-16T14:20:00.000Z",
  "lastModifiedBy": "John Doe",
  "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
}
```

---

## `atl confluence download-attachments`

Download attachments from a Confluence page to a local directory.

```bash
atl confluence download-attachments --page-id <ID> [--output-dir <dir>] [--filter <type>] [--json]
```

**Options:**
- `--page-id` — **(required)** page ID
- `--output-dir` — output directory (default: system temp dir)
- `--filter` — `images`, `documents`, or `all` (default: `all`)

**Examples:**
```bash
atl confluence download-attachments --page-id 12345 --filter images
atl confluence download-attachments --page-id 12345 --output-dir ./assets
```

**JSON output:**
```json
{
  "pageId": "12345",
  "outputDir": "/tmp/confluence-attachments/12345",
  "downloaded": [
    {
      "filename": "diagram.png",
      "path": "/tmp/confluence-attachments/12345/diagram.png",
      "mediaType": "application/octet-stream",
      "fileSize": 245760
    }
  ]
}
```

---

## `atl confluence create-page`

Create a new Confluence page.

```bash
atl confluence create-page --space <KEY> --title <title> --body <content> [options] [--json]
```

**Required options:**
- `-s, --space <key>` — space key
- `--title <title>` — page title
- `-b, --body <content>` — page body (use `-` to read from stdin)

**Optional:**
- `--parent-id <id>` — parent page ID
- `--format <format>` — `markdown` (default) or `storage` (raw Confluence XHTML)

**Examples:**
```bash
atl confluence create-page --space DEV --title "API Guide" --body "# API Guide\n\nEndpoints..."
atl confluence create-page -s DEV --title "Sub Page" -b "Content" --parent-id 12345
cat README.md | atl confluence create-page -s DEV --title "README" -b -
atl confluence create-page -s DEV --title "Raw" -b "<h1>Hello</h1><p>World</p>" --format storage
```

**JSON output:**
```json
{
  "id": "12346",
  "title": "API Guide",
  "version": 1,
  "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12346"
}
```

---

## `atl confluence update-page`

Update an existing Confluence page. Auto-detects current version if not specified.

```bash
atl confluence update-page --id <pageId> --body <content> [options] [--json]
```

**Required options:**
- `--id <pageId>` — page ID
- `-b, --body <content>` — new body (use `-` to read from stdin)

**Optional:**
- `--title <title>` — new page title
- `--format <format>` — `markdown` (default) or `storage`
- `--version <n>` — version number (auto-detected if omitted)

**Examples:**
```bash
atl confluence update-page --id 12345 --body "# Updated\n\nNew content"
atl confluence update-page --id 12345 --title "New Title" --body "Content"
cat doc.md | atl confluence update-page --id 12345 -b -
```

**JSON output:**
```json
{
  "id": "12345",
  "title": "Updated Page",
  "version": 6,
  "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
}
```

---

## `atl confluence add-comment <body>`

Add a comment to a Confluence page. Use `-` as body to read from stdin.

```bash
atl confluence add-comment <body> --page-id <id> [--parent-comment-id <id>] [--json]
```

**Options:**
- `--page-id <id>` — **(required)** page ID
- `--parent-comment-id <id>` — parent comment ID (for threaded replies)

**Examples:**
```bash
atl confluence add-comment "Great documentation!" --page-id 12345
atl confluence add-comment "Reply to this" --page-id 12345 --parent-comment-id 67890
echo "Long comment..." | atl confluence add-comment - --page-id 12345
```

**JSON output:**
```json
{
  "id": "99001",
  "body": "Great documentation!",
  "author": "John Doe",
  "created": "2024-01-16T14:20:00.000Z"
}
```

---

## Workflow: Summarizing a page with images

1. **Get the page:** `atl confluence get-page --id <ID> --json`
2. **Check for images:** Look at the `images` array. If empty, summarize from text alone.
3. **Download images:** `atl confluence download-attachments --page-id <ID> --filter images --json`
4. **Analyze images:** Read each downloaded image file to understand diagrams, screenshots.
5. **Synthesize:** Combine text + image understanding into a comprehensive answer.

## Workflow: Create and populate a page

```bash
# 1. Create the page
atl confluence create-page -s DEV --title "Sprint 42 Retrospective" --body "# Sprint 42 Retro" --json

# 2. Update with full content
cat retro-notes.md | atl confluence update-page --id <PAGE_ID> -b -

# 3. Add a comment
atl confluence add-comment "Notes from today's meeting" --page-id <PAGE_ID>
```
