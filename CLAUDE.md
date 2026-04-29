# CLAUDE.md

## Project Overview

**atlassian-cli** (`atl`) is a TypeScript CLI for Jira and Confluence that serves as a lightweight alternative to the [mcp-atlassian](https://github.com/sooperset/mcp-atlassian) MCP server. Phase 1 implemented read-only tools; Phase 2 added write operations.

The original MCP server has 73 tools (49 Jira + 24 Confluence). This CLI currently implements 13 Atlassian commands + 2 utility commands:

**Jira (8 commands):**
- `atl jira search` — JQL search
- `atl jira get-issue` — Full issue details with comments, images, and attachments
- `atl jira download-attachments` — Download issue attachments to local directory
- `atl jira create-issue` — Create a new issue
- `atl jira update-issue` — Update issue fields
- `atl jira add-comment` — Add a comment to an issue
- `atl jira get-transitions` — List available workflow transitions
- `atl jira transition-issue` — Transition an issue to a new status

**Confluence (6 commands):**
- `atl confluence search` — CQL/text search
- `atl confluence get-page` — Page content by ID or title+space (layout-aware, with image extraction)
- `atl confluence download-attachments` — Download page attachments to local directory
- `atl confluence create-page` — Create a new page (markdown or storage format)
- `atl confluence update-page` — Update page content
- `atl confluence add-comment` — Add a comment to a page

**Utility:**
- `atl install --skills` — Install AI agent skill files (Claude Code, Cursor, Copilot)
- `atl uninstall --skills` — Remove installed skill files

## Tech Stack

- **Language:** TypeScript (ES2022, NodeNext modules, strict mode)
- **Runtime:** Node.js >= 22 (uses native `fetch`, no HTTP library)
- **CLI framework:** Commander.js
- **Content conversion:** Turndown (HTML to Markdown), custom ADF-to-Markdown parser, text-to-ADF (write), markdown-to-storage (write)
- **Output styling:** Chalk
- **No test framework yet**

## Build & Run

```bash
npm run build          # tsc → dist/ + copies skill files into dist
npm run dev            # tsc --watch (does NOT copy skills)
npm start              # node dist/bin/atl.js
node dist/bin/atl.js   # direct invocation
```

Entry point: `bin/atl.ts` → compiles to `dist/bin/atl.js`

## Publishing to npm

The package is scoped as `@sahajamit/atlassian-cli`. Key npm config in `package.json`:
- `files: ["dist", "LICENSE", "README.md"]` — only these are published
- `prepublishOnly: "npm run build"` — auto-builds before publish
- `build` includes `copy-skills` step that copies all three `src/skills/*/SKILL.md` files into `dist/`

```bash
npm publish --access public    # publish to npm registry
```

### ⚠️ Pending version bump for next publish

The currently-checked-in source has accumulated changes since the last published version (`0.2.1` on npm) that **must be reflected in a version bump on the next `npm publish`**. Bump to **`0.3.0`** (minor) before publishing — these are behavior changes for existing consumers, not just docs:

- **`postinstall` script removed.** Previously `npm install @sahajamit/atlassian-cli` auto-dropped skill files into `~/.claude/skills`, `~/.cursor/rules`, `~/.copilot/skills`. It no longer does — users must run `atl install --skills` manually. Existing consumers upgrading will silently lose the auto-install.
- **Path-traversal hardening in `download-attachments`** (Jira + Confluence). Attachments with traversal-style filenames (`../foo`) are now rejected or basename-stripped instead of writing outside the target dir. Edge-case behavior change.
- **`JIRA_SSL_VERIFY` / `CONFLUENCE_SSL_VERIFY` env vars removed.** They were dead code (Node native `fetch` doesn't honor them), but anyone with these set will see them silently ignored. Workaround documented: `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- `package.json` metadata updates (`repository.url`, `homepage`, `bugs`, `files` whitelist) — cosmetic but tied to the public-repo release.
- New `LICENSE` file shipped in the tarball.

**Before the next `npm publish`:**
1. Bump `version` in `package.json` to `0.3.0`.
2. Skim this list and add any since-then changes to release notes.
3. Run `npm pack --dry-run` and confirm no `postinstall` artifacts and that LICENSE + README ship.
4. Then `npm publish --access public`.

Remove this section once `0.3.0` (or later) has shipped.

## Project Structure

```
bin/atl.ts                        # CLI entry point, commander setup
src/
  config.ts                       # Env var loading, Cloud vs Server detection
  http.ts                         # HTTP client with auth (Basic / PAT) + file download
  output.ts                       # JSON vs human-readable output (auto-detects TTY)
  errors.ts                       # CliError, ConfigError, ApiError
  installer.ts                    # Skill file installer for AI agents
  types/
    common.ts                     # Auth, Config, ServiceConfig types
    jira.ts                       # Jira data models
    confluence.ts                 # Confluence data models
  preprocessing/
    adf-to-text.ts                # Atlassian Document Format → Markdown
    text-to-adf.ts                # Plain text → ADF (for Jira Cloud writes)
    html-to-markdown.ts           # HTML → Markdown with layout/macro/image handling
    markdown-to-storage.ts        # Markdown → Confluence storage XHTML (for writes)
  clients/
    jira.ts                       # Jira API client (Cloud v3 / Server v2)
    confluence.ts                 # Confluence API client
  commands/
    jira/
      search.ts, get-issue.ts, create-issue.ts, update-issue.ts,
      add-comment.ts, get-transitions.ts, transition-issue.ts, index.ts
    confluence/
      search.ts, get-page.ts, download-attachments.ts,
      create-page.ts, update-page.ts, add-comment.ts, index.ts
  skills/
    atl/SKILL.md                  # Parent skill (routing + overview)
    atl-jira/SKILL.md             # Jira commands skill
    atl-confluence/SKILL.md       # Confluence commands skill
.claude/skills/                   # Claude Code skill definitions (dev only)
```

## Key Architecture Patterns

- **Cloud vs Server/DC:** Auto-detected from URL (`atlassian.net` = Cloud). Cloud uses REST API v3 (Jira) with POST search; Server uses v2 with GET search. The clients handle this transparently.
- **Auth:** Basic Auth (email + API token) for Cloud; PAT (Bearer token) preferred for Server/DC, Basic Auth as fallback.
- **Content normalization:** Raw API responses are normalized to unified types. Jira Cloud returns ADF (JSON), Server returns wiki markup — both converted to Markdown. Confluence HTML is converted via Turndown with targeted rules for layouts, code blocks, panels, expand sections, and images.
- **Image extraction:** `htmlToMarkdown()` returns `{ markdown, images }` — the images array collects all `ac:image` references found during conversion, enriched with attachment metadata from the API.
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
```

For Server/DC instances with self-signed certs, run with `NODE_TLS_REJECT_UNAUTHORIZED=0` (process-wide; Node native `fetch` does not support per-request TLS bypass).

## Skill Installer (`atl install --skills` / `atl uninstall --skills`)

The CLI installs three modular skill files into AI agent directories:
- **`atl`** — parent skill (routing + overview)
- **`atl-jira`** — all Jira commands with syntax and examples
- **`atl-confluence`** — all Confluence commands with syntax and examples

Targets per skill:
- **Claude Code** → `~/.claude/skills/<name>/SKILL.md`
- **Cursor** → `~/.cursor/rules/<name>.md`
- **Copilot (standalone)** → `~/.copilot/skills/<name>/SKILL.md`
- **GitHub Copilot** → appends to `.github/copilot-instructions.md` (with `<!-- <name>-skill -->` markers)

The installer (`src/installer.ts`) locates bundled skill files relative to its own compiled path. The `copy-skills` build step copies all three to `dist/`.

## Adding New Commands

1. Add types to `src/types/jira.ts` or `src/types/confluence.ts`
2. Add client method in `src/clients/jira.ts` or `src/clients/confluence.ts`
3. Create command file in `src/commands/<service>/<command>.ts`
4. Register in `src/commands/<service>/index.ts`
5. Add a Claude Code skill in `.claude/skills/`
6. Update the unified skill file in `src/skills/atl/SKILL.md`

Follow existing patterns: normalize API responses, handle Cloud/Server differences in the client layer, use `formatOutput()` for display.

## Planned Features (Phase 3 Roadmap)

- **Jira:** list-projects, list-boards, list-sprints, get-sprint-issues, link-issues, delete-issue
- **Confluence:** get-children, get-page-tree, delete-page, get-labels/add-label, get-page-history
- **Infra:** `atl configure` wizard, config file (~/.config/atl/config.json), OAuth 2.0
