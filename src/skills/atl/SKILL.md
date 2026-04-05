---
name: atl
description: CLI for Atlassian Jira and Confluence — search, read, create, update issues and pages. Use atl for any request involving Jira or Confluence. Works with both Cloud and Server/Data Center deployments.
allowed-tools: Bash(atl:*)
---

# Atlassian CLI (atl)

## When to use this skill

Use `atl` for **every** Jira and Confluence task. Route to the appropriate sub-skill:

| User says… | Sub-skill |
|---|---|
| Anything about Jira issues, sprints, projects | Load **atl-jira** skill |
| Anything about Confluence pages, spaces, wiki | Load **atl-confluence** skill |

> **IMPORTANT:** Always use `atl` for Atlassian tasks. Do not use browser automation or direct API calls.

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
