# Local Development & Testing Guide

This guide covers how to build, run, and test the `atl` CLI from source before publishing to npm.

## Prerequisites

- Node.js >= 22.0.0
- npm
- Access to an Atlassian Jira and/or Confluence instance (Cloud or Server/DC)

## Setup

### 1. Clone and install dependencies

```bash
git clone https://github.com/sahajamit/atlassian-cli.git
cd atlassian-cli
npm install
```

### 2. Configure environment variables

Copy the example env file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your instance details. See examples below for Cloud and Server/DC.

**Cloud (atlassian.net):**

```bash
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your_api_token

CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your_api_token
```

Get an API token at: https://id.atlassian.com/manage-profile/security/api-tokens

**Server / Data Center (on-prem):**

```bash
JIRA_URL=https://jira.yourcompany.com
JIRA_PERSONAL_TOKEN=your_personal_access_token

CONFLUENCE_URL=https://confluence.yourcompany.com
CONFLUENCE_PERSONAL_TOKEN=your_personal_access_token
```

Generate a PAT from your Atlassian Server profile page under **Personal Access Tokens**.

**Self-signed certs:** the CLI does not implement per-service TLS bypass — Node's native `fetch` doesn't support a per-request `rejectUnauthorized`. If you must connect to a Server/DC instance with a self-signed cert, run the process with `NODE_TLS_REJECT_UNAUTHORIZED=0`:

```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 atl jira search "project = PROJ"
```

This applies to the entire Node process, so use it deliberately (e.g. only when you trust the network path).

### 3. Load environment variables

The CLI reads from `process.env`, so export the variables into your shell before running:

```bash
source .env        # if your .env uses export statements
# OR
set -a && source .env && set +a   # auto-export all variables from .env
```

Alternatively, use a tool like [direnv](https://direnv.net/) or prefix commands inline:

```bash
JIRA_URL=https://... JIRA_PERSONAL_TOKEN=... node dist/bin/atl.js jira search "project = PROJ"
```

## Building

### Compile TypeScript

```bash
npm run build
```

This runs `tsc` and copies the skill file (`src/skills/atl/SKILL.md`) into `dist/`. The compiled output goes to `dist/`.

### Watch mode (auto-recompile on save)

```bash
npm run dev
```

Useful during active development — keeps a terminal open and recompiles on every file change.

## Running the CLI from source

After building, run the CLI directly via Node:

```bash
node dist/bin/atl.js --help
node dist/bin/atl.js jira search "project = PROJ AND status = Open"
node dist/bin/atl.js confluence search "release notes"
```

### Using `npm start`

```bash
npm start -- --help
npm start -- jira get-issue PROJ-123
npm start -- confluence get-page --id 12345
```

Note the `--` separator — npm needs it to pass arguments through to the script.

### Simulating a global install with `npm link`

To test the CLI as if it were installed globally (i.e., use the `atl` command directly):

```bash
npm link
```

Now you can run `atl` from anywhere:

```bash
atl jira search "assignee = currentUser()"
atl confluence search "architecture" --spaces ENG,PLATFORM
atl confluence get-page --id 12345
```

To remove the link when done:

```bash
npm unlink -g @sahajamit/atlassian-cli
```

## Testing Workflows

### Jira

```bash
# Search issues with JQL
atl jira search "project = PROJ ORDER BY updated DESC" --limit 5

# Get a specific issue with comments
atl jira get-issue PROJ-123 --comments 5

# JSON output (for verifying schema)
atl jira search "project = PROJ" --json

# Pipe to jq for inspection
atl jira search "project = PROJ" --json | jq '.issues[0]'
```

### Confluence

```bash
# Plain text search across all spaces
atl confluence search "deployment guide"

# Search within specific spaces
atl confluence search "API reference" --spaces ENG,DOCS

# Get a page by ID
atl confluence get-page --id 12345

# Get a page by title and space
atl confluence get-page --title "Release Notes" --space ENG

# Raw HTML output (skip markdown conversion)
atl confluence get-page --id 12345 --raw

# JSON output
atl confluence search "onboarding" --json | jq '.results[] | {id, title, url}'
```

### Skill installer

```bash
# Install skill files into AI agent directories
atl install

# Verify files were created
ls ~/.claude/skills/atl/SKILL.md
ls ~/.cursor/rules/atl.md          # only if Cursor is set up
ls ~/.copilot/skills/atl/SKILL.md

# Uninstall skill files
atl uninstall
```

### Verifying output modes

The CLI auto-detects whether stdout is a terminal (TTY) or a pipe:

```bash
# Human-readable table (TTY)
atl jira search "project = PROJ"

# Automatic JSON (piped)
atl jira search "project = PROJ" | cat

# Forced JSON
atl jira search "project = PROJ" --json
```

### Testing Cloud vs Server/DC

If you have access to both deployment types, test each separately by swapping environment variables:

```bash
# Test against Cloud
export JIRA_URL=https://company.atlassian.net
export JIRA_USERNAME=you@company.com
export JIRA_API_TOKEN=cloud_token
atl jira search "project = PROJ"

# Test against Server/DC
export JIRA_URL=https://jira.internal.company.com
export JIRA_PERSONAL_TOKEN=server_pat
atl jira search "project = PROJ"
```

## Troubleshooting

### "No Atlassian services configured"

None of the required environment variables (`JIRA_URL`, `CONFLUENCE_URL`) are set. Check your `.env` and ensure the variables are exported.

### Authentication errors (401)

- **Cloud:** Verify your email and API token are correct. Tokens expire if revoked.
- **Server/DC:** Verify your PAT is valid and has not expired. Check that the token has the required permissions.

### SSL errors on Server/DC

For instances with self-signed certificates, run with `NODE_TLS_REJECT_UNAUTHORIZED=0` (process-wide). See *Setup → Self-signed certs* above.

### Confluence search returns no results (Server/DC)

Ensure you are on the latest build. Older versions used `siteSearch` (a Cloud-only CQL function) for plain-text queries. The fix uses the `text` CQL field for Server/DC instead.

### Build errors

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

## Publishing to npm

The package is published as `@sahajamit/atlassian-cli`. Only the `dist/` directory is included in the published package (controlled by the `files` field in `package.json`).

### Pre-publish checklist

1. Ensure `npm run build` succeeds with no errors
2. Test all commands against at least one deployment type (Cloud or Server/DC)
3. Verify `atl install` and `atl uninstall` work correctly
4. Verify `dist/src/skills/atl/SKILL.md` exists after build (the `copy-skills` step)
5. Update the version in `package.json` if needed

### Dry run (inspect what will be published)

```bash
npm pack --dry-run
```

This lists all files that would be included in the tarball. Verify that only `dist/` contents are listed and no source files, `.env`, or credentials leak through.

### Publish

```bash
# First time: you need to be logged in
npm login

# Publish (auto-runs prepublishOnly → npm run build)
npm publish --access public
```

### Testing the published package

After publishing, verify the install works end-to-end:

```bash
# Install globally from npm
npm install -g @sahajamit/atlassian-cli

# Verify the binary works
atl --version
atl --help

# Install skill files
atl install

# Test with real credentials
atl jira search "project = PROJ" --limit 1
atl confluence search "test" --limit 1

# Clean up
npm uninstall -g @sahajamit/atlassian-cli
```

### Local testing before publishing (alternative to npm link)

You can also test the package install flow locally without publishing:

```bash
# Create a tarball
npm pack

# Install the tarball globally
npm install -g sahajamit-atlassian-cli-0.1.0.tgz

# Test it
atl --help
atl install

# Clean up
npm uninstall -g @sahajamit/atlassian-cli
rm sahajamit-atlassian-cli-0.1.0.tgz
```

## Project structure

```
atlassian-cli/
├── bin/atl.ts                       # CLI entry point, commander setup
├── src/
│   ├── config.ts                    # Env var loading, Cloud vs Server detection
│   ├── http.ts                      # HTTP client with auth (Basic / PAT) + file download
│   ├── output.ts                    # JSON vs human-readable output (auto-detects TTY)
│   ├── errors.ts                    # CliError, ConfigError, ApiError
│   ├── installer.ts                 # Skill file installer for AI agents
│   ├── types/
│   │   ├── common.ts                # Auth, Config, ServiceConfig types
│   │   ├── jira.ts                  # Jira data models
│   │   └── confluence.ts            # Confluence data models
│   ├── preprocessing/
│   │   ├── adf-to-text.ts           # Atlassian Document Format → Markdown
│   │   ├── text-to-adf.ts           # Plain text → ADF (for Jira Cloud writes)
│   │   ├── html-to-markdown.ts      # HTML → Markdown with layout/macro/image handling
│   │   └── markdown-to-storage.ts   # Markdown → Confluence storage XHTML (for writes)
│   ├── clients/
│   │   ├── jira.ts                  # Jira API client (Cloud v3 / Server v2)
│   │   └── confluence.ts            # Confluence API client
│   ├── commands/
│   │   ├── jira/                    # search, get-issue, download-attachments, ...
│   │   └── confluence/              # search, get-page, download-attachments, ...
│   └── skills/
│       ├── atl/SKILL.md             # Parent skill (routing + overview)
│       ├── atl-jira/SKILL.md        # Jira commands skill
│       └── atl-confluence/SKILL.md  # Confluence commands skill
├── .claude/skills/                  # Claude Code skill definitions (dev only)
├── docs/                            # Public-facing docs and dev guide
└── tsconfig.json
```

### Architecture patterns

- **Cloud vs Server/DC** is auto-detected from the URL (`atlassian.net` = Cloud). Cloud uses REST API v3 (Jira) with POST search; Server uses v2 with GET search. Clients handle the difference transparently.
- **Auth:** Basic Auth (email + API token) for Cloud; PAT (Bearer token) preferred for Server/DC, Basic Auth as fallback.
- **Content normalization:** raw API responses are normalized to unified types. Jira Cloud returns ADF (JSON), Server returns wiki markup — both converted to Markdown. Confluence HTML is converted via Turndown.
- **Output mode:** auto-detects TTY for human-readable tables vs JSON for piped output. `--json` flag forces JSON.
- **Factory pattern:** `createHttpClient()`, `createJiraClient()`, `createConfluenceClient()` — no classes, just functions returning objects.
- **Error hierarchy:** `CliError` base → `ConfigError` (missing env vars) and `ApiError` (HTTP failures).

## Adding new commands

1. Add types to `src/types/jira.ts` or `src/types/confluence.ts`
2. Add client method in `src/clients/jira.ts` or `src/clients/confluence.ts`
3. Create command file in `src/commands/<service>/<command>.ts`
4. Register in `src/commands/<service>/index.ts`
5. Update the unified skill file in `src/skills/atl-<service>/SKILL.md`

Follow existing patterns: normalize API responses, handle Cloud/Server differences in the client layer, use `formatOutput()` for display.

## Roadmap

Phase 1 (read-only) and Phase 2 (write operations) are complete. Phase 3 candidates:

**Jira:**
- `atl jira list-projects` — List accessible projects
- `atl jira list-boards` — List agile boards
- `atl jira list-sprints` — List sprints for a board
- `atl jira get-sprint-issues` — Sprint board view
- `atl jira link-issues` — Link two issues
- `atl jira delete-issue` — Delete an issue

**Confluence:**
- `atl confluence get-children` — Get child pages
- `atl confluence get-page-tree` — Space page hierarchy
- `atl confluence delete-page` — Delete a page
- `atl confluence get-labels` / `add-label` — Label management
- `atl confluence get-page-history` — Version history

**Infrastructure:**
- `atl configure` — Interactive setup wizard
- Config file support (`~/.config/atl/config.json`)
- OAuth 2.0 support for Cloud

## Before Submitting a PR

1. Ensure `npm run build` succeeds with no errors
2. Test your changes against at least one deployment type (Cloud or Server/DC)
3. Verify both human-readable and JSON output modes work
4. If you added a new command, add a corresponding skill file in `.claude/skills/` and update `src/skills/atl-<service>/SKILL.md`
