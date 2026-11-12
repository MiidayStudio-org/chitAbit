// Adds the login token to every /api request, so components can keep
// calling plain fetch('/api/...'). If the server says 401, the app logs out.

export const TOKEN_STORAGE_KEY = 'chitabit_token';
export const UNAUTHORIZED_EVENT = 'chitabit:unauthorized';

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const PUBLIC_ENDPOINTS = ['/api/auth/login', '/api/auth/register'];

function getPath(input: RequestInfo | URL): string | null {
  try {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const baseUrl = API_BASE || window.location.origin;
    const url = new URL(raw, baseUrl);
    const expectedOrigin = new URL(baseUrl).origin;
    return url.origin === expectedOrigin ? url.pathname : null;
  } catch {
    return null;
  }
}

const originalFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  let targetInput = input;
  if (API_BASE && typeof input === 'string' && input.startsWith('/api/')) {
    targetInput = `${API_BASE}${input}`;
  }

  const path = getPath(input);
  const isApi = path !== null && path.startsWith('/api/');
  const isPublic = path !== null && PUBLIC_ENDPOINTS.includes(path);

  if (isApi && !isPublic) {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    init = { ...init, headers };
  }

  const response = await originalFetch(targetInput, init);

  if (isApi && !isPublic && response.status === 401) {
    window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
  }
  return response;
};
