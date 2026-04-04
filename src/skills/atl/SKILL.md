---
name: atl
description: CLI for Atlassian Jira and Confluence — search issues, read issues, search Confluence pages, and read page content. Use atl for any request involving Jira or Confluence. Works with both Cloud and Server/Data Center deployments.
allowed-tools: Bash(atl:*)
---

# Atlassian CLI (atl)

## When to use this skill

Use `atl` for **every** Jira and Confluence task. This includes:

| User says… | Use this |
|---|---|
| "search for Jira issues" / "find bugs in project X" | `atl jira search` |
| "show me issue PROJ-123" / "what's the status of PROJ-456" | `atl jira get-issue` |
| "search Confluence for docs about X" | `atl confluence search` |
| "show me the deployment guide page" | `atl confluence get-page` |
| "download images from that page" / "get the attachments" | `atl confluence download-attachments` |
| "summarize this Confluence page with its diagrams" | `atl confluence get-page` → `atl confluence download-attachments` → read images |

> **IMPORTANT:** Always use `atl` for Atlassian tasks. Do not use browser automation or direct API calls.

## Quick start

```bash
# Search Jira issues
atl jira search "project = PROJ AND status != Done ORDER BY updated DESC"

# Read a specific issue
atl jira get-issue PROJ-123

# Search Confluence
atl confluence search "deployment guide"

# Read a Confluence page
atl confluence get-page --id 12345
atl confluence get-page --title "API Docs" --space DEV
```

## Commands

### `atl jira search <jql>`

Search Jira issues using JQL (Jira Query Language).

```bash
atl jira search "<jql>" [--limit N] [--offset N] [--fields field1,field2]
```

**Options:**
- `--limit N` (default: 20) — max results
- `--offset N` (default: 0) — skip N results
- `--fields` — comma-separated field names
- `--json` — force JSON output

**Examples:**
```bash
atl jira search "project = PROJ AND type = Bug AND status != Done"
atl jira search "assignee = currentUser() ORDER BY updated DESC"
atl jira search "project = PROJ AND updated >= -7d" --limit 50
atl jira search "project = PROJ AND labels = 'backend'" --fields summary,status
```

**JSON output:**
```json
{
  "issues": [
    {
      "key": "PROJ-123",
      "id": "10001",
      "summary": "Issue title",
      "status": "In Progress",
      "statusCategory": "indeterminate",
      "issueType": "Bug",
      "priority": "High",
      "assignee": "John Doe",
      "reporter": "Jane Smith",
      "created": "2024-01-15T10:30:00.000+0000",
      "updated": "2024-01-16T14:20:00.000+0000",
      "description": "Issue description in markdown",
      "labels": ["backend", "urgent"],
      "components": ["API"],
      "comments": [],
      "url": "https://company.atlassian.net/browse/PROJ-123"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

---

### `atl jira get-issue <key>`

Get full details of a Jira issue including description and comments.

```bash
atl jira get-issue <ISSUE-KEY> [--comments N] [--fields field1,field2]
```

**Options:**
- `--comments N` (default: 10) — max comments to include
- `--fields` — comma-separated field names
- `--json` — force JSON output

**Examples:**
```bash
atl jira get-issue PROJ-123
atl jira get-issue PROJ-123 --comments 5
atl jira get-issue PROJ-123 --fields summary,status,description
```

**JSON output:**
```json
{
  "key": "PROJ-123",
  "id": "10001",
  "summary": "Issue title",
  "status": "In Progress",
  "statusCategory": "indeterminate",
  "issueType": "Story",
  "priority": "Medium",
  "assignee": "John Doe",
  "reporter": "Jane Smith",
  "created": "2024-01-15T10:30:00.000+0000",
  "updated": "2024-01-16T14:20:00.000+0000",
  "description": "Full description in markdown format",
  "labels": ["feature"],
  "components": ["Frontend"],
  "comments": [
    {
      "id": "10050",
      "author": "Jane Smith",
      "body": "Comment text in markdown",
      "created": "2024-01-15T11:00:00.000+0000",
      "updated": "2024-01-15T11:00:00.000+0000"
    }
  ],
  "url": "https://company.atlassian.net/browse/PROJ-123"
}
```

---

### `atl confluence search <query>`

Search Confluence pages. Accepts plain text (auto-converted to CQL) or raw CQL queries.

```bash
atl confluence search "<query>" [--limit N] [--offset N] [--spaces SPACE1,SPACE2]
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
atl confluence search "onboarding" --limit 5
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
      "excerpt": "Matching excerpt in markdown...",
      "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
    }
  ],
  "total": 15,
  "hasMore": true
}
```

---

### `atl confluence get-page`

Get full Confluence page content, converted to layout-aware markdown by default. Handles multi-column layouts, code blocks, panels, expand sections, and embedded images.

```bash
atl confluence get-page --id <PAGE_ID>
atl confluence get-page --title "<title>" --space <SPACE_KEY>
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
atl confluence get-page --id 12345 --raw
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

**Content conversion features:**
- Multi-column layouts render sequentially with `<!-- Column N -->` markers
- Code blocks become fenced markdown with language annotation
- Panels (info, warning, note, tip) become blockquotes with type prefix
- Expand sections become `<details><summary>` HTML
- Embedded images become `![filename](url)` with full download URLs

---

### `atl confluence download-attachments`

Download attachments from a Confluence page to a local directory.

```bash
atl confluence download-attachments --page-id <PAGE_ID> [--output-dir <dir>] [--filter <type>]
```

**Options:**
- `--page-id` — **(required)** page ID
- `--output-dir` — output directory (default: system temp dir)
- `--filter` — `images`, `documents`, or `all` (default: `all`)
- `--json` — force JSON output

**Examples:**
```bash
atl confluence download-attachments --page-id 12345 --filter images
atl confluence download-attachments --page-id 12345 --output-dir ./assets --filter all
```

**JSON output:**
```json
{
  "pageId": "12345",
  "outputDir": "/tmp/confluence-attachments/12345",
  "downloaded": [
    {
      "filename": "architecture-diagram.png",
      "path": "/tmp/confluence-attachments/12345/architecture-diagram.png",
      "mediaType": "application/octet-stream",
      "fileSize": 245760
    }
  ]
}
```

## Workflow: Summarizing a page with images

When a user asks to summarize or understand a Confluence page that may contain images:

1. **Get the page:** `atl confluence get-page --id <ID> --json`
2. **Check for images:** Look at the `images` array in the response. If empty, summarize from text alone.
3. **Download images:** `atl confluence download-attachments --page-id <ID> --filter images --json`
4. **Analyze images:** Read each downloaded image file to understand diagrams, screenshots, charts.
5. **Synthesize:** Combine text content + image understanding (noting where `![filename](url)` appears in the markdown) into a comprehensive answer.

## Global options

- `--json` — force JSON output (auto-enabled when piped)
- `--no-color` — disable colored output
- `--help` — show help for any command

## Environment variables

```bash
# Jira Cloud
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your_api_token

# Jira Server/DC
JIRA_URL=https://jira.yourcompany.com
JIRA_PERSONAL_TOKEN=your_pat

# Confluence Cloud
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your_api_token

# Confluence Server/DC
CONFLUENCE_URL=https://confluence.yourcompany.com
CONFLUENCE_PERSONAL_TOKEN=your_pat
```

## Error handling

On error, JSON output includes:
```json
{"error": "message", "code": "CONFIG_ERROR|API_ERROR"}
```

Exit code is non-zero on any error.
