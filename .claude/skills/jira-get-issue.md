---
name: jira-get-issue
description: Get full details of a Jira issue by key
---

# Jira Get Issue

Get full details of a Jira issue including description and comments.

## Usage

```bash
atl jira get-issue <ISSUE-KEY> [--comments N] [--fields field1,field2]
```

## Examples

```bash
# Get full issue details
atl jira get-issue PROJ-123

# Get issue with limited comments
atl jira get-issue PROJ-123 --comments 5

# Get specific fields only
atl jira get-issue PROJ-123 --fields summary,status,assignee
```

## JSON Output Schema

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

## Environment Variables Required

- `JIRA_URL` - Jira instance URL
- `JIRA_USERNAME` + `JIRA_API_TOKEN` (Cloud) or `JIRA_PERSONAL_TOKEN` (Server/DC)
