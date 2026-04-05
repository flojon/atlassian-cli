export interface ConfluenceImageInfo {
  filename: string;
  url: string;
  width?: number;
  height?: number;
  mediaType?: string;
  fileSize?: number;
}

export interface ConfluenceAttachment {
  id: string;
  title: string;
  mediaType: string;
  fileSize: number;
  downloadUrl: string;
}

export interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  spaceName: string;
  body: string;
  images: ConfluenceImageInfo[];
  attachments: ConfluenceAttachment[];
  version: number;
  lastModified: string;
  lastModifiedBy: string | null;
  url: string;
}

export interface ConfluenceSearchEntry {
  id: string;
  title: string;
  type: string;
  spaceKey: string;
  spaceName: string;
  lastModified: string;
  excerpt: string;
  url: string;
}

export interface ConfluenceSearchResult {
  results: ConfluenceSearchEntry[];
  total: number;
  hasMore: boolean;
}

// Raw API response types

export interface ConfluenceRawSearchResponse {
  results: ConfluenceRawSearchEntry[];
  totalSize: number;
  start: number;
  limit: number;
  size: number;
  _links?: { next?: string };
}

export interface ConfluenceRawSearchEntry {
  content?: {
    id: string;
    type: string;
    title: string;
    status: string;
    _links?: { webui?: string };
    space?: { key: string; name: string };
    history?: { lastUpdated?: { when: string } };
  };
  title?: string;
  excerpt?: string;
  url?: string;
}

export interface ConfluenceRawPage {
  id: string;
  type: string;
  title: string;
  status: string;
  space?: { key: string; name: string };
  body?: {
    storage?: { value: string };
    view?: { value: string };
  };
  version?: { number: number; when: string; by?: { displayName: string } };
  children?: {
    attachment?: {
      results: ConfluenceRawAttachment[];
    };
  };
  _links?: { base?: string; webui?: string };
}

export interface ConfluenceRawAttachment {
  id: string;
  type: string;
  title: string;
  extensions?: {
    mediaType?: string;
    fileSize?: number;
  };
  _links?: {
    download?: string;
  };
}

export interface ConfluenceRawAttachmentResponse {
  results: ConfluenceRawAttachment[];
  size: number;
  limit: number;
  start: number;
  _links?: { next?: string };
}

// Write operation types

export interface ConfluenceCreatePageInput {
  spaceKey: string;
  title: string;
  body: string;
  parentId?: string;
  format?: 'markdown' | 'storage';
}

export interface ConfluenceCreatePageResult {
  id: string;
  title: string;
  version: number;
  url: string;
}

export interface ConfluenceAddCommentResult {
  id: string;
  body: string;
  author: string;
  created: string;
}
