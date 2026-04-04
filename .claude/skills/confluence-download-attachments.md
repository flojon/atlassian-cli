---
name: confluence-download-attachments
description: Download attachments from a Confluence page to a local directory
---

# Confluence Download Attachments

Download attachments from a Confluence page to a local directory. Supports filtering by type (images, documents, or all).

## Usage

```bash
atl confluence download-attachments --page-id <PAGE_ID> [--output-dir <dir>] [--filter <type>]
```

## Examples

```bash
# Download all attachments from a page
atl confluence download-attachments --page-id 12345

# Download only images
atl confluence download-attachments --page-id 12345 --filter images

# Download to a specific directory
atl confluence download-attachments --page-id 12345 --output-dir ./page-assets --filter images

# JSON output
atl confluence download-attachments --page-id 12345 --filter images --json
```

## Options

- `--page-id <id>` — **(required)** Confluence page ID
- `--output-dir <dir>` — Output directory (default: system temp dir under `confluence-attachments/{pageId}/`)
- `--filter <type>` — Filter attachments: `images`, `documents`, or `all` (default: `all`)
- `--json` — Output as JSON

## Filter Types

- **images** — `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.bmp`, `.tiff`
- **documents** — Everything that is not an image
- **all** — All attachments (default)

## JSON Output Schema

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

## Environment Variables Required

- `CONFLUENCE_URL` - Confluence instance URL
- `CONFLUENCE_USERNAME` + `CONFLUENCE_API_TOKEN` (Cloud) or `CONFLUENCE_PERSONAL_TOKEN` (Server/DC)
