import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const previewCache = new Map<string, { data: LinkPreviewData; expiresAt: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

function isPrivateIpOrHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '0.0.0.0') return true;
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(h)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(h)) return true;
  if (h.endsWith('.local') || h.endsWith('.internal')) return true;
  return false;
}

function extractMeta(html: string, propertyPattern: string): string | undefined {
  // Matches both property="og:..." content="..." and name="..." content="..."
  const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${propertyPattern}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  if (match && match[1]) return match[1].trim();
  // Reverse attribute order: content="..." property="..."
  const revRegex = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${propertyPattern}["']`, 'i');
  const revMatch = html.match(revRegex);
  if (revMatch && revMatch[1]) return revMatch[1].trim();
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const ogTitle = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title');
  if (ogTitle) return ogTitle;
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match && match[1] ? match[1].trim() : undefined;
}

function extractDescription(html: string): string | undefined {
  return (
    extractMeta(html, 'og:description') ||
    extractMeta(html, 'twitter:description') ||
    extractMeta(html, 'description')
  );
}

function extractImage(html: string, baseUrl: string): string | undefined {
  const raw = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');
  if (!raw) return undefined;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

function extractSiteName(html: string, hostname: string): string {
  const site = extractMeta(html, 'og:site_name');
  if (site) return site;
  return hostname.replace(/^www\./, '');
}

/**
 * GET /api/media/preview?url=...
 * Scrapes OpenGraph & Twitter Card metadata for posted links.
 */
router.get('/preview', async (req: Request, res: Response): Promise<void> => {
  const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
  if (!rawUrl) {
    res.status(400).json({ error: 'url parameter is required' });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      res.status(400).json({ error: 'Only http and https URLs are allowed' });
      return;
    }
    if (isPrivateIpOrHost(parsed.hostname)) {
      res.status(400).json({ error: 'Private or local addresses are forbidden' });
      return;
    }
  } catch {
    res.status(400).json({ error: 'Invalid URL format' });
    return;
  }

  const cached = previewCache.get(rawUrl);
  if (cached && cached.expiresAt > Date.now()) {
    res.json({ preview: cached.data });
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ChatAbit-Bot/1.0 (+https://chatabit.dev; Link Preview Scraper)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      res.json({ preview: { url: rawUrl, siteName: parsed.hostname } });
      return;
    }

    // Limit read size to first 120KB to avoid heavy payload parsing
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    const html = decoder.decode(buffer.slice(0, 120000));

    const preview: LinkPreviewData = {
      url: rawUrl,
      title: extractTitle(html),
      description: extractDescription(html),
      image: extractImage(html, parsed.origin),
      siteName: extractSiteName(html, parsed.hostname),
    };

    previewCache.set(rawUrl, { data: preview, expiresAt: Date.now() + CACHE_TTL_MS });
    res.json({ preview });
  } catch {
    // If request fails or times out, return basic URL fallback
    res.json({ preview: { url: rawUrl, siteName: parsed.hostname } });
  }
});

export default router;
