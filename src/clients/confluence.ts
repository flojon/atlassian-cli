import type { HttpClient } from '../http.js';
import { htmlToMarkdown } from '../preprocessing/html-to-markdown.js';
import type { DeploymentType } from '../types/common.js';
import type {
  ConfluencePage,
  ConfluenceRawPage,
  ConfluenceRawSearchResponse,
  ConfluenceSearchEntry,
  ConfluenceSearchResult,
} from '../types/confluence.js';

interface SearchOptions {
  limit?: number;
  offset?: number;
  spaces?: string[];
}

interface GetPageOptions {
  id?: string;
  title?: string;
  spaceKey?: string;
  convertToMarkdown?: boolean;
}

export interface ConfluenceClient {
  search(query: string, opts?: SearchOptions): Promise<ConfluenceSearchResult>;
  getPage(opts: GetPageOptions): Promise<ConfluencePage>;
}

const CQL_OPERATORS = /[=~><]|AND|OR|NOT|IN\s*\(|currentUser\(\)/i;

function buildCql(query: string, deployment: DeploymentType, spaces?: string[]): string {
  // If query doesn't look like CQL, wrap as text search
  let cql: string;
  if (CQL_OPERATORS.test(query)) {
    cql = query;
  } else {
    // siteSearch is Cloud-only; Server/DC uses the "text" CQL field instead
    const searchField = deployment === 'cloud' ? 'siteSearch' : 'text';
    cql = `${searchField} ~ "${query.replace(/"/g, '\\"')}"`;
  }

  // Apply spaces filter
  if (spaces?.length) {
    const spaceCql = spaces.map(s => `space = "${s}"`).join(' OR ');
    cql = `(${cql}) AND (${spaceCql})`;
  }

  return cql;
}

function getApiPathPrefix(baseUrl: string, deployment: DeploymentType): string {
  // Cloud Confluence URLs typically end with /wiki
  // Server URLs don't have /wiki prefix
  if (deployment === 'cloud') {
    // If baseUrl already includes /wiki, the path is relative to that
    if (baseUrl.endsWith('/wiki')) {
      return '/rest/api';
    }
    return '/wiki/rest/api';
  }
  return '/rest/api';
}

function buildPageUrl(baseUrl: string, rawPage: ConfluenceRawPage, deployment: DeploymentType): string {
  const webui = rawPage._links?.webui;
  if (webui) {
    const base = rawPage._links?.base ?? baseUrl;
    return `${base}${webui}`;
  }
  // Fallback
  if (deployment === 'cloud') {
    const wikiBase = baseUrl.endsWith('/wiki') ? baseUrl : `${baseUrl}/wiki`;
    return `${wikiBase}/spaces/${rawPage.space?.key ?? ''}/pages/${rawPage.id}`;
  }
  return `${baseUrl}/pages/viewpage.action?pageId=${rawPage.id}`;
}

function normalizeSearchEntry(
  entry: ConfluenceRawSearchResponse['results'][number],
  baseUrl: string,
): ConfluenceSearchEntry {
  const content = entry.content;
  return {
    id: content?.id ?? '',
    title: content?.title ?? entry.title ?? '',
    type: content?.type ?? 'page',
    spaceKey: content?.space?.key ?? '',
    spaceName: content?.space?.name ?? '',
    lastModified: content?.history?.lastUpdated?.when ?? '',
    excerpt: entry.excerpt ? htmlToMarkdown(entry.excerpt) : '',
    url: entry.url
      ? `${baseUrl}${entry.url}`
      : (content?._links?.webui ? `${baseUrl}${content._links.webui}` : ''),
  };
}

function normalizePage(
  raw: ConfluenceRawPage,
  baseUrl: string,
  deployment: DeploymentType,
  convertToMarkdown: boolean,
): ConfluencePage {
  const bodyHtml = raw.body?.storage?.value ?? raw.body?.view?.value ?? '';
  const body = convertToMarkdown ? htmlToMarkdown(bodyHtml) : bodyHtml;

  return {
    id: raw.id,
    title: raw.title,
    spaceKey: raw.space?.key ?? '',
    spaceName: raw.space?.name ?? '',
    body,
    version: raw.version?.number ?? 0,
    lastModified: raw.version?.when ?? '',
    lastModifiedBy: raw.version?.by?.displayName ?? null,
    url: buildPageUrl(baseUrl, raw, deployment),
  };
}

export function createConfluenceClient(
  http: HttpClient,
  baseUrl: string,
  deployment: DeploymentType,
): ConfluenceClient {
  const apiPrefix = getApiPathPrefix(baseUrl, deployment);

  return {
    async search(query: string, opts: SearchOptions = {}): Promise<ConfluenceSearchResult> {
      const limit = opts.limit ?? 10;
      const offset = opts.offset ?? 0;
      const cql = buildCql(query, deployment, opts.spaces);

      const response = await http.request<ConfluenceRawSearchResponse>({
        method: 'GET',
        path: `${apiPrefix}/content/search`,
        query: {
          cql,
          limit,
          start: offset,
          excerpt: 'highlight',
        },
      });

      const results = response.results
        .filter(r => r.content) // Filter out entries without content
        .map(r => normalizeSearchEntry(r, baseUrl));

      return {
        results,
        total: response.totalSize,
        hasMore: !!response._links?.next,
      };
    },

    async getPage(opts: GetPageOptions): Promise<ConfluencePage> {
      const convertToMarkdown = opts.convertToMarkdown ?? true;

      if (opts.id) {
        // Fetch by ID
        const raw = await http.request<ConfluenceRawPage>({
          method: 'GET',
          path: `${apiPrefix}/content/${opts.id}`,
          query: {
            expand: 'body.storage,version,space',
          },
        });

        return normalizePage(raw, baseUrl, deployment, convertToMarkdown);
      }

      if (opts.title && opts.spaceKey) {
        // Fetch by title + space
        const response = await http.request<{ results: ConfluenceRawPage[] }>({
          method: 'GET',
          path: `${apiPrefix}/content`,
          query: {
            title: opts.title,
            spaceKey: opts.spaceKey,
            expand: 'body.storage,version,space',
            limit: 1,
          },
        });

        if (!response.results?.length) {
          const { ConfigError } = await import('../errors.js');
          throw new ConfigError(
            `Page not found: "${opts.title}" in space "${opts.spaceKey}"`,
          );
        }

        return normalizePage(response.results[0]!, baseUrl, deployment, convertToMarkdown);
      }

      const { ConfigError } = await import('../errors.js');
      throw new ConfigError('Either --id or both --title and --space are required.');
    },
  };
}
