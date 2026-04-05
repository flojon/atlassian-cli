---
name: jira-download-attachments
description: Download attachments from a Jira issue to a local directory
---

# Jira Download Attachments

Download attachments from a Jira issue to a local directory. Supports filtering by type (images, documents, or all).

## Usage

```bash
atl jira download-attachments --issue-key <ISSUE-KEY> [--output-dir <dir>] [--filter <type>]
```

## Examples

```bash
# Download all attachments from an issue
atl jira download-attachments --issue-key PROJ-123

# Download only images
atl jira download-attachments --issue-key PROJ-123 --filter images

# Download to a specific directory
atl jira download-attachments --issue-key PROJ-123 --output-dir ./issue-assets --filter images

# JSON output
atl jira download-attachments --issue-key PROJ-123 --filter images --json
```

## Options

- `--issue-key <key>` — **(required)** Jira issue key (e.g. PROJ-123)
- `--output-dir <dir>` — Output directory (default: system temp dir under `jira-attachments/{issueKey}/`)
- `--filter <type>` — Filter attachments: `images`, `documents`, or `all` (default: `all`)
- `--json` — Output as JSON

## Filter Types

- **images** — Attachments with `image/*` MIME type
- **documents** — Everything that is not an image
- **all** — All attachments (default)

## JSON Output Schema

```json
{
  "issueKey": "PROJ-123",
  "outputDir": "/tmp/jira-attachments/PROJ-123",
  "downloaded": [
    {
      "filename": "screenshot.png",
      "path": "/tmp/jira-attachments/PROJ-123/screenshot.png",
      "mimeType": "image/png",
      "size": 245760
    }
  ]
}
```

## Environment Variables Required

- `JIRA_URL` - Jira instance URL
- `JIRA_USERNAME` + `JIRA_API_TOKEN` (Cloud) or `JIRA_PERSONAL_TOKEN` (Server/DC)
