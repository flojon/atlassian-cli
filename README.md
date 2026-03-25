# atl — Atlassian CLI

A lightweight Node.js CLI for Atlassian Jira and Confluence. Works with both **Cloud** and **Server/Data Center** deployments.

Built as a faster, leaner alternative to MCP servers for letting AI agents (like Claude Code) interact with Atlassian products.

---

## Why We Built This

### The Problem with MCP

[MCP (Model Context Protocol)](https://modelcontextprotocol.io/) is the standard way AI agents talk to external tools. The [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) server is an excellent implementation — 73 tools covering nearly every Jira and Confluence operation. But in practice, using MCP for Atlassian has real costs:

1. **Token overhead.** Every MCP call includes the full tool schema in the conversation context. With 73 tools, that's thousands of tokens spent just describing what's available — before any actual work happens. On long conversations, this adds up fast.

2. **Server lifecycle.** MCP requires a running server process. You need to start it, keep it alive, handle crashes, manage configuration. It's another moving part in your development setup.

3. **Cold start latency.** The Python MCP server needs to initialize, load dependencies, and establish connections before the first call. This adds seconds to every fresh session.

4. **All-or-nothing tool loading.** MCP sends all tool definitions to the agent upfront. Even if you only need `jira search` and `get-issue`, the agent sees all 73 tools and has to reason about which ones to use. This dilutes focus and wastes context.

### The CLI + Skills Approach

`atl` takes a different approach: it's a plain CLI binary that Claude Code (or any agent) invokes directly via shell commands. Combined with Claude Code skills (markdown files that teach the agent how to use each command), this gives you:

| | MCP Server | CLI + Skills |
|---|---|---|
| **Token cost** | ~3,000+ tokens for tool schemas per turn | ~200 tokens per skill file, loaded on demand |
| **Setup** | Start server process, configure transport | Set env vars, run `npm link` |
| **Latency** | Server init + JSON-RPC overhead | Direct process spawn (~50ms) |
| **Tool selection** | Agent picks from 73 tools | Agent reads relevant skill file only |
| **Dependencies** | Python + FastMCP + atlassian-python-api | Node.js + 3 npm packages |
| **Debugging** | Inspect MCP messages | Run the same CLI command in your terminal |

The key insight: **an agent doesn't need a protocol to call a CLI.** It just runs a shell command and reads the output. Skills files teach it the command syntax and output schema — no runtime overhead, no server process, no token bloat.

### When to Use MCP Instead

MCP still makes sense when:
- You need **bi-directional communication** (server pushing updates to the agent)
- You're building a **multi-tenant SaaS** with OAuth per user
- You need **all 73 tools** and want automatic tool discovery
- Your agent framework **only supports MCP** (no shell access)

For the common case — a developer using Claude Code to work with their team's Jira and Confluence — the CLI is simpler and cheaper.

---

## Quick Start

### Prerequisites

- Node.js 22+
- An Atlassian account with API access

### Install

```bash
git clone <repo-url> && cd atlassian-cli
npm install
npm run build
npm link    # makes `atl` available globally
```

### Configure

Set environment variables for your Atlassian instance. You only need to configure the services you use (Jira, Confluence, or both).

**Atlassian Cloud:**
```bash
export JIRA_URL=https://your-company.atlassian.net
export JIRA_USERNAME=your.email@company.com
export JIRA_API_TOKEN=your_api_token          # https://id.atlassian.com/manage-profile/security/api-tokens

export CONFLUENCE_URL=https://your-company.atlassian.net/wiki
export CONFLUENCE_USERNAME=your.email@company.com
export CONFLUENCE_API_TOKEN=your_api_token
```

**Server / Data Center (on-prem):**
```bash
export JIRA_URL=https://jira.yourcompany.com
export JIRA_PERSONAL_TOKEN=your_pat           # Generated in Jira → Profile → Personal Access Tokens

export CONFLUENCE_URL=https://confluence.yourcompany.com
export CONFLUENCE_PERSONAL_TOKEN=your_pat
```

The CLI auto-detects Cloud vs Server based on the URL (`atlassian.net` = Cloud, anything else = Server/DC).

### Verify

```bash
atl jira search "project = PROJ ORDER BY updated DESC" --limit 3
```

---

## Tools

### Jira

#### `atl jira search <jql>`

Search issues using [JQL (Jira Query Language)](https://support.atlassian.com/jira-service-management-cloud/docs/use-advanced-search-with-jira-query-language-jql/).

```bash
# Find open bugs assigned to you
atl jira search "project = PROJ AND type = Bug AND assignee = currentUser() AND status != Done"

# Recently updated issues
atl jira search "project = PROJ AND updated >= -7d ORDER BY updated DESC"

# Issues by label
atl jira search "project = PROJ AND labels = backend" --limit 50

# Custom fields
atl jira search "project = PROJ" --fields summary,status,customfield_10001
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-l, --limit <n>` | 20 | Maximum results to return |
| `--offset <n>` | 0 | Skip this many results (pagination) |
| `-f, --fields <fields>` | core fields | Comma-separated field names |
| `--json` | auto | Force JSON output |

**Output (human):**
```
Found 42 issue(s) (more available)

Key        Summary                          Status        Assignee      Priority
─────────  ───────────────────────────────  ────────────  ────────────  ────────
PROJ-101   Login page returns 500           In Progress   Jane Smith    High
PROJ-98    Update API docs for v2           To Do         Unassigned    Medium
PROJ-95    Add rate limiting to /search     Done          John Doe      Low
```

**Output (JSON):**
```json
{
  "issues": [
    {
      "key": "PROJ-101",
      "id": "10042",
      "summary": "Login page returns 500",
      "status": "In Progress",
      "statusCategory": "indeterminate",
      "issueType": "Bug",
      "priority": "High",
      "assignee": "Jane Smith",
      "reporter": "Bob Wilson",
      "created": "2024-01-15T10:30:00.000+0000",
      "updated": "2024-01-16T14:20:00.000+0000",
      "description": "When clicking login with SSO...",
      "labels": ["backend", "urgent"],
      "components": ["API"],
      "comments": [],
      "url": "https://company.atlassian.net/browse/PROJ-101"
    }
  ],
  "total": 42,
  "hasMore": true
}
```

---

#### `atl jira get-issue <key>`

Get full details of an issue including description and comments.

```bash
# Full issue details
atl jira get-issue PROJ-123

# Limit comments
atl jira get-issue PROJ-123 --comments 5

# Specific fields only
atl jira get-issue PROJ-123 --fields summary,status,description
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-c, --comments <n>` | 10 | Maximum comments to include |
| `-f, --fields <fields>` | core fields | Comma-separated field names |
| `--json` | auto | Force JSON output |

**Output (human):**
```
PROJ-123  Fix authentication timeout on SSO login

  Status:     In Progress
  Type:       Bug
  Priority:   High
  Assignee:   Jane Smith
  Reporter:   Bob Wilson
  Labels:     backend, auth
  Components: API, SSO
  Created:    2024-01-15T10:30:00.000+0000
  Updated:    2024-01-16T14:20:00.000+0000
  URL:        https://company.atlassian.net/browse/PROJ-123

Description
The SSO login flow times out after 30 seconds when the IdP
takes more than 10s to respond. We should increase the timeout
and add a retry mechanism.

Comments (2)

  Bob Wilson — 2024-01-15T11:00:00.000+0000
  Reproduced on staging. The timeout is hardcoded in auth-service.

  Jane Smith — 2024-01-16T09:15:00.000+0000
  PR is up: #456. Changed timeout to 60s with exponential backoff.
```

**Note on descriptions:** Jira Cloud stores descriptions in ADF (Atlassian Document Format). The CLI automatically converts ADF to markdown. Jira Server stores descriptions as wiki markup or plain text, which is returned as-is.

---

### Confluence

#### `atl confluence search <query>`

Search pages and blog posts. Accepts plain text (auto-wrapped as CQL) or raw [CQL (Confluence Query Language)](https://developer.atlassian.com/server/confluence/advanced-searching-using-cql/).

```bash
# Plain text search (auto-converts to CQL)
atl confluence search "deployment guide"

# CQL query
atl confluence search "type = page AND space = DEV AND title ~ 'API'"

# Filter by spaces
atl confluence search "onboarding" --spaces DEV,HR

# Paginate
atl confluence search "architecture" --limit 5 --offset 10
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `-l, --limit <n>` | 10 | Maximum results to return |
| `--offset <n>` | 0 | Skip this many results (pagination) |
| `-s, --spaces <keys>` | all | Comma-separated space keys to filter |
| `--json` | auto | Force JSON output |

**Output (JSON):**
```json
{
  "results": [
    {
      "id": "12345",
      "title": "Deployment Guide",
      "type": "page",
      "spaceKey": "DEV",
      "spaceName": "Development",
      "lastModified": "2024-01-16T14:20:00.000Z",
      "excerpt": "This guide covers the **deployment** process for production...",
      "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
    }
  ],
  "total": 15,
  "hasMore": true
}
```

**Query auto-detection:** If your query doesn't contain CQL operators (`=`, `~`, `>`, `<`, `AND`, `OR`, `NOT`, `IN`, `currentUser()`), it's treated as a plain text search and wrapped as `siteSearch ~ "your query"`. Otherwise it's passed as raw CQL.

---

#### `atl confluence get-page`

Get full page content, converted to markdown by default.

```bash
# By page ID
atl confluence get-page --id 12345

# By title and space
atl confluence get-page --title "API Documentation" --space DEV

# Raw HTML (skip markdown conversion)
atl confluence get-page --id 12345 --raw
```

**Options:**

| Flag | Default | Description |
|------|---------|-------------|
| `--id <pageId>` | — | Page ID (numeric) |
| `--title <title>` | — | Page title (requires `--space`) |
| `--space <key>` | — | Space key (requires `--title`) |
| `--raw` | false | Return raw HTML instead of markdown |
| `--json` | auto | Force JSON output |

You must provide either `--id` or both `--title` and `--space`.

**Output (JSON):**
```json
{
  "id": "12345",
  "title": "API Documentation",
  "spaceKey": "DEV",
  "spaceName": "Development",
  "body": "# API Documentation\n\nThis page describes our REST API endpoints...",
  "version": 5,
  "lastModified": "2024-01-16T14:20:00.000Z",
  "lastModifiedBy": "John Doe",
  "url": "https://company.atlassian.net/wiki/spaces/DEV/pages/12345"
}
```

**Content conversion:** Confluence stores pages in XHTML ("storage format"). By default, the CLI converts this to clean markdown using [Turndown](https://github.com/mixmark-io/turndown). Confluence-specific macros (like `<ac:structured-macro>`) are converted to `[macro: name]` placeholders. Use `--raw` to get the original HTML.

---

## Output Modes

The CLI has two output modes:

| Mode | When | Format |
|------|------|--------|
| **Human** | stdout is a terminal (TTY) | Colored tables and formatted text |
| **JSON** | stdout is piped (non-TTY) | Structured JSON |

This means agents automatically get JSON without any flags:

```bash
# Agent runs this — gets JSON because stdout is piped
result=$(atl jira search "project = PROJ")

# Human runs the same command — gets a colored table
atl jira search "project = PROJ"

# Force JSON in terminal
atl jira search "project = PROJ" --json
```

---

## Cloud vs Server/Data Center

The CLI works with both Atlassian Cloud and self-hosted Server/Data Center deployments. Differences are handled automatically:

| | Cloud | Server / Data Center |
|---|---|---|
| **Detection** | URL contains `atlassian.net` | Everything else |
| **Auth** | Email + API token | Personal Access Token (preferred) or username + password |
| **Jira API** | REST API v3 | REST API v2 |
| **Confluence API** | REST API v1 (content) | REST API v1 (content) |
| **Descriptions** | ADF (auto-converted to markdown) | Wiki markup / plain text |

You don't need to specify which deployment type you're using — the CLI detects it from the URL.

### Authentication Methods

**Cloud — Basic Auth (email + API token):**
```bash
export JIRA_URL=https://your-company.atlassian.net
export JIRA_USERNAME=your.email@company.com    # Your Atlassian email
export JIRA_API_TOKEN=<token>                  # From id.atlassian.com
```

**Server/DC — Personal Access Token (recommended):**
```bash
export JIRA_URL=https://jira.yourcompany.com
export JIRA_PERSONAL_TOKEN=<pat>               # From Jira → Profile → Personal Access Tokens
```

**Server/DC — Basic Auth (legacy):**
```bash
export JIRA_URL=https://jira.yourcompany.com
export JIRA_USERNAME=your_username
export JIRA_API_TOKEN=your_password            # Yes, the password goes in API_TOKEN
```

The same pattern applies to Confluence — replace `JIRA_` with `CONFLUENCE_`.

---

## Claude Code Integration

The repo includes [Claude Code skill files](https://docs.anthropic.com/en/docs/claude-code/skills) in `.claude/skills/` that teach Claude Code how to use each command:

```
.claude/skills/
├── jira-search.md
├── jira-get-issue.md
├── confluence-search.md
└── confluence-get-page.md
```

Each skill file documents the command syntax, all options, and the full JSON output schema. When Claude Code needs to interact with Jira or Confluence, it reads the relevant skill file and runs the CLI command — no MCP server needed.

### How it works with agents

1. Agent reads `.claude/skills/jira-search.md` to learn the command syntax
2. Agent runs `atl jira search "project = PROJ AND assignee = currentUser()"`
3. CLI returns JSON (auto-detected because stdout is piped)
4. Agent parses the JSON and continues reasoning

This is typically **5-10x cheaper in tokens** than the equivalent MCP flow, because:
- Only the relevant skill schema is loaded (not all 73 tools)
- No MCP protocol overhead (tool registration, JSON-RPC framing)
- The output is the same structured JSON either way

---

## Project Structure

```
atlassian-cli/
├── bin/
│   └── atl.ts                    # CLI entry point
├── src/
│   ├── config.ts                 # Environment variable loader, auth detection
│   ├── http.ts                   # HTTP client (native fetch, auth headers)
│   ├── output.ts                 # JSON vs human-readable formatting
│   ├── errors.ts                 # Error classes (ConfigError, ApiError)
│   ├── types/
│   │   ├── common.ts             # Auth, config, deployment types
│   │   ├── jira.ts               # Jira issue and search types
│   │   └── confluence.ts         # Confluence page and search types
│   ├── preprocessing/
│   │   ├── adf-to-text.ts        # Jira Cloud ADF → markdown converter
│   │   └── html-to-markdown.ts   # Confluence HTML → markdown (Turndown)
│   ├── clients/
│   │   ├── jira.ts               # Jira API client (Cloud v3 + Server v2)
│   │   └── confluence.ts         # Confluence API client
│   └── commands/
│       ├── jira/
│       │   ├── search.ts         # atl jira search
│       │   └── get-issue.ts      # atl jira get-issue
│       └── confluence/
│           ├── search.ts         # atl confluence search
│           └── get-page.ts       # atl confluence get-page
├── .claude/skills/               # Claude Code skill definitions
├── .env.example                  # Environment variable template
├── package.json
└── tsconfig.json
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `JIRA_URL` | For Jira | Jira instance URL |
| `JIRA_USERNAME` | Cloud | Your email address |
| `JIRA_API_TOKEN` | Cloud | API token from id.atlassian.com |
| `JIRA_PERSONAL_TOKEN` | Server/DC | Personal access token |
| `JIRA_SSL_VERIFY` | No | Set to `false` to skip SSL verification |
| `CONFLUENCE_URL` | For Confluence | Confluence instance URL |
| `CONFLUENCE_USERNAME` | Cloud | Your email address |
| `CONFLUENCE_API_TOKEN` | Cloud | API token from id.atlassian.com |
| `CONFLUENCE_PERSONAL_TOKEN` | Server/DC | Personal access token |
| `CONFLUENCE_SSL_VERIFY` | No | Set to `false` to skip SSL verification |

---

## Roadmap

The MVP covers the 4 most common operations. Future tools will follow the same pattern:

**Jira (next):**
- `atl jira create-issue` — Create issues
- `atl jira update-issue` — Update issue fields
- `atl jira transition` — Change issue status
- `atl jira add-comment` — Add comments
- `atl jira get-sprint-issues` — Sprint board view

**Confluence (next):**
- `atl confluence create-page` — Create pages
- `atl confluence update-page` — Update page content
- `atl confluence get-page-tree` — Space page hierarchy

**Infrastructure:**
- `atl configure` — Interactive setup wizard
- Config file support (`~/.config/atl/config.json`)
- OAuth 2.0 support for Cloud

---

## Credits

Architecture and API patterns informed by the excellent [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) project by [sooperset](https://github.com/sooperset).
