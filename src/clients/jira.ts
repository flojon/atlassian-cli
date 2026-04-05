import type { HttpClient } from '../http.js';
import { adfToMarkdown } from '../preprocessing/adf-to-text.js';
import { textToAdf } from '../preprocessing/text-to-adf.js';
import type { DeploymentType } from '../types/common.js';
import type {
  JiraAddCommentResult,
  JiraCloudSearchResponse,
  JiraComment,
  JiraCreateIssueInput,
  JiraCreateIssueResult,
  JiraIssue,
  JiraRawIssue,
  JiraSearchResult,
  JiraServerSearchResponse,
  JiraTransition,
  JiraUpdateIssueInput,
} from '../types/jira.js';

const DEFAULT_FIELDS = [
  'summary', 'status', 'assignee', 'reporter', 'priority',
  'issuetype', 'labels', 'components', 'created', 'updated',
  'description', 'comment',
];

interface SearchOptions {
  fields?: string[];
  limit?: number;
  offset?: number;
}

interface GetIssueOptions {
  fields?: string[];
  expand?: string[];
  commentLimit?: number;
}

export interface JiraClient {
  search(jql: string, opts?: SearchOptions): Promise<JiraSearchResult>;
  getIssue(issueKey: string, opts?: GetIssueOptions): Promise<JiraIssue>;
  createIssue(input: JiraCreateIssueInput): Promise<JiraCreateIssueResult>;
  updateIssue(issueKey: string, input: JiraUpdateIssueInput): Promise<void>;
  addComment(issueKey: string, body: string): Promise<JiraAddCommentResult>;
  getTransitions(issueKey: string): Promise<JiraTransition[]>;
  transitionIssue(issueKey: string, transitionId: string, opts?: { comment?: string; resolution?: string }): Promise<void>;
}

function extractString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>;
    return (obj.displayName as string) ?? (obj.name as string) ?? (obj.value as string) ?? null;
  }
  return null;
}

function normalizeIssue(raw: JiraRawIssue, baseUrl: string, deployment: DeploymentType): JiraIssue {
  const f = raw.fields;

  // Process description
  let description: string | null = null;
  if (f.description) {
    if (deployment === 'cloud' && typeof f.description === 'object') {
      // Cloud: ADF format
      description = adfToMarkdown(f.description);
    } else if (typeof f.description === 'string') {
      // Server: plain text or wiki markup
      description = f.description;
    }
  }

  // Process comments
  const comments: JiraComment[] = [];
  const commentField = f.comment as { comments?: Array<Record<string, unknown>> } | undefined;
  if (commentField?.comments) {
    for (const c of commentField.comments) {
      let body: string;
      if (deployment === 'cloud' && typeof c.body === 'object') {
        body = adfToMarkdown(c.body);
      } else {
        body = (c.body as string) ?? '';
      }
      comments.push({
        id: String(c.id ?? ''),
        author: extractString(c.author) ?? 'Unknown',
        body,
        created: (c.created as string) ?? '',
        updated: (c.updated as string) ?? '',
      });
    }
  }

  // Status
  const statusObj = f.status as Record<string, unknown> | undefined;
  const statusCategoryObj = statusObj?.statusCategory as Record<string, unknown> | undefined;

  return {
    key: raw.key,
    id: raw.id,
    summary: (f.summary as string) ?? '',
    status: extractString(f.status) ?? 'Unknown',
    statusCategory: (statusCategoryObj?.key as string) ?? 'undefined',
    issueType: extractString(f.issuetype) ?? 'Unknown',
    priority: extractString(f.priority),
    assignee: extractString(f.assignee),
    reporter: extractString(f.reporter),
    created: (f.created as string) ?? '',
    updated: (f.updated as string) ?? '',
    description,
    labels: (f.labels as string[]) ?? [],
    components: ((f.components as Array<Record<string, unknown>>) ?? []).map(
      c => (c.name as string) ?? '',
    ),
    comments,
    url: `${baseUrl}/browse/${raw.key}`,
  };
}

export function createJiraClient(http: HttpClient, baseUrl: string, deployment: DeploymentType): JiraClient {
  return {
    async search(jql: string, opts: SearchOptions = {}): Promise<JiraSearchResult> {
      const fields = opts.fields ?? DEFAULT_FIELDS;
      const limit = opts.limit ?? 20;
      const offset = opts.offset ?? 0;

      if (deployment === 'cloud') {
        // Cloud v3: POST /rest/api/3/search/jql
        const response = await http.request<JiraCloudSearchResponse>({
          method: 'POST',
          path: '/rest/api/3/search/jql',
          body: {
            jql,
            fields,
            maxResults: limit,
            ...(offset > 0 ? { startAt: offset } : {}),
          },
        });

        const issues = response.issues.map(raw => normalizeIssue(raw, baseUrl, deployment));
        return {
          issues,
          total: response.total ?? issues.length,
          hasMore: !!response.nextPageToken,
        };
      } else {
        // Server v2: GET /rest/api/2/search
        const response = await http.request<JiraServerSearchResponse>({
          method: 'GET',
          path: '/rest/api/2/search',
          query: {
            jql,
            fields: fields.join(','),
            startAt: offset,
            maxResults: limit,
          },
        });

        const issues = response.issues.map(raw => normalizeIssue(raw, baseUrl, deployment));
        return {
          issues,
          total: response.total,
          hasMore: (response.startAt + response.issues.length) < response.total,
        };
      }
    },

    async getIssue(issueKey: string, opts: GetIssueOptions = {}): Promise<JiraIssue> {
      const fields = opts.fields ?? DEFAULT_FIELDS;
      const expand = opts.expand ?? [];
      const apiVersion = deployment === 'cloud' ? '3' : '2';

      const raw = await http.request<JiraRawIssue>({
        method: 'GET',
        path: `/rest/api/${apiVersion}/issue/${issueKey}`,
        query: {
          fields: fields.join(','),
          ...(expand.length ? { expand: expand.join(',') } : {}),
        },
      });

      const issue = normalizeIssue(raw, baseUrl, deployment);

      // Limit comments if requested
      if (opts.commentLimit !== undefined && issue.comments.length > opts.commentLimit) {
        issue.comments = issue.comments.slice(-opts.commentLimit);
      }

      return issue;
    },

    async createIssue(input: JiraCreateIssueInput): Promise<JiraCreateIssueResult> {
      const apiVersion = deployment === 'cloud' ? '3' : '2';

      const fields: Record<string, unknown> = {
        project: { key: input.projectKey },
        issuetype: { name: input.issueType },
        summary: input.summary,
      };

      if (input.description) {
        fields.description = deployment === 'cloud'
          ? textToAdf(input.description)
          : input.description;
      }

      if (input.assignee) {
        fields.assignee = deployment === 'cloud'
          ? { accountId: input.assignee }
          : { name: input.assignee };
      }

      if (input.priority) {
        fields.priority = { name: input.priority };
      }

      if (input.labels?.length) {
        fields.labels = input.labels;
      }

      if (input.components?.length) {
        fields.components = input.components.map(name => ({ name }));
      }

      if (input.parentKey) {
        fields.parent = { key: input.parentKey };
      }

      const response = await http.request<{ id: string; key: string; self: string }>({
        method: 'POST',
        path: `/rest/api/${apiVersion}/issue`,
        body: { fields },
      });

      return {
        key: response.key,
        id: response.id,
        url: `${baseUrl}/browse/${response.key}`,
      };
    },

    async updateIssue(issueKey: string, input: JiraUpdateIssueInput): Promise<void> {
      const apiVersion = deployment === 'cloud' ? '3' : '2';

      const fields: Record<string, unknown> = {};
      const update: Record<string, unknown[]> = {};

      if (input.summary !== undefined) {
        fields.summary = input.summary;
      }

      if (input.description !== undefined) {
        fields.description = deployment === 'cloud'
          ? textToAdf(input.description)
          : input.description;
      }

      if (input.assignee !== undefined) {
        fields.assignee = deployment === 'cloud'
          ? { accountId: input.assignee }
          : { name: input.assignee };
      }

      if (input.priority !== undefined) {
        fields.priority = { name: input.priority };
      }

      if (input.labels !== undefined) {
        fields.labels = input.labels;
      }

      if (input.components !== undefined) {
        fields.components = input.components.map(name => ({ name }));
      }

      // Incremental label operations use the "update" field
      if (input.addLabels?.length) {
        update.labels = [...(update.labels ?? []), ...input.addLabels.map(l => ({ add: l }))];
      }
      if (input.removeLabels?.length) {
        update.labels = [...(update.labels ?? []), ...input.removeLabels.map(l => ({ remove: l }))];
      }

      const body: Record<string, unknown> = {};
      if (Object.keys(fields).length > 0) body.fields = fields;
      if (Object.keys(update).length > 0) body.update = update;

      await http.request<void>({
        method: 'PUT',
        path: `/rest/api/${apiVersion}/issue/${issueKey}`,
        body,
      });
    },

    async addComment(issueKey: string, body: string): Promise<JiraAddCommentResult> {
      const apiVersion = deployment === 'cloud' ? '3' : '2';

      const requestBody = deployment === 'cloud'
        ? { body: textToAdf(body) }
        : { body };

      const response = await http.request<Record<string, unknown>>({
        method: 'POST',
        path: `/rest/api/${apiVersion}/issue/${issueKey}/comment`,
        body: requestBody,
      });

      return {
        id: String(response.id ?? ''),
        body: deployment === 'cloud' && typeof response.body === 'object'
          ? adfToMarkdown(response.body)
          : String(response.body ?? ''),
        author: extractString(response.author) ?? 'Unknown',
        created: String(response.created ?? ''),
      };
    },

    async getTransitions(issueKey: string): Promise<JiraTransition[]> {
      const apiVersion = deployment === 'cloud' ? '3' : '2';

      const response = await http.request<{ transitions: Array<Record<string, unknown>> }>({
        method: 'GET',
        path: `/rest/api/${apiVersion}/issue/${issueKey}/transitions`,
      });

      return response.transitions.map(t => {
        const to = t.to as Record<string, unknown> | undefined;
        const statusCategory = to?.statusCategory as Record<string, unknown> | undefined;
        return {
          id: String(t.id ?? ''),
          name: String(t.name ?? ''),
          to: {
            id: String(to?.id ?? ''),
            name: String(to?.name ?? ''),
            statusCategory: String(statusCategory?.key ?? ''),
          },
        };
      });
    },

    async transitionIssue(
      issueKey: string,
      transitionId: string,
      opts: { comment?: string; resolution?: string } = {},
    ): Promise<void> {
      const apiVersion = deployment === 'cloud' ? '3' : '2';

      const body: Record<string, unknown> = {
        transition: { id: transitionId },
      };

      if (opts.resolution) {
        body.fields = { resolution: { name: opts.resolution } };
      }

      if (opts.comment) {
        const commentBody = deployment === 'cloud'
          ? { body: textToAdf(opts.comment) }
          : { body: opts.comment };
        body.update = {
          comment: [{ add: commentBody }],
        };
      }

      await http.request<void>({
        method: 'POST',
        path: `/rest/api/${apiVersion}/issue/${issueKey}/transitions`,
        body,
      });
    },
  };
}
