import { createHighlighter, Highlighter } from 'shiki';

export interface LanguageOption {
  id: string;
  label: string;
  fileIconId: string;
  aliases: string[];
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'typescript', label: 'TypeScript', fileIconId: 'ts', aliases: ['ts', 'typescript'] },
  { id: 'javascript', label: 'JavaScript', fileIconId: 'js', aliases: ['js', 'javascript'] },
  { id: 'python', label: 'Python', fileIconId: 'py', aliases: ['py', 'python'] },
  { id: 'go', label: 'Go', fileIconId: 'go', aliases: ['go', 'golang'] },
  { id: 'rust', label: 'Rust', fileIconId: 'rs', aliases: ['rs', 'rust'] },
  { id: 'java', label: 'Java', fileIconId: 'java', aliases: ['java'] },
  { id: 'c', label: 'C', fileIconId: 'c', aliases: ['c'] },
  { id: 'cpp', label: 'C++', fileIconId: 'cpp', aliases: ['cpp', 'c++'] },
  { id: 'csharp', label: 'C#', fileIconId: 'cs', aliases: ['cs', 'c#', 'csharp'] },
  { id: 'php', label: 'PHP', fileIconId: 'php', aliases: ['php'] },
  { id: 'ruby', label: 'Ruby', fileIconId: 'rb', aliases: ['rb', 'ruby'] },
  { id: 'kotlin', label: 'Kotlin', fileIconId: 'kt', aliases: ['kt', 'kotlin'] },
  { id: 'swift', label: 'Swift', fileIconId: 'swift', aliases: ['swift'] },
  { id: 'sql', label: 'SQL', fileIconId: 'sql', aliases: ['sql'] },
  { id: 'bash', label: 'Bash', fileIconId: 'sh', aliases: ['bash', 'sh', 'shell', 'zsh'] },
  { id: 'json', label: 'JSON', fileIconId: 'json', aliases: ['json'] },
  { id: 'yaml', label: 'YAML', fileIconId: 'yml', aliases: ['yaml', 'yml'] },
  { id: 'html', label: 'HTML', fileIconId: 'html', aliases: ['html', 'xml'] },
  { id: 'css', label: 'CSS', fileIconId: 'css', aliases: ['css', 'scss', 'less'] },
  { id: 'markdown', label: 'Markdown', fileIconId: 'md', aliases: ['markdown', 'md'] },
];

export const TAG_TO_LANG_MAP: Record<string, string> = {
  ts: 'typescript',
  typescript: 'typescript',
  js: 'javascript',
  javascript: 'javascript',
  py: 'python',
  python: 'python',
  go: 'go',
  golang: 'go',
  rs: 'rust',
  rust: 'rust',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cs: 'csharp',
  'c#': 'csharp',
  csharp: 'csharp',
  php: 'php',
  rb: 'ruby',
  ruby: 'ruby',
  kt: 'kotlin',
  kotlin: 'kotlin',
  swift: 'swift',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  shell: 'bash',
  zsh: 'bash',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  html: 'html',
  xml: 'html',
  css: 'css',
  scss: 'css',
  less: 'css',
  md: 'markdown',
  markdown: 'markdown',
  docker: 'dockerfile',
  dockerfile: 'dockerfile',
};

let highlighterPromise: Promise<Highlighter> | null = null;
const loadedLangs = new Set<string>();
const loadedThemes = new Set<string>();

// Synchronous memoization cache: `${theme}:${lang}:${text}` -> HTML
const highlightCache = new Map<string, string>();

export function getCachedHighlight(text: string, lang: string, theme: string): string | null {
  const normLang = normalizeLanguage(lang) || 'typescript';
  const key = `${theme}:${normLang}:${text}`;
  return highlightCache.get(key) || null;
}

export function setCachedHighlight(text: string, lang: string, theme: string, html: string): void {
  const normLang = normalizeLanguage(lang) || 'typescript';
  const key = `${theme}:${normLang}:${text}`;
  highlightCache.set(key, html);
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['dark-plus', 'light-plus'],
      langs: [
        'typescript',
        'javascript',
        'python',
        'sql',
        'bash',
        'json',
        'html',
        'css',
        'markdown',
        'go',
        'rust',
        'java',
      ],
    }).then((hl) => {
      hl.getLoadedLanguages().forEach((l) => loadedLangs.add(l));
      hl.getLoadedThemes().forEach((t) => loadedThemes.add(t));
      return hl;
    });
  }
  return highlighterPromise;
}

export function normalizeLanguage(lang?: string): string {
  if (!lang) return '';
  const clean = lang.toLowerCase().trim().replace(/^language-/, '');
  return TAG_TO_LANG_MAP[clean] || clean;
}

export function detectLanguage(code: string): string {
  const trimmed = code.trim();

  // JSON detection
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // not strict json
    }
  }

  // HTML / XML
  if (/^<(!DOCTYPE|html|div|span|template|svg|table|p)\b/i.test(trimmed)) {
    return 'html';
  }

  // SQL
  if (/\b(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|JOIN)\b/i.test(trimmed)) {
    return 'sql';
  }

  // Python
  if (/\b(def\s+\w+\(|elif\s+|import\s+\w+|from\s+\w+\s+import|print\(|class\s+\w+:)/.test(trimmed)) {
    return 'python';
  }

  // Dockerfile
  if (/^(FROM|RUN|COPY|ADD|ENTRYPOINT|CMD|ENV|WORKDIR|EXPOSE)\s+/m.test(trimmed)) {
    return 'dockerfile';
  }

  // Rust
  if (/\b(fn\s+\w+\(|let\s+mut\s+|impl\s+|match\s+|pub\s+struct\s+)/.test(trimmed)) {
    return 'rust';
  }

  // Go
  if (/\b(func\s+\w+\(|package\s+\w+|import\s+\(|go\s+func\()/.test(trimmed)) {
    return 'go';
  }

  // Bash / Shell
  if (/^#!\/bin\/(bash|sh)|(\b(sudo|npm|yarn|pnpm|git|cd|ls|mkdir|chmod|curl|grep)\s+)/m.test(trimmed)) {
    return 'bash';
  }

  // TypeScript / JavaScript
  if (/\b(const|let|var|function|return|import|export|console\.log|=>)\b/.test(trimmed)) {
    if (/\b(interface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|any)\b)/.test(trimmed)) {
      return 'typescript';
    }
    return 'javascript';
  }

  // CSS
  if (/(\.[\w-]+\s*\{|[a-z-]+\s*:\s*[^;]+;)/i.test(trimmed)) {
    return 'css';
  }

  return 'typescript';
}

/**
 * Parses message for leading language tag override (e.g. `py: print("hi")` or `sql: SELECT * FROM users`).
 * If present, hides the tag from content and returns the override language.
 */
export function parseMessageLanguageAndContent(
  rawText: string,
  defaultLang = 'typescript'
): { lang: string; content: string; hasOverride: boolean } {
  if (!rawText) {
    return { lang: defaultLang, content: '', hasOverride: false };
  }

  const match = rawText.match(/^([a-zA-Z0-9#+]+):\s*([\s\S]*)$/);
  if (match) {
    const tag = match[1].toLowerCase();
    if (TAG_TO_LANG_MAP[tag]) {
      return {
        lang: TAG_TO_LANG_MAP[tag],
        content: match[2],
        hasOverride: true,
      };
    }
  }

  return {
    lang: defaultLang || 'typescript',
    content: rawText,
    hasOverride: false,
  };
}

export interface MessageSegment {
  type: 'text' | 'code';
  content: string;
  lang?: string;
}

/**
 * Splits message text into normal text segments and fenced code blocks (```lang ... ```)
 */
export function parseMessageSegments(content: string): MessageSegment[] {
  if (!content) return [];

  const codeBlockRegex = /```([a-zA-Z0-9_+-]*)\r?\n([\s\S]*?)```/g;
  const segments: MessageSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textPart = content.slice(lastIndex, match.index);
      if (textPart) {
        segments.push({ type: 'text', content: textPart });
      }
    }
    segments.push({
      type: 'code',
      lang: match[1]?.trim() || '',
      content: match[2].replace(/\r\n/g, '\n'),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    if (remaining) {
      segments.push({ type: 'text', content: remaining });
    }
  }

  return segments.length > 0 ? segments : [{ type: 'text', content }];
}

/**
 * Ensures theme and language are loaded into Shiki instance
 */
async function ensureReady(hl: Highlighter, theme: string, lang: string): Promise<string> {
  const normLang = normalizeLanguage(lang) || 'typescript';

  // Ensure theme
  if (!loadedThemes.has(theme)) {
    try {
      await hl.loadTheme(theme as any);
      loadedThemes.add(theme);
    } catch (e) {
      console.warn(`Failed to lazy load Shiki theme: ${theme}`, e);
    }
  }

  // Ensure lang
  if (!loadedLangs.has(normLang)) {
    try {
      await hl.loadLanguage(normLang as any);
      loadedLangs.add(normLang);
    } catch (e) {
      console.warn(`Failed to lazy load Shiki language: ${normLang}`, e);
      return 'typescript';
    }
  }

  return normLang;
}

/**
 * Highlights a normal message or token string through Shiki
 */
export async function highlightMessage(
  text: string,
  language = 'typescript',
  theme = 'dark-plus'
): Promise<string> {
  if (!text) return '';

  const cached = getCachedHighlight(text, language, theme);
  if (cached) return cached;

  try {
    const hl = await getHighlighter();
    const effectiveTheme = loadedThemes.has(theme) ? theme : (await hl.loadTheme(theme as any), loadedThemes.add(theme), theme);
    const effectiveLang = await ensureReady(hl, effectiveTheme, language);

    const html = hl.codeToHtml(text, {
      lang: effectiveLang,
      theme: effectiveTheme,
    });

    setCachedHighlight(text, language, theme, html);
    return html;
  } catch (err) {
    console.error('highlightMessage failed:', err);
    const fallback = `<pre class="shiki"><code>${escapeHtml(text)}</code></pre>`;
    setCachedHighlight(text, language, theme, fallback);
    return fallback;
  }
}

/**
 * Highlights code snippet for fenced code blocks
 */
export async function highlightCode(
  code: string,
  language?: string,
  theme = 'dark-plus'
): Promise<string> {
  const normLang = normalizeLanguage(language) || detectLanguage(code);

  const cached = getCachedHighlight(code, normLang, theme);
  if (cached) return cached;

  try {
    const hl = await getHighlighter();
    const effectiveTheme = loadedThemes.has(theme) ? theme : (await hl.loadTheme(theme as any), loadedThemes.add(theme), theme);
    const effectiveLang = await ensureReady(hl, effectiveTheme, normLang);

    const html = hl.codeToHtml(code, {
      lang: effectiveLang,
      theme: effectiveTheme,
    });

    setCachedHighlight(code, normLang, theme, html);
    return html;
  } catch (err) {
    console.error('Shiki highlightCode failed:', err);
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`;
  }
}
