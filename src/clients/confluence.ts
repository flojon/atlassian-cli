import type { HttpClient } from '../http.js';
import { htmlToMarkdown } from '../preprocessing/html-to-markdown.js';
import { markdownToStorage } from '../preprocessing/markdown-to-storage.js';
import type { DeploymentType } from '../types/common.js';
import type {
  ConfluenceAddCommentResult,
  ConfluenceAttachment,
  ConfluenceCreatePageInput,
  ConfluenceCreatePageResult,
  ConfluencePage,
  ConfluenceRawAttachmentResponse,
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
  getAttachments(pageId: string): Promise<ConfluenceAttachment[]>;
  downloadAttachment(downloadPath: string, destPath: string): Promise<void>;
  createPage(input: ConfluenceCreatePageInput): Promise<ConfluenceCreatePageResult>;
  updatePage(pageId: string, body: string, opts?: { title?: string; format?: 'markdown' | 'storage'; version?: number }): Promise<ConfluenceCreatePageResult>;
  addComment(pageId: string, body: string, opts?: { parentCommentId?: string }): Promise<ConfluenceAddCommentResult>;
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
    excerpt: entry.excerpt ? htmlToMarkdown(entry.excerpt).markdown : '',
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
  const rawAttachments = raw.children?.attachment?.results ?? [];

  // Build the full attachments list from the API (source of truth)
  const attachments: import('../types/confluence.js').ConfluenceAttachment[] = rawAttachments.map(a => ({
    id: a.id,
    title: a.title,
    mediaType: a.extensions?.mediaType ?? 'application/octet-stream',
    fileSize: a.extensions?.fileSize ?? 0,
    downloadUrl: a._links?.download
      ? `${baseUrl}${a._links.download}`
      : `${baseUrl}/download/attachments/${raw.id}/${encodeURIComponent(a.title)}`,
  }));

  let body: string;
  let images: import('../types/confluence.js').ConfluenceImageInfo[] = [];

  if (convertToMarkdown) {
    const result = htmlToMarkdown(bodyHtml, { contentId: raw.id, baseUrl });
    body = result.markdown;
    images = result.images;

    // Enrich parser-discovered images with attachment metadata
    for (const img of images) {
      const match = attachments.find(a => a.title === img.filename);
      if (match) {
        img.mediaType = match.mediaType;
        img.fileSize = match.fileSize;
        img.url = match.downloadUrl;
      }
    }

    // Add any image-type attachments that the HTML parser missed
    const discoveredFilenames = new Set(images.map(img => img.filename));
    for (const att of attachments) {
      if (att.mediaType.startsWith('image/') && !discoveredFilenames.has(att.title)) {
        images.push({
          filename: att.title,
          url: att.downloadUrl,
          mediaType: att.mediaType,
          fileSize: att.fileSize,
        });
      }
    }
  } else {
    body = bodyHtml;
  }

  return {
    id: raw.id,
    title: raw.title,
    spaceKey: raw.space?.key ?? '',
    spaceName: raw.space?.name ?? '',
    body,
    images,
    attachments,
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
        path: `${apiPrefix}/search`,
        query: {
          cql,
          limit,
          start: offset,
          excerpt: 'highlight',
        },
      });

      const results = response.results
        .filter(r => r.content)
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
            expand: 'body.storage,version,space,children.attachment',
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
            expand: 'body.storage,version,space,children.attachment',
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

    async getAttachments(pageId: string): Promise<ConfluenceAttachment[]> {
      const response = await http.request<ConfluenceRawAttachmentResponse>({
        method: 'GET',
        path: `${apiPrefix}/content/${pageId}/child/attachment`,
        query: {
          limit: 250,
        },
      });

      return response.results.map(raw => ({
        id: raw.id,
        title: raw.title,
        mediaType: raw.extensions?.mediaType ?? 'application/octet-stream',
        fileSize: raw.extensions?.fileSize ?? 0,
        downloadUrl: raw._links?.download
          ? `${baseUrl}${raw._links.download}`
          : `${baseUrl}/download/attachments/${pageId}/${encodeURIComponent(raw.title)}`,
      }));
    },

    async downloadAttachment(downloadPath: string, destPath: string): Promise<void> {
      // downloadPath is an absolute URL — extract the path portion relative to baseUrl
      const relativePath = downloadPath.startsWith(baseUrl)
        ? downloadPath.slice(baseUrl.length)
        : downloadPath;
      await http.downloadToFile(relativePath, destPath);
    },

    async createPage(input: ConfluenceCreatePageInput): Promise<ConfluenceCreatePageResult> {
      const storageBody = input.format === 'storage'
        ? input.body
        : markdownToStorage(input.body);

      const requestBody: Record<string, unknown> = {
        type: 'page',
        title: input.title,
        space: { key: input.spaceKey },
        body: {
          storage: {
            value: storageBody,
            representation: 'storage',
          },
        },
      };

      if (input.parentId) {
        requestBody.ancestors = [{ id: input.parentId }];
      }

      const response = await http.request<ConfluenceRawPage>({
        method: 'POST',
        path: `${apiPrefix}/content`,
        body: requestBody,
      });

      return {
        id: response.id,
        title: response.title,
        version: response.version?.number ?? 1,
        url: buildPageUrl(baseUrl, response, deployment),
      };
    },

    async updatePage(
      pageId: string,
      body: string,
      opts: { title?: string; format?: 'markdown' | 'storage'; version?: number } = {},
    ): Promise<ConfluenceCreatePageResult> {
      const storageBody = opts.format === 'storage'
        ? body
        : markdownToStorage(body);

      // If version not provided, fetch current page to get it
      let version = opts.version;
      let currentTitle = opts.title;
      if (version === undefined || currentTitle === undefined) {
        const current = await http.request<ConfluenceRawPage>({
          method: 'GET',
          path: `${apiPrefix}/content/${pageId}`,
          query: { expand: 'version' },
        });
        if (version === undefined) {
          version = (current.version?.number ?? 0) + 1;
        }
        if (currentTitle === undefined) {
          currentTitle = current.title;
        }
      }

      const requestBody = {
        type: 'page',
        title: currentTitle,
        body: {
          storage: {
            value: storageBody,
            representation: 'storage',
          },
        },
        version: { number: version },
      };

      const response = await http.request<ConfluenceRawPage>({
        method: 'PUT',
        path: `${apiPrefix}/content/${pageId}`,
        body: requestBody,
      });

      return {
        id: response.id,
        title: response.title,
        version: response.version?.number ?? version,
        url: buildPageUrl(baseUrl, response, deployment),
      };
    },

    async addComment(
      pageId: string,
      body: string,
      opts: { parentCommentId?: string } = {},
    ): Promise<ConfluenceAddCommentResult> {
      const requestBody: Record<string, unknown> = {
        type: 'comment',
        container: { id: pageId, type: 'page' },
        body: {
          storage: {
            value: `<p>${body}</p>`,
            representation: 'storage',
          },
        },
      };

      if (opts.parentCommentId) {
        requestBody.ancestors = [{ id: opts.parentCommentId }];
      }

      const response = await http.request<Record<string, unknown>>({
        method: 'POST',
        path: `${apiPrefix}/content`,
        body: requestBody,
      });

      const version = response.version as Record<string, unknown> | undefined;
      return {
        id: String(response.id ?? ''),
        body,
        author: (version?.by as Record<string, unknown>)?.displayName as string ?? 'Unknown',
        created: (version?.when as string) ?? '',
      };
    },
  };
}
