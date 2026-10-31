import xss from 'xss';

// Options for XSS filter: keep markdown readable while stripping dangerous scripts/iframes
const xssOptions = {
  whiteList: {}, // Strip all raw HTML tags to prevent XSS injection, while allowing markdown text
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'xml', 'iframe', 'object'],
};

export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  // Trim and filter dangerous characters
  return xss(input.trim(), xssOptions);
}

export function sanitizeDraftText(input: string): string {
  if (typeof input !== 'string') return '';
  // Sanitize without trimming whitespace/newlines so typing state is preserved
  return xss(input, xssOptions);
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required' };
  }
  const trimmed = username.trim();
  if (trimmed.length < 2 || trimmed.length > 25) {
    return { valid: false, error: 'Username must be between 2 and 25 characters' };
  }
  // Allow alphanumeric, underscores, hyphens, and dots
  const validPattern = /^[a-zA-Z0-9_\-\.]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Username may only contain letters, numbers, underscores, hyphens, and periods' };
  }
  if (trimmed.toLowerCase() === 'devbot') {
    return { valid: false, error: 'devbot is a reserved system username' };
  }
  return { valid: true };
}

export function validateChannelName(name: string): { valid: boolean; error?: string } {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Channel name is required' };
  }
  const trimmed = name.trim().toLowerCase().replace(/^#/, '');
  if (trimmed.length < 2 || trimmed.length > 30) {
    return { valid: false, error: 'Channel name must be between 2 and 30 characters' };
  }
  const validPattern = /^[a-z0-9\-_]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Channel name may only contain lowercase letters, numbers, hyphens, and underscores' };
  }
  return { valid: true };
}
