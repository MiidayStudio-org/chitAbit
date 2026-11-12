/**
 * Cloudflare Worker Backend for ChatAbit
 * - Handles REST API endpoints with Cloudflare D1 (SQLite at the edge)
 * - Supports CORS for Cloudflare Pages frontend
 * - Handles WebSocket upgrade requests via native WebSockets
 */

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<{ success: boolean; error?: string; results?: T[] }>;
  all<T = unknown>(): Promise<{ success: boolean; results: T[] }>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<Array<{ success: boolean; results?: T[] }>>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface Env {
  DB?: D1Database;
  chitabit_db?: D1Database;
  JWT_SECRET?: string;
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  CLIENT_ORIGIN?: string;
}

// CORS helper headers
function getCorsHeaders(request: Request, env: Env): Headers {
  const origin = request.headers.get('Origin') || '*';
  const allowedOrigin = env.CLIENT_ORIGIN && env.CLIENT_ORIGIN !== '*' ? env.CLIENT_ORIGIN : origin;

  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

function jsonResponse(data: unknown, status = 200, corsHeaders?: Headers): Response {
  const headers = new Headers(corsHeaders);
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(message: string, status = 400, corsHeaders?: Headers): Response {
  return jsonResponse({ error: message }, status, corsHeaders);
}

// Simple token parser / generator for Edge runtime
async function createToken(userId: string, username: string, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      id: userId,
      username,
      exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    })
  );

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${payload}`));
  const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${header}.${payload}.${sigBase64}`;
}

async function verifyToken(token: string, secret: string): Promise<{ id: string; username: string } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Decode URL-safe base64
    const binSig = atob(sig.replace(/-/g, '+').replace(/_/g, '/'));
    const sigBytes = new Uint8Array(binSig.length);
    for (let i = 0; i < binSig.length; i++) sigBytes[i] = binSig.charCodeAt(i);

    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(`${header}.${payload}`));
    if (!valid) return null;

    const data = JSON.parse(atob(payload));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;

    return { id: data.id, username: data.username };
  } catch {
    return null;
  }
}

// Password hashing using PBKDF2 Web Crypto
async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );
  const hashArray = new Uint8Array(derivedBits);
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  const hashHex = Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `pbkdf2:${saltHex}:${hashHex}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'pbkdf2') return false;
    const [, saltHex, origHashHex] = parts;

    const salt = new Uint8Array(
      saltHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
    );
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
      'deriveBits',
    ]);
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      256
    );
    const hashHex = Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return hashHex === origHashHex;
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = getCorsHeaders(request, env);

    // 1. Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const secret = env.JWT_SECRET || 'dev-secret-for-cloudflare-worker-chitabit';
    const db = env.DB || env.chitabit_db;

    // Root status endpoint
    if (url.pathname === '/' || url.pathname === '') {
      return jsonResponse(
        {
          name: 'chitAbit API Server',
          status: 'online',
          runtime: 'Cloudflare Worker',
          health: '/api/health',
          message: 'Backend is running live. Access the chat UI via your Cloudflare Pages frontend URL.',
        },
        200,
        cors
      );
    }

    // 2. Health check
    if (url.pathname === '/api/health') {
      return jsonResponse(
        {
          status: 'ok',
          platform: 'cloudflare-worker',
          timestamp: new Date().toISOString(),
          geminiConfigured: Boolean(env.GEMINI_API_KEY),
        },
        200,
        cors
      );
    }

    // 3. Auth Endpoints
    if (url.pathname === '/api/auth/register' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const username = (body.username || '').trim().toLowerCase();
        const password = body.password || '';
        const displayName = (body.displayName || username).trim();

        if (!username || username.length < 3) {
          return errorResponse('Username must be at least 3 characters', 400, cors);
        }
        if (!password || password.length < 6) {
          return errorResponse('Password must be at least 6 characters', 400, cors);
        }

        if (!db) return errorResponse('Database not initialized', 500, cors);

        const existing = await db.prepare('SELECT id FROM users WHERE username = ?')
          .bind(username)
          .first();

        if (existing) {
          return errorResponse('Username is already taken', 400, cors);
        }

        const id = `u_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const hashed = await hashPassword(password);
        const avatarColors = ['#06c755', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'];
        const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
        const now = Date.now();

        await db.prepare(
          `INSERT INTO users (id, username, password_hash, display_name, avatar_color, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(id, username, hashed, displayName, avatarColor, now)
          .run();

        const token = await createToken(id, username, secret);
        return jsonResponse(
          {
            user: { id, username, displayName, avatarColor, createdAt: now },
            token,
          },
          201,
          cors
        );
      } catch (err: any) {
        return errorResponse(err.message || 'Registration failed', 500, cors);
      }
    }

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        if (!db) return errorResponse('Database not initialized', 500, cors);
        const body: any = await request.json();
        const username = (body.username || '').trim().toLowerCase();
        const password = body.password || '';

        const user: any = await db.prepare('SELECT * FROM users WHERE username = ?')
          .bind(username)
          .first();

        if (!user || !user.password_hash) {
          return errorResponse('Invalid username or password', 401, cors);
        }

        const valid = await verifyPassword(password, user.password_hash);
        if (!valid) {
          return errorResponse('Invalid username or password', 401, cors);
        }

        const token = await createToken(user.id, user.username, secret);
        return jsonResponse(
          {
            user: {
              id: user.id,
              username: user.username,
              displayName: user.display_name,
              avatarColor: user.avatar_color,
              avatarUrl: user.avatar_url,
              bio: user.bio,
              status: user.status,
              fileIcon: user.file_icon,
              createdAt: user.created_at,
            },
            token,
          },
          200,
          cors
        );
      } catch (err: any) {
        return errorResponse(err.message || 'Login failed', 500, cors);
      }
    }

    // Token verification helper for protected routes
    const authHeader = request.headers.get('Authorization');
    const authUser = authHeader?.startsWith('Bearer ')
      ? await verifyToken(authHeader.substring(7), secret)
      : null;

    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      if (!authUser) return errorResponse('Unauthorized', 401, cors);
      if (!db) return errorResponse('Database not initialized', 500, cors);
      const user: any = await db.prepare('SELECT * FROM users WHERE id = ?')
        .bind(authUser.id)
        .first();

      if (!user) return errorResponse('User not found', 404, cors);
      return jsonResponse(
        {
          user: {
            id: user.id,
            username: user.username,
            displayName: user.display_name,
            avatarColor: user.avatar_color,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            status: user.status,
            fileIcon: user.file_icon,
            colorTheme: user.color_theme,
            customAccentColor: user.custom_accent_color,
            createdAt: user.created_at,
          },
        },
        200,
        cors
      );
    }

    if (url.pathname === '/api/auth/profile' && request.method === 'PUT') {
      if (!authUser) return errorResponse('Unauthorized', 401, cors);
      if (!db) return errorResponse('Database not initialized', 500, cors);
      const body: any = await request.json();

      await db.prepare(
        `UPDATE users
         SET display_name = COALESCE(?, display_name),
             bio = COALESCE(?, bio),
             status = COALESCE(?, status),
             avatar_url = COALESCE(?, avatar_url),
             file_icon = COALESCE(?, file_icon),
             color_theme = COALESCE(?, color_theme),
             custom_accent_color = COALESCE(?, custom_accent_color)
         WHERE id = ?`
      )
        .bind(
          body.displayName || null,
          body.bio || null,
          body.status || null,
          body.avatarUrl !== undefined ? body.avatarUrl : null,
          body.fileIcon || null,
          body.colorTheme || null,
          body.customAccentColor || null,
          authUser.id
        )
        .run();

      const user: any = await db.prepare('SELECT * FROM users WHERE id = ?')
        .bind(authUser.id)
        .first();

      return jsonResponse({ user }, 200, cors);
    }

    // 4. Channels API
    if (url.pathname === '/api/channels' && request.method === 'GET') {
      if (!db) return errorResponse('Database not initialized', 500, cors);
      const { results } = await db.prepare('SELECT * FROM channels ORDER BY created_at ASC').all();
      return jsonResponse(results || [], 200, cors);
    }

    // 5. Messages API
    if (url.pathname === '/api/messages/unread' && request.method === 'GET') {
      if (!authUser) return errorResponse('Unauthorized', 401, cors);
      return jsonResponse({}, 200, cors);
    }

    // 6. Direct Messages fetch
    const dmMatch = url.pathname.match(/^\/api\/messages\/dm\/([^/]+)\/([^/]+)$/);
    if (dmMatch && request.method === 'GET') {
      if (!db) return errorResponse('Database not initialized', 500, cors);
      const [, u1, u2] = dmMatch;
      const { results } = await db.prepare(
        `SELECT m.*, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color, u.avatar_url as sender_avatar_url, u.file_icon as sender_file_icon
         FROM messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE (m.sender_id = ? AND m.dm_recipient_id = ?)
            OR (m.sender_id = ? AND m.dm_recipient_id = ?)
         ORDER BY m.created_at ASC LIMIT 50`
      )
        .bind(u1, u2, u2, u1)
        .all();
      return jsonResponse(results || [], 200, cors);
    }

    // 7. Channel Messages fetch
    const chMsgMatch = url.pathname.match(/^\/api\/channels\/([^/]+)\/messages$/);
    if (chMsgMatch && request.method === 'GET') {
      if (!db) return errorResponse('Database not initialized', 500, cors);
      const channelId = chMsgMatch[1];
      const { results } = await db.prepare(
        `SELECT m.*, u.display_name as sender_display_name, u.avatar_color as sender_avatar_color, u.avatar_url as sender_avatar_url, u.file_icon as sender_file_icon
         FROM messages m
         LEFT JOIN users u ON m.sender_id = u.id
         WHERE m.channel_id = ?
         ORDER BY m.created_at ASC LIMIT 50`
      )
        .bind(channelId)
        .all();
      return jsonResponse(results || [], 200, cors);
    }

    // 8. Friends API
    if (url.pathname === '/api/friends/list' && request.method === 'GET') {
      if (!authUser) return errorResponse('Unauthorized', 401, cors);
      if (!db) return errorResponse('Database not initialized', 500, cors);
      const { results } = await db.prepare(
        `SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.file_icon, u.status, u.bio
         FROM friends f
         JOIN users u ON f.friend_id = u.id
         WHERE f.user_id = ?`
      )
        .bind(authUser.id)
        .all();
      return jsonResponse({ friends: results || [] }, 200, cors);
    }

    // 9. Upload API (Base64 data URLs / local files)
    if (url.pathname === '/api/upload' && request.method === 'POST') {
      if (!authUser) return errorResponse('Unauthorized', 401, cors);
      try {
        const formData = await request.formData();
        const file = formData.get('file');
        if (!file || typeof file === 'string') {
          return errorResponse('No file uploaded', 400, cors);
        }
        const blob = file as Blob;
        const buffer = await blob.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
        const dataUrl = `data:${blob.type || 'image/png'};base64,${base64}`;
        return jsonResponse({ url: dataUrl }, 200, cors);
      } catch (err: any) {
        return errorResponse(err.message || 'Upload failed', 500, cors);
      }
    }

    // Default 404 for unhandled API routes
    return errorResponse(`Route ${url.pathname} not found`, 404, cors);
  },
};
