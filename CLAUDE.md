# CLAUDE.md

## Project Overview

**atlassian-cli** (`atl`) is a TypeScript CLI for Jira and Confluence that serves as a lightweight alternative to the [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) MCP server. Phase 1 replicates the 4 most-used read-only tools; write commands and additional tools are planned.

The original MCP server has 73 tools (49 Jira + 24 Confluence). This CLI currently implements 4:
- `atl jira search` — JQL search
- `atl jira get-issue` — Full issue details with comments
- `atl confluence search` — CQL/text search
- `atl confluence get-page` — Page content by ID or title+space

## Tech Stack

- **Language:** TypeScript (ES2022, NodeNext modules, strict mode)
- **Runtime:** Node.js >= 22 (uses native `fetch`, no HTTP library)
- **CLI framework:** Commander.js
- **Content conversion:** Turndown (HTML to Markdown), custom ADF-to-Markdown parser
- **Output styling:** Chalk
- **No test framework yet**

## Build & Run

```bash
npm run build          # tsc → dist/
npm run dev            # tsc --watch
npm start              # node dist/bin/atl.js
node dist/bin/atl.js   # direct invocation
```

Entry point: `bin/atl.ts` → compiles to `dist/bin/atl.js`

## Project Structure

```
bin/atl.ts                        # CLI entry point, commander setup
src/
  config.ts                       # Env var loading, Cloud vs Server detection
  http.ts                         # HTTP client with auth (Basic / PAT)
  output.ts                       # JSON vs human-readable output (auto-detects TTY)
  errors.ts                       # CliError, ConfigError, ApiError
  types/
    common.ts                     # Auth, Config, ServiceConfig types
    jira.ts                       # Jira data models
    confluence.ts                 # Confluence data models
  preprocessing/
    adf-to-text.ts                # Atlassian Document Format → Markdown
    html-to-markdown.ts           # HTML → Markdown (Confluence pages)
  clients/
    jira.ts                       # Jira API client (Cloud v3 / Server v2)
    confluence.ts                 # Confluence API client
  commands/
    jira/
      search.ts, get-issue.ts, index.ts
    confluence/
      search.ts, get-page.ts, index.ts
.claude/skills/                   # Claude Code skill definitions for each command
```

## Key Architecture Patterns

- **Cloud vs Server/DC:** Auto-detected from URL (`atlassian.net` = Cloud). Cloud uses REST API v3 (Jira) with POST search; Server uses v2 with GET search. The clients handle this transparently.
- **Auth:** Basic Auth (email + API token) for Cloud; PAT (Bearer token) preferred for Server/DC, Basic Auth as fallback.
- **Content normalization:** Raw API responses are normalized to unified types. Jira Cloud returns ADF (JSON), Server returns wiki markup — both converted to Markdown. Confluence HTML is converted via Turndown.
- **Output mode:** Auto-detects TTY for human-readable tables vs JSON for piped output. `--json` flag forces JSON.
- **Factory pattern:** `createHttpClient()`, `createJiraClient()`, `createConfluenceClient()` — no classes, just functions returning objects.
- **Error hierarchy:** `CliError` base → `ConfigError` (missing env vars) and `ApiError` (HTTP failures).

## Authentication (Environment Variables)

```bash
# Cloud (atlassian.net)
JIRA_URL=https://company.atlassian.net
JIRA_USERNAME=email@company.com
JIRA_API_TOKEN=...

# Server/DC (on-prem) — PAT preferred
JIRA_URL=https://jira.internal.company.com
JIRA_PERSONAL_TOKEN=...

# Same pattern for CONFLUENCE_URL, CONFLUENCE_USERNAME, etc.
# Optional: JIRA_SSL_VERIFY=false / CONFLUENCE_SSL_VERIFY=false
```

## Adding New Commands

1. Add types to `src/types/jira.ts` or `src/types/confluence.ts`
2. Add client method in `src/clients/jira.ts` or `src/clients/confluence.ts`
3. Create command file in `src/commands/<service>/<command>.ts`
4. Register in `src/commands/<service>/index.ts`
5. Add a Claude Code skill in `.claude/skills/`

Follow existing patterns: normalize API responses, handle Cloud/Server differences in the client layer, use `formatOutput()` for display.

## Planned Features (Roadmap)

- **Jira:** create-issue, update-issue, transition, add-comment, get-sprint-issues
- **Confluence:** create-page, update-page, get-page-tree
- **Infra:** `atl configure` wizard, config file (~/.config/atl/config.json), OAuth 2.0
