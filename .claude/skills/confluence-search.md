---
name: confluence-search
description: Search Confluence pages using CQL or plain text
---

# Confluence Search

Search Confluence pages. Accepts plain text (auto-converted to CQL) or raw CQL queries.

## Usage

```bash
atl confluence search "<query>" [--limit N] [--offset N] [--spaces SPACE1,SPACE2]
```

## Examples

```bash
# Simple text search
atl confluence search "deployment guide"

# CQL query
atl confluence search "type = page AND space = DEV AND title ~ 'API'"

# Filter by spaces
atl confluence search "architecture" --spaces DEV,PLATFORM

# Limit results
atl confluence search "onboarding" --limit 5
```

## JSON Output Schema

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

## Environment Variables Required

- `CONFLUENCE_URL` - Confluence instance URL
- `CONFLUENCE_USERNAME` + `CONFLUENCE_API_TOKEN` (Cloud) or `CONFLUENCE_PERSONAL_TOKEN` (Server/DC)
