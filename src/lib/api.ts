import Constants from 'expo-constants';
import { clearSession, getAccessToken, getRefreshToken, saveTokens, type AuthTokens } from './session';
import { createIdempotencyKey } from './idempotency';

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  fieldErrors?: { field: string; message: string }[];
}

export class ApiError extends Error {
  constructor(readonly status: number, readonly problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `Request failed (${status})`);
    this.name = 'ApiError';
  }
}

function defaultBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || 'localhost'}:4010/api`;
}

export const API_BASE_URL = defaultBaseUrl();
let refreshPromise: Promise<boolean> | undefined;

async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    await saveTokens((await response.json()) as AuthTokens);
    return true;
  } catch {
    return false;
  }
}

async function send(path: string, init: RequestInit, retry401: boolean): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json, application/problem+json');
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let response = await fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, { ...init, headers });
  if (response.status === 401 && retry401 && !path.endsWith('/auth/refresh')) {
    refreshPromise ??= refreshAccessToken().finally(() => { refreshPromise = undefined; });
    if (await refreshPromise) return send(path, init, false);
    await clearSession();
  }
  return response;
}

export async function apiRequestWithResponse<T>(path: string, init: RequestInit = {}): Promise<{ data: T; response: Response }> {
  const headers = new Headers(init.headers);
  const response = await send(path, { ...init, headers }, true);
  if (!response.ok) {
    let problem: ProblemDetail;
    try { problem = await response.json() as ProblemDetail; }
    catch { problem = { status: response.status, title: response.statusText }; }
    throw new ApiError(response.status, problem);
  }
  if (response.status === 204) return { data: undefined as T, response };
  return { data: await response.json() as T, response };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await apiRequestWithResponse<T>(path, init)).data;
}

export function idempotencyHeaders(headers: HeadersInit = {}): Headers {
  const result = new Headers(headers);
  if (!result.has('Idempotency-Key')) result.set('Idempotency-Key', createIdempotencyKey());
  return result;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}

export async function logout(): Promise<void> {
  try { await apiRequest('/auth/logout', { method: 'POST', body: jsonBody({ refreshToken: await getRefreshToken() }) }); }
  finally { await clearSession(); }
}
