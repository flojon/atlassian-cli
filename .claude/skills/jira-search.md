---
name: jira-search
description: Search Jira issues using JQL queries
---

# Jira Search

Search Jira issues using JQL (Jira Query Language).

## Usage

```bash
atl jira search "<jql>" [--limit N] [--offset N] [--fields field1,field2]
```

## Examples

```bash
# Find open bugs in a project
atl jira search "project = PROJ AND type = Bug AND status != Done"

# Find issues assigned to current user
atl jira search "assignee = currentUser() ORDER BY updated DESC"

# Find recently updated issues
atl jira search "project = PROJ AND updated >= -7d"

# Find issues by label
atl jira search "project = PROJ AND labels = 'backend'"
```

## JSON Output Schema

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

## Environment Variables Required

- `JIRA_URL` - Jira instance URL
- `JIRA_USERNAME` + `JIRA_API_TOKEN` (Cloud) or `JIRA_PERSONAL_TOKEN` (Server/DC)
