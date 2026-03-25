export interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  spaceName: string;
  body: string;
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
  _links?: { base?: string; webui?: string };
}
