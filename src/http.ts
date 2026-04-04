import { createWriteStream } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { ApiError, formatApiError } from './errors.js';
import type { ServiceConfig } from './types/common.js';

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

export interface HttpClient {
  request<T>(options: RequestOptions): Promise<T>;
  downloadToFile(path: string, destPath: string): Promise<void>;
}

function buildAuthHeader(config: ServiceConfig): string {
  if (config.auth.type === 'basic') {
    const encoded = Buffer.from(`${config.auth.username}:${config.auth.token}`).toString('base64');
    return `Basic ${encoded}`;
  }
  return `Bearer ${config.auth.token}`;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export function createHttpClient(config: ServiceConfig): HttpClient {
  const authHeader = buildAuthHeader(config);

  return {
    async request<T>(options: RequestOptions): Promise<T> {
      const { method = 'GET', path, query, body } = options;
      const url = buildUrl(config.baseUrl, path, query);

      const headers: Record<string, string> = {
        'Authorization': authHeader,
        'Accept': 'application/json',
      };

      if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        let errorBody: unknown;
        try {
          errorBody = await response.json();
        } catch {
          errorBody = await response.text().catch(() => null);
        }
        throw formatApiError(response.status, errorBody, `${method} ${path}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    },

    async downloadToFile(path: string, destPath: string): Promise<void> {
      const url = buildUrl(config.baseUrl, path, {});

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Authorization': authHeader },
      });

      if (!response.ok) {
        throw new ApiError(`Download failed: ${response.status} ${response.statusText}`, response.status, `GET ${path}`);
      }

      if (!response.body) {
        throw new ApiError('Empty response body', 0, `GET ${path}`);
      }

      await mkdir(dirname(destPath), { recursive: true });
      const nodeStream = Readable.fromWeb(response.body as import('node:stream/web').ReadableStream);
      await pipeline(nodeStream, createWriteStream(destPath));
    },
  };
}
