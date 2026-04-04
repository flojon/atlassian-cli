# MCP-Atlassian Research Notes

**Source repo:** https://github.com/sooperset/mcp-atlassian
**Cloned at:** `/Users/amitrawat/Desktop/dev/github/mcp-atlassian`
**Purpose:** Research for building a Node.js CLI equivalent (`cli-atlassian`)

---

## Overview

MCP-Atlassian is an MCP (Model Context Protocol) server that provides AI agents with structured tool access to Atlassian Jira and Confluence. Written in Python using the FastMCP framework. Supports both Cloud and Server/Data Center deployments.

**Total tools:** 73 (49 Jira + 24 Confluence)

---

## Architecture

```
src/mcp_atlassian/
├── jira/              # Jira API client modules
├── confluence/        # Confluence API client modules
├── models/            # Pydantic data models (Jira + Confluence)
├── preprocessing/     # Content preprocessing (HTML → markdown, etc.)
├── servers/           # MCP server definitions (tool registrations)
│   ├── jira.py        # All 49 Jira tools registered here
│   ├── confluence.py  # All 24 Confluence tools registered here
│   ├── main.py        # Entry point, combines both servers
│   ├── context.py     # Request context management
│   └── dependencies.py # Dependency injection for clients
└── utils/             # Shared utilities (auth, SSL, logging, etc.)
```

**Key pattern:** Each tool is registered via `@jira_mcp.tool()` or `@confluence_mcp.tool()` decorators. Tools are tagged with `read`/`write` and grouped by `toolset` for selective enabling.

---

## Authentication — Cloud vs Server/Data Center

### Atlassian Cloud
- **Basic Auth:** `username` (email) + `api_token` (from https://id.atlassian.com/manage-profile/security/api-tokens)
- **OAuth 2.0 (3LO):** For multi-user/SaaS deployments, supports `cloud_id` based routing
- URLs follow pattern: `https://your-company.atlassian.net` (Jira), `https://your-company.atlassian.net/wiki` (Confluence)

### Server / Data Center (On-Prem)
- **Personal Access Token (PAT):** Single token auth, simpler. Env var: `JIRA_PERSONAL_TOKEN` / `CONFLUENCE_PERSONAL_TOKEN`
- **Basic Auth:** Username + password (legacy, still supported)
- URLs are custom: `https://jira.yourcompany.com`, `https://confluence.yourcompany.com`
- Supports custom SSL certificates, proxy configuration, custom HTTP headers

### Environment Variables

**Cloud:**
```
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your_api_token
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your_api_token
```

**Server/DC:**
```
JIRA_URL=https://jira.yourcompany.com
JIRA_PERSONAL_TOKEN=your_pat
CONFLUENCE_URL=https://confluence.yourcompany.com
CONFLUENCE_PERSONAL_TOKEN=your_pat
```

**Additional config:**
```
JIRA_SSL_VERIFY=true/false
JIRA_SPACES_FILTER=SPACE1,SPACE2
READ_ONLY_MODE=true/false
MCP_ATLASSIAN_ENABLED_TOOLSETS=jira_issues,jira_search,...
```

---

## Jira Tools — Complete List (49 tools)

### Users (toolset: jira_users)
| Tool | Type | Description |
|------|------|-------------|
| `get_user_profile` | read | Get user profile by email, username, account ID or key |

### Watchers (toolset: jira_watchers)
| Tool | Type | Description |
|------|------|-------------|
| `get_issue_watchers` | read | Get list of watchers for an issue |
| `add_watcher` | write | Add a user as watcher to an issue |
| `remove_watcher` | write | Remove a watcher from an issue |

### Issues (toolset: jira_issues)
| Tool | Type | Description |
|------|------|-------------|
| `get_issue` | read | Get full issue details by key (e.g. PROJ-123). Supports field filtering. |
| `create_issue` | write | Create a new issue with project, type, summary, description, assignee, priority, labels, components, custom fields |
| `batch_create_issues` | write | Create multiple issues in one call |
| `update_issue` | write | Update any field on an existing issue |
| `delete_issue` | write | Delete an issue |
| `add_comment` | write | Add comment to issue (supports visibility restrictions) |
| `edit_comment` | write | Edit existing comment |
| `add_worklog` | write | Log work time on an issue |
| `get_worklog` | read | Get work logs for an issue |
| `get_issue_dates` | read | Get key dates (created, updated, resolved, due) |

### Search (toolset: jira_search)
| Tool | Type | Description |
|------|------|-------------|
| `search` | read | Search issues using JQL. Supports pagination, field selection. |
| `search_fields` | read | List available fields for JQL queries |
| `get_field_options` | read | Get allowed values for a specific field |

### Transitions (toolset: jira_transitions)
| Tool | Type | Description |
|------|------|-------------|
| `get_transitions` | read | Get available transitions for an issue |
| `transition_issue` | write | Change issue status (e.g. To Do → In Progress → Done) |

### Attachments (toolset: jira_attachments)
| Tool | Type | Description |
|------|------|-------------|
| `download_attachments` | read | Download file attachments from an issue |
| `get_issue_images` | read | Get image attachments as embedded content |

### Agile/Boards (toolset: jira_agile)
| Tool | Type | Description |
|------|------|-------------|
| `get_agile_boards` | read | List agile boards (Scrum/Kanban), filterable by project/type |
| `get_board_issues` | read | Get issues on a specific board |
| `get_sprints_from_board` | read | List sprints for a board |
| `get_sprint_issues` | read | Get issues in a specific sprint |
| `create_sprint` | write | Create a new sprint |
| `update_sprint` | write | Update sprint details (name, dates, state) |
| `add_issues_to_sprint` | write | Move issues into a sprint |

### Links (toolset: jira_links)
| Tool | Type | Description |
|------|------|-------------|
| `get_link_types` | read | Get available issue link types |
| `link_to_epic` | write | Link an issue to an epic |
| `create_issue_link` | write | Create a link between two issues |
| `create_remote_issue_link` | write | Link issue to external URL |
| `remove_issue_link` | write | Remove a link between issues |

### Projects (toolset: jira_projects)
| Tool | Type | Description |
|------|------|-------------|
| `get_project_issues` | read | Get issues for a project with optional filters |
| `get_all_projects` | read | List all accessible projects |
| `get_project_versions` | read | Get project versions/releases |
| `get_project_components` | read | Get project components |
| `create_version` | write | Create a new version/release for a project |

### Changelogs (toolset: jira_changelogs)
| Tool | Type | Description |
|------|------|-------------|
| `batch_get_changelogs` | read | Get change history for multiple issues at once |

### Service Desk / JSM (toolset: jira_service_desk)
| Tool | Type | Description |
|------|------|-------------|
| `get_service_desk_queues` | read | List JSM queues |
| `get_queue_issues` | read | Get issues in a JSM queue |
| `get_issue_sla` | read | Get SLA metrics for a service desk issue |

### Development (toolset: jira_development)
| Tool | Type | Description |
|------|------|-------------|
| `get_issue_development_info` | read | Get linked PRs, branches, commits for an issue |
| `get_issues_development_info` | read | Batch get dev info for multiple issues |

### Forms / ProForma (toolset: jira_forms)
| Tool | Type | Description |
|------|------|-------------|
| `get_issue_proforma_forms` | read | Get ProForma forms attached to an issue |
| `get_proforma_form_details` | read | Get form structure and answers |
| `update_proforma_form_answers` | write | Submit/update form answers |

---

## Confluence Tools — Complete List (24 tools)

### Search (toolset: confluence_search)
| Tool | Type | Description |
|------|------|-------------|
| `search` | read | Search Confluence using CQL (Confluence Query Language) |

### Pages (toolset: confluence_pages)
| Tool | Type | Description |
|------|------|-------------|
| `get_page` | read | Get page content by ID or title+space. Converts to markdown. |
| `get_page_children` | read | Get child pages of a page |
| `get_space_page_tree` | read | Get hierarchical page tree for a space |
| `create_page` | write | Create a new page in a space |
| `update_page` | write | Update page content and/or title |
| `delete_page` | write | Delete a page |
| `move_page` | write | Move page to different parent/space |

### Comments (toolset: confluence_comments)
| Tool | Type | Description |
|------|------|-------------|
| `get_comments` | read | Get comments on a page |
| `add_comment` | write | Add comment to a page |
| `reply_to_comment` | write | Reply to an existing comment |

### Labels (toolset: confluence_labels)
| Tool | Type | Description |
|------|------|-------------|
| `get_labels` | read | Get labels on a page |
| `add_label` | write | Add label(s) to a page |

### Users (toolset: confluence_users)
| Tool | Type | Description |
|------|------|-------------|
| `search_user` | read | Search for Confluence users |

### History/Analytics (toolset: confluence_history)
| Tool | Type | Description |
|------|------|-------------|
| `get_page_history` | read | Get page version history |
| `get_page_diff` | read | Get diff between two page versions |
| `get_page_views` | read | Get page view analytics |

### Attachments (toolset: confluence_attachments)
| Tool | Type | Description |
|------|------|-------------|
| `upload_attachment` | write | Upload a single file to a page |
| `upload_attachments` | write | Upload multiple files to a page |
| `get_attachments` | read | List attachments on a page |
| `download_attachment` | read | Download a specific attachment |
| `download_content_attachments` | read | Download all attachments from a page |
| `delete_attachment` | write | Delete an attachment |
| `get_page_images` | read | Get image attachments as embedded content |

---

## Cloud vs Server/Data Center Differences

### API Differences
| Feature | Cloud | Server/DC |
|---------|-------|-----------|
| API Base | `/rest/api/3` (Jira), `/wiki/api/v2` (Confluence) | `/rest/api/2` (Jira), `/rest/api/content` (Confluence) |
| Auth | Basic (email+token) or OAuth 2.0 | PAT or Basic (username+password) |
| User ID | Account ID (`accountId`) | Username or key |
| Confluence content format | ADF (Atlassian Document Format) | Storage format (XHTML-like) |
| Issue description | ADF JSON | Wiki markup or HTML |
| Watcher API | Account ID based | Username based |
| Minimum version | Always latest | Jira 8.14+, Confluence 6.0+ |

### How the code handles it
- `config.is_cloud` property checks URL pattern (`atlassian.net` = cloud)
- Branching logic throughout the codebase: `if config.is_cloud: ... else: ...`
- Confluence has a `v2_adapter.py` that adapts v1 API responses to match v2 format
- Jira formats issue descriptions differently for Cloud (ADF) vs Server (wiki markup)

---

## Content Preprocessing

The `preprocessing/` module handles:
- **HTML to Markdown conversion** for Confluence pages
- **ADF (Atlassian Document Format) to readable text** for Jira Cloud
- **Smart content truncation** to keep responses within token limits
- **Attachment handling** — base64 encoding for images, download links for files

---

## Toolset System

Tools are grouped into toolsets (e.g., `jira_issues`, `jira_search`, `confluence_pages`). This allows:
- Selective enabling/disabling via `MCP_ATLASSIAN_ENABLED_TOOLSETS` env var
- Read-only mode via `READ_ONLY_MODE=true` (disables all write tools)
- Granular control over what an AI agent can access

---

## Key Design Patterns for CLI Port

### What to replicate in Node.js CLI
1. **Tool-per-command pattern** — each MCP tool becomes a CLI subcommand
2. **Dual auth support** — Cloud (Basic/OAuth) and Server/DC (PAT/Basic)
3. **Cloud detection** — URL-based auto-detection (`atlassian.net` = cloud)
4. **Read/Write separation** — `--read-only` flag to disable mutations
5. **JQL/CQL pass-through** — search commands accept raw JQL/CQL strings
6. **Field selection** — `--fields` flag to control output verbosity
7. **Pagination** — `--limit` and `--offset` for search results
8. **JSON output** — structured JSON output for piping to agents
9. **Markdown output** — human-readable formatted output for terminal
10. **Content preprocessing** — HTML/ADF to markdown conversion

### Suggested CLI command structure
```
cli-atlassian jira search "project = PROJ AND status = Open"
cli-atlassian jira get-issue PROJ-123
cli-atlassian jira create-issue --project PROJ --type Bug --summary "Login broken"
cli-atlassian jira transition PROJ-123 --status "In Progress"
cli-atlassian jira get-sprint-issues --board 42 --sprint 100

cli-atlassian confluence search "type = page AND space = DEV"
cli-atlassian confluence get-page --id 12345
cli-atlassian confluence create-page --space DEV --title "New Page" --body "Content"
cli-atlassian confluence get-page-tree --space DEV
```

### Node.js libraries to consider
- `commander` or `yargs` — CLI framework
- `axios` or `node-fetch` — HTTP client
- `turndown` — HTML to Markdown conversion
- `dotenv` — environment variable management
- `chalk` — terminal coloring
- `ora` — loading spinners

---

## Compatibility Matrix (from README)

| Product | Deployment | Support |
|---------|------------|---------|
| Confluence | Cloud | Fully supported |
| Confluence | Server/Data Center | Supported (v6.0+) |
| Jira | Cloud | Fully supported |
| Jira | Server/Data Center | Supported (v8.14+) |

---

## Summary for CLI Port

**Total commands to implement:** 73 (49 Jira + 24 Confluence)

**Priority for MVP:**
1. `jira search` (JQL)
2. `jira get-issue`
3. `jira create-issue`
4. `jira update-issue`
5. `jira transition-issue`
6. `jira add-comment`
7. `confluence search` (CQL)
8. `confluence get-page`
9. `confluence create-page`
10. `confluence update-page`

These 10 commands cover 90% of daily Jira/Confluence workflows.
