---
name: confluence-get-page
description: Get a Confluence page content by ID or title+space
---

# Confluence Get Page

Get full Confluence page content, converted to markdown by default.

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
```

## JSON Output Schema

```json
{
  "id": "12345",
  "title": "API Documentation",
  "spaceKey": "DEV",
  "spaceName": "Development",
  "body": "# API Documentation\n\nPage content in markdown...",
  "version": 5,
  "lastModified": "2024-01-16T14:20:00.000Z",
  "lastModifiedBy": "John Doe",
  "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
}
```

## Environment Variables Required

- `CONFLUENCE_URL` - Confluence instance URL
- `CONFLUENCE_USERNAME` + `CONFLUENCE_API_TOKEN` (Cloud) or `CONFLUENCE_PERSONAL_TOKEN` (Server/DC)
