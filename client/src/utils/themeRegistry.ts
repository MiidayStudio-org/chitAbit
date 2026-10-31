export interface ThemeColors {
  bg: string;
  sidebar: string;
  activityBar: string;
  tabActive: string;
  tabInactive: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  statusBar: string;
  statusBarFg: string;
  inputBg: string;
  lineHighlight: string;
  selection: string;
}

export interface ColorThemeDefinition {
  id: string;
  label: string;
  type: 'dark' | 'light';
  shikiTheme: string;
  colors: ThemeColors;
}

export const COLOR_THEMES: ColorThemeDefinition[] = [
  {
    id: 'dark-plus',
    label: 'Dark+ (default)',
    type: 'dark',
    shikiTheme: 'dark-plus',
    colors: {
      bg: '#1e1e1e',
      sidebar: '#252526',
      activityBar: '#333333',
      tabActive: '#1e1e1e',
      tabInactive: '#2d2d2d',
      border: '#3c3c3c',
      text: '#cccccc',
      muted: '#858585',
      accent: '#007acc',
      statusBar: '#007acc',
      statusBarFg: '#ffffff',
      inputBg: '#3c3c3c',
      lineHighlight: '#2a2d2e',
      selection: '#04395e',
    },
  },
  {
    id: 'light-plus',
    label: 'Light+',
    type: 'light',
    shikiTheme: 'light-plus',
    colors: {
      bg: '#ffffff',
      sidebar: '#f3f3f3',
      activityBar: '#2c2c2c',
      tabActive: '#ffffff',
      tabInactive: '#ececec',
      border: '#e7e7e7',
      text: '#333333',
      muted: '#717171',
      accent: '#007acc',
      statusBar: '#007acc',
      statusBarFg: '#ffffff',
      inputBg: '#ffffff',
      lineHighlight: '#e8e8e8',
      selection: '#add6ff',
    },
  },
  {
    id: 'monokai',
    label: 'Monokai',
    type: 'dark',
    shikiTheme: 'monokai',
    colors: {
      bg: '#272822',
      sidebar: '#1e1f1c',
      activityBar: '#191a17',
      tabActive: '#272822',
      tabInactive: '#1e1f1c',
      border: '#3e3d32',
      text: '#f8f8f2',
      muted: '#75715e',
      accent: '#fd971f',
      statusBar: '#75715e',
      statusBarFg: '#ffffff',
      inputBg: '#3e3d32',
      lineHighlight: '#3e3d32',
      selection: '#49483e',
    },
  },
  {
    id: 'dracula',
    label: 'Dracula',
    type: 'dark',
    shikiTheme: 'dracula',
    colors: {
      bg: '#282a36',
      sidebar: '#21222c',
      activityBar: '#191a21',
      tabActive: '#282a36',
      tabInactive: '#21222c',
      border: '#44475a',
      text: '#f8f8f2',
      muted: '#6272a4',
      accent: '#bd93f9',
      statusBar: '#191a21',
      statusBarFg: '#f8f8f2',
      inputBg: '#21222c',
      lineHighlight: '#44475a',
      selection: '#44475a',
    },
  },
  {
    id: 'one-dark-pro',
    label: 'One Dark Pro',
    type: 'dark',
    shikiTheme: 'one-dark-pro',
    colors: {
      bg: '#282c34',
      sidebar: '#21252b',
      activityBar: '#1e2227',
      tabActive: '#282c34',
      tabInactive: '#21252b',
      border: '#181a1f',
      text: '#abb2bf',
      muted: '#5c6370',
      accent: '#61afef',
      statusBar: '#21252b',
      statusBarFg: '#abb2bf',
      inputBg: '#1e2227',
      lineHighlight: '#2c313a',
      selection: '#3e4451',
    },
  },
  {
    id: 'github-dark',
    label: 'GitHub Dark',
    type: 'dark',
    shikiTheme: 'github-dark',
    colors: {
      bg: '#24292e',
      sidebar: '#1f2428',
      activityBar: '#24292e',
      tabActive: '#24292e',
      tabInactive: '#1f2428',
      border: '#1b1f23',
      text: '#e1e4e8',
      muted: '#6a737d',
      accent: '#f9826c',
      statusBar: '#1f2428',
      statusBarFg: '#e1e4e8',
      inputBg: '#1f2428',
      lineHighlight: '#2b3137',
      selection: '#39414a',
    },
  },
  {
    id: 'github-light',
    label: 'GitHub Light',
    type: 'light',
    shikiTheme: 'github-light',
    colors: {
      bg: '#ffffff',
      sidebar: '#f6f8fa',
      activityBar: '#24292e',
      tabActive: '#ffffff',
      tabInactive: '#f6f8fa',
      border: '#e1e4e8',
      text: '#24292e',
      muted: '#6a737d',
      accent: '#2188ff',
      statusBar: '#24292e',
      statusBarFg: '#ffffff',
      inputBg: '#fafbfc',
      lineHighlight: '#f1f3f5',
      selection: '#c8e1ff',
    },
  },
  {
    id: 'night-owl',
    label: 'Night Owl',
    type: 'dark',
    shikiTheme: 'night-owl',
    colors: {
      bg: '#011627',
      sidebar: '#01111d',
      activityBar: '#010e1a',
      tabActive: '#011627',
      tabInactive: '#01111d',
      border: '#0b2942',
      text: '#d6deeb',
      muted: '#5f7e97',
      accent: '#82aaff',
      statusBar: '#011627',
      statusBarFg: '#d6deeb',
      inputBg: '#0b2942',
      lineHighlight: '#0b2942',
      selection: '#1b90ff4d',
    },
  },
  {
    id: 'tokyo-night',
    label: 'Tokyo Night',
    type: 'dark',
    shikiTheme: 'tokyo-night',
    colors: {
      bg: '#1a1b26',
      sidebar: '#16161e',
      activityBar: '#16161e',
      tabActive: '#1a1b26',
      tabInactive: '#16161e',
      border: '#101014',
      text: '#a9b1d6',
      muted: '#565f89',
      accent: '#7aa2f7',
      statusBar: '#16161e',
      statusBarFg: '#a9b1d6',
      inputBg: '#16161e',
      lineHighlight: '#24283b',
      selection: '#283457',
    },
  },
  {
    id: 'solarized-dark',
    label: 'Solarized Dark',
    type: 'dark',
    shikiTheme: 'solarized-dark',
    colors: {
      bg: '#002b36',
      sidebar: '#073642',
      activityBar: '#00212b',
      tabActive: '#002b36',
      tabInactive: '#073642',
      border: '#073642',
      text: '#93a1a1',
      muted: '#586e75',
      accent: '#2aa198',
      statusBar: '#00212b',
      statusBarFg: '#93a1a1',
      inputBg: '#073642',
      lineHighlight: '#073642',
      selection: '#073642',
    },
  },
  {
    id: 'solarized-light',
    label: 'Solarized Light',
    type: 'light',
    shikiTheme: 'solarized-light',
    colors: {
      bg: '#fdf6e3',
      sidebar: '#eee8d5',
      activityBar: '#073642',
      tabActive: '#fdf6e3',
      tabInactive: '#eee8d5',
      border: '#e4ddc8',
      text: '#657b83',
      muted: '#93a1a1',
      accent: '#2aa198',
      statusBar: '#073642',
      statusBarFg: '#ffffff',
      inputBg: '#eee8d5',
      lineHighlight: '#eee8d5',
      selection: '#eee8d5',
    },
  },
  {
    id: 'catppuccin-mocha',
    label: 'Catppuccin Mocha',
    type: 'dark',
    shikiTheme: 'catppuccin-mocha',
    colors: {
      bg: '#1e1e2e',
      sidebar: '#181825',
      activityBar: '#11111b',
      tabActive: '#1e1e2e',
      tabInactive: '#181825',
      border: '#313244',
      text: '#cdd6f4',
      muted: '#6c7086',
      accent: '#cba6f7',
      statusBar: '#11111b',
      statusBarFg: '#cdd6f4',
      inputBg: '#181825',
      lineHighlight: '#313244',
      selection: '#585b70',
    },
  },
  {
    id: 'nord',
    label: 'Nord',
    type: 'dark',
    shikiTheme: 'nord',
    colors: {
      bg: '#2e3440',
      sidebar: '#2e3440',
      activityBar: '#242933',
      tabActive: '#3b4252',
      tabInactive: '#2e3440',
      border: '#434c5e',
      text: '#d8dee9',
      muted: '#616e88',
      accent: '#88c0d0',
      statusBar: '#3b4252',
      statusBarFg: '#d8dee9',
      inputBg: '#3b4252',
      lineHighlight: '#3b4252',
      selection: '#434c5e',
    },
  },
  {
    id: 'material-theme-palenight',
    label: 'Material Palenight',
    type: 'dark',
    shikiTheme: 'material-theme-palenight',
    colors: {
      bg: '#292d3e',
      sidebar: '#252837',
      activityBar: '#1b1e2b',
      tabActive: '#292d3e',
      tabInactive: '#252837',
      border: '#1b1e2b',
      text: '#a6accd',
      muted: '#676e95',
      accent: '#ab77f8',
      statusBar: '#1b1e2b',
      statusBarFg: '#a6accd',
      inputBg: '#1b1e2b',
      lineHighlight: '#333747',
      selection: '#3c435e',
    },
  },
];

export function getTheme(themeId?: string | null): ColorThemeDefinition {
  if (!themeId) return COLOR_THEMES[0];
  const found = COLOR_THEMES.find((t) => t.id === themeId || t.shikiTheme === themeId);
  return found || COLOR_THEMES[0];
}

export function applyTheme(themeId?: string | null, customAccentColor?: string | null): ColorThemeDefinition {
  const theme = getTheme(themeId);
  const root = document.documentElement;

  // Set all core CSS variables derived from theme
  root.style.setProperty('--bg', theme.colors.bg);
  root.style.setProperty('--sidebar', theme.colors.sidebar);
  root.style.setProperty('--activity-bar', theme.colors.activityBar);
  root.style.setProperty('--tab-active', theme.colors.tabActive);
  root.style.setProperty('--tab-inactive', theme.colors.tabInactive);
  root.style.setProperty('--border', theme.colors.border);
  root.style.setProperty('--text', theme.colors.text);
  root.style.setProperty('--muted', theme.colors.muted);
  
  const effectiveAccent = customAccentColor || theme.colors.accent;
  const effectiveStatusBar = customAccentColor || theme.colors.statusBar;
  const effectiveStatusBarFg = customAccentColor ? '#ffffff' : theme.colors.statusBarFg;

  root.style.setProperty('--accent', effectiveAccent);
  root.style.setProperty('--status-bar', effectiveStatusBar);
  root.style.setProperty('--status-bar-fg', effectiveStatusBarFg);
  root.style.setProperty('--input-bg', theme.colors.inputBg);
  root.style.setProperty('--line-highlight', theme.colors.lineHighlight);
  root.style.setProperty('--selection', theme.colors.selection);

  // Backward compatibility alias variables
  root.style.setProperty('--vscode-editor-bg', theme.colors.bg);
  root.style.setProperty('--vscode-sidebar-bg', theme.colors.sidebar);
  root.style.setProperty('--vscode-activitybar-bg', theme.colors.activityBar);
  root.style.setProperty('--vscode-tabs-bg', theme.colors.tabInactive);
  root.style.setProperty('--vscode-tab-active-bg', theme.colors.tabActive);
  root.style.setProperty('--vscode-tab-inactive-bg', theme.colors.tabInactive);
  root.style.setProperty('--vscode-statusbar-bg', effectiveStatusBar);
  root.style.setProperty('--vscode-border', theme.colors.border);
  root.style.setProperty('--vscode-fg', theme.colors.text);
  root.style.setProperty('--vscode-muted', theme.colors.muted);
  root.style.setProperty('--vscode-accent', effectiveAccent);
  root.style.setProperty('--vscode-line-highlight', theme.colors.lineHighlight);
  root.style.setProperty('--vscode-selection', theme.colors.selection);

  root.setAttribute('data-theme', theme.id);

  if (theme.type === 'light') {
    root.classList.add('light-plus');
    root.classList.remove('dark');
  } else {
    root.classList.add('dark');
    root.classList.remove('light-plus');
  }

  return theme;
}
