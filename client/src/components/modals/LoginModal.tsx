import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Lock, User as UserIcon, UserPlus, ArrowRight, Terminal } from 'lucide-react';
import { FileIcon } from '../../utils/fileIcons';

export const LoginModal: React.FC = () => {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setLoading(true);

    if (tab === 'login') {
      const res = await login(cleanUsername, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Failed to sign in. Verify username and password.');
      }
    } else {
      const res = await register(cleanUsername, password, displayName.trim() || undefined);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Registration failed. Try a different username.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs select-none font-mono">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-md w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* VS Code Window Titlebar */}
        <div className="h-8 bg-[#323233] border-b border-[#252526] px-3 flex items-center justify-between text-xs text-[#cccccc]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#f88070] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#cca700] inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#89d185] inline-block" />
            <span className="ml-2 font-semibold text-[#858585]">chitAbit — Authentication</span>
          </div>
          <FileIcon name="ts" size={14} />
        </div>

        <div className="p-7 space-y-5">
          {/* Brand header */}
          <div className="text-center">
            <div className="inline-flex p-3 rounded-lg bg-[#252526] border border-[#3c3c3c] mb-2 text-[#007acc]">
              <Terminal className="w-7 h-7" />
            </div>
            <h1 className="text-lg font-bold text-white tracking-tight">chitAbit</h1>
            <p className="text-xs text-[#858585] mt-0.5">Developer Chat in VS Code</p>
          </div>

          {/* Tab buttons */}
          <div className="flex border-b border-[#3c3c3c]">
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setTab('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${
                tab === 'login'
                  ? 'border-[#007acc] text-white'
                  : 'border-transparent text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setTab('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 text-xs font-bold text-center border-b-2 cursor-pointer transition-colors ${
                tab === 'register'
                  ? 'border-[#007acc] text-white'
                  : 'border-transparent text-[#858585] hover:text-[#cccccc]'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-2.5 bg-[#5a1d1d] border border-red-800 text-[#f88070] text-xs rounded text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#858585]">
                  <UserIcon className="w-3.5 h-3.5" />
                </span>
                <input
                  id="login-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. torvalds, ada_l"
                  autoCapitalize="none"
                  autoCorrect="off"
                  className="w-full bg-[#252526] border border-[#3c3c3c] focus:border-[#007acc] rounded-sm pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#666666] outline-none"
                  autoFocus
                />
              </div>
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-[#858585]">
                    <UserPlus className="w-3.5 h-3.5" />
                  </span>
                  <input
                    id="register-displayname-input"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Linus Torvalds"
                    className="w-full bg-[#252526] border border-[#3c3c3c] focus:border-[#007acc] rounded-sm pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#666666] outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold text-[#858585] uppercase mb-1">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-[#858585]">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  id="login-password-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#252526] border border-[#3c3c3c] focus:border-[#007acc] rounded-sm pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#666666] outline-none"
                />
              </div>
            </div>

            <button
              id="login-submit-button"
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full py-2 bg-[#007acc] hover:bg-[#0062a3] disabled:opacity-40 text-white rounded text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm mt-3"
            >
              <span>{loading ? 'Authenticating...' : tab === 'login' ? 'Open Workspace' : 'Register Developer'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
