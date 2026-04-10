# CLI vs VS Code Extension: Token Efficiency Analysis

A comparison of packaging Atlassian tooling (Jira/Confluence) as a **CLI** vs a **VS Code extension** for AI coding agent consumption.

> **Scope:** This analysis focuses on token efficiency and developer experience when AI agents (Claude Code, Cursor, GitHub Copilot) invoke Atlassian tools. MCP is excluded from this comparison.

---

## Existing VS Code Extensions for Atlassian

| Extension | Author | Description |
|---|---|---|
| **Atlassian for VS Code** | Atlassian (official) | Issue viewing, Rovo Dev AI agent, Bitbucket PRs |
| **Atlassian Tools** | AutoOcto | Jira/Confluence with Copilot chat support |
| **Atlassian MCP Server** | SethFord | 25+ tools via MCP protocol |
| **Jira Plugin** | gioboa | Manage on-premises/cloud Jira issues |

None of these are specifically optimized for **token efficiency** when used by AI coding agents.

---

## Token Cost Breakdown Per Invocation

| Cost Component | CLI (`atl`) | VS Code Extension (Language Model Tools API) | VS Code Extension (Copilot @agent) |
|---|---|---|---|
| **Tool/Skill schema** | ~600-690 tokens (on-demand, per-skill) | 300-500 tokens (registered at startup) | 800-1,200 tokens (dynamic discovery) |
| **Invocation overhead** | ~20-40 tokens (bash command string) | ~50-100 tokens (JSON-RPC protocol) | ~100-150 tokens (agent protocol) |
| **Response data** | ~800 tokens (same data) | ~800 tokens (same data) | ~800 tokens (same data) |
| **First call total** | **~1,510** | **~1,150-1,400** | **~1,700-2,150** |
| **Subsequent calls** | **~820** | **~850-900** | **~900-950** |

---

## Multi-Turn Conversation Example (10 turns, mixed Jira/Confluence)

| Approach | Calculation | Total |
|---|---|---|
| **CLI** | ~690 (jira skill) + ~470 (confluence skill, lazy-loaded) + 10 x ~40 (commands) + 10 x ~800 (responses) | **~9,560 tokens** |
| **VS Code Extension** | ~500 (all schemas upfront) + 10 x ~80 (invocations) + 10 x ~800 (responses) | **~9,300 tokens** |

The difference is within ~3% -- effectively a tie for most workflows.

---

## Real-World Example: "Summarize Issue PROJ-123 with Images"

### CLI Approach

```
1. Load atl-jira skill (first mention):        ~600 tokens
2. Run: atl jira get-issue PROJ-123 --json:    ~40 tokens
3. Parse response (issue + 2 images):          ~800 tokens
4. Run: atl jira download-attachments:         ~40 tokens
5. Parse download response:                    ~150 tokens
6. Agent reads 2 image files:                  ~500 tokens

Total: ~2,130 tokens
```

### VS Code Extension Approach

```
1. Load tool schemas (all tools, at startup):  ~500 tokens
2. Tool invocation + response:                 ~100 + 800 = ~900 tokens
3. Download command:                           ~100 + 150 = ~250 tokens
4. Read image files:                           ~500 tokens

Total: ~2,150 tokens
```

---

## Where CLI Wins

### 1. Portability
Works with Claude Code, Cursor, Copilot, Windsurf -- any agent with shell access. A VS Code extension only works inside VS Code.

### 2. On-Demand Skill Loading
The three-file routing architecture loads only what's needed:

```
atl (routing, ~90 tokens) --> atl-jira (~600 tokens) OR atl-confluence (~470 tokens)
```

For a Jira-only conversation, Confluence skill definitions are never loaded. VS Code extensions register **all** tool schemas at session start with no lazy-loading mechanism.

### 3. No Protocol Overhead
Direct process spawn + stdout. No JSON-RPC handshake, no session management, no lifecycle negotiation.

### 4. Debuggability
Users can run the exact same command in their terminal and see the exact same output. With an extension, debugging requires VS Code's extension host and debug adapter protocol.

### 5. Zero Runtime Dependency
No VS Code process needed. Works in SSH sessions, CI/CD pipelines, Docker containers, any terminal environment.

---

## Where VS Code Extension Wins

### 1. Lower Latency
In-process function call (~10ms) vs process spawn (~50ms). Matters for rapid multi-step workflows.

### 2. Richer UI Integration
Gutter icons, side panels, webviews, inline suggestions. A CLI cannot show an interactive Jira board or inline issue previews.

### 3. OAuth Flow
Extensions can pop up a browser auth window. CLI requires manual environment variable setup.

### 4. Native Copilot Integration
For GitHub Copilot users specifically, the extension marketplace is the native distribution channel with built-in discovery.

### 5. Streaming Responses
Extensions can stream partial results progressively. CLI returns all output at once.

---

## Structural Comparison

| Criteria | CLI | VS Code Extension |
|---|---|---|
| **Token efficiency** | Tie (within 5%) | Tie (within 5%) |
| **Agent compatibility** | **Winner** -- works everywhere | VS Code only |
| **Distribution/discovery** | npm registry | **Winner** -- VS Code marketplace |
| **Setup friction** | Env vars + npm install | **Winner** -- install + OAuth UI |
| **Development cost** | **Winner** -- single codebase | Two targets (extension + API) |
| **UI capabilities** | Terminal only | **Winner** -- panels, webviews |
| **Headless/remote use** | **Winner** -- SSH, CI, Docker | Requires VS Code |
| **Debugging** | **Winner** -- run in terminal | Extension host required |

---

## CLI's Output Optimization (Already Built)

The `atl` CLI is already optimized for AI agent consumption:

1. **Automatic JSON detection** -- when output is piped (non-TTY), JSON is returned automatically with no `--json` flag needed
2. **Lean response schema** -- no null padding, no metadata bloat
3. **Markdown conversion** -- Jira ADF and Confluence HTML are pre-converted to markdown, reducing downstream parse tokens
4. **Separated image metadata** -- images are in a separate array with URLs/paths, avoiding inline content bloat

---

## Recommendation

**Stay with CLI.** The token efficiency difference is negligible (~3-5%), but the CLI provides:

- **Universal agent compatibility** (not locked to VS Code)
- **Already built and working** (no new development needed)
- **Simpler codebase** (one target, not two)
- **Works in headless/remote environments** (SSH, CI/CD, Docker)


### The Real Token Efficiency Lever

The biggest token savings don't come from CLI vs extension packaging. They come from:

1. **Response shaping** -- auto-JSON, markdown conversion, lean schemas (already done)
2. **On-demand skill loading** -- routing architecture that loads only relevant skills (already done)
3. **Content normalization** -- converting ADF/HTML to compact markdown before returning to the agent (already done)

---

*Analysis date: April 2026*
