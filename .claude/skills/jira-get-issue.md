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
  "images": [
    {
      "filename": "screenshot.png",
      "url": "https://company.atlassian.net/rest/api/3/attachment/content/10001",
      "mediaType": "image/png",
      "fileSize": 245760
    }
  ],
  "attachments": [
    {
      "id": "10001",
      "filename": "screenshot.png",
      "mimeType": "image/png",
      "size": 245760,
      "downloadUrl": "https://company.atlassian.net/rest/api/3/attachment/content/10001",
      "created": "2024-01-15T10:30:00.000+0000",
      "author": "Jane Smith"
    }
  ],
  "url": "https://company.atlassian.net/browse/PROJ-123"
}
```

## LLM Workflow: Analyzing an Issue with Images

When a user asks to summarize or understand a Jira issue that may contain images, follow this multi-step workflow:

1. **Get the issue content:**
   ```bash
   atl jira get-issue PROJ-123 --json
   ```
   This returns the text content as markdown plus `images` and `attachments` arrays.

2. **Check if images exist:** Look at the `images` array in the response. If empty, summarize from the text content alone.

3. **Download the images:**
   ```bash
   atl jira download-attachments --issue-key PROJ-123 --filter images --json
   ```
   This downloads all image attachments to a local directory and returns the file paths.

4. **Analyze each image:** Read each downloaded image file to understand screenshots, diagrams, charts, etc.

5. **Synthesize:** Combine understanding of the text content, the placement of images within the markdown description (look for `![filename](url)` references), and the image analysis to produce a comprehensive summary.

## Environment Variables Required

- `JIRA_URL` - Jira instance URL
- `JIRA_USERNAME` + `JIRA_API_TOKEN` (Cloud) or `JIRA_PERSONAL_TOKEN` (Server/DC)
