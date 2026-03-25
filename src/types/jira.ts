export interface JiraUser {
  accountId?: string;
  key?: string;
  displayName: string;
  emailAddress?: string;
}

export interface JiraComment {
  id: string;
  author: string;
  body: string;
  created: string;
  updated: string;
}

export interface JiraIssue {
  key: string;
  id: string;
  summary: string;
  status: string;
  statusCategory: string;
  issueType: string;
  priority: string | null;
  assignee: string | null;
  reporter: string | null;
  created: string;
  updated: string;
  description: string | null;
  labels: string[];
  components: string[];
  comments: JiraComment[];
  url: string;
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  hasMore: boolean;
}

// Raw API response types (Cloud v3)

export interface JiraCloudSearchResponse {
  issues: JiraRawIssue[];
  total?: number;
  nextPageToken?: string;
}

export interface JiraServerSearchResponse {
  issues: JiraRawIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface JiraRawIssue {
  id: string;
  key: string;
  self: string;
  fields: Record<string, unknown>;
}
