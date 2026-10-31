import React from 'react';
import { Icon, addCollection } from '@iconify/react';
import vscodeIcons from '@iconify-json/vscode-icons/icons.json';

// Initialize full VS Code icons collection offline
try {
  addCollection(vscodeIcons as any);
} catch (err) {
  console.warn('Failed to register offline vscode-icons collection:', err);
}

export interface FileIconOption {
  id: string;
  ext: string;
  label: string;
  iconName: string;
}

export const FILE_ICON_OPTIONS: FileIconOption[] = [
  { id: 'ts', ext: '.ts', label: 'TypeScript', iconName: 'vscode-icons:file-type-typescript-official' },
  { id: 'tsx', ext: '.tsx', label: 'React TSX', iconName: 'vscode-icons:file-type-reactts' },
  { id: 'js', ext: '.js', label: 'JavaScript', iconName: 'vscode-icons:file-type-js-official' },
  { id: 'py', ext: '.py', label: 'Python', iconName: 'vscode-icons:file-type-python' },
  { id: 'go', ext: '.go', label: 'Go', iconName: 'vscode-icons:file-type-go' },
  { id: 'rs', ext: '.rs', label: 'Rust', iconName: 'vscode-icons:file-type-rust' },
  { id: 'java', ext: '.java', label: 'Java', iconName: 'vscode-icons:file-type-java' },
  { id: 'c', ext: '.c', label: 'C', iconName: 'vscode-icons:file-type-c' },
  { id: 'cpp', ext: '.cpp', label: 'C++', iconName: 'vscode-icons:file-type-cpp' },
  { id: 'cs', ext: '.cs', label: 'C#', iconName: 'vscode-icons:file-type-csharp' },
  { id: 'php', ext: '.php', label: 'PHP', iconName: 'vscode-icons:file-type-php' },
  { id: 'rb', ext: '.rb', label: 'Ruby', iconName: 'vscode-icons:file-type-ruby' },
  { id: 'kt', ext: '.kt', label: 'Kotlin', iconName: 'vscode-icons:file-type-kotlin' },
  { id: 'swift', ext: '.swift', label: 'Swift', iconName: 'vscode-icons:file-type-swift' },
  { id: 'sql', ext: '.sql', label: 'SQL', iconName: 'vscode-icons:file-type-sql' },
  { id: 'sh', ext: '.sh', label: 'Shell', iconName: 'vscode-icons:file-type-shell' },
  { id: 'json', ext: '.json', label: 'JSON', iconName: 'vscode-icons:file-type-json' },
  { id: 'yml', ext: '.yml', label: 'YAML', iconName: 'vscode-icons:file-type-yaml' },
  { id: 'html', ext: '.html', label: 'HTML', iconName: 'vscode-icons:file-type-html' },
  { id: 'css', ext: '.css', label: 'CSS', iconName: 'vscode-icons:file-type-css' },
  { id: 'md', ext: '.md', label: 'Markdown', iconName: 'vscode-icons:file-type-markdown' },
  { id: 'docker', ext: 'Dockerfile', label: 'Docker', iconName: 'vscode-icons:file-type-docker' },
];

export function getLanguageForFileIcon(fileIconId?: string | null): string {
  if (!fileIconId) return 'typescript';
  const clean = fileIconId.toLowerCase().replace(/^\./, '');
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    rb: 'ruby',
    kt: 'kotlin',
    swift: 'swift',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    shell: 'bash',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    html: 'html',
    css: 'css',
    md: 'markdown',
    docker: 'dockerfile',
  };
  return map[clean] || 'typescript';
}

export function getFileIconForLanguage(langId?: string | null): string {
  if (!langId) return 'ts';
  const clean = langId.toLowerCase().trim();
  const map: Record<string, string> = {
    typescript: 'ts',
    ts: 'ts',
    javascript: 'js',
    js: 'js',
    python: 'py',
    py: 'py',
    go: 'go',
    golang: 'go',
    rust: 'rs',
    rs: 'rs',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    'c++': 'cpp',
    csharp: 'cs',
    'c#': 'cs',
    cs: 'cs',
    php: 'php',
    ruby: 'rb',
    rb: 'rb',
    kotlin: 'kt',
    kt: 'kt',
    swift: 'swift',
    sql: 'sql',
    bash: 'sh',
    sh: 'sh',
    shell: 'sh',
    json: 'json',
    yaml: 'yml',
    yml: 'yml',
    html: 'html',
    css: 'css',
    markdown: 'md',
    md: 'md',
  };
  return map[clean] || 'ts';
}


export const FOLDER_ICON_CLOSED = 'vscode-icons:default-folder';
export const FOLDER_ICON_OPEN = 'vscode-icons:default-folder-opened';
export const BOT_ICON = 'vscode-icons:file-type-robotcode';

/**
 * Deterministically maps any username to one of the 16 file icons
 */
export function getStableFileIcon(username: string): string {
  if (!username) return 'ts';
  if (username.toLowerCase() === 'devbot') return 'bot';
  if (username.toLowerCase() === 'general') return 'folder';

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % FILE_ICON_OPTIONS.length;
  return FILE_ICON_OPTIONS[index].id;
}

/**
 * Resolves icon name from an icon id or extension
 */
export function resolveIconName(
  iconIdOrExt?: string | null,
  isFolder = false,
  isOpenFolder = false,
  isBot = false
): string {
  if (isBot) return BOT_ICON;
  if (isFolder) return isOpenFolder ? FOLDER_ICON_OPEN : FOLDER_ICON_CLOSED;

  const clean = (iconIdOrExt || '').toLowerCase().replace(/^\./, '');
  const match = FILE_ICON_OPTIONS.find(
    (o) => o.id === clean || o.ext.replace(/^\./, '') === clean
  );

  return match ? match.iconName : 'vscode-icons:file-type-typescript-official';
}

/**
 * Returns extension label e.g. '.ts' or '.py'
 */
export function getFileExtension(iconId?: string | null): string {
  if (!iconId) return '.ts';
  const clean = iconId.toLowerCase().replace(/^\./, '');
  const match = FILE_ICON_OPTIONS.find((o) => o.id === clean);
  return match ? match.ext : `.${clean}`;
}

export interface FileIconProps {
  name?: string | null;
  isFolder?: boolean;
  isOpenFolder?: boolean;
  isBot?: boolean;
  size?: number;
  status?: 'Online' | 'Idle' | 'Offline';
  className?: string;
}

export const FileIcon: React.FC<FileIconProps> = ({
  name,
  isFolder = false,
  isOpenFolder = false,
  isBot = false,
  size = 16,
  status,
  className = '',
}) => {
  const iconString = resolveIconName(name, isFolder, isOpenFolder, isBot);

  return (
    <div className={`relative inline-flex items-center justify-center flex-shrink-0 ${className}`}>
      <Icon icon={iconString} width={size} height={size} />
      {status && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#1e1e1e] dark:border-[#1e1e1e] ${
            status === 'Online'
              ? 'bg-[#89d185]'
              : status === 'Idle'
              ? 'bg-[#cca700]'
              : 'bg-[#858585]'
          }`}
          title={`Status: ${status}`}
        />
      )}
    </div>
  );
};
