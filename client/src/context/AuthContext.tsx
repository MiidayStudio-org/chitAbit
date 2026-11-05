import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { UNAUTHORIZED_EVENT } from '../utils/authFetch';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (username: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: {
    displayName?: string;
    bio?: string;
    status?: string;
    avatarColor?: string;
    avatarUrl?: string | null;
    fileIcon?: string;
    messageLanguage?: string;
    colorTheme?: string;
    customAccentColor?: string | null;
    highlightAllMessages?: boolean;
    shareLiveTyping?: boolean;
  }) => Promise<{ success: boolean; user?: User; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('chitabit_user');
    const savedToken = localStorage.getItem('chitabit_token');

    if (savedToken) {
      setToken(savedToken);
    }

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
      } catch (err) {
        console.error('Failed to parse saved user session:', err);
        localStorage.removeItem('chitabit_user');
      }
    }

    // Verify token with server if we have one
    if (savedToken) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem('chitabit_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {
          // ignore network failure on offline or startup
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to login' };
      }

      setUser(data.user);
      localStorage.setItem('chitabit_user', JSON.stringify(data.user));
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('chitabit_token', data.token);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  };

  const register = async (
    username: string,
    password: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to register' };
      }

      setUser(data.user);
      localStorage.setItem('chitabit_user', JSON.stringify(data.user));
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('chitabit_token', data.token);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  };

  const updateProfile = async (updates: {
    displayName?: string;
    bio?: string;
    status?: string;
    avatarColor?: string;
    avatarUrl?: string | null;
    fileIcon?: string;
    messageLanguage?: string;
    colorTheme?: string;
    customAccentColor?: string | null;
    highlightAllMessages?: boolean;
    shareLiveTyping?: boolean;
  }): Promise<{ success: boolean; user?: User; error?: string }> => {
    if (!token && !user) return { success: false, error: 'Not authenticated' };

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update profile' };
      }

      setUser(data.user);
      localStorage.setItem('chitabit_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('chitabit_user');
    localStorage.removeItem('chitabit_token');
  };

  // Token expired, invalid, or user deleted: the server answered 401, so log out.
  useEffect(() => {
    window.addEventListener(UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, logout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, updateProfile, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
