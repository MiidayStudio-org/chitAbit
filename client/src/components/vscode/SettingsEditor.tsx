import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { FILE_ICON_OPTIONS, FileIcon, getFileIconForLanguage } from '../../utils/fileIcons';
import { COLOR_THEMES, ColorThemeDefinition, getTheme } from '../../utils/themeRegistry';
import { LANGUAGE_OPTIONS } from '../../utils/shikiHighlighter';
import { Check, Loader2, LogOut, Info, Palette, Code, Sliders, RotateCcw } from 'lucide-react';

export interface SettingsEditorProps {
  currentUser: User | null;
  onUpdateProfile: (updates: {
    displayName?: string;
    bio?: string;
    status?: string;
    fileIcon?: string;
    shareLiveTyping?: boolean;
    messageLanguage?: string;
    colorTheme?: string;
    customAccentColor?: string | null;
    highlightAllMessages?: boolean;
  }) => Promise<{ success: boolean; error?: string }>;
  currentColorTheme: string;
  onSelectTheme: (themeId: string) => void;
  customAccentColor: string | null;
  onSetCustomAccent: (color: string | null) => void;
  onLogout: () => void;
}

const PRESET_ACCENTS = [
  { name: 'VS Code Blue', color: '#007acc' },
  { name: 'Electric Violet', color: '#bd93f9' },
  { name: 'Emerald', color: '#89d185' },
  { name: 'Coral', color: '#f9826c' },
  { name: 'Teal', color: '#2aa198' },
  { name: 'Gold', color: '#cca700' },
  { name: 'Nord Frost', color: '#88c0d0' },
];

export const SettingsEditor: React.FC<SettingsEditorProps> = ({
  currentUser,
  onUpdateProfile,
  currentColorTheme,
  onSelectTheme,
  customAccentColor,
  onSetCustomAccent,
  onLogout,
}) => {
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [selectedFileIcon, setSelectedFileIcon] = useState(currentUser?.fileIcon || 'ts');
  const [messageLanguage, setMessageLanguage] = useState(currentUser?.messageLanguage || 'typescript');
  const [highlightAllMessages, setHighlightAllMessages] = useState<boolean>(
    currentUser?.highlightAllMessages !== false
  );
  const [shareLiveTyping, setShareLiveTyping] = useState<boolean>(
    currentUser?.shareLiveTyping !== false
  );
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setBio(currentUser.bio || '');
      setSelectedFileIcon(currentUser.fileIcon || 'ts');
      setMessageLanguage(currentUser.messageLanguage || 'typescript');
      setHighlightAllMessages(currentUser.highlightAllMessages !== false);
      setShareLiveTyping(currentUser.shareLiveTyping !== false);
    }
  }, [currentUser]);

  const handleLanguageChange = (newLang: string) => {
    setMessageLanguage(newLang);
    // Selecting a message language also updates the user's file icon to match
    const matchingIcon = getFileIconForLanguage(newLang);
    setSelectedFileIcon(matchingIcon);
  };

  const handleToggleHighlight = async (enabled: boolean) => {
    setHighlightAllMessages(enabled);
    const res = await onUpdateProfile({ highlightAllMessages: enabled });
    if (res.success) {
      setStatusMessage({
        text: `Highlight all messages preference set to ${enabled ? 'ON' : 'OFF'} and saved.`,
        type: 'success',
      });
    }
  };

  const handleToggleShareLiveTyping = async (enabled: boolean) => {
    setShareLiveTyping(enabled);
    const res = await onUpdateProfile({ shareLiveTyping: enabled });
    if (res.success) {
      setStatusMessage({
        text: `Live typing preference set to ${enabled ? 'ON' : 'OFF'} and saved.`,
        type: 'success',
      });
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);

    const res = await onUpdateProfile({
      displayName: displayName.trim() || undefined,
      bio: bio.trim() || undefined,
      fileIcon: selectedFileIcon,
      messageLanguage,
      highlightAllMessages,
      shareLiveTyping,
    });

    setIsSaving(false);
    if (res.success) {
      setStatusMessage({ text: 'Settings saved successfully to database.', type: 'success' });
    } else {
      setStatusMessage({ text: res.error || 'Failed to update settings', type: 'error' });
    }
  };

  const currentThemeDef = getTheme(currentColorTheme);

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[var(--bg)] text-[var(--text)] font-mono select-none transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-[var(--border)] pb-3">
          <h1 className="text-xl font-bold text-[var(--text)]">Settings</h1>
          <p className="text-xs text-[var(--muted)] mt-1 font-sans">
            Customize your VS Code identity, syntax highlighting language, color themes, and appearance
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-2.5 rounded text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-[#04395e] text-[#89d185] border border-[var(--accent)]'
                : 'bg-[#5a1d1d] text-[#f88070] border border-red-800'
            }`}
          >
            {statusMessage.type === 'success' && <Check className="w-3.5 h-3.5" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* SECTION: Appearance & Color Themes */}
        <div className="p-4 bg-[var(--sidebar)] border border-[var(--border)] rounded space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <Palette className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              Appearance & Color Themes
            </h2>
          </div>

          <p className="text-xs text-[var(--muted)] font-sans">
            Select one of 14 authentic VS Code themes. The entire workbench (activity bar, explorer sidebar, editor tabs, status bar, and code syntax highlighting) updates in real-time.
          </p>

          {/* Theme Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {COLOR_THEMES.map((theme: ColorThemeDefinition) => {
              const isSelected = currentColorTheme === theme.id || currentColorTheme === theme.shikiTheme;
              return (
                <button
                  key={theme.id}
                  type="button"
                  id={`theme-card-${theme.id}`}
                  onClick={() => onSelectTheme(theme.id)}
                  className={`p-2.5 rounded border text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-[var(--accent)] ring-1 ring-[var(--accent)] shadow-md'
                      : 'border-[var(--border)] hover:border-[var(--muted)] bg-[var(--bg)]/40'
                  }`}
                  style={{ backgroundColor: theme.colors.bg }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-xs font-bold truncate"
                      style={{ color: theme.colors.text }}
                    >
                      {theme.label}
                    </span>
                    {isSelected && (
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5"
                        style={{
                          backgroundColor: theme.colors.accent,
                          color: '#ffffff',
                        }}
                      >
                        <Check className="w-3 h-3" />
                        Active
                      </span>
                    )}
                  </div>

                  {/* Swatches preview */}
                  <div className="flex items-center gap-1.5 mt-1 pt-1.5 border-t border-[rgba(128,128,128,0.2)]">
                    <span
                      className="w-4 h-4 rounded-sm border border-black/20"
                      style={{ backgroundColor: theme.colors.bg }}
                      title="Editor BG"
                    />
                    <span
                      className="w-4 h-4 rounded-sm border border-black/20"
                      style={{ backgroundColor: theme.colors.sidebar }}
                      title="Sidebar BG"
                    />
                    <span
                      className="w-4 h-4 rounded-sm border border-black/20"
                      style={{ backgroundColor: theme.colors.activityBar }}
                      title="Activity Bar"
                    />
                    <span
                      className="w-4 h-4 rounded-sm border border-black/20"
                      style={{ backgroundColor: theme.colors.accent }}
                      title="Accent"
                    />
                    <span
                      className="w-4 h-4 rounded-sm border border-black/20"
                      style={{ backgroundColor: theme.colors.statusBar }}
                      title="Status Bar"
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Accent Color Picker */}
          <div className="pt-3 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">
                Custom Accent Color
              </div>
              <p className="text-[11px] text-[var(--muted)] font-sans">
                Override status bar and highlight accents
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="vscode-custom-accent-picker"
                type="color"
                value={customAccentColor || currentThemeDef.colors.accent}
                onChange={(e) => onSetCustomAccent(e.target.value)}
                className="w-8 h-8 rounded border border-[var(--border)] cursor-pointer bg-transparent"
                title="Pick custom accent color"
              />

              {/* Presets */}
              <div className="flex items-center gap-1">
                {PRESET_ACCENTS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => onSetCustomAccent(preset.color)}
                    className="w-5 h-5 rounded-full border border-black/30 cursor-pointer hover:scale-110 transition-transform"
                    style={{ backgroundColor: preset.color }}
                    title={preset.name}
                  />
                ))}
              </div>

              {customAccentColor && (
                <button
                  type="button"
                  id="vscode-reset-accent-btn"
                  onClick={() => onSetCustomAccent(null)}
                  className="flex items-center gap-1 text-[11px] text-[var(--muted)] hover:text-[var(--text)] px-2 py-1 rounded border border-[var(--border)] cursor-pointer ml-1"
                  title="Reset to theme default accent"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* SECTION: Message Syntax Highlighting */}
        <div className="p-4 bg-[var(--sidebar)] border border-[var(--border)] rounded space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
            <Code className="w-4 h-4 text-[var(--accent)]" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              Message Syntax Highlighting
            </h2>
          </div>

          {/* Toggle: Highlight all messages like code */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[var(--text)]">
                Highlight all messages like code
              </div>
              <p className="text-xs text-[var(--muted)] font-sans mt-0.5">
                When ON, every message body is colored token-by-token according to your message language. When OFF, only fenced code blocks (```) are highlighted.
              </p>
            </div>

            <button
              type="button"
              id="vscode-highlight-all-toggle-btn"
              onClick={() => handleToggleHighlight(!highlightAllMessages)}
              className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                highlightAllMessages ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  highlightAllMessages ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text)]">
              Status:
            </span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                highlightAllMessages
                  ? 'bg-[var(--selection)] text-[var(--accent)]'
                  : 'bg-[var(--border)] text-[var(--muted)]'
              }`}
            >
              {highlightAllMessages ? 'ON (Default)' : 'OFF (Code blocks only)'}
            </span>
          </div>

          {/* Dropdown: My Message Language */}
          <div className="pt-3 border-t border-[var(--border)]">
            <label className="block text-xs font-semibold mb-1 text-[var(--text)]">
              My message language
            </label>
            <p className="text-xs text-[var(--muted)] font-sans mb-2">
              Default language used to highlight your messages. Choosing a language also updates your file icon to match.
            </p>

            <select
              id="vscode-message-language-select"
              value={messageLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--accent)] px-3 py-2 text-xs text-[var(--text)] rounded outline-none font-mono cursor-pointer"
            >
              {LANGUAGE_OPTIONS.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.label} ({lang.id})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SECTION: File Type Icon Selection */}
        <div className="p-4 bg-[var(--sidebar)] border border-[var(--border)] rounded">
          <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text)] mb-1">
            User File Icon
          </label>
          <p className="text-xs text-[var(--muted)] font-sans mb-3">
            In chitAbit, developers are represented by their signature file-type icon. Choose your icon below:
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FILE_ICON_OPTIONS.map((opt) => {
              const isSelected = selectedFileIcon === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  id={`file-icon-${opt.id}`}
                  onClick={() => setSelectedFileIcon(opt.id)}
                  className={`flex items-center gap-2 p-2 rounded border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[var(--selection)] border-[var(--accent)] text-[var(--text)] font-semibold'
                      : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text)] hover:border-[var(--muted)]'
                  }`}
                >
                  <FileIcon name={opt.id} size={18} />
                  <div className="truncate flex-1">
                    <span className="block text-xs font-bold truncate">{opt.ext}</span>
                    <span className="block text-[10px] text-[var(--muted)] truncate font-sans">
                      {opt.label}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--accent)] flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION: Profile Details & Save */}
        <form onSubmit={handleSave} className="space-y-6">
          <div className="p-4 bg-[var(--sidebar)] border border-[var(--border)] rounded space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              Profile Details
            </h2>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text)]">
                Display Name
              </label>
              <input
                id="vscode-settings-displayname"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Linus Torvalds"
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--accent)] px-3 py-1.5 text-xs text-[var(--text)] rounded outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-[var(--text)]">
                Status / Bio
              </label>
              <input
                id="vscode-settings-bio"
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="e.g. Debugging the kernel 💻"
                className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--accent)] px-3 py-1.5 text-xs text-[var(--text)] rounded outline-none"
              />
            </div>

            <button
              id="vscode-save-settings-btn"
              type="submit"
              disabled={isSaving}
              className="px-4 py-1.5 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded text-xs font-bold flex items-center gap-2 cursor-pointer transition-opacity"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>Save Profile & Language Settings</span>
            </button>
          </div>

          {/* Section: Live Typing / Draft Mirroring */}
          <div className="p-4 bg-[var(--sidebar)] border border-[var(--border)] rounded">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                  Live Typing (Draft Mirroring)
                </h2>
                <p className="text-xs text-[var(--muted)] font-sans mt-0.5">
                  Stream your message draft character-by-character live as you type, like Unix talk.
                </p>
              </div>

              <button
                type="button"
                id="vscode-live-typing-toggle-btn"
                onClick={() => handleToggleShareLiveTyping(!shareLiveTyping)}
                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  shareLiveTyping ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    shareLiveTyping ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-[var(--text)]">
                Share live typing with others
              </span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  shareLiveTyping
                    ? 'bg-[var(--selection)] text-[var(--accent)]'
                    : 'bg-[var(--border)] text-[var(--muted)]'
                }`}
              >
                {shareLiveTyping ? 'ON' : 'OFF'}
              </span>
            </div>

            <div className="mt-3 p-2.5 rounded bg-[var(--bg)] border border-[var(--border)] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#cca700] flex-shrink-0 mt-0.5" />
              <div className="text-[11px] text-[var(--muted)] font-sans leading-normal">
                <span className="font-bold text-[#cca700] mr-1">Privacy:</span>
                Others can see what you type before you press Enter. When turned off, you only send the normal "is typing..." status and will not see others' live drafts.
              </div>
            </div>
          </div>

          {/* Section: Account & Logout */}
          <div className="p-4 bg-[var(--sidebar)] border border-[var(--border)] rounded flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[var(--text)]">
                Signed in as @{currentUser?.username}
              </div>
              <div className="text-[10px] text-[var(--muted)]">ID: {currentUser?.id}</div>
            </div>

            <button
              type="button"
              id="vscode-logout-btn"
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/60 light-plus:bg-red-50 text-red-400 light-plus:text-red-600 border border-red-800/60 rounded text-xs font-bold hover:bg-red-900 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
