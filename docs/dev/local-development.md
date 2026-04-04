# Local Development & Testing Guide

This guide covers how to build, run, and test the `atl` CLI from source before publishing to npm.

## Prerequisites

- Node.js >= 22.0.0
- npm
- Access to an Atlassian Jira and/or Confluence instance (Cloud or Server/DC)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url>
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

**Optional — disable SSL verification (self-signed certs):**

```bash
JIRA_SSL_VERIFY=false
CONFLUENCE_SSL_VERIFY=false
```

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

This runs `tsc` and outputs compiled JavaScript to the `dist/` directory.

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
npm unlink -g atlassian-cli
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

For instances with self-signed certificates, set `JIRA_SSL_VERIFY=false` or `CONFLUENCE_SSL_VERIFY=false`.

### Confluence search returns no results (Server/DC)

Ensure you are on the latest build. Older versions used `siteSearch` (a Cloud-only CQL function) for plain-text queries. The fix uses the `text` CQL field for Server/DC instead.

### Build errors

```bash
# Clean and rebuild
rm -rf dist
npm run build
```

## Before Submitting a PR

1. Ensure `npm run build` succeeds with no errors
2. Test your changes against at least one deployment type (Cloud or Server/DC)
3. Verify both human-readable and JSON output modes work
4. If you added a new command, add a corresponding skill file in `.claude/skills/`
